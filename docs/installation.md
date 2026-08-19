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

## Requirements

| Dependency | Why | Notes |
|---|---|---|
| **Python 3** | concealer is a single stdlib-only script | No `pip install` needed |
| **[sops](https://github.com/getsops/sops)** | encrypt/decrypt the vault | |
| **[age](https://github.com/FiloSottile/age)** | encryption backend + `age-keygen` | |
| **expect** | drives age's passphrase prompt (age reads `/dev/tty`, not stdin) | ships with macOS and most Linux |

concealer runs a **preflight check** on every command and exits with an install hint if any of `sops`, `age`, `age-keygen`, or `expect` are missing.

---

## Homebrew (recommended)

```bash
brew install fxerkan/tap/concealer
```

This pulls in `sops`, `age`, and `expect` automatically.

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
