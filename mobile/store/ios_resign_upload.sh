#!/usr/bin/env bash
# Re-sign the archived App.app to App Store distribution and upload to App Store Connect,
# without Xcode Organizer and without touching the (password-locked) dhikrer-sign keychain.
#
# The Capacitor archive is signed for *development* (Apple Development + get-task-allow=1),
# so it must be re-signed to distribution. We build a throwaway keychain from the vault's
# distribution private key + the public cert embedded in the App Store provisioning profile
# (the two are a matched pair), import Apple's WWDR + root CAs so the chain validates, then
# codesign the frameworks + app with the distribution identity and package the IPA by hand.
#
# Run through the vault so the private keys never hit disk in the clear:
#   concealer run_with_secrets --names APPLE_DIST_CERT,APPLE_ASC_API_KEY \
#     --project concealer --environment prod --repo concealer -- \
#     bash mobile/store/ios_resign_upload.sh
#
# Needs (in the same Apple account, team 96RZX28T7X):
#   - mobile/build/App.xcarchive              (xcodebuild ... archive)
#   - _credentials/Concealer_App_Store_Profile.mobileprovision
set -euo pipefail
cd "$(dirname "$0")/../.."          # repo root
ROOT=$PWD
PROFILE=_credentials/Concealer_App_Store_Profile.mobileprovision
ARCHIVE=mobile/build/App.xcarchive
IDENT="Apple Distribution: Erkan ÇİFTÇİ (96RZX28T7X)"

W=$(mktemp -d); KC=$W/concealer-sign.keychain
ORIG=$(security list-keychains -d user | sed 's/[" ]//g' | tr '\n' ' ')
cleanup(){ security list-keychains -d user -s $ORIG 2>/dev/null || true; security delete-keychain "$KC" 2>/dev/null || true; rm -rf "$W"; }
trap cleanup EXIT

# Apple CAs (public) so the leaf chains to a trusted root inside the isolated keychain.
curl -fsS -o "$W/wwdr.cer" https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer
curl -fsS -o "$W/root.cer" https://www.apple.com/appleca/AppleIncRootCertificate.cer
# Public cert lives inside the profile; pair it with the vault private key.
security cms -D -i "$PROFILE" > "$W/prof.plist"
python3 - "$W/prof.plist" "$W/cert.der" <<'PY'
import plistlib,sys
p=plistlib.load(open(sys.argv[1],'rb'))
open(sys.argv[2],'wb').write(p['DeveloperCertificates'][0])
PY
printf '%s' "$APPLE_DIST_CERT_PRIVATE_KEY_PEM" | sed 's/\\n/\n/g' > "$W/key.pem"
openssl x509 -inform DER -in "$W/cert.der" -out "$W/cert.pem"
openssl pkcs12 -export -legacy -inkey "$W/key.pem" -in "$W/cert.pem" -out "$W/dist.p12" -passout pass:kc -name concealer-dist

security create-keychain -p cerbuild "$KC"
security unlock-keychain -p cerbuild "$KC"
security set-keychain-settings "$KC"
security import "$W/wwdr.cer" -k "$KC" -T /usr/bin/codesign 2>/dev/null || true
security import "$W/root.cer" -k "$KC" -T /usr/bin/codesign 2>/dev/null || true
security import "$W/dist.p12" -k "$KC" -P kc -T /usr/bin/codesign -T /usr/bin/security
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k cerbuild "$KC" >/dev/null
security list-keychains -d user -s "$KC" $ORIG
security find-identity -v -p codesigning "$KC" | grep -i distribution

# Re-sign + package.
rm -rf "$W/Payload"; mkdir -p "$W/Payload"
cp -R "$ARCHIVE/Products/Applications/App.app" "$W/Payload/"
APP=$W/Payload/App.app
cp "$PROFILE" "$APP/embedded.mobileprovision"
/usr/libexec/PlistBuddy -x -c 'Print :Entitlements' "$W/prof.plist" > "$W/ent.plist"
xattr -cr "$APP"
for f in "$APP"/Frameworks/*.framework; do codesign --force --sign "$IDENT" --keychain "$KC" "$f"; done
codesign --force --sign "$IDENT" --entitlements "$W/ent.plist" --keychain "$KC" "$APP"
codesign --verify --deep --strict "$APP"
rm -rf mobile/build/ipa; mkdir -p mobile/build/ipa
( cd "$W" && zip -qry "$ROOT/mobile/build/ipa/App.ipa" Payload )

# Upload.
PKDIR=~/.appstoreconnect/private_keys; mkdir -p "$PKDIR"; umask 077
printf '%s' "$APPLE_ASC_API_KEY_P8_PRIVATE_KEY" | sed 's/\\n/\n/g' > "$PKDIR/AuthKey_${APPLE_ASC_API_KEY_KEY_ID}.p8"
xcrun altool --upload-app -f mobile/build/ipa/App.ipa -t ios \
  --apiKey "$APPLE_ASC_API_KEY_KEY_ID" --apiIssuer "$APPLE_ASC_API_KEY_ISSUER_ID"
