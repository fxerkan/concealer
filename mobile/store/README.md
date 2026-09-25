# concealer — App Store & Google Play listing kit

Everything needed to publish the concealer mobile app (`com.fxerkan.concealer`).
Apple Team `96RZX28T7X` · support `concealer@fxerkan.com`.

## Contents
- `metadata/en-US/`, `metadata/tr/` — name, subtitle, short + full description, keywords, release notes, URLs (fastlane / EAS-compatible layout).
- `feature-graphic.png` — Google Play feature graphic (1024×500).
- `app-icon-1024.png` — store icon (also `../assets/icon.png`).
- `screenshots/ios/`, `screenshots/android/` — device screenshots.

## Screenshots — required sizes
Capture on a **real device / simulator** with the app populated (the demo vault is handy: `python3 mobile/serve-demo.py`, host `http://localhost:8088`, password `demo1234`).

- **iOS (App Store):** 6.7"/6.9" (1290×2796 or 1320×2868) and 6.5" (1242×2688). `xcrun simctl io booted screenshot out.png`.
- **Android (Play):** phone 1080×1920+ (16:9/9:16). `adb exec-out screencap -p > out.png`.

Suggested shots (all verified working):
1. Unlock — brand + slogan, master password.  (`screenshots/ios/01-login.png` included)
2. Vault list — colored type pills, search, sort/filter.
3. Secret detail — masked value + reveal/copy.
4. Edit — masked fields, fixed Save/Delete bar.
5. Settings — theme, auto-lock, host, Rate/Support.
6. Discovery — "Servers on your network" auto-find.
7. (optional) Conflict resolution.

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
