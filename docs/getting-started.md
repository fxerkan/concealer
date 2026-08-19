---
title: Getting Started
layout: default
nav_order: 2
---

# Getting Started
{: .no_toc }

Install concealer, create your vault, store your first secret, and use it — in about five minutes.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

## 1. Install

```bash
# Homebrew (recommended) — pulls in sops, age and expect automatically
brew install fxerkan/tap/concealer
```

Or run the single script directly (needs `python3`, `sops`, `age`, `expect` on PATH). See [Installation]({{ site.baseurl }}/installation) for the manual route and dependency details.

Verify:

```bash
concealer version        # concealer 0.8.0
cer version              # `cer` is the short alias for `concealer`
```

---

## 2. Initialize the vault

```bash
concealer init
```

`init` generates the age key, asks you to set a **master password**, then prints, **once**:

- **8 one-time recovery codes** — store these *elsewhere* (password manager, paper). Any one recovers the vault if you forget the master password.
- A starter `export CONCEALER_TOKEN=…` line — a time-limited CLI token so you don't re-type the password every command.

After `init` the plaintext age key is removed from disk — only encrypted, password-wrapped copies remain (**key-at-rest**). Copying the vault folder gets an attacker nothing without your password or a recovery code.

{: .warning }
> The master password and recovery codes are shown **once** and never stored in plaintext. If you lose all of them, the vault is unrecoverable — that is the point.

---

## 3. Unlock your shell session

CLI commands that touch secrets need an unlock token in your environment. Either paste the line `init` printed, or mint a fresh one:

```bash
eval "$(concealer unlock)"     # asks the master password, exports CONCEALER_TOKEN (~8h TTL)
```

The token value lives **only** in your shell environment (`CONCEALER_TOKEN`). The vault stores just its hash. See [Tokens & Recovery]({{ site.baseurl }}/tokens-recovery).

---

## 4. Store your first secret

```bash
# a simple API key (type defaults to api_key)
concealer set --name OPENAI_API_KEY --project web --env prod 'sk-DUMMY-123' --tags ai

# a typed database secret (fields as key=value pairs)
concealer set --name MAIN_DB --type database --tenant acme --project billing --env prod \
    host=db.acme.io port=5432 database=billing username=svc password=sk-DUMMY-pw auth_type=password
```

Every secret carries a **scope** — `tenant / project / environment / repo`. Empty dimensions act as wildcards. See [Concepts → Scopes]({{ site.baseurl }}/concepts#scopes--inheritance).

---

## 5. Find, read, use

```bash
concealer list --type database --tenant acme      # masked table
concealer search OPENAI                            # search all fields
concealer get --name OPENAI_API_KEY --project web --env prod   # print the value (audited)

# inject secrets into a command's environment and run it — no value leaks to the terminal
concealer run --project web --env prod npm run deploy
```

`run` auto-detects `repo` and `project` from the current git repo when you omit them, then injects the most-specific matching secrets as environment variables.

---

## 6. Open the Web UI

```bash
concealer web        # http://127.0.0.1:8787 (localhost only) — unlock with the master password
```

Full CRUD with type-aware forms, searchable multi-select filters, per-secret deploy renderers, clipboard copy with auto-clear, and a tamper-evident audit-log viewer. See [Web UI]({{ site.baseurl }}/web-ui).

---

## 7. Let an AI agent use secrets (without seeing them)

```bash
concealer agent register claude          # prints a CONCEALER_TOKEN for this agent
claude mcp add --scope user concealer \
  --env CONCEALER_TOKEN=<token-from-above> \
  -- /path/to/concealer/concealer mcp
```

The agent can now `list_secrets`, `search_secrets`, `run_with_secrets`, and `set_secret` over MCP — but plaintext values are **redacted** from everything it sees. See [MCP]({{ site.baseurl }}/mcp).

---

## Next steps

- [CLI Reference]({{ site.baseurl }}/cli-reference) — every command and flag
- [Security Model]({{ site.baseurl }}/security) — what protects what, and the honest ceilings
- [Portability & Backup]({{ site.baseurl }}/portability) — move to another machine safely
