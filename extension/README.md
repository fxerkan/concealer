# concealer — Chrome extension

Open your vault and **one-click-copy a secret value** from the Chrome toolbar, without typing
`cer web`. The popup starts `concealer web` **on demand** and the server **shuts itself down
after 15 min idle**, so nothing lingers in the background.

```
┌──────────────────────────────────────────┐
│ ▤ concealer   auto-lock 04:55  🎲 🌐 ⚙ 🔒 │
│ ┌────────────────────────────────────────┐│
│ │ Search… (name / tag / project)         ││
│ ├────────────────────────────────────────┤│
│ │ DROPBOX_APP        Dropbox-Syncer/prod ▾││ ← multi-field: expands
│ │   DROPBOX_APP_KEY      ••••••••    👁 ⧉ ││    (per-field copy + reveal)
│ │   DROPBOX_APP_SECRET   ••••••••    👁 ⧉ ││
│ │ AWS_PROD_KEY          menuman/prod    ⧉ ││ ← single field: one-click copy
│ └────────────────────────────────────────┘│
└──────────────────────────────────────────┘
```

Features: per-field copy (secret + non-secret) with reveal • auto-lock countdown that locks when
the server's idle-lock expires • 🎲 password/token generator • ⚙ settings (clipboard auto-clear) •
🌐 / brand name open the full web UI • clipboard auto-clears after N seconds.

## Install (one time)

Needs `python3` and the `concealer` script (this repo). Then:

```bash
python3 extension/install.py                 # auto-detects ./concealer
# or point at a specific script / a CONCEALER_HOME:
python3 extension/install.py /path/to/concealer
CONCEALER_HOME=/path/to/vault python3 extension/install.py
```

Then load the extension:

1. `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → pick this `extension/` folder
3. Confirm the ID is `bkogcelhpcfdfceaoickckmikhglgpae`
4. Restart Chrome, click the concealer toolbar icon

Works the same in Chromium / Brave / Edge (the installer registers all that are present).
Windows: run the same `install.py` (it writes the registry keys + a `.bat` launcher).

Uninstall: `python3 extension/install.py --uninstall`.

## How it works

- **Popup → native host** (`nativehost/concealer_host.py`): on open, if nothing is listening on
  `127.0.0.1:8787` the host launches `concealer web 8787` detached (`CONCEALER_NO_OPEN=1`,
  `CONCEALER_WEB_IDLE_EXIT=900`), waits for it, and replies. Chrome gives native hosts a bare
  environment, so `install.py` pins the exact `python`, `concealer` path, and optional
  `CONCEALER_HOME` into `nativehost/config.json`.
- **Popup → web API**: unlock with the master password, then list/reveal over `/api/*`. The
  extension is a cross-origin client, so the SPA's HttpOnly cookie can't ride its fetches — it
  holds the token itself and sends `X-Concealer-Token` (server change in `concealer`).
- **Copy** grabs the record's primary secret field (first field flagged secret, else the first),
  writes it to the clipboard, and wipes the clipboard after 20 s. Values are never logged.

## Notes / limits

- Port is hardcoded to concealer's default **8787** (`popup.js` `PORT`, `manifest.json`
  `host_permissions`). Change both if you run the web UI on another port.
- `config.json`, `run_host.*`, and the copied host manifest are machine-specific and git-ignored.
- The idle self-exit only frees the *process*; the vault is already locked (keys dropped) by
  the server's own idle-lock well before that.
