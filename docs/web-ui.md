---
title: Web UI
layout: default
nav_order: 7
has_children: true
---

# Web UI
{: .no_toc }

A professional single-page app served locally by concealer itself — full CRUD, filtering, per-secret deploy, and a tamper-evident audit viewer.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

## Launch

```bash
concealer web            # http://127.0.0.1:8787 (default port)
concealer web 8080       # custom port
```

Binds to `127.0.0.1` **only** — it is a single-user local convenience, not a hardened multi-user server. Unlock in the browser with the master password.

![concealer Web UI — searchable, scoped secrets]({{ site.baseurl }}/assets/app-secrets.png)

---

## Features

- **TR / EN** interface toggle (top-right) — the whole UI is bilingual.
- Full **CRUD** with type-aware forms · responsive (phone/tablet) layout.
- Search + **searchable, multi-select** filters for type / tenant / project / environment / repo / **tags**.
- **Sortable, reorderable columns** — including any custom field (`web_url`, `host`, …) as its own column.
- **Per-secret Deploy** — render the exact CLI/manifest to push a secret to `export` / `docker` / `k8s` / `aws-secrets` / `aws-ssm` / `github` / …
- **Copy to clipboard with auto-clear** (20s) · password **show/hide** toggle.
- Metadata: url, tags, notes.
- **Auto-lock on idle** (default 300s; set with `CONCEALER_IDLE=…` or the Settings page).
- **Audit Log viewer** — filter by action / source / key / date, pagination, row detail, **chain verification**, CSV/JSON export.
- **[Risks]({{ site.baseurl }}/risks)** — health overview (rotation / expiry / reuse), reused-value blast radius, shell-history scan, and opt-in **Exposure** checks (HIBP Pwned Passwords, email breach, git-history scan).
- **[Policy]({{ site.baseurl }}/policy)** — user-defined rotation / expiry / reuse / naming / tagging rules with violation lists, bulk-fix, and notifications; also hosts the per-agent MCP access limits.
- **Scan folder** — sweep a directory, **shell history**, or **live environment / shell-profile variables** (`scan --envvars`) for stray secrets and import them, tagged by origin, with a server-side folder browser and OS-native picker.
- **Settings** — idle timeout, which operations require confirmation, and your **HIBP API key**. (Per-agent MCP rate limits moved to [Policy]({{ site.baseurl }}/policy).)

---

![Audit log viewer with chain verification]({{ site.baseurl }}/assets/app-audit-logs.png)

The **[Risks]({{ site.baseurl }}/risks)** tab surfaces stale, reused, and exposed secrets; the **[Policy]({{ site.baseurl }}/policy)** tab enforces your own rules. **Scan folder** sweeps a directory, shell history, or environment variables for stray secrets and imports them, tagged by origin:

![Scan a folder or shell history for leaked secrets]({{ site.baseurl }}/assets/app-scan-folder.png)

---

## Session & locking

- Unlock decrypts the age key into **memory for that session only** (`_SESS_KEY`) — no age/tty prompt in the request path, no plaintext key on disk.
- The session has a **hard idle auto-lock**: after `idle` seconds of inactivity, the session and the in-memory key references are dropped (followed by `gc.collect()`). Activity does **not** extend the TTL — it's a fixed-lifetime lock. Note: this drops references and reclaims copies but does **not** zeroize memory — CPython cannot overwrite freed `str`/`bytes`, so plaintext may persist in the heap/swap until overwritten. See [Security → Web UI scope]({{ site.baseurl }}/security#web-ui-scope).
- **Lock** immediately from the UI, or it happens automatically on idle.

---

## JSON API (overview)

The SPA talks to a small JSON API on the same port. Selected endpoints:

| Method & path | Purpose |
|---|---|
| `POST /api/unlock` | unlock with `{pw}`; sets an `HttpOnly` session cookie |
| `POST /api/lock` | clear the session and in-memory key |
| `GET /api/session` | unlock state, idle timeout, remaining seconds |
| `GET /api/types` | type → field schema map |
| `GET /api/secrets` | list (masked) with scope/tag/type/query filters |
| `GET /api/secret/<id>?reveal=1` | fetch one record; `reveal=1` reveals + audits |
| `POST /api/secrets` | create a record |
| `GET /api/audit` | paginated, filterable audit rows |
| `GET /api/audit/verify` | chain + tail-anchor integrity check |
| `GET /api/audit/export?format=csv\|json` | download the audit log |
| `GET/POST /api/settings` | idle, confirm-ops, MCP limits, registered agents (POST needs master pw) |
| `GET /api/health` | rotation / expiry / reuse health overview |
| `GET /api/leaks` | reused-value risk report |
| `GET /api/history` | shell-history secret scan |
| `POST /api/exposure` · `POST /api/breach` | online leak check (k-anonymity) · HIBP email breach |
| `POST /api/gitscan` · `POST /api/gitremedy` | git / log / .gitignore scan · cleanup guide |
| `GET/POST /api/policies` · `DELETE /api/policies/<id>` | policy rules CRUD |
| `POST /api/scan` | dry-run folder scan (returns masked candidates) |
| `GET /api/backup` | auto-backup status (never returns the password) |
| `GET /api/browse` · `GET /api/pickdir` | server-side folder browser / OS-native picker |
| `POST /api/copy` | record a clipboard copy in the audit log |

All non-public endpoints require a valid unlocked session cookie or return `401 locked`.

{: .note }
> The web UI is the **human owner's** interface — unlocked by the master password, so it is not subject to the per-agent anti-exfiltration rate limits that apply to MCP.
