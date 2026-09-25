#!/usr/bin/env python3
"""Push App Store listing (text + screenshots) to the editable iOS version via the
App Store Connect API. Auth uses the ASC API key from the vault (ES256 JWT signed
directly with `cryptography`, no PyJWT). Run through the vault:

  concealer run_with_secrets --names APPLE_ASC_API_KEY \
    --project zikirci --environment prod --repo zikirci -- \
    python3 mobile/store/asc_metadata.py

Text is authoritative; screenshots are best-effort (per-image, won't abort text).
"""
import os, time, json, base64, hashlib, glob
import requests
from cryptography.hazmat.primitives.serialization import load_pem_private_key
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature

APP_ID = "6816103801"
BASE = "https://api.appstoreconnect.apple.com"
M = "mobile/store/metadata"
SHOTS = sorted(glob.glob("/tmp/iosshots/*.png"))          # 1242x2688, prepared by caller
DISPLAY = "APP_IPHONE_65"
LOCALES = {"en-US": "en-US", "tr": "tr"}                   # metadata dir -> ASC locale

def b64u(b): return base64.urlsafe_b64encode(b).rstrip(b"=")
def token():
    kid=os.environ["APPLE_ASC_API_KEY_KEY_ID"]; iss=os.environ["APPLE_ASC_API_KEY_ISSUER_ID"]
    p8=os.environ["APPLE_ASC_API_KEY_P8_PRIVATE_KEY"]
    if "\\n" in p8 and "\n" not in p8: p8=p8.replace("\\n","\n")
    now=int(time.time())
    hdr={"alg":"ES256","kid":kid,"typ":"JWT"}
    pl={"iss":iss,"iat":now,"exp":now+1000,"aud":"appstoreconnect-v1"}
    si=b64u(json.dumps(hdr).encode())+b"."+b64u(json.dumps(pl).encode())
    key=load_pem_private_key(p8.encode(),None)
    der=key.sign(si,ec.ECDSA(hashes.SHA256())); r,s=decode_dss_signature(der)
    raw=r.to_bytes(32,"big")+s.to_bytes(32,"big")
    return (si+b"."+b64u(raw)).decode()

TOK=token()
H={"Authorization":f"Bearer {TOK}"}
def rd(p,default=""):
    try: return open(p,encoding="utf-8").read().strip()
    except FileNotFoundError: return default
def _ck(r):
    if not r.ok:
        raise RuntimeError(f"{r.status_code} {r.request.method} {r.url}\n{r.text[:600]}")
    return r.json() if r.text else {}
def get(u,**kw): return _ck(requests.get(u,headers=H,**kw))
def patch(u,body): return _ck(requests.patch(u,headers={**H,"Content-Type":"application/json"},json=body))
def post(u,body): return _ck(requests.post(u,headers={**H,"Content-Type":"application/json"},json=body))

# editable iOS version
vers=get(f"{BASE}/v1/apps/{APP_ID}/appStoreVersions",params={"filter[platform]":"IOS","limit":"20"})["data"]
EDITABLE={"PREPARE_FOR_SUBMISSION","DEVELOPER_REJECTED","REJECTED","METADATA_REJECTED","INVALID_BINARY","WAITING_FOR_REVIEW"}
ver=next((v for v in vers if v["attributes"]["appStoreState"] in EDITABLE), vers[0])
VID=ver["id"]; print("version",ver["attributes"]["versionString"],ver["attributes"]["appStoreState"],VID)

locs={l["attributes"]["locale"]:l["id"] for l in get(f"{BASE}/v1/appStoreVersions/{VID}/appStoreVersionLocalizations")["data"]}

def upsert_text(src,loc):
    attrs={
        "description":rd(f"{M}/{src}/description.txt"),
        "keywords":rd(f"{M}/{src}/keywords.txt")[:100],
        # support_url.txt holds a mailto address; App Store needs an http(s) URI
        "supportUrl":"https://concealer.fxerkan.com",
        "marketingUrl":rd(f"{M}/{src}/marketing_url.txt","https://concealer.fxerkan.com"),
        "promotionalText":rd(f"{M}/{src}/subtitle.txt")[:170],
    }
    attrs={k:v for k,v in attrs.items() if v}
    if loc in locs:
        patch(f"{BASE}/v1/appStoreVersionLocalizations/{locs[loc]}",{"data":{"type":"appStoreVersionLocalizations","id":locs[loc],"attributes":attrs}})
        print(f"  text {loc}: patched")
    else:
        r=post(f"{BASE}/v1/appStoreVersionLocalizations",{"data":{"type":"appStoreVersionLocalizations","attributes":{**attrs,"locale":loc},
            "relationships":{"appStoreVersion":{"data":{"type":"appStoreVersions","id":VID}}}}})
        locs[loc]=r["data"]["id"]; print(f"  text {loc}: created")

def screenshot_set(locid):
    sets=get(f"{BASE}/v1/appStoreVersionLocalizations/{locid}/appScreenshotSets")["data"]
    for s in sets:
        if s["attributes"]["screenshotDisplayType"]==DISPLAY: return s["id"]
    r=post(f"{BASE}/v1/appScreenshotSets",{"data":{"type":"appScreenshotSets","attributes":{"screenshotDisplayType":DISPLAY},
        "relationships":{"appStoreVersionLocalization":{"data":{"type":"appStoreVersionLocalizations","id":locid}}}}})
    return r["data"]["id"]

def upload_shot(setid,path):
    data=open(path,"rb").read(); name=os.path.basename(path)
    r=post(f"{BASE}/v1/appScreenshots",{"data":{"type":"appScreenshots","attributes":{"fileSize":len(data),"fileName":name},
        "relationships":{"appScreenshotSet":{"data":{"type":"appScreenshotSets","id":setid}}}}})
    sid=r["data"]["id"]
    for op in r["data"]["attributes"]["uploadOperations"]:
        hdrs={h["name"]:h["value"] for h in op["requestHeaders"]}
        seg=data[op["offset"]:op["offset"]+op["length"]]
        requests.request(op["method"],op["url"],headers=hdrs,data=seg).raise_for_status()
    patch(f"{BASE}/v1/appScreenshots/{sid}",{"data":{"type":"appScreenshots","id":sid,
        "attributes":{"uploaded":True,"sourceFileChecksum":hashlib.md5(data).hexdigest()}}})

for src,loc in LOCALES.items():
    upsert_text(src,loc)

for src,loc in LOCALES.items():
    if not SHOTS: break
    try:
        setid=screenshot_set(locs[loc])
        existing=len(get(f"{BASE}/v1/appScreenshotSets/{setid}/appScreenshots")["data"])
        if existing:
            print(f"  shots {loc}: {existing} already present, skip"); continue
        for p in SHOTS[:10]:
            try: upload_shot(setid,p)
            except Exception as e: print(f"    ! {os.path.basename(p)}: {str(e)[:120]}")
        print(f"  shots {loc}: uploaded {len(SHOTS[:10])}")
    except Exception as e:
        print(f"  shots {loc}: {str(e)[:160]}")

print("done")
