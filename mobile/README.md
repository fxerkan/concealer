# concealer mobile

A cross‑platform (iOS + Android) companion app for [concealer](../README.md). It:

- **Opens the vault offline** with your master password (no host connection needed).
- **Imports the whole vault** from the host on first connect, then works standalone.
- Lets you **add / edit / delete secrets on the phone**, offline.
- **Syncs bidirectionally** with the host when online (last‑write‑wins; deletions propagate).

It is a thin web app (`www/`) wrapped by [Capacitor](https://capacitorjs.com/). All
cryptography runs on‑device with [`age-encryption`](https://www.npmjs.com/package/age-encryption)
— the same age passphrase format concealer's bundles use. No sops/age binary on the phone.

## How it works

- At rest the phone stores **only** the age‑encrypted vault bundle (encrypted with your master
  password). Decrypted secrets live in memory only, while unlocked.
- **Offline open** = decrypt the stored bundle with the master password. Wrong password → fails.
- **Sync** = encrypt the local set with the master password and POST it to the host's
  `POST /api/sync`. The host does a timestamp‑based last‑write‑wins merge (honoring deletion
  tombstones) and returns the full merged set, which the phone adopts. Secret values never
  travel in plaintext — only encrypted bundles cross the wire.
- Network calls use Capacitor's native HTTP (no browser CORS). In a desktop browser the app
  falls back to `fetch` for development.

## Host setup

The phone reaches the host over the LAN bridge (the plain web server is loopback‑only):

```bash
concealer lan            # phone -> http://<host>.local:8788  (same Wi‑Fi only)
```

Unlock the host once (open its web UI and enter the master password) **or** just let the phone
do it — `/api/sync` self‑unlocks the vault key from the master password you send. In the app's
setup screen enter the host address (e.g. `http://192.168.1.20:8788`) and your master password,
then **Connect & import**.

> `/api/sync` requires the master password on every call — that is the only credential. It is
> the human‑owner path (never an agent token).

## Build

Prereqs: Node, and Xcode (iOS) / Android Studio (Android).

```bash
cd mobile
npm install
npm run bundle:age        # (re)generate www/age.js from age-encryption; already vendored
npx cap init concealer org.concealer.mobile --web-dir www   # only if capacitor.config.json is missing
npm run add:ios           # or: npm run add:android
npm run sync
npm run open:ios          # build & run from Xcode / Android Studio
```

`www/age.js` is committed pre‑bundled so the app runs without a build step during development;
re‑run `npm run bundle:age` after bumping `age-encryption`.

## Not yet (deliberately deferred)

- Biometric unlock (Face ID / fingerprint) — the bundle is already master‑password encrypted at
  rest; add [`@capacitor/biometric`] later to gate the in‑memory unlock.
- Reveal/copy affordances, field‑level masking parity with the web UI.
- TR/EN localization (the web UI is bilingual; this app ships English first).
- Background/auto sync — sync is manual (tap **Sync**) for now.
