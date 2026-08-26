# CLAUDE.md — guidance for AI agents working on `concealer`

`concealer` is a **local‑only secret manager**: a thin wrapper over [SOPS](https://github.com/getsops/sops) + [age](https://github.com/FiloSottile/age) that adds typed secrets, scoping, a web UI, an audit log, and an MCP server. Read `README.md` for the product overview.

## 🚨 Security rules (non‑negotiable)

1. **NEVER commit vault data.** `keys/`, `secrets.enc.yaml`, `secrets.enc.json`, and `.sops.yaml` are git‑ignored and must stay that way. This repo ships the *tool*, never a vault. Before any `git add`, confirm none of these are staged.
2. **NEVER print real secret values** in test output, commits, or messages. Use dummy values (`sk-DUMMY-…`) for tests.
3. **NEVER weaken the crypto.** All encryption is delegated to `sops`/`age` on purpose. Do not add a home‑grown cipher, do not store plaintext secrets, do not roll your own KDF. The stdlib `scrypt` verifier and HMAC audit chain are the only crypto concealer itself performs.
4. **Test against an isolated vault**, never the user's real one: `CONCEALER_HOME=/tmp/testvault concealer init` then point the web/CLI there. The real vault's master password is the user's and is unknown to you.

## Architecture

- **`concealer`** — single Python 3 script (stdlib only, no pip deps). CLI + web server + MCP server.
  - `load()/save()` shell out to `sops` (`--config .sops.yaml`, `--filename-override`). Data model is one JSON dict `{ "secrets": [ {record}, ... ] }`.
  - A record: `{id, name, type, tenant, project, environment, repo, tags[], url, notes, fields{}, created, updated}`.
  - `norm()` upgrades/legacy‑migrates records on load. `entry_public()` masks secret fields.
  - **Masking is record‑aware:** `rec_field_secret(e, fname)`/`rec_mask(e, fname, v)` resolve secrecy as per‑field override (`e["field_meta"][fname] = {"secret": bool, "mask": "partial"|"full"}`) → type template (`field_is_secret`) → name regex → **value heuristic** (`_URL_CREDS`: a value with embedded `user:pass@`, e.g. `jdbc_url`/dsn, is masked even in a "plain" field). `entry_public()` (web + MCP) and the TUI go through these. Overrides may only *add* masking by default; a field is shown plain only if the user explicitly set `secret:false`. Keep it that way — never let a template‑secret field render plain without an explicit override.
  - Master password: `write_master()`/`verify_master()` use stdlib `hashlib.scrypt` against `keys/master.json` (no tty). age passphrase ops (`_age_pw`) are driven via **`expect`** because age reads `/dev/tty`, not stdin. `_age_pw`'s expect pattern matches the substring `passphrase` (NOT `passphrase:`) — age's encrypt prompt ends in `…one): `, so `passphrase:` never matches and every call would hang 30 s.
  - **Key‑at‑rest:** the age private key is **not** on disk in plaintext for new vaults. `init` removes `keys/age-key.txt` after making `keys/age-key.txt.age` (master‑pw encrypted). `_unlock_key()` resolves the key text in order: in‑memory `_KEY_CACHE` → `CONCEALER_TOKEN` env (via `keys/agents.json`) → legacy plaintext `age-key.txt` if present (returns `None` → sops reads the file) → interactive master‑pw prompt on a TTY. `_env()` passes the key to sops via `SOPS_AGE_KEY` (memory), never a temp file. Old vaults with a plaintext key keep working unchanged; `harden` migrates them.
  - **Unlock tokens (`keys/agents.json`):** `mint_token()` stores per‑token `{scrypt‑hash, token‑wrapped age key}`; the token value lives **only** in the client env (`CONCEALER_TOKEN`), never on disk. Humans get a TTL token via `unlock`; agents get a long‑lived, revocable token via `agent register`. `resolve_token()` honours revoke + expiry.
  - **Recovery codes (`keys/recovery.json`):** `init` prints 8 one‑time codes (shown once, only scrypt‑hash + code‑wrapped age key stored). Any code recovers the vault via `recover`; `passwd` **requires** a code as a 2nd factor (consumed) so a stolen master password alone can't take over. `recovery` regenerates the set.
  - Audit: `audit()` appends an HMAC‑SHA256‑chained line to `keys/audit.log` with a monotonic `seq`; `audit_verify()` recomputes the chain **and** compares the tail against the `keys/audit.head` anchor to catch tail‑truncation (deleting the last lines). Ceiling: `audit.key` is on disk, so a full FS‑root attacker can still re‑forge — documented in the `audit_verify` comment.
- **`webui.html`** — the SPA. Served by the Python server with `__IDLE__` replaced at request time. Talks to a JSON API (`/api/...`). Bilingual (TR/EN) via the `I18N` dict + `t()` + `data-i18n` attributes. Brand is rendered `conceal<span class="ac">er</span>` (the `er` suffix is accent‑colored — house branding rule).
- **`sm`** — tiny legacy `sops exec-env` helper. Optional.

## Conventions

- **Style: minimal.** One file where reasonable, stdlib over dependencies, delegate to `sops`/`age`. Match the existing terse, comment‑where‑subtle style.
- **Code comments must be English** across the whole codebase. User‑facing web strings must still exist in **both** `tr` and `en` in the `I18N` dict (those stay bilingual — only comments are English‑only).
- **Branding rule:** product names ending in “er” render the “er” in the accent color. Applied in `webui.html` (`.brand .ac`).
- Timestamps are UTC ISO‑8601 (`now_iso()`).
- **Versioning:** single source of truth is `VERSION` in `concealer` (surfaced by `concealer version` and MCP `serverInfo`). Stays in **`0.x.y` until the first full public release — never bump to `1.0`** before then. Any user‑visible change bumps `VERSION` **and** adds a dated entry to `CHANGELOG.md` (Keep a Changelog format).

## Running & testing

```bash
# isolated smoke test — init now HARDENS (removes plaintext key) and prints a CLI token
CONCEALER_HOME=/tmp/tv sh -c 'printf "pw\npw\n" | ./concealer init'   # prints `export CONCEALER_TOKEN=…` + recovery codes
export CONCEALER_TOKEN=…          # CLI ops now need a token (or run `concealer unlock`); grab it from init output
CONCEALER_HOME=/tmp/tv ./concealer get --name A     # token-driven, no prompt
CONCEALER_HOME=/tmp/tv ./concealer web 8799 &       # web unlock (master pw) holds the key in memory; then curl /api/*
python3 -c "import py_compile; py_compile.compile('concealer', doraise=True)"   # syntax check
```
There are no external test frameworks; verify by exercising the CLI (set `CONCEALER_TOKEN`), the JSON API (curl `/api/unlock` then the rest), and the MCP stdio protocol (`CONCEALER_TOKEN=… ./concealer mcp` with piped JSON‑RPC lines). New commands: `unlock`, `agent register|list|revoke`, `harden`, `recover`, `recovery`.

## MCP contract

Tools: `list_secrets`, `search_secrets`, `run_with_secrets`, `set_secret`. The agent must **never** receive plaintext secret values — `run_with_secrets` injects into a child env and `redact()`s values from the returned output. Every MCP call is audited with `source=mcp` and `actor=<agent label>`. The MCP server unlocks via `CONCEALER_TOKEN` in its env (from `concealer agent register <name>`), resolved once per process — agents are never prompted for a password. Without a valid token on a hardened vault it fails closed (no secret leaks).

- **Registration is mandatory:** `_mcp_call` resolves the token via `_mcp_agent()` and refuses any call whose token isn't a **registered agent** (`source=="agent"`). A CLI/human token or no token → access denied. Keep this gate — it's what stops unregistered agents from reading anything.
- **Anti-bulk-exfiltration (`rate_gate`):** `list_secrets`/`search_secrets` results pass through `rate_gate(agent, rows)`. Two per-agent limits (`agent_limits()` → `CFG["limits"]`, default `{per_call:10, window_quota:25, window_sec:3600}`): `per_call` caps rows in one response; `window_quota` caps **distinct secret names** revealed in the rolling window across list+search combined. Already-disclosed names re-list free (idempotent) *unless* `window_quota==0`, which is a full block. State lives in `keys/ratestate.json` (git-ignored; names+timestamps only, never values) so it survives an MCP restart. Limits are edited in the web Settings page (per-agent overrides) via `GET/POST /api/settings` (`limits` + registered `agents`). **Don't** move enumeration back to a raw `filt()`→`_fmt()` path that skips `rate_gate`, and don't apply the gate to the web UI (that's the human owner, unlocked by master password).

## Things to preserve when editing

- **Key‑at‑rest:** never write the age private key to disk in plaintext on a hardened vault. Keep the `_unlock_key()` resolution order (cache → `CONCEALER_TOKEN` → legacy file → TTY prompt) and pass the key to sops via `SOPS_AGE_KEY` (memory), not a temp file. Keep the legacy fallback so old plaintext‑key vaults still work.
- **Token store:** the token value must stay client‑side (`CONCEALER_TOKEN`); only its scrypt‑hash + token‑wrapped key go in `keys/agents.json`. Preserve revoke/expiry.
- **`passwd` 2nd factor:** keep requiring (and consuming) a recovery code — master password alone must not rotate the key.
- **Recovery codes / master password** are shown **once**; never persist them in plaintext, never print real ones in tests (`sk-DUMMY-…` only).
- **Audit tamper‑evidence:** keep the monotonic `seq` in the signed payload and the `keys/audit.head` anchor check for tail‑truncation.
- The `_age_pw` expect pattern (`passphrase`, not `passphrase:`) — reverting it makes every age call hang 30 s.
- The web unlock path decrypts the backup into memory per session (`_SESS_KEY`) — do not reintroduce age/tty prompts into the request path.
- Broken‑pipe suppression in the HTTP handler.
- The `.gitignore` protecting vault data (now also `keys/audit.head`, `keys/recovery.json`, `keys/agents.json`).
- Idle auto‑lock (server session TTL + client timer) — it also clears `_SESS_KEY`/`_KEY_CACHE`.
