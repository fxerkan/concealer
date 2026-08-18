# Changelog

All notable changes to `concealer` are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/); versioning is
`0.x.y` and **stays in `0.x` until the first full public release** — there is no
`1.0` yet. Dates are UTC.

## [0.8.0] — 2026-08-18

### Added
- **Encrypted vault backups (`.cer`).** Settings → **Backup** can now write the
  whole vault to an opaque `.cer` file — the entire secret DB `age`-encrypted with
  a **dedicated backup password that must differ from the master password** (min 8
  chars, enforced). The file is binary `age` ciphertext: opening it reveals nothing.
  Restore through the existing **Import** (it accepts `.age` and `.cer`), or from the
  CLI. Two modes:
  - **Backup now** — enter a backup password (twice) and download a `.cer`.
  - **Automatic backups** — enable + set an interval, destination folder, and how
    many files to keep. The backup password is wrapped to the vault's `age` public
    key (`keys/backup.json`, git-ignored) so the **plaintext backup password is
    never stored**; only the vault's `age` private key (in memory while unlocked)
    can unwrap it. A due backup is written on unlock once the interval has elapsed,
    and old files are rotated to the `keep` count.
  - New `concealer backup [--dir D]` CLI writes a `.cer` using the configured
    backup password + folder — schedule it with `cron`/`launchd` for unattended,
    always-on periodic backups. `keys/backup.json` is added to the vault
    `.gitignore` (init + `harden`).

### Security
- **The MCP anti-bulk-exfiltration control point now also covers the CLI.** AI
  agents can drive the `concealer` CLI directly, so `list`, `search`, and `get`
  now pass through the same `rate_gate` as MCP — `per_call` + rolling
  `window_quota` on distinct secret names, keyed by the token label (`cli` for a
  human/CLI token, or the agent label). A looped `concealer get` across names is
  blocked once the window quota is spent (`get_denied` audit). The limit note
  goes to **stderr** so it can't corrupt piped stdout. **Web and TUI are left
  unrestricted** on purpose — that's the human owner, unlocked by master password.
- **Settings → MCP access limits now shows a hardening warning.** `GET
  /api/settings` returns `hardened` (true when no plaintext `keys/age-key.txt` is
  on disk). If the vault is **not** hardened, the panel warns that MCP/CLI can
  read secrets *without a token or registration* (the legacy plaintext-key
  fallback bypasses tokens entirely) and shows the fix: `concealer harden` →
  `concealer agent register <name>` → set `CONCEALER_TOKEN` in the agent's MCP env
  → restart. Fixes the confusing "No registered agents" state on a non-hardened
  vault, where agents were reading secrets through the key file rather than a
  registered token. The "no agents" hint also stopped swallowing `<name>` as HTML.

## [0.7.0] — 2026-08-18

### Security
- **MCP anti-bulk-exfiltration control point.** An AI agent (or a stolen token)
  can no longer dump the whole vault through MCP `list_secrets`/`search_secrets`.
  Two limits now apply per agent:
  - **`per_call`** — a single response returns at most N rows (default 10), so
    "list everything" can never return ~150 secrets at once.
  - **`window_quota`** — an agent may reveal at most N *distinct* secret names
    within a rolling `window_sec` (default 25 / 3600 s), across **both** list and
    search combined. Repeated/rapid queries can't reassemble the full list — once
    the quota is spent the agent is told to narrow (`project`/`tag`/`type`) or
    wait. Already-seen names re-list for free (idempotent) so honest re-queries
    don't burn quota; `window_quota: 0` fully blocks an agent.
  State is per-agent in `keys/ratestate.json` (git-ignored; holds only names +
  timestamps, never values) so it survives an MCP process restart.
- **Registration is now mandatory for MCP secret access.** Every MCP tool call
  requires a **registered agent token** (`concealer agent register <name>` →
  `source=agent`). A raw CLI/human token, or no token, is refused (fail-closed) —
  so no unregistered agent (codex, deepseek, opencode, ChatGPT, …) can reach
  secrets. The resolved agent label is now recorded as the `actor` on every
  MCP `list`/`search`/`inject` audit line.

### Added
- **Per-agent limits managed in the web Settings page.** A new "MCP access limits"
  panel edits the default limits and per-agent overrides (each registered agent is
  listed); saving requires the master password. `GET/POST /api/settings` carry
  `limits` + the registered `agents` list.

## [0.6.10] — 2026-08-18

### Security
- **Custom field *names* that look like secret values are now blocked and hidden.**
  A leaked credential/token/URL accidentally entered as a *field name* (e.g. an
  Atlassian `ATATT…` token, a base64 blob, or a `https://…` URL) no longer:
  (a) can be **stored** — CLI `set`, web create/update, MCP `set_secret`, and the
  TUI add flow reject such names (error/warning shows only a **masked** form), and
  (b) can be **displayed** — `entry_public()` drops them, so they never reach the
  web UI (Columns picker, tables) or MCP output. Rule (`_bad_field_name`): a field
  name must be a short identifier (≤40 chars, `[A-Za-z0-9 _.-]` only); names
  matching a token pattern or containing a separator-free 20+ char mixed
  alphanumeric run are treated as leaked values. Legit names like
  `CLOUDFLARE_R2_ACCESS_KEY_ID`, `client_secret`, `api-version` still pass.
  Already-stored bad names (from older versions) are hidden on read and cleaned
  out the next time the record is saved.

