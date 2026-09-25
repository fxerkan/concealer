# concealer — publishing runbook

App id: **com.fxerkan.concealer** · Apple Team **96RZX28T7X** · support **concealer@fxerkan.com**
Version 0.9.28 (Android versionCode 1).

## Artifacts (built by this repo)
- **Android AAB (signed, upload-ready):** `mobile/android/app/build/outputs/bundle/release/app-release.aab`
  - Build: `cd mobile/android && ./gradlew bundleRelease` (JAVA_HOME=openjdk@17).
  - Signing key: `mobile/android/signing/concealer-upload.jks` (gitignored) — backup + passwords are in the
    concealer vault secret **concealer-android-upload-keystore** (`*/concealer/prod`). **Never lose this key.**
- **iOS archive:** `mobile/build/App.xcarchive`
  - Build: `xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release -archivePath build/App.xcarchive -allowProvisioningUpdates DEVELOPMENT_TEAM=96RZX28T7X archive`
  - Export/upload needs App Store Connect auth (API key + Issuer ID) — see below.
- **Store listing:** `mobile/store/metadata/{en-US,tr}`, `feature-graphic.png`, `app-icon-1024.png`, `screenshots/`.
- **Privacy policy:** `https://concealer.fxerkan.com/privacy/` (source `docs/privacy/`).
- **Rate redirect:** `https://concealer.fxerkan.com/rate/` (source `docs/rate/` — set `STORE.ios` after publish).

## Google Play (you: console steps; the AAB is ready)
1. Play Console → Create app → name **concealer**, app, free, accept declarations.
2. Set up: Privacy policy URL (above), App access, Ads (no), Content rating (questionnaire → Tools/Utility),
   Target audience (18+ / everyone), Data safety (**No data collected/shared**), Government apps (no).
3. Production → Create release → upload `app-release.aab` → release notes (`metadata/*/release_notes.txt`) → review → roll out.
4. Store listing: short + full description, app icon, feature graphic, phone screenshots (`store/screenshots/android`).

## App Store (you: app record + submit; I can upload the build via your ASC API key)
1. **App Store Connect → Apps → +** (you're here): register the App ID `com.fxerkan.concealer` (Identifiers → +),
   set SKU `com.fxerkan.concealer`, create the app.
2. Accept the **Paid & Free Apps agreement** (Business tab) if not active — uploads fail otherwise.
3. Upload the build (either path):
   - **CLI (I can run):** `xcodebuild -exportArchive -archivePath build/App.xcarchive -exportPath build/ipa -exportOptionsPlist ExportOptions.plist -allowProvisioningUpdates -authenticationKeyPath ~/.appstoreconnect/private_keys/AuthKey_T2SMCH6U9X.p8 -authenticationKeyID T2SMCH6U9X -authenticationKeyIssuerID <ISSUER_ID>` then `xcrun altool --upload-app -f build/ipa/App.ipa --apiKey T2SMCH6U9X --apiIssuer <ISSUER_ID>`.
     Needs the **Issuer ID** (App Store Connect → Users and Access → Integrations). It's also in the vault secret **APPLE_ASC_API_KEY**.
   - **Xcode Organizer:** Window → Organizer → the archive → Distribute App → App Store Connect → Upload.
4. In App Store Connect: fill Description/Keywords (`metadata/*`), upload 6.7" screenshots, set Privacy (No data collected),
   Age rating, pricing (free), then **Submit for Review**.

## Notes
- The debug builds used for testing are NOT the store builds; always ship the signed release AAB / archive above.
- Bump `versionCode` (Android) and the build number (iOS) for every subsequent upload.
