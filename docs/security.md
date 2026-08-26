---
title: Security Model
layout: default
nav_order: 10
---

# Security Model & Notes
{: .no_toc }

What protects what — and the honest ceilings, stated plainly.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

## Cryptography (delegated)

- **Encryption:** AES-256-GCM (via SOPS) over **age** X25519. concealer implements **none** of this — it delegates 100% to `sops`/`age`.
- **Key derivation** for the wrapped-key backups and the UI verifier: **scrypt / age-scrypt** (stdlib `hashlib.scrypt`).
- The only crypto concealer itself performs is the stdlib scrypt **master-password verifier** and the **HMAC audit chain**. No home-grown cipher, no home-grown KDF, no plaintext secret storage.

The design principle: *the laziest secure design is the one where you write the least security code.* SOPS and age are widely reviewed; reusing them means the security-critical parts are already vetted by the world.

---

## Key-at-rest

On a hardened vault the age private key is **never on disk in plaintext**. Only wrapped copies exist:

- master-password-wrapped (`keys/age-key.txt.age`),
- recovery-code-wrapped (`keys/recovery.json`),
- token-wrapped (`keys/agents.json`).

The key reaches `sops` **in memory** (`SOPS_AGE_KEY`), never a temp file. Old vaults with a `0600 keys/age-key.txt` still work; run `concealer harden` to migrate.

---

## Tokens

Unlock tokens are held **client-side** (`CONCEALER_TOKEN`). The vault stores only a scrypt hash + a token-wrapped key. Every token is **revocable** and supports expiry. Agents get their own token — no shared password. A copied vault folder is inert without the master password or a recovery code.

---

## Recovery codes as a second factor

Recovery codes wrap the key too: any one recovers the vault, and `passwd` **consumes** one as a second factor — so a stolen master password *alone* cannot rotate the key or take over the vault.

---

## Audit tamper-evidence

The audit log holds key **names and actions, not values**. It is tamper-evident via:

- an **HMAC-SHA256 chain** (each entry depends on the previous),
- a monotonic **`seq`** in the signed payload, and
- a **`keys/audit.head`** anchor that catches tail-truncation (deleting the last lines).

`concealer audit verify` recomputes the chain and checks the anchor.

{: .warning }
> **Honest ceiling:** `keys/audit.key` is stored locally, so a filesystem-root attacker with full access could re-forge the chain. True immutability needs an off-machine key/anchor. This limitation is documented in the code, not hidden.

---

## Web UI scope

The web server binds to `127.0.0.1` **only** and is **single-user**. Treat it as a local convenience, not a hardened multi-user server. The session decrypts the key into process memory (never to disk), and a hard idle auto-lock drops it after `idle` seconds.

{: .warning }
> **Honest ceiling — in-memory secrets are not zeroized.** concealer is pure Python (CPython). When the session locks, it drops its references to the key and calls `gc.collect()`, but **CPython does not overwrite freed memory**. Python `str`/`bytes` are immutable, and the plaintext flows through several unavoidable copies — the decrypted vault from `sops`, `json.loads`, the age key handed to the `sops` child via the `SOPS_AGE_KEY` **environment variable** (readable via `/proc/<pid>/environ` by the same user on Linux), the master password from `getpass`. So plaintext key/secret bytes may **linger in the process heap, in swap, or in a core dump** until overwritten by chance. "Auto-lock clears it" means the reachable-copy window shrinks — it is **not** secure erasure. Treat process memory (and swap/core dumps) as a trust boundary: an attacker who can read the process's memory, its swap, or a core dump can recover secrets. This is a design limit of a stdlib-only tool, not a defect we can fully fix in Python.

---

## Anti-exfiltration (MCP)

Agents are gated: only **registered** agent tokens can call MCP tools, and `list`/`search`/`get` results pass through a per-agent **rate gate** (`per_call`, `window_quota`, `window_sec`) to prevent bulk dumping. `run_with_secrets` redacts values from output. See [MCP]({{ site.baseurl }}/mcp).

---

## What is never committed

`keys/`, `secrets.enc.yaml`, `secrets.enc.json`, and `.sops.yaml` are git-ignored and must stay that way. The concealer repo ships the **tool**, never a vault. Before any `git add`, confirm none of these are staged.

---

## No PII by design

There are deliberately **no** credit-card / passport / national-ID types. This vault is for machine and account credentials, not identity documents.

---

## Threat model summary

| Threat | Mitigation | Residual risk |
|---|---|---|
| Secret pasted into an AI chat | MCP injects without revealing; values redacted | Agent must be registered & rate-limited |
| Laptop stolen (disk copied) | Key-at-rest: wrapped key only, no plaintext | Master password strength |
| Master password leaked | `passwd` needs a recovery code as 2nd factor | Recovery codes must be stored separately |
| Vault committed by accident | `.gitignore` protects vault files | User discipline on `git add` |
| Audit log tampered | HMAC chain + seq + tail anchor | FS-root attacker can re-forge (local key) |
| Agent tries to dump everything | Registration gate + per-agent rate limits | Limits are tunable per agent |
