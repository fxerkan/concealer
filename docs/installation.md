---
title: Installation
layout: default
nav_order: 3
---

# Installation
{: .no_toc }

1. TOC
{:toc}

---

## Quick install

<div class="cer-tabs">
<div class="cer-tabbar">
<button class="cer-tab is-active" data-tab="mac">🍎 macOS / Linux</button>
<button class="cer-tab" data-tab="win">🪟 Windows</button>
<button class="cer-tab" data-tab="ext">🧩 Chrome Extension</button>
</div>
<div class="cer-panel is-active" data-panel="mac" markdown="1">
Homebrew pulls in `sops`, `age`, and `expect` automatically:

```bash
brew install fxerkan/tap/concealer
concealer init
```
</div>
<div class="cer-panel" data-panel="win" markdown="1">
Scoop pulls in Python + `sops` + `age`:

```powershell
scoop bucket add fxerkan https://github.com/fxerkan/scoop-bucket
scoop install concealer
concealer init
```

See the [Windows guide]({{ site.baseurl }}/WINDOWS) for details.
</div>
<div class="cer-panel" data-panel="ext" markdown="1">
Browse your vault and copy secrets from the Chrome toolbar. Install concealer (macOS/Linux or
Windows tab), then run the one-time setup:

```bash
cer chrome-extension
```

Full guide → [Chrome Extension]({{ site.baseurl }}/chrome-extension).
</div>
</div>

---

## Requirements

| Dependency | Why | Notes |
|---|---|---|
| **Python 3** | concealer is a single stdlib-only script | No `pip install` needed |
| **[sops](https://github.com/getsops/sops)** | encrypt/decrypt the vault | |
| **[age](https://github.com/FiloSottile/age)** | encryption backend + `age-keygen` | |
| **expect** | drives age's passphrase prompt (age reads `/dev/tty`, not stdin) | **macOS/Linux only** — on Windows this role is filled by `pywinpty` (a pip dep) |

concealer runs a **preflight check** on every command and exits with an install hint if any of `sops`, `age`, `age-keygen`, or `expect` (Windows: `pywinpty`) are missing.

**Platforms:** macOS, Linux, and **Windows** (native — see the [Windows guide]({{ site.baseurl }}/WINDOWS)). All four interfaces (CLI · Web · MCP · TUI) are verified on each in CI.

---

## Homebrew (recommended, macOS/Linux)

```bash
brew install fxerkan/tap/concealer
```

This pulls in `sops`, `age`, and `expect` automatically.

---

## pipx (all platforms, incl. Windows)

```bash
pipx install concealer            # concealer itself (+ pywinpty/windows-curses on Windows)
scoop install sops age            # the binaries it wraps (Windows); brew/apt elsewhere
```

`sops`/`age` are external binaries and are **not** pip packages — install them with
your OS package manager.

## Scoop (Windows)

concealer has its own Scoop bucket:

```powershell
scoop bucket add fxerkan https://github.com/fxerkan/scoop-bucket
scoop install concealer          # pulls in python + sops + age
```

See the [Windows guide]({{ site.baseurl }}/WINDOWS) for environment variables and the
security caveats.

---

## Manual (single script)

```bash
# prerequisites
brew install sops age            # macOS (or your OS package manager); expect ships with macOS

# get concealer
git clone https://github.com/fxerkan/concealer.git
cd concealer

# optional: put it on PATH with the short `cer` alias
ln -sf "$PWD/concealer" ~/bin/concealer
ln -sf "$PWD/concealer" ~/bin/cer
```

The script is dependency-free Python — no virtualenv, no packages. `cer` is a symlink to `concealer`; every command works under either name.

---

## First-time setup

```bash
concealer init          # generate keys + set master password
```

`init` prints **8 one-time recovery codes** and a starter `export CONCEALER_TOKEN=…` line, then removes the plaintext age key from disk. Save the recovery codes elsewhere. See [Getting Started]({{ site.baseurl }}/getting-started) for the full flow.

Use `concealer init --force` to reinitialize over an existing vault (destructive — only on a throwaway/test vault).

---

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `CONCEALER_HOME` | vault directory | `~/.concealer`; in a repo checkout, the folder next to the script |
| `CONCEALER_TOKEN` | CLI/MCP unlock token (produced by `init` / `unlock` / `agent register`) | — |
| `CONCEALER_IDLE` | web session idle auto-lock timeout, in seconds | `300` |
| `CONCEALER_ACTOR` | fallback actor label recorded in the audit log | — |

### Isolated test vault

Never test against your real vault. Point `CONCEALER_HOME` at a throwaway directory:

```bash
CONCEALER_HOME=/tmp/testvault concealer init
CONCEALER_HOME=/tmp/testvault concealer web 8799
```

---

## Vault files (what lives in `CONCEALER_HOME`)

```
secrets.enc.yaml        # the vault — SOPS+age encrypted JSON (stored as YAML)
.sops.yaml              # SOPS config (recipient / rules)
keys/
  age-key.txt.age       # age private key, master-password wrapped — the ONLY key at rest
  master.json           # scrypt verifier for the master password (UI)
  recovery.json         # recovery-code hashes + code-wrapped key
  agents.json           # unlock-token hashes + token-wrapped key
  audit.log             # HMAC-chained audit log (+ monotonic seq)
  audit.head            # tail anchor (catches truncation)
  ratestate.json        # per-agent anti-exfiltration rate state (names+timestamps only)
  backup.json           # auto-backup settings (age-wrapped backup password)
```

{: .warning }
> **Nothing** in `keys/`, `secrets.enc.yaml`, or `.sops.yaml` should ever be committed to a public repo. The project's `.gitignore` protects these. This repo ships the *tool*, never a vault.
