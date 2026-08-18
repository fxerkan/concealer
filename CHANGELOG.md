# Changelog

All notable changes to `concealer` are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/); versioning is
`0.x.y` and **stays in `0.x` until the first full public release** — there is no
`1.0` yet. Dates are UTC.

## [0.6.3] — 2026-08-18

### Security
- **TUI wipes the terminal scrollback on exit.** The TUI already runs in the
  alternate screen buffer, but terminals like iTerm2 (with *"Save lines to
  scrollback in alternate screen mode"* enabled) copy the alt-screen frames into
  the real scrollback — so after quitting `cer` you could scroll up and still see
  the whole screen, including (masked) secret values. `cer` now clears the screen
  **and** the scrollback (`ESC[2J ESC[3J`) on teardown, so nothing survives
  regardless of terminal settings. Fires on both quit and crash.

## [0.6.2] — 2026-08-18

### Changed
- **Login redaction is now a continuous streaming animation.** Each dummy secret
  runs a full lifecycle on its own slow (8–15 s) loop — rises in, shows plaintext,
  gets redacted (amber bar + strike-through), fades out, then **reappears at a new
  random spot** — so the effect keeps flowing without a page refresh. Fragments
  start mid-cycle (negative delays) so the stream is alive on load; repositioning
  happens on the invisible frame boundary (`animationiteration`), so there are no
  visible jumps. GPU-only (`transform`/`opacity`). Under `prefers-reduced-motion`
  it **degrades to a calm opacity-only cross-fade** (no rise/scale motion) instead
  of freezing — so the show/hide stream still plays for users who have Reduce
  Motion on (which previously left the background static).

## [0.6.1] — 2026-08-18

Complete the Turkish translation of the web UI.

### Fixed
- **Missing Turkish strings.** Tab labels (Sırlar / Denetim Kayıtları / Riskler),
  the scope-dimension filter & form labels (Tenant/Proje/Ortam/Repo), column
  headers (Ad/Tip/Anahtar), the auto-lock countdown (oto-kilit), and the
  export/import buttons now render in Turkish. Balanced `tr`/`en` key sets.
- **Operation/action names** (create/update/delete/export/import/settings/…)
  now show translated labels in the Settings confirm-ops list, the Audit Logs
  Action column + detail, the Stats "by action" chart, and the action filter —
  via a display-only `actLabel()` map (raw values kept for data/filtering).

## [0.6.0] — 2026-08-18

Audit grid parity, a Stats dashboard, themes, and a redaction login animation.

### Added
- **Stats dashboard** (new tab). Interactive, dependency-free charts (hand-rolled
  HTML bars + inline SVG trend line) over secrets and the audit log: activity
  trend, and top type / platform-tag / interface(source) / action / actor /
  most-accessed-secret / project / tenant / environment / repo. KPI cards, a
  period quick-select and source/actor/type/project multi-select filter panel.
  All bars carry value labels; every series has a hover tooltip.
- **Audit Logs grid parity with Secrets.** Client-side quick search, multi-select
  filters (source / action / actor / key) with a show/hide filter panel, per-column
  click-to-sort, drag-to-resize, reorder + hide (⚙), and client pagination with a
  page-size selector. Column order/visibility persist in `localStorage`.
- **Fast period selection** (30 min / 1 h / 6 h / 1 day / 1 week / 30 days / All)
  on both Audit and Stats, alongside the existing from/to datetime range.
- **Themes.** Besides the default Covert (Dark), a **White** and a **Matrix**
  (phosphor-green mono) theme, switchable from the header and persisted.
- **Login redaction animation.** Dummy secrets/API keys/tokens (all `…DUMMY…`)
  scroll in the background and get "concealed" — an amber redaction bar wipes over
  each value with a strike-through, on a loop. Respects `prefers-reduced-motion`.
- **Per-field secrecy overrides (`field_meta`).** Every field can be marked
  secret/plain with a mask style (partial `sk-D…xy` or full `••••••••`),
  independent of the type template — set in the TUI add/edit flow. Resolved by
  `rec_field_secret()`/`rec_mask()` (per-field override → type template → name
  heuristic → **value heuristic**) and honoured consistently across the web
  (`entry_public()`), the TUI, MCP `run_with_secrets` **redaction**, and
  reuse/leak detection — so a field marked secret can't leak through any path.
- **Connection strings masked by default.** `database.jdbc_url` is now a secret
  field, and any value with embedded credentials `[user]:pass@` (jdbc/dsn/conn
  strings, incl. password-only `redis://:pw@host`) is masked even in a "plain"
  field — and redacted from MCP child-process output — so credentials in URLs
  never show on sight. `host:port/path` (no credentials) stays visible.

### Changed
- **TUI Details panel is now interactive.** Focus it (`3`/Tab) and move a cursor
  over each key/value with `↑↓`/`j`/`k`; `Enter` or `m` reveals **just the
  selected field** (per-field, not all-at-once); `p` copies the selected field.
  `m` from the Secrets panel still reveals/hides the whole record. Long records
  auto-scroll to keep the cursor visible.
- **Every TUI secret access is audited** (`source=tui`): revealing a masked field
  (or reveal-all) records a `get` with the field name, alongside the existing
  copy/create/update/delete/rotate events.
- **TUI modals are opaque.** The `?` keymap and all prompts/pickers paint a solid
  background instead of showing the vault behind them.

### Fixed
- **TUI now renders in the VS Code integrated terminal** (borders/panels were
  invisible there). Root cause: VS Code launches the shell with a non-UTF-8
  locale (`LC_ALL/LANG=C`), so ncurses silently dropped the Unicode box-drawing
  characters. `tui()` now forces a UTF-8 locale (`en_US.UTF-8`/`C.UTF-8`) before
  curses starts, and if none is available falls back to an all-ASCII glyph set
  (`+ - |`), so panels always draw. Also added `KEY_RESIZE` handling (refresh
  geometry + full repaint) and made `put()` swallow encoding errors.

## [0.5.1] — 2026-08-18

Secrets grid: custom-field columns, reorder, native folder picker.

### Added
- **Custom fields as table columns.** The column picker now lists every field
  found across secrets (e.g. `web_url`, `host`, `username`) — toggle any on as
  its own column. Plain fields show their value; secret fields stay masked.
- **Column reordering** (▲▼ in the column picker) and per-column click-to-sort;
  order/visibility persist in `localStorage`. Secrets grid is now model-driven.
- **Native OS folder picker** in Scan folder (`/api/pickdir` → Finder /
  Explorer / zenity / kdialog), falling back to the in-app browser only when no
  native tool exists.
- README: type-aware entry screenshots per secret type + Audit/Risks/Scan
  screens; secret-types table refreshed.

### Changed
- Scan folder: **Import selected** stays disabled until a scan finds candidates;
  **Scan** is now the amber (primary) button, Import is a distinct green.
- Header logo enlarged, vertically centered with the wordmark, brighter glow.
- Tags filter matching is **OR** (any selected tag matches) — a record with any
  of the chosen tags shows.

## [0.5.0] — 2026-08-18

Terminal UI + English help.

### Added
- **`concealer tui`** — a full-screen curses vault browser (btop / Keeper-
  Supershell style) mirroring the web app, in the Covert amber palette. Three
  focusable panels — **Filters** (facets with live counts, multi-select),
  **Secrets** (list) and **Details** — plus a top status bar, a live search
  line and a help bar. Keyboard-driven: `Tab`/`1`/`2`/`3`/`h`/`l` switch panels;
  `j`/`k`/arrows + `g`/`G` + PgUp/Dn + Ctrl-D/U navigate; `/` live search;
  `Space` toggle a facet, `x` clear filters; `m` reveal/hide; `a`/`e`/`d`/`r`
  add/edit/delete/rotate; `p`/`u`/`w` copy value/username/url (clipboard
  auto-clears after 45 s); `?` keymap, `Ctrl-L` redraw, `q` quit. **Secrets are
  masked by default** and revealed only on `m`. ASCII logo splash on launch;
  unlocks once on the TTY (master pw / `CONCEALER_TOKEN`) before curses starts;
  every mutation/copy is audited with `source=tui`. Stdlib `curses` only
  (Unix/macOS).

### Changed
- **`help` / `--help` is now fully English** and column-aligned (built via a row
  formatter so synopsis/description columns stay flush). Added the `tui` entry.

## [0.4.1] — 2026-08-18

Secrets-page follow-ups: privacy, tag filtering, and a real folder picker.

### Removed
- **PII-bearing secret types** (`credit_card`, `bank_account`, `passport`,
  `id_card`) — these must never live in this vault. Remaining everyday types:
  `pin`, `wifi`, `membership`, `secure_note`.

### Added
- **Tags** multi-select in the filter panel (`filt()` tag matching accepts
  comma-joined values, any-match).
- **Folder picker** in Scan folder: a server-side directory browser
  (`/api/browse`) to navigate and pick a path, alongside typing it directly.
- **Scanning progress bar** (indeterminate) while a scan runs.
- Imported secrets are tagged by origin: `scan-folder` vs `scan-history`; the
  scan candidate list shows a 📁/📜 badge per source.
- **Glow/halo** around the header logo (matches the feature-graphic).

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
