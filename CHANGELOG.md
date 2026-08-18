# Changelog

All notable changes to `concealer` are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/); versioning is
`0.x.y` and **stays in `0.x` until the first full public release** — there is no
`1.0` yet. Dates are UTC.

## [0.4.0] — 2026-08-18

Web UI overhaul: responsive/mobile layout and per-secret deploy.

### Added
- **11 new secret types** beyond api_key/database/website/custom — developer:
  `access_token`, `oauth`, `jwt`, `ssh_key`, `certificate`, `server`, `login`;
  everyday: `pin` (phone/door/card), `wifi`, `credit_card`, `bank_account`,
  `passport`, `id_card`, `membership`, `secure_note` — each with typed,
  correctly-masked fields.
- **Per-secret Deploy.** Deploy moved from a global toolbar button to a row
  action; it always renders the CLI command/manifest for that one secret to the
  chosen target (`export`/`dotenv`/`docker`/`json`/`k8s`/`aws-secrets`/`aws-ssm`/`github`).
  New `/api/deploy` `id` field + `deploy_render_one()`.
- **Searchable, multi-select filter dropdowns** for type/tenant/project/
  environment/repo, each with its own label and an **All** row to clear the
  selection; collapsible under a Filters toggle (auto-collapsed on mobile).
  `matches()`/`filt()` accept comma-joined multi values.
- **Client-side pagination** (single bottom pager) with a **rows-per-page**
  selector (10/25/50/100, remembered).

### Changed
- Secrets row actions reduced to **View + a kebab menu** (Edit / Deploy /
  Delete). Column-picker moved to a gear in the Actions header.
- **Sticky** search/filter bar and table header (removed the `overflow`
  scroll-container that broke `position:sticky`); zebra-striped rows; distinct
  header background; table uses full browser width and reflows to cards on
  phones/tablets with a hamburger menu.
- Action buttons (New Secret / Scan folder / Generate) moved left, each with
  its own colour; Generate moved out of the header.
- Tab labels pluralised (Audit Logs, Risks); Settings icon removed; header logo
  given a chip so it reads on the dark bar; auto-lock countdown sits next to
  Lock with the language switch at the far right, turns red in the last 10s,
  and stays visible on mobile.

### Fixed
- Auto-lock now closes any open modal (Edit/Deploy) when it locks, so the
  login screen is no longer hidden behind a stale popup.

## [0.3.0] — 2026-08-18

Distribution release: installable via Homebrew, with a detailed CLI help.

### Added
- **Homebrew packaging.** `Formula/concealer.rb` + `PACKAGING.md`. Users install
  with `brew install fxerkan/tap/concealer`, which pulls in `sops`, `age`, and
  `expect` automatically — no manual dependency setup.
- **Detailed `--help`.** `concealer help` (also `-h`, `--help`, and no-arg) now
  prints a full command reference, scope/type notes, worked examples, and the
  environment variables.
- **Dependency preflight.** Vault commands fail fast with a clear message and an
  install hint when `sops`/`age`/`expect` are missing, instead of a cryptic error.

### Changed
- **Default vault home.** When run from a package install (no vault next to the
  script), `CONCEALER_HOME` now defaults to `~/.concealer` so the vault lives in a
  writable per-user dir. Repo checkouts with an existing vault keep using the
  script directory unchanged.

## [0.2.0] — 2026-08-18

Security hardening release: tamper-evident audit, encrypted key-at-rest,
unlock tokens for agents, and master-password recovery.

### Added
- **Recovery codes.** `init` now generates 8 one-time recovery codes (shown
  **once**, only their scrypt hash + a code-wrapped copy of the age key are
  stored — never the plaintext code).
  - `concealer recover` — recover the vault with any code if the master
    password is forgotten, then set a new one.
  - `concealer recovery` — regenerate the code set (requires the master
    password).
- **`passwd` two-factor.** Changing the master password now requires **both**
  the current password **and** a valid recovery code (consumed on use), so a
  stolen master password alone can't rotate the key and take over.
- **Key-at-rest.** The age private key is no longer stored in plaintext on new
  vaults. `init` removes `keys/age-key.txt` after writing the master-password-
  encrypted backup; the key is handed to `sops` in memory via `SOPS_AGE_KEY`.
  A copied vault directory is useless without the master password or a token.
- **Unlock tokens / agent registration.** `keys/agents.json` stores, per token,
  a scrypt hash + a token-wrapped copy of the key. The token value lives only in
  the client environment (`CONCEALER_TOKEN`), never on disk.
  - `concealer unlock` — mint a TTL-bound token for humans (prints
    `export CONCEALER_TOKEN=…`; use `eval "$(concealer unlock)"`).
  - `concealer agent register <name>` — mint a long-lived, revocable token for
    an AI agent / MCP server so it never prompts for a password.
  - `concealer agent list` / `concealer agent revoke <name|all>`.
  - `concealer harden` — migrate an existing plaintext-key vault to key-at-rest.
- **Audit tail-truncation detection.** Each audit line now carries a monotonic
  `seq`, and a `keys/audit.head` anchor records the last line; `audit verify`
  fails if the tail was silently deleted (previously undetectable).
- `concealer version` / `--version`.

### Changed
- `_age_pw` now matches the `passphrase` substring instead of `passphrase:`.
  age's encryption prompt ends in `…one): `, so the old pattern never matched
  and every age call hung for 30 s.
- Web unlock decrypts the backup into memory per session (`_SESS_KEY`) instead
  of relying on a plaintext key file; idle auto-lock clears the in-memory key.
- MCP server unlocks once per process via `CONCEALER_TOKEN`; without a valid
  token on a hardened vault it fails closed (no secret leaks).
- `.gitignore` written by `init` now also covers `keys/audit.head`,
  `keys/recovery.json`, and `keys/agents.json`.

### Security
- Audit chain is now resistant to insertion, reordering, and tail-truncation.
  Known ceiling: `keys/audit.key` is on disk, so a full filesystem-root attacker
  can still re-forge the chain — documented in `audit_verify`. True immutability
  needs an off-machine key/anchor.
- Recovery codes and the master password are shown once and never persisted in
  plaintext.

### Backward compatibility
- Existing vaults with a plaintext `age-key.txt` keep working with no token
  (legacy path); run `concealer harden` to opt into key-at-rest.

## [0.1.0]

Initial baseline: single-file local secret manager over SOPS + age.

### Added
- Typed secrets (`api_key` / `database` / `website` / `custom`) with
  `tenant / project / environment / repo` scoping, tags, url, notes, full CRUD.
- CLI, localhost web UI (bilingual TR/EN), and MCP stdio server
  (`list_secrets`, `search_secrets`, `run_with_secrets` — values never exposed).
- HMAC-SHA256-chained audit log; scrypt master-password verifier; passphrase-
  wrapped portable key backup; idle auto-lock; leak scan; folder import; deploy
  renderers.

[0.2.0]: #020--2026-08-18
[0.1.0]: #010
