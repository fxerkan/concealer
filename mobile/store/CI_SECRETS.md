# Mobile CI/CD secrets

`.github/workflows/mobile-release.yml` needs these **repository secrets** (Settings →
Secrets and variables → Actions). `mobile-ci.yml` needs none. Populate them in one shot
with `ci_push_secrets.sh` (below) — it reads the same vault + local signing files this
machine already uses, and pipes each value straight into `gh secret set` (never printed).

| Secret | Source |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | base64 of `mobile/android/signing/concealer-upload.jks` (vault: `concealer-android-upload-keystore`) |
| `ANDROID_KEYSTORE_PASSWORD` | `storePassword` in `signing/keystore.properties` |
| `ANDROID_KEY_PASSWORD` | `keyPassword` in `signing/keystore.properties` (keyAlias is `concealer`, hard-coded in the workflow) |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_KEY` | `_credentials/sa-concealer-google-*.json` (concealer GCP SA) |
| `APPLE_DIST_CERT_PRIVATE_KEY_PEM` | vault `APPLE_DIST_CERT._PRIVATE_KEY_PEM` |
| `APPLE_ASC_API_KEY_KEY_ID` / `APPLE_ASC_API_KEY_ISSUER_ID` / `APPLE_ASC_API_KEY_P8_PRIVATE_KEY` | vault `APPLE_ASC_API_KEY.*` |
| `APPLE_PROVISIONING_PROFILE_BASE64` | base64 of `_credentials/Concealer_App_Store_Profile.mobileprovision` |

## Populate

```sh
# Apple secrets come from the vault; Android keystore + Play SA come from local files.
concealer run_with_secrets --names APPLE_DIST_CERT,APPLE_ASC_API_KEY \
  --project zikirci --environment prod --repo zikirci -- \
  bash mobile/store/ci_push_secrets.sh
```

(Move `APPLE_DIST_CERT` / `APPLE_ASC_API_KEY` into `*/concealer/prod` and change the scope
above if you don't want to depend on the zikirci scope.)

## Notes / gotchas (learned validating the pipeline)

- **Play app in Draft → draft releases only.** `play_upload.py` defaults `PLAY_RELEASE_STATUS=draft`; a `completed` release on a Draft app is rejected (sometimes with a misleading *"Target SDK too low"*). Set `PLAY_RELEASE_STATUS=completed` once the app is published to actually roll out.
- **iOS needs the current SDK.** App Store rejects builds from old Xcode ("built with iOS 17.5 SDK…"); the iOS job runs on `macos-15` + `setup-xcode` `latest-stable`.
- **Android SDK on the runner:** use the preinstalled cmdline-tools + `yes | sdkmanager --licenses` (the `setup-android` action trips on the runner's preview-SDK license).
- **`cap sync`, not `cap copy`**, for Android — the cordova plugin gradle files are generated + gitignored.
- **`-legacy` p12** only exists on OpenSSL 3 (brew); macOS/CI LibreSSL omits it — `ios_resign_upload.sh` detects this.
- **versionCode/build number = epoch seconds** so they always exceed prior uploads.

## Triggering

- **Manual:** Actions → *Mobile Release* → Run workflow → pick the Play track / whether to push the iOS listing.
- **Tag:** `git tag mobile-v1.0.1 && git push origin mobile-v1.0.1`.

Each run stamps Android `versionCode` and the iOS build number from `100 + run_number`, so
re-runs never collide with an existing upload. `versionName` stays `1.0` — bump it in
`app/build.gradle` / the Xcode project for a new marketing version.
