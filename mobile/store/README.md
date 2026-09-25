# concealer — App Store & Google Play listing kit

Everything needed to publish the concealer mobile app (`com.fxerkan.concealer`).
Apple Team `96RZX28T7X` · support `concealer@fxerkan.com`.

## Contents
- `metadata/en-US/`, `metadata/tr/` — name, subtitle, short + full description, keywords, release notes, URLs (fastlane / EAS-compatible layout).
- `feature-graphic.png` — Google Play feature graphic (1024×500).
- `app-icon-1024.png` — store icon (also `../assets/icon.png`).
- `screenshots/ios/`, `screenshots/android/` — device screenshots.

## Screenshots
Real device screenshots are provided in `screenshots/ios/` (8) and `screenshots/android/` (10):
login, server discovery/scan, vault list, secret detail + copy, edit, new secret,
database-type template, settings + change-server, and the matrix theme.

To recapture (demo vault is handy: `python3 mobile/serve-demo.py`, host `http://localhost:8088`, password `demo1234`):
- **iOS (App Store):** upload the 6.7"/6.9" set (1290×2796 or 1320×2868). `xcrun simctl io booted screenshot out.png` or the device screenshots here.
- **Android (Play):** phone 1080×1920+ (9:16). `adb exec-out screencap -p > out.png`.

## Rate button → website redirect
The app's **Rate** button opens `https://concealer.fxerkan.com/rate/?p=<ios|android>`.
That page (`docs/rate/index.html` in this repo) reads the platform and redirects to the right store,
so the store URLs are edited **on the website, with no app release**. Set the iOS App Store URL in
that page's `STORE.ios` once the app is live (the Play URL is already wired to `com.fxerkan.concealer`).

## Before submitting
- **App Store numeric ID:** after the first App Store Connect build, set `APPLE_APP_ID` in `mobile/www/index.html` (the Rate button) and rebuild.
- **Privacy:** publish `https://concealer.fxerkan.com/privacy`. Data collection: **none** (no account, no analytics, no network beyond the user's own LAN host). Fill App Privacy / Data Safety as "No data collected".
- **Category:** Developer Tools (iOS) / Tools (Android).
- **Content rating:** everyone / 4+.
- **Release build:** debug APK/IPA here is for testing. For stores, archive a **release** build:
  - Android: `cd android && ./gradlew bundleRelease` (AAB) with a release keystore.
  - iOS: Xcode → Product → Archive → distribute to App Store Connect.

## Notes
- User-facing copy never names the underlying encryption tooling (house rule); it says "master password / encrypted".
- Turkish copy keeps the word "secret" untranslated (house rule).
