# Chrome Web Store listing — copy/paste content

Live: <https://chromewebstore.google.com/detail/concealer/hecffnhjbhldmdpcnpkpcffmodnemdcj>
Item ID: **hecffnhjbhldmdpcnpkpcffmodnemdcj** · Version: **0.9.17**

All assets live in `extension/store/` (regenerate with `python3 extension/store/gen.py` — needs
`rsvg-convert` + `magick`). Screenshots are 1280×800, 24-bit PNG, no alpha — as the store requires.

---

## Store listing (Mağaza girişi)

**Category:** Developer Tools
**Language:** English

**Description** (paste into Açıklama):

```
concealer is a companion toolbar UI for the concealer secret manager — The local-only secret manager for the AI-coding era. 
Open your vault and copy secret values from Chrome without ever typing `cer web`.

FEATURES
• One-click copy — click a secret to copy its value; the clipboard auto-clears after a few seconds.
• Per-field copy — multi-field secrets (database host/user/password, OAuth app key/secret/token…) expand into child rows. Copy or reveal exactly the field you need; non-secret fields show inline.
• On-demand — the local vault server starts only when you open the popup and shuts itself down when idle, so nothing lingers in the background.
• Auto-lock — a countdown locks the popup on its own short timer (configurable), independent of the server, and blinks when it's about to expire.
• Password generator — generate strong passwords / hex / base64url / UUID and copy them.
• Themes — Dark, White, and Matrix, matching the concealer web UI.
• Search — filter by name, tag, project, or environment.

PRIVACY
The extension talks ONLY to your own concealer server on 127.0.0.1 (localhost). 
No data is collected, and nothing is ever sent to a remote server. 
Secret values are never logged.

REQUIREMENTS (one-time)
1. Install concealer:  brew install fxerkan/tap/concealer  (macOS)
or:  scoop install fxerkan/concealer  (Windows)
2. Register the native helper:  cer chrome-extension
The extension shows this setup step until it's done.

Open source: https://github.com/fxerkan/concealer
```

**Homepage URL:** `https://github.com/fxerkan/concealer`
**Support URL:** `https://github.com/fxerkan/concealer/issues`

**Graphics:**

- Store icon 128×128: `extension/icons/icon128.png`
- Screenshots (add all three): `extension/store/screenshot-1-list.png`,
  `extension/store/screenshot-2-fields.png`, `extension/store/screenshot-3-matrix.png`
- Small promo tile 440×280 (optional): `extension/store/promo-440x280.png`
- Promo video (YouTube URL, Store listing → "Global promo video"): `https://youtu.be/HNTiNCzyjJw`
  (source: `video/` Remotion project, composition `Store-Promo`)

---

## Privacy tab (Gizlilik)

**Single purpose:**

```
A companion UI for the locally-installed concealer secret manager: browse your vault and copy
secret values from the Chrome toolbar. It communicates only with the user's own concealer server
running on localhost.
```

**Permission justifications:**

- **nativeMessaging** —
  `Starts and talks to the user's locally-installed concealer helper (native messaging host) so the local vault server can be launched on demand. No data leaves the machine.`
- **storage** —
  `Stores UI preferences (theme, clipboard-clear and auto-lock timeouts) in chrome.storage.local and a short-lived session token in chrome.storage.session. No secret values are stored; nothing is synced.`
- **clipboardWrite** —
  `Copies the secret value the user selects to the clipboard, then clears it after a timeout.`
- **tabs** —
  `Finds the open tab whose domain matches a sign-in request the user approved, so the login form on that tab can be filled, and focuses an already-open vault tab instead of opening duplicates. Tab URLs are only compared locally and never sent anywhere.`
- **alarms** —
  `A periodic backstop timer that checks the local concealer server for pending sign-in requests while the background worker sleeps.`
- **notifications** —
  `Shows a browser notification when a sign-in request is waiting for the user's approval.`
- **contextMenus** —
  `Adds two right-click items: "Fill with concealer" opens the list of saved logins for the page, and "Save sign-in to concealer" offers to save what the user typed into the page's login form. Nothing is read from the page until the user picks one.`
- **Host permission `http://127.0.0.1:8787/*`, `http://localhost:8787/*`, `http://concealer.localhost:8787/*`** —
  `Communicates only with the user's own concealer server running locally. No remote hosts are contacted.`
- **Optional host permission `http://127.0.0.1/*`** (requested only when the user changes ⚙ → App port) —
  `Lets the extension talk to the user's own concealer running on a different local port (for example a development copy). Requested at that moment, never at install; no remote hosts are contacted.`
- **Content script on `http://*/*`, `https://*/*`** —
  `Fills a login form on the current page only after the user approved that exact sign-in in the extension, and shows the approval banner on that page. It reads nothing from pages otherwise and sends no page data anywhere.`
- **Remotely hosted code:** No.

**Data usage disclosures** — tick **Authentication information** (the user's own credentials are filled into the page they approved; never transmitted off-device), then check:

- Does NOT collect or use data for purposes unrelated to the single purpose.
- Does NOT sell or transfer user data to third parties.
- Does NOT use or transfer data for creditworthiness / lending.
- I certify the above and comply with the Developer Program Policies.

**Privacy policy URL:** `https://github.com/fxerkan/concealer/blob/main/PRIVACY.md`

---

## Test instructions for reviewers (Test talimatları)

```
This extension is a UI for the open-source concealer secret manager (github.com/fxerkan/concealer);
it needs concealer installed locally because it talks only to a localhost vault server — it has no
remote backend.

To test:
1. Install concealer:  brew install fxerkan/tap/concealer   (macOS/Linux with Homebrew)
2. Create a throwaway vault:
     CONCEALER_HOME=/tmp/tv sh -c 'printf "pw\npw\n" | cer init'
     export CONCEALER_TOKEN=…            # printed by init
     CONCEALER_HOME=/tmp/tv cer set --name TEST_KEY --project demo --env prod sk-DUMMY-123
3. Register the native helper:  CONCEALER_HOME=/tmp/tv cer chrome-extension
4. Click the concealer toolbar icon → it starts the local server → unlock with master password "pw"
   → the secret list appears → click a row to copy its value.

If you cannot install local software during review, please contact us at
github.com/fxerkan/concealer/issues and we will provide a demo recording. The extension performs
no network requests except to 127.0.0.1 (the user's own machine).
```

---

## After publishing

The store item ID (`hecffnhjbhldmdpcnpkpcffmodnemdcj`) is already wired into `concealer`
(`_EXT_STORE_ID`), so `cer chrome-extension` trusts the published build. CI publishing of future
versions: `.github/workflows/publish-extension.yml` (see its header for the required secrets).
