#!/usr/bin/env python3
"""Upload the signed AAB to Google Play via the Android Publisher API.

Run through the vault so the service-account JSON never lands on disk:

  concealer run_with_secrets --names GOOGLE_PLAY_SERVICE_ACCOUNT \
    --project concealer --environment prod --repo concealer -- \
    python3 mobile/store/play_upload.py [track]

track defaults to "production" (the chosen release). Requires the app
com.fxerkan.concealer to already exist in the same Play account and the
service-account email to have release access to it (console-only setup).
"""
import os, sys, json
from google.oauth2 import service_account
from googleapiclient.discovery import build

PKG = "com.fxerkan.concealer"
AAB = os.path.join(os.path.dirname(__file__), "..",
                   "android/app/build/outputs/bundle/release/app-release.aab")
track = sys.argv[1] if len(sys.argv) > 1 else "production"

info = json.loads(os.environ["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_KEY"])
creds = service_account.Credentials.from_service_account_info(
    info, scopes=["https://www.googleapis.com/auth/androidpublisher"])
svc = build("androidpublisher", "v3", credentials=creds, cache_discovery=False)

edit = svc.edits().insert(packageName=PKG, body={}).execute()["id"]
b = svc.edits().bundles().upload(
    packageName=PKG, editId=edit, media_body=os.path.abspath(AAB),
    media_mime_type="application/octet-stream").execute()
vc = b["versionCode"]
print("uploaded versionCode", vc)
# A Draft app only accepts draft releases; a live app accepts completed. Try the
# stronger status first and fall back so the same script works in both states.
from googleapiclient.errors import HttpError
for status in (os.environ.get("PLAY_RELEASE_STATUS", "completed"), "draft"):
    try:
        svc.edits().tracks().update(
            packageName=PKG, editId=edit, track=track,
            body={"releases": [{"name": os.environ.get("ANDROID_VERSION_NAME", "1.0"),
                                "versionCodes": [vc], "status": status}]}).execute()
        svc.edits().commit(packageName=PKG, editId=edit).execute()
        print(f"committed to '{track}' as {status}")
        break
    except HttpError as e:
        if status == "draft" or b'draft' not in e.content:
            raise
        print("  app is in Draft; retrying as draft release")
