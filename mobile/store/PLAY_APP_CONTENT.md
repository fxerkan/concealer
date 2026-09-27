# Google Play — "App content" declarations (console-only)

These three are **legal declarations Google only accepts in the Play Console** — there is
no Android Publisher API for them (unlike the AAB / listing / screenshots, which we automate).
Answers below reflect concealer's real behavior: no accounts, no data collection, and a
built-in offline **Demo mode** that gives a reviewer full access with no login.

## 1. App access (Oturum açma bilgileri) → **Yes / Evet** → add a group
- **Name:** `Demo mode — full access, no login`
- **Username / password:** leave empty (there is no account)
- **Any other information required to access your app:**
  > Concealer has no user accounts. On the first screen, tap "Try the demo — no host needed"
  > to access the entire app offline with sample data: browse, add/edit/delete secrets,
  > reveal & copy values, switch theme, and see auto-lock. No login, account, or network is
  > required to review any part of the app. (For real use, the app can optionally sync with a
  > self-hosted "concealer" server on the user's own local network using a master password —
  > not needed to review the app.)

## 2. Target audience (Hedef kitle)
- **Age groups:** 18 and over only.
- **Is your app appealing to children?** No.
- No ads, not directed to children.

## 3. Data safety (Veri güvenliği)
- **Does your app collect or share user data?** No — everything stays on the user's own
  devices, there are no company servers.
- **Data collected / shared:** none.
- **Encrypted in transit** (if asked): Yes (end-to-end, master-password).
- **Can users request deletion?** N/A — no data is collected.
- **Privacy policy:** https://concealer.fxerkan.com/privacy/

---
**Next time:** these can't be API-automated, but the answers above are canonical — paste them in.
Everything else (build, listing, screenshots, release tracks) is automated via
`mobile/store/play_upload.py` + the CI `mobile-release` workflow.