## [0.6.9] — 2026-08-18

### Fixed
- **Shell-history inline `KEY=VALUE` false positives.** The command-line inline
  rule is far noisier than the `.env`-file rule it borrowed (`--file=path`,
  `--tag-value=…`, `--parent=//…`). It now requires **both** a strongly
  secret-looking key name (`secret|token|passw|credential|api_key|access_key|
  private_key|bearer|pat` — no longer the broad `value|key|id`) **and** a
  high-entropy value. File paths, URLs, and tag values no longer show as leaks;
  real assignments like `AWS_BEARER_TOKEN_BEDROCK=…` / `PASSWORD=…` still do.

## [0.6.8] — 2026-08-18

### Changed
- **Risks tab split into sub-tabs.** "Reused values" and "Shell history" are now
  two sub-tabs inside Risks (the history section was easy to miss at the bottom
  of the page). The history table now uses the same responsive `.cards` grid.

### Fixed
- **Shell-history scan false positives.** Vault-value matching now only fires on
  **high-entropy** stored values (`len ≥ 12`, mixed alnum) and only on a full
  token boundary — so a short label stored in a secret field (a project code,
  tenant, hostname fragment) no longer matches as a substring across every
  `cd`/`docker`/`git` command. Short/dictionary-like values are ignored.
- **zsh timestamp noise.** The displayed command strips zsh's `EXTENDED_HISTORY`
  metadata prefix (`: <ts>:<dur>;`) so the row shows the actual command, not the
  `: 1772292826:0;` bookkeeping.

## [0.6.7] — 2026-08-18

### Changed
- **Risks (leaks) table now matches the Secrets/Audit grid.** Converted the leak-group table to the same model-driven grid: sortable columns, drag-to-resize handles, per-column show/hide + reorder, and the `⚙` column menu now sits on the last header cell (was a `⋮` button floating in the toolbar above the table). Added responsive `.cards` layout parity.
- Secrets header columns are now resizable (drag handle), matching Audit/Risks.
- Audit header cells now show the pointer cursor on hover (added the `sortable` class), matching Secrets.
- Removed the now-unused generic DOM-grid subsystem (`regrid`/`gridApply`/`gridColsMenu`) — all three tables use the model-driven pattern.

## [0.6.6] — 2026-08-18

### Changed
- **Login CLI hint fits one line.** The command teaser dropped the repeated
  `$ cer` prefixes (which wrapped to two lines) for a single, readable
  `$ cer web · tui · mcp` — `cer` accented, modes in text colour, `·` separators
  muted; pinned to one line (`white-space:nowrap`).

## [0.6.5] — 2026-08-18

### Added
- **Shell history leak scan + purge.** New `concealer history [--purge]` command
  and a **Shell history leaks** section in the Risks tab. Scans `~/.zsh_history`,
  `~/.bash_history` (and `.histfile`/`.sh_history`/`.ksh_history`) for secret
  values typed straight into the shell — matched three ways: **vault value**
  (a stored secret's value appears verbatim in a command = confirmed leak),
  **token patterns** (AWS/OpenAI/GitHub/Slack/etc. via the scan-folder regexes),
  and **inline `KEY=VALUE`** env assignments that look secret. Values never leak:
  the command line is returned masked. Purge (CLI `--purge`, or per-row select in
  the web UI) removes the flagged lines after a `*.concealer.bak` backup, and
  re-checks each line still contains a secret before deleting (won't nuke the
  wrong line if history shifted). Audited as `history_scan` / `history_purge`.
  API: `GET /api/history`, `POST /api/history/purge`.

## [0.6.4] — 2026-08-18

### Changed
- **TUI shortcuts follow the function's first letter.** Copy is now **`c`**
  (was `p`) and search is **`s`** (the old `/` still works — `s` is friendlier on
  a Turkish keyboard). Help bar and help window updated.

### Added
- **TUI language toggle (TR / EN).** Press **`L`** to switch the whole TUI
  between Turkish and English; the choice persists in `keys/config.json`
  (`lang`). Default is taken from the OS locale (`LANG=tr*` → Turkish, else
  English). All chrome, prompts, messages, and the help window are translated via
  a curses-specific `_TUI_TR` table + `L()` helper.

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
  invisible there). VS Code's terminal (xterm.js) drops the Unicode box-drawing
  glyphs (`┌ │ ─`) this UI draws with. The TUI now detects VS Code
  (`TERM_PROGRAM=vscode`) and renders an all-ASCII glyph set (`+ - |`, `>`, `*`),
  with a single transliteration choke-point in `put()` so no stray Unicode leaks
  through; `CONCEALER_TUI_ASCII=1|0` forces the mode either way. Other terminals
  (iTerm2, etc.) keep the Unicode box-drawing. Also: force a UTF-8 locale before
  curses starts (belt-and-suspenders for text encoding), `KEY_RESIZE` handling
  (refresh geometry + full repaint), and `put()` swallows encoding errors.

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
