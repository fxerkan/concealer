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
  - Master password: `write_master()`/`verify_master()` use stdlib `hashlib.scrypt` against `keys/master.json` (no tty). age passphrase ops (`_age_pw`) are driven via **`expect`** because age reads `/dev/tty`, not stdin.
  - Audit: `audit()` appends an HMAC‑SHA256‑chained line to `keys/audit.log`; `audit_verify()` recomputes the chain.
- **`webui.html`** — the SPA. Served by the Python server with `__IDLE__` replaced at request time. Talks to a JSON API (`/api/...`). Bilingual (TR/EN) via the `I18N` dict + `t()` + `data-i18n` attributes. Brand is rendered `conceal<span class="ac">er</span>` (the `er` suffix is accent‑colored — house branding rule).
- **`sm`** — tiny legacy `sops exec-env` helper. Optional.

## Conventions

- **Style: minimal.** One file where reasonable, stdlib over dependencies, delegate to `sops`/`age`. Match the existing terse, comment‑where‑subtle style.
- **Turkish comments** in `concealer` are intentional (the author's language); keep them. User‑facing web strings must exist in **both** `tr` and `en` in the `I18N` dict.
- **Branding rule:** product names ending in “er” render the “er” in the accent color. Applied in `webui.html` (`.brand .ac`).
- Timestamps are UTC ISO‑8601 (`now_iso()`).

## Running & testing

```bash
# isolated smoke test
CONCEALER_HOME=/tmp/tv sh -c 'printf "pw\npw\n" | ./concealer init'
CONCEALER_HOME=/tmp/tv ./concealer web 8799 &      # then curl the /api/* endpoints
python3 -c "import py_compile; py_compile.compile('concealer', doraise=True)"   # syntax check
```
There are no external test frameworks; verify by exercising the CLI, the JSON API (curl), and the MCP stdio protocol (pipe JSON‑RPC lines into `./concealer mcp`).

## MCP contract

Tools: `list_secrets`, `search_secrets`, `run_with_secrets`. The agent must **never** receive plaintext secret values — `run_with_secrets` injects into a child env and `redact()`s values from the returned output. Every MCP call is audited with `source=mcp`.

## Things to preserve when editing

- The scrypt‑verifier path for the web unlock (do not reintroduce age/tty prompts into the request path).
- Broken‑pipe suppression in the HTTP handler.
- The `.gitignore` protecting vault data.
- Idle auto‑lock (server session TTL + client timer).
