---
title: Chrome Extension
layout: default
nav_order: 7.2
---

# Chrome Extension
{: .no_toc }

Open your vault and copy secret values straight from the Chrome toolbar — without ever typing
`cer web`. The popup starts the local server on demand and locks itself when idle.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

## What it is

The concealer extension is a thin toolbar UI for your **local** vault. It talks only to a concealer
server on `127.0.0.1` (your own machine) — no cloud, no accounts, no telemetry. Click a secret to
copy its value; the clipboard auto-clears after a few seconds.

![concealer popup — secret list]({{ site.baseurl }}/assets/ext-list.png)

Multi-field secrets (a database's host/user/password, an OAuth app's key/secret/token…) expand into
child rows so you copy **exactly** the field you need — and reveal it first if you want to check it.

![concealer popup — per-field copy]({{ site.baseurl }}/assets/ext-fields.png)

---

## Install & set up

Two one-time steps: **(1)** add the extension to Chrome, then **(2)** register the native helper so
the popup can start your vault. Pick your platform:

<div class="cer-tabs">
<div class="cer-tabbar">
<button class="cer-tab is-active" data-tab="mac">🍎 macOS / Linux</button>
<button class="cer-tab" data-tab="win">🪟 Windows</button>
<button class="cer-tab" data-tab="ext">🧩 Chrome Extension</button>
</div>
<div class="cer-panel is-active" data-panel="mac" markdown="1">
**1. Install concealer** (if you don't have it yet):

```bash
brew install fxerkan/tap/concealer
```

**2. Register the native helper** (one-time OS setup):

```bash
cer chrome-extension
```

Then click the concealer toolbar icon. The extension shows this setup step until it's done.
Remove it later with `cer chrome-extension --uninstall`.
</div>
<div class="cer-panel" data-panel="win" markdown="1">
**1. Install concealer** (if you don't have it yet):

```powershell
scoop bucket add fxerkan https://github.com/fxerkan/scoop-bucket
scoop install concealer
```

**2. Register the native helper** (one-time OS setup):

```powershell
cer chrome-extension
```

This writes the native-host manifest and the `HKCU\…\NativeMessagingHosts` registry keys for
Chrome / Edge / Chromium. Then click the concealer toolbar icon.
See the [Windows guide]({{ site.baseurl }}/WINDOWS) for environment details.
</div>
<div class="cer-panel" data-panel="ext" markdown="1">
**From the Chrome Web Store** — _coming soon (pending review)._ Once live it installs like any
extension; you still run `cer chrome-extension` once (the store can't register a native host).

**Load unpacked (works today):**

1. `git clone https://github.com/fxerkan/concealer.git`
2. Open `chrome://extensions` → enable **Developer mode**
3. **Load unpacked** → select the `extension/` folder
4. Run the setup command for your OS (the other tabs), then click the toolbar icon.
</div>
</div>

{: .note }
> The native helper is **built into concealer** (`concealer native-host`) — there's no separate
> program to install. `cer chrome-extension` just registers it with your browser and pins the
> `PATH`/vault so Chrome's minimal launch environment can still find `sops`/`age`.

---

## Using it

- **Copy** — click a single-field secret to copy its value instantly. For multi-field secrets,
  click to expand, then use the 📋 button on the field you want. 👁 reveals a secret field
  (auto-hides again after a few seconds).
- **Search** — filter by name, tag, project, or environment.
- **Auto-lock** — a countdown in the header locks the popup on its own short timer (separate from,
  and never longer than, the server's), and blinks red as it runs out.
- **🎲 Generate** — strong passwords / hex / base64url / UUID, copy with one click.
- **🌐 / brand name** — open the full web UI in a tab.
- Generate, Web UI, and Settings all work **before** you unlock.

## Themes

Three built-in themes — **Dark**, **White**, **Matrix** — matching the web UI. Set them in
**Settings ⚙️** (persisted per browser).

![concealer popup — Matrix theme]({{ site.baseurl }}/assets/ext-matrix.png)

## Settings

Open **⚙️ Settings** for:

| Setting | Range | Default |
|---|---|---|
| Theme | Dark · White · Matrix | Dark |
| Clipboard auto-clear | 0–600 s | 20 s |
| Extension auto-lock | 10 s – server idle | 60 s |
| Reveal auto-hide | 5–30 s | 10 s |

It also shows the port, the server's auto-lock, whether the vault is hardened, and a **Developer**
row (see below).

---

## Developer builds

An unpacked build has a **different extension ID** than the Web Store version. Authorize it for the
native host with the command shown in **Settings → Developer** (it embeds this build's exact ID):

```bash
cer chrome-extension --add-id <extension-id>   # Settings shows the ID for you
cer chrome-extension --list                    # show all authorized IDs
```

---

## Privacy & security

- The extension talks **only** to `http://127.0.0.1:8787` (your machine). No remote requests, no
  data collection. See the [privacy policy](https://github.com/fxerkan/concealer/blob/main/PRIVACY.md).
- Secret values are never logged; the clipboard is wiped after your configured timeout.
- The token that authenticates the popup lives in `chrome.storage.session` (memory only, gone when
  the browser closes). It is sent as `X-Concealer-Token`; the web UI keeps its HttpOnly cookie.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Popup shows the **setup card** | Run `cer chrome-extension`, then reopen the popup. |
| "Native host not found" after setup | Fully quit and reopen Chrome (it caches host manifests at startup). |
| Wrong / empty secret list | The server is pointed at a different vault — re-run `cer chrome-extension` from the shell where your real `CONCEALER_HOME` is set (or with it unset for the default `~/.concealer`). |
| `cer web` says "address already in use" | The extension already started a server — it just opens that one. |

Uninstall the helper any time: `cer chrome-extension --uninstall`.
