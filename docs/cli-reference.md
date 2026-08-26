---
title: CLI Reference
layout: default
nav_order: 5
---

# CLI Reference
{: .no_toc }

Every command, with its parameters. `cer` is the short alias for `concealer` — both names work identically.
{: .fs-5 .fw-300 }

```
concealer <command> [options]          # short: cer <command>
```

Most commands accept a **scope**: `--tenant T  --project P  --env E  --repo R`. An omitted dimension is a wildcard.

1. TOC
{:toc}

---

## Common options

| Flag | Applies to | Meaning |
|---|---|---|
| `--tenant <T>` | most | tenant dimension |
| `--project <P>` | most | project dimension |
| `--env <E>` | most | environment dimension |
| `--repo <R>` | most | repo dimension |
| `--name <N>` | get/set/rm/rotate/list | secret name |
| `--type <T>` | list/set | secret type (see [types]({{ site.baseurl }}/secret-types)) |
| `--tag <X>` | list | filter by a single tag |
| `--tags a,b` | set | comma-separated tags to assign |

Scope flags select records by exact match on the given dimensions. Commands that mutate or read a single value (`get`, `rm`, `rotate`) require the scope to match **exactly one** record, or they abort with a "disambiguate" error.

---

# Vault & key management

## init

```bash
concealer init [--force]
```

Set up a new vault: generates the age key, asks you to set the master password, prints **8 one-time recovery codes** and a starter `CONCEALER_TOKEN`, then removes the plaintext age key from disk (key-at-rest).

| Option | Meaning |
|---|---|
| `--force` | reinitialize over an existing vault (destructive) |

## unlock

```bash
eval "$(concealer unlock)"
```

Mint a **time-limited** token for a human via the master password. Prints an `export CONCEALER_TOKEN=…` line (~8h TTL). Wrap in `eval "$(...)"` to load it into your current shell.

## harden

```bash
concealer harden
```

Migrate an old plaintext-key vault to key-at-rest: removes `keys/age-key.txt` (only the encrypted backup remains), tops up `.gitignore`, and prints a fresh CLI token. Prompts for the master password. No-op if already hardened.

## passwd

```bash
concealer passwd
```

Change the master password. Requires the **current password** *and* a **recovery code** (consumed as a second factor). A stolen master password alone can't rotate the key.

## recover

```bash
concealer recover
```

Forgot the master password? Prompts for a **recovery code**, restores access, and sets a new master password.

## recovery

```bash
concealer recovery
```

Regenerate the recovery-code set (needs the master password). Prints a fresh batch of 8 one-time codes; old codes stop working.

## agent

```bash
concealer agent register <name>
concealer agent list
concealer agent revoke <name|all>
```

Manage long-lived, revocable tokens for AI agents (MCP). See [Tokens & Recovery]({{ site.baseurl }}/tokens-recovery) and [MCP]({{ site.baseurl }}/mcp).

| Subcommand | Meaning |
|---|---|
| `register <name>` | prompts for the master password, mints a non-expiring revocable token, prints the `CONCEALER_TOKEN` env snippet for the MCP server |
| `list` | show tokens: label, source (`cli`/`agent`), expiry or `revoked`, created timestamp |
| `revoke <name>` | revoke one token by label; `all` revokes every token |

---

# Secrets

## set / add

```bash
concealer set --name N [--type T] [scope] [--tags a,b] <value | key=value ...>
```

Create or update a secret. `add` is an alias for `set`. If a record with the same name + scope exists, its fields are **merged/updated**; otherwise a new record is created.

| Argument | Meaning |
|---|---|
| `--name N` | **required** — secret name |
| `--type T` | secret type; default `api_key` |
| `--tags a,b` | comma-separated tags (replaces existing tags on update) |
| `<value>` | for a single-value type: the bare value → stored as field `value` |
| `key=value …` | for typed secrets: one or more `field=value` pairs |
| scope flags | `--tenant/--project/--env/--repo` |

