# concealer — Chrome extension

Open your vault and **copy secret values** from the Chrome toolbar, without typing `cer web`.
The popup starts `concealer web` **on demand** via concealer's built-in native-messaging host and
the server **self-exits after 15 min idle**, so nothing lingers.

```
┌──────────────────────────────────────────────┐
│ concealer   🔒 auto-lock 04:55 │ 🎲 🌐 ⚙️     │
│ ┌──────────────────────────────────────────┐ │
│ │ Search… (name / tag / project)           │ │
│ ├──────────────────────────────────────────┤ │
│ │ DROPBOX_APP          Dropbox-Syncer/prod ▾│ │ ← multi-field: expands
│ │   DROPBOX_APP_KEY        ••••••••   👁 📋 │ │    (per-field copy + reveal)
│ │   DROPBOX_APP_SECRET     ••••••••   👁 📋 │ │
│ │ AWS_PROD_KEY            menuman/prod    📋 │ │ ← single field: one-click copy
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

Features: per-field copy (secret + non-secret) with auto-hiding reveal • auto-lock countdown
(extension idle, shorter than the server; blinks red near the end) • 🎲 password/token generator •
⚙️ settings (theme Dark/White/Matrix, clipboard auto-clear, extension auto-lock, reveal auto-hide) •
🌐 / brand name open the full web UI. Generate / Web UI / Settings work even while locked.

## Install

**1. Install the extension**
- From the [Chrome Web Store](https://chromewebstore.google.com/detail/concealer/hecffnhjbhldmdpcnpkpcffmodnemdcj) (recommended), or
- Unpacked: `chrome://extensions` → Developer mode → **Load unpacked** → this `extension/` folder.

**2. One-time OS setup** (registers the native helper; needs concealer installed):

```bash
cer chrome-extension          # or: ./concealer chrome-extension
```

That's it — click the toolbar icon. If concealer isn't installed yet:
`brew install fxerkan/tap/concealer` (macOS) / `scoop install fxerkan/concealer` (Windows).

The extension shows this setup step automatically until the host is registered.
Uninstall the host: `cer chrome-extension --uninstall`.

## Developer builds

An unpacked build has a different extension ID than the Web Store version. Authorize it for the
native host with the command shown in **Settings → Developer**:

```bash
cer chrome-extension --add-id <extension-id>     # Settings shows this build's exact ID
cer chrome-extension --list                      # show authorized IDs
```

## Publishing (Chrome Web Store)

```bash
python3 extension/build.py     # → dist/concealer-extension-<version>.zip (self-signed key stripped)
```

The extension is **live**: <https://chromewebstore.google.com/detail/concealer/hecffnhjbhldmdpcnpkpcffmodnemdcj>.
Its ID (`hecffnhjbhldmdpcnpkpcffmodnemdcj`) is already wired into `concealer` (`_EXT_STORE_ID`), so the
native host trusts the published build. Version updates publish automatically via
`.github/workflows/publish-extension.yml` (dispatched by `release.yml`) — or upload the zip by hand
at <https://chrome.google.com/webstore/devconsole>.

## How it works

- **Popup → `concealer native-host`** (built into concealer, registered by `cer chrome-extension`):
  on open, if nothing is listening on `127.0.0.1:8787` it launches `concealer web 8787` detached
  (`CONCEALER_NO_OPEN=1`, `CONCEALER_WEB_IDLE_EXIT=900`) and replies. The launcher pins the
  install-time `PATH` (so sops/age resolve under Chrome's minimal env) and `CONCEALER_HOME`.
- **Popup → web API**: unlock with the master password, then list/reveal over `/api/*`. The
  extension is cross-origin, so it sends its token as `X-Concealer-Token` (the SPA's HttpOnly
  cookie can't ride its fetches). Values are never logged; the clipboard auto-clears.
