---
title: Concepts
layout: default
nav_order: 4
---

# Concepts
{: .no_toc }

The mental model behind concealer: how the vault is stored, how scopes resolve, how the key is protected, and how the audit log stays tamper-evident.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

## The vault

The vault is **one encrypted JSON document** (stored as YAML by SOPS) at `secrets.enc.yaml`. Its shape:

```json
{ "secrets": [ { "id": "...", "name": "...", "type": "...",
                 "tenant": "", "project": "", "environment": "", "repo": "",
                 "tags": [], "url": "", "notes": "",
                 "fields": { "...": "..." },
                 "created": "...", "updated": "..." } ] }
```

Every operation is **load → decrypt to a dict → mutate → save → re-encrypt**. concealer shells out to `sops` for both directions; the age key is handed to `sops` **in memory** (`SOPS_AGE_KEY`), never via a temp file.

A record is normalized on load (`norm()`) so old/legacy records are upgraded transparently.

---

## Scopes & inheritance

Every secret carries four **scope dimensions**:

```
tenant / project / environment / repo
```

- An **empty** dimension is a **wildcard** (a default that applies broadly).
- On `run` / `run_with_secrets`, the **most-specific match wins**:
  `acme/proj-a/prod` overrides `proj-a` overrides `global`.
- Unspecified dimensions on `run` are **auto-detected** from the current git repo (`repo` and `project`).

This is what lets the same logical secret name (say `DATABASE_URL`) exist for many projects and environments without collision — you disambiguate by scope, not by mangling the name.

### CLI flags for scope

| Flag | Dimension |
|---|---|
| `--tenant` | tenant |
| `--project` | project |
| `--env` | environment |
| `--repo` | repo |

Most commands accept any subset of these plus `--name` and `--type`.

---

## Secret types & masking

Each secret has a **type** that defines a type-aware form — you only enter the fields that make sense for it. Fields marked `secret` (password / token / value / private_key / …) are **stored masked** and revealed only on demand (and that reveal is audited).

Masking is **record-aware**, resolved in this order:

1. **Per-field override** — `field_meta[field] = {secret: bool, mask: "partial"|"full"}`. Overrides may only *add* masking by default; a field renders plain only if you explicitly set `secret: false`.
2. **Type template** — the field's declared secrecy for its type.
3. **Name heuristic** — a field whose name matches `pass|secret|token|value|key|credential|apikey`.
4. **Value heuristic** — a value with embedded credentials (`scheme://user:pass@…`, e.g. a `jdbc_url` or DSN) is masked even in an otherwise "plain" field.

See [Secret Types]({{ site.baseurl }}/secret-types) for the full field catalog.

---

## Key-at-rest

The age **private key is never written to disk in plaintext** on a hardened vault. It exists only wrapped:

- by the **master password** → `keys/age-key.txt.age`
- by each **recovery code** → `keys/recovery.json`
- by each **unlock token** → `keys/agents.json`

At use time, `concealer` resolves the key text in this order and hands it to `sops` in memory:

1. in-process memory cache (`_KEY_CACHE`)
2. `CONCEALER_TOKEN` from the environment (via `keys/agents.json`)
3. legacy plaintext `keys/age-key.txt` if present (old vaults)
4. interactive master-password prompt on a TTY

Old vaults with a `0600 keys/age-key.txt` still work; run [`concealer harden`]({{ site.baseurl }}/cli-reference#harden) to migrate them to key-at-rest.

---

## Tokens

Humans and agents unlock via **revocable tokens** rather than repeatedly typing the password:

- **Human**: `concealer unlock` mints a **TTL** token (~8h) exported as `CONCEALER_TOKEN`.
- **Agent**: `concealer agent register <name>` mints a **long-lived, revocable** token for the MCP server's environment.

The token value lives **only** in the client environment. The vault stores only its scrypt hash + a token-wrapped copy of the age key. Revoke the token and that copy is dead. See [Tokens & Recovery]({{ site.baseurl }}/tokens-recovery).

---

## Recovery codes

`init` prints **8 one-time codes** (shown once; only their scrypt hash + a code-wrapped key are stored). Any one code:

- recovers the vault if you forget the master password (`concealer recover`), and
- is **required as a second factor** by `concealer passwd` (consumed), so a stolen master password alone can't rotate the key.

Regenerate the set with `concealer recovery`.

---

## Audit chain

Every access — CLI, Web, or MCP — appends a line to `keys/audit.log`:

- **HMAC-SHA256 chained** — each entry's hash depends on the previous one.
- **Monotonic `seq`** in the signed payload.
- **`keys/audit.head`** anchors the tail, so deleting/truncating the last lines is detectable.

`concealer audit verify` recomputes the chain and checks the anchor. Altering, deleting, reordering, or truncating entries breaks verification.

The audit log records **key names and actions, never values**.

{: .note }
> **Honest ceiling:** `keys/audit.key` is stored locally, so a filesystem-root attacker with full access could re-forge the chain. True immutability needs an off-machine key/anchor. This is documented, not hidden — see [Security Model]({{ site.baseurl }}/security).
