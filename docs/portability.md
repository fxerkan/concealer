---
title: Portability & Backup
layout: default
nav_order: 11
---

# Portability & Backup
{: .no_toc }

The vault is bound to a **password** (or a recovery code), not to this machine's hardware. Move it anywhere.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

## Move to another machine

Copy these from `CONCEALER_HOME`:

```
secrets.enc.yaml
.sops.yaml
keys/age-key.txt.age      # master-password-wrapped age key
keys/master.json          # scrypt verifier
keys/recovery.json        # recovery-code wraps
keys/agents.json          # token wraps (optional)
keys/audit.log            # audit history (optional)
keys/audit.head           # tail anchor (optional)
```

**Do not** copy any `CONCEALER_TOKEN` — tokens are per-machine on purpose. On the new machine:

```bash
eval "$(concealer unlock)"     # asks the master password, mints a fresh token here
concealer list                 # works — machine-independent
```

A copied folder is **inert** until someone types the master password (or a recovery code). That's the security property: portability without machine-binding, and no plaintext key travels with the files.

---

## Encrypted export / import bundles

For a single portable, password-protected file:

```bash
concealer export                     # writes concealer-export-YYYY-MM-DD.age (prompts master pw)
concealer export mybundle.age        # custom filename

concealer import mybundle.age        # prompts the bundle password; reports +new / ~updated
```

`import` also restores `.cerbak` backups (older `.cer` files still restore — import is extension-agnostic). Pick how existing records are handled with `--mode=overwrite|skip|duplicate` (default `overwrite`).

---

## Automated `.cerbak` backups (cron / launchd)

Configure a backup password and directory in the web **Settings** (the password is stored age-wrapped, never in plaintext), then run:

```bash
concealer backup                 # writes a .cerbak to the configured directory
concealer backup --dir /path     # override and persist the directory
```

Key access comes from `CONCEALER_TOKEN` (or a TTY master-password prompt), so it works unattended when a token is present. Schedule it with cron or a launchd agent. The web UI's auto-backup can also fire on unlock when the configured interval has elapsed.

---

## Restore

```bash
concealer import backup-file.cerbak     # prompts the backup password
```

---

## Rule of thumb

| You have… | You can restore the vault |
|---|---|
| The files **and** the master password | ✅ yes — `unlock` on any machine |
| The files **and** a recovery code | ✅ yes — `recover`, then set a new password |
| The files **only** | ❌ no — inert without a password or code |
| A `CONCEALER_TOKEN` from another machine | ❌ no — tokens don't transfer |
