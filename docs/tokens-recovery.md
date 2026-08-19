---
title: Tokens & Recovery
layout: default
nav_order: 9
---

# Tokens, Unlock & Recovery
{: .no_toc }

How you unlock the vault without re-typing the master password every command, and how you get back in if you forget it.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

## Unlock tokens

Rather than prompting for the master password on every operation, concealer uses **revocable tokens**. The token value lives **only** in your environment (`CONCEALER_TOKEN`); the vault stores just its scrypt hash plus a token-wrapped copy of the age key. Revoke the token and that copy is dead.

### Human unlock (TTL token)

```bash
eval "$(concealer unlock)"      # master password → CONCEALER_TOKEN (~8h) in your shell
```

`unlock` prints an `export CONCEALER_TOKEN=…` line; `eval "$(...)"` loads it into the current shell. After it expires, run `unlock` again.

### Agent token (long-lived, revocable)

```bash
concealer agent register claude     # master password → non-expiring, revocable token for MCP
concealer agent list                # label · source · expiry/revoked · created
concealer agent revoke claude       # revoke one (or `all`)
```

Agent tokens are for the MCP server's environment so agents never see a password. See [MCP]({{ site.baseurl }}/mcp).

{: .note }
> Tokens are **per-machine on purpose**. A copied vault folder is inert until someone types the master password on the new machine and mints a fresh token.

---

## Recovery codes

`concealer init` prints **8 one-time recovery codes**, shown **once**. Only their scrypt hash and a code-wrapped copy of the age key are stored — the codes themselves are never persisted in plaintext.

Any one code:

- **recovers the vault** if you forget the master password, and
- is **required as a second factor** by `passwd` (consumed on use).

Store them somewhere separate from the machine (a password manager, printed paper). Regenerate the whole set with:

```bash
concealer recovery      # needs the current master password; old codes stop working
```

---

## Change the master password

```bash
concealer passwd
```

Asks for the **current password** *and* a **recovery code** (consumed). Requiring a code means whoever learns your master password still can't take the vault over without one of the codes you stored elsewhere. Out of codes? Run `concealer recovery` first.

---

## Forgot the master password?

```bash
concealer recover
```

Asks for a recovery code, restores access, and sets a new master password.

---

## Harden an old vault

Vaults created before key-at-rest keep a `0600 keys/age-key.txt` on disk. Migrate them so the plaintext key is removed:

```bash
concealer harden       # removes the plaintext age key, prints a fresh CLI token
```

After hardening, the age key exists on disk only in password-, recovery-code-, and token-wrapped forms. See [Concepts → Key-at-rest]({{ site.baseurl }}/concepts#key-at-rest).

---

## Quick map

| I want to… | Command |
|---|---|
| Unlock my shell for a while | `eval "$(concealer unlock)"` |
| Give an agent access | `concealer agent register <name>` |
| See / revoke tokens | `concealer agent list` · `concealer agent revoke <name\|all>` |
| Change my password | `concealer passwd` (needs a recovery code) |
| I forgot my password | `concealer recover` |
| Get new recovery codes | `concealer recovery` |
| Remove a legacy plaintext key | `concealer harden` |
