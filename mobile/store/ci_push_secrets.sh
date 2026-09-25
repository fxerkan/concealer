#!/usr/bin/env bash
# Populate the GitHub Actions secrets used by .github/workflows/mobile-release.yml.
# Apple secrets are injected from the vault (run this via `concealer run_with_secrets`);
# the Android keystore + Play SA are read from the local gitignored files.
# Every value is piped straight into `gh secret set` — nothing is echoed.
set -euo pipefail
cd "$(dirname "$0")/../.."                 # repo root
REPO="${GH_REPO:-fxerkan/concealer}"
set_secret(){ gh secret set "$1" --repo "$REPO"; }   # reads value from stdin

# --- Apple (vault-injected env) ---
printf '%s' "${APPLE_DIST_CERT_PRIVATE_KEY_PEM:?}"  | set_secret APPLE_DIST_CERT_PRIVATE_KEY_PEM
printf '%s' "${APPLE_ASC_API_KEY_KEY_ID:?}"         | set_secret APPLE_ASC_API_KEY_KEY_ID
printf '%s' "${APPLE_ASC_API_KEY_ISSUER_ID:?}"      | set_secret APPLE_ASC_API_KEY_ISSUER_ID
printf '%s' "${APPLE_ASC_API_KEY_P8_PRIVATE_KEY:?}" | set_secret APPLE_ASC_API_KEY_P8_PRIVATE_KEY

# --- iOS provisioning profile (local) ---
base64 -i _credentials/Concealer_App_Store_Profile.mobileprovision | set_secret APPLE_PROVISIONING_PROFILE_BASE64

# --- Android signing (local, gitignored) ---
base64 -i mobile/android/signing/concealer-upload.jks | set_secret ANDROID_KEYSTORE_BASE64
grep '^storePassword=' mobile/android/signing/keystore.properties | cut -d= -f2- | set_secret ANDROID_KEYSTORE_PASSWORD
grep '^keyPassword='   mobile/android/signing/keystore.properties | cut -d= -f2- | set_secret ANDROID_KEY_PASSWORD

# --- Google Play service account (local) ---
cat _credentials/sa-concealer-google-*.json | set_secret GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_KEY

echo "All 8 secrets set on $REPO."
