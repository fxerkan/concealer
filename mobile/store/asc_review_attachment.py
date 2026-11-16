#!/usr/bin/env python3
"""Attach a file (default: the demo video) to the App Review Information of the editable
iOS version via the App Store Connect API. Same vault-driven auth as asc_metadata.py:

  concealer run_with_secrets --names APPLE_ASC_API_KEY \
    --tenant "*" --project zikirci --environment prod --repo zikirci -- \
    python3 mobile/store/asc_review_attachment.py [path]

Idempotent: an attachment with the same file name is replaced.
"""
import os, sys, time, json, base64, hashlib
import requests
from cryptography.hazmat.primitives.serialization import load_pem_private_key
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature

APP_ID = "6816103801"
BASE = "https://api.appstoreconnect.apple.com"
PATH = sys.argv[1] if len(sys.argv) > 1 else "mobile/store/demo-video.mp4"

def b64u(b): return base64.urlsafe_b64encode(b).rstrip(b"=")
def token():
    kid=os.environ["APPLE_ASC_API_KEY_KEY_ID"]; iss=os.environ["APPLE_ASC_API_KEY_ISSUER_ID"]
    p8=os.environ["APPLE_ASC_API_KEY_P8_PRIVATE_KEY"]
    if "\\n" in p8 and "\n" not in p8: p8=p8.replace("\\n","\n")
    now=int(time.time())
    si=b64u(json.dumps({"alg":"ES256","kid":kid,"typ":"JWT"}).encode())+b"."+ \
       b64u(json.dumps({"iss":iss,"iat":now,"exp":now+1000,"aud":"appstoreconnect-v1"}).encode())
    der=load_pem_private_key(p8.encode(),None).sign(si,ec.ECDSA(hashes.SHA256())); r,s=decode_dss_signature(der)
    return (si+b"."+b64u(r.to_bytes(32,"big")+s.to_bytes(32,"big"))).decode()

H={"Authorization":f"Bearer {token()}"}
def _ck(r):
    if not r.ok: raise RuntimeError(f"{r.status_code} {r.request.method} {r.url}\n{r.text[:600]}")
    return r.json() if r.text else {}
def get(u,**kw): return _ck(requests.get(u,headers=H,**kw))
def send(method,u,body): return _ck(requests.request(method,u,headers={**H,"Content-Type":"application/json"},json=body))

vers=get(f"{BASE}/v1/apps/{APP_ID}/appStoreVersions",params={"filter[platform]":"IOS","limit":"20"})["data"]
EDITABLE={"PREPARE_FOR_SUBMISSION","DEVELOPER_REJECTED","REJECTED","METADATA_REJECTED","INVALID_BINARY","WAITING_FOR_REVIEW"}
ver=next((v for v in vers if v["attributes"]["appStoreState"] in EDITABLE), vers[0])
print("version",ver["attributes"]["versionString"],ver["attributes"]["appStoreState"])
RID=get(f"{BASE}/v1/appStoreVersions/{ver['id']}/appStoreReviewDetail")["data"]["id"]

data=open(PATH,"rb").read(); name=os.path.basename(PATH)
for a in get(f"{BASE}/v1/appStoreReviewDetails/{RID}/appStoreReviewAttachments")["data"]:
    if a["attributes"]["fileName"]==name:
        _ck(requests.delete(f"{BASE}/v1/appStoreReviewAttachments/{a['id']}",headers=H)); print("replaced existing",name)

att=send("POST",f"{BASE}/v1/appStoreReviewAttachments",{"data":{"type":"appStoreReviewAttachments",
    "attributes":{"fileName":name,"fileSize":len(data)},
    "relationships":{"appStoreReviewDetail":{"data":{"type":"appStoreReviewDetails","id":RID}}}}})["data"]
for op in att["attributes"]["uploadOperations"]:
    r=requests.request(op["method"],op["url"],headers={h["name"]:h["value"] for h in op["requestHeaders"]},
                       data=data[op["offset"]:op["offset"]+op["length"]])
    if not r.ok: raise RuntimeError(f"chunk upload {r.status_code} {r.text[:300]}")
send("PATCH",f"{BASE}/v1/appStoreReviewAttachments/{att['id']}",{"data":{"type":"appStoreReviewAttachments","id":att["id"],
    "attributes":{"uploaded":True,"sourceFileChecksum":hashlib.md5(data).hexdigest()}}})
time.sleep(3)
st=get(f"{BASE}/v1/appStoreReviewAttachments/{att['id']}")["data"]["attributes"]
print("attached",st["fileName"],st["fileSize"],"bytes ·",(st.get("assetDeliveryState") or {}).get("state"))