Field names that look like a *leaked secret value* (matching the secret-name heuristic where they don't belong) are rejected with an error.

```bash
concealer set --name OPENAI_API_KEY --project web --env prod 'sk-DUMMY-123' --tags ai
concealer set --name pg --type database --project web \
    host=db.local port=5432 database=app username=app password=sk-DUMMY-pw
```

## get

```bash
concealer get --name N [scope]
```

Print the secret value(s). Must match **exactly one** record. For `api_key` it prints the bare value; for typed secrets it prints `field=value` lines. Reading counts against the agent access quota and is written to the audit log.

## list

```bash
concealer list [term] [scope] [--tag X] [--type T]
```

List matching records as a masked table (`name  type  tenant  project  env  repo  tags`). An optional bare `term` filters by substring across fields.

| Option | Meaning |
|---|---|
| `[term]` | optional free-text filter |
| `--tag X` | filter by a single tag |
| `--type T` | filter by type |
| scope flags | narrow by dimension |

## search

```bash
concealer search <term>
```

Search across **all fields** (name, scope, tags, url, notes) for `term`. Values remain masked.

## rm

```bash
concealer rm --name N [scope]
```

Delete a record. Must match **exactly one**.

## rotate

```bash
concealer rotate --name N [scope] [new-value]
```

Rotate the `value` of a matching secret. If you don't pass `new-value`, a cryptographically random 32-byte URL-safe token is generated. Must match exactly one; prints the new value **masked**.

## dims

```bash
concealer dims
```

Show the distinct scope values in use (all `tenant`, `project`, `environment`, `repo` values across the vault). Useful for discovering how you've scoped things.

## leaks

```bash
concealer leaks
```

Find **reused (shared) secret values** — the same plaintext value stored under multiple names/scopes — and score the blast radius (severity, count, affected projects & environments). Values are shown masked.

## history

```bash
concealer history [--purge]
```

Scan your **shell history** files for secrets left behind (with reasons). Dry-run by default.

| Option | Meaning |
|---|---|
| `--purge` | delete the offending lines (writes a `*.concealer.bak` backup first) |

After a purge, run `history -c` in open shells so the in-memory history isn't written back.

---

# Scan · deploy · run

## scan

```bash
concealer scan [<folder>] [--import] [--history] [--envvars] [scope]
```

Extract candidate secrets from a folder's `.env`/config files (and optionally shell history / environment variables), then optionally import them into the vault tagged by origin. Dry-run by default. `<folder>` is optional when `--history` or `--envvars` is given.

| Option | Meaning |
|---|---|
| `<folder>` | directory to sweep (optional if `--history`/`--envvars` set) |
| `--import` | actually import the candidates (default is dry-run) |
| `--history` | also scan shell history |
| `--envvars` | also scan the live environment + shell-profile files (`~/.bashrc`, `~/.zshrc`, `/etc/environment`, …); macOS + Linux |
| scope flags | scope to assign on import; `project` defaults to the folder's basename |

```bash
concealer scan ./myrepo --history --import --project myrepo --env dev
```

## deploy

```bash
concealer deploy --target <t> [scope]
```

Render the matching secrets into a deployment format on stdout — nothing is pushed; you pipe the output where you want it.

| Option | Meaning |
|---|---|
| `--target <t>` | one of the targets below; default `dotenv` |
| scope flags | which secrets to render |

**Targets:** `dotenv` · `export` · `docker` · `json` · `k8s` · `aws-secrets` · `aws-ssm` · `github`

```bash
concealer deploy --target dotenv --project web --env prod > .env
```

## run

```bash
concealer run [scope] <cmd...>
```

Inject matching secrets into a child environment and **exec** the command. Values never appear in the terminal. Unspecified `repo`/`project` are auto-detected from the current git repo; the most-specific scope match wins.

- `api_key` secrets are injected as `NAME=value`.
- Typed secrets are injected per-field as `NAME_FIELD=value` (uppercased field name).

```bash
concealer run --project web --env prod npm run deploy
```

---

# Transfer · audit · interfaces

## export

```bash
concealer export [file]
```

Export a **password-protected `.age` bundle** of the whole vault. Prompts for the master password to confirm, then writes the bundle. Default filename: `concealer-export-YYYY-MM-DD.age`.

## import

```bash
concealer import <bundle.age|.cerbak|.cer> [--mode=overwrite|skip|duplicate]
```

Import a bundle or restore a `.cerbak` backup (older `.cer` files still restore — import is extension-agnostic). Prompts for the bundle password. Reports how many records were added / updated / skipped.

| `--mode` | On a record that already exists… |
|---|---|
| `overwrite` *(default)* | update the matching record (prior behavior) |
| `skip` | leave the existing record untouched |
| `duplicate` | always add the incoming record as a fresh copy with a new id |

## backup

```bash
concealer backup [--dir D]
```

Write a `.cer` vault backup using the backup password configured in the web **Settings** (age-wrapped). Intended for cron / launchd. Key access comes from `CONCEALER_TOKEN` (or a TTY master-password prompt).

| Option | Meaning |
|---|---|
| `--dir D` | override (and persist) the backup output directory |

## audit

```bash
concealer audit
concealer audit verify
```

- `audit` — print the most recent audit entries (`ts  source  action  key  [actor]  detail`).
- `audit verify` — recompute the HMAC chain and check the tail anchor; reports integrity.

## config

```bash
concealer config [key [val]]
```

Get or set runtime settings.

| Form | Meaning |
|---|---|
| `config` | print all settings |
| `config <key>` | print one setting |
| `config <key> <val>` | set a setting and persist it |

Settable keys: `idle` (web idle-lock seconds, integer), `confirm_ops` (comma-separated list of operations requiring confirmation).

## tui

```bash
concealer tui
```

Interactive terminal UI — arrow keys to navigate, search, add/delete, and reveal secrets in place.

## web

```bash
concealer web [port]
```

Serve the web UI + JSON API on `http://127.0.0.1:<port>` (localhost only; default `8787`). Unlock with the master password. See [Web UI]({{ site.baseurl }}/web-ui).

## mcp

```bash
CONCEALER_TOKEN=<agent-token> concealer mcp
```

Run the MCP stdio server for AI agents. Requires a **registered agent** token in `CONCEALER_TOKEN`; fails closed without one. See [MCP]({{ site.baseurl }}/mcp).

## version / help

```bash
concealer version      # or --version, -v
concealer help         # or --help, -h, or no args
```

---

## Quick reference

```
VAULT / KEY     init [--force] · unlock · harden · passwd · recover · recovery
                agent register|list|revoke <name>
SECRETS         list · search · get · set/add · rm · rotate · dims · leaks · history [--purge]
SCAN / DEPLOY   scan <folder> [--import] [--history] · deploy --target <t> · run <cmd...>
TRANSFER/AUDIT  export [file] · import <bundle> · backup [--dir D] · audit [verify]
INTERFACE       config [key [val]] · tui · web [port] · mcp · version · help
```
