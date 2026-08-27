# Changelog

All notable changes to `concealer` are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/); versioning is
`0.x.y` and **stays in `0.x` until the first full public release** — there is no
`1.0` yet. Dates are UTC.

## [0.9.16] — 2026-08-27

### Added
- **Chrome extension** (`extension/`) — open the vault and copy secret values from the toolbar,
  without typing `cer web`. The popup starts `concealer web` **on demand** via a native-messaging
  host **built into concealer** (macOS/Linux/Windows) and the server **self-exits after 15 min
  idle**, so nothing lingers. One-time OS setup is a single command — **`cer chrome-extension`**
  (registers the host; `--add-id <id>` authorizes dev builds, `--list`, `--uninstall`); the popup
  shows a setup card with that command until it's registered. `extension/build.py` packages a
  Chrome Web Store zip (self-signed `key` stripped); `.github/workflows/publish-extension.yml`
  automates the upload. Features:
  - **Per-field copy** — multi-field secrets expand into child rows (secret + non-secret), each
    with its own copy button and a reveal (eye) for secret fields; single-field secrets one-click copy.
  - **Auto-lock countdown** in the header that locks the popup when the server's idle-lock expires.
  - **Generate** (🎲) — client-side password/hex/base64url/UUID generator, copy to clipboard.
  - **Settings** (⚙) — clipboard auto-clear seconds, server/vault info, link to full web settings.
  - Globe button and the brand name both open the full web UI.
  - **Settings → Developer** shows this build's extension ID + the `--add-id` command to authorize it.

### Changed
- **Web server: header-token auth for the extension.** `/api/*` now accepts `X-Concealer-Token`
  in addition to the SPA's HttpOnly cookie (which can't ride cross-origin fetches from an
  extension page). `/api/unlock` returns the token in the body **only** when the caller sends
  `X-Concealer-Client: ext` — the browser SPA never sets it, so its token stays HttpOnly.
- **Web server: opt-in idle self-exit.** `CONCEALER_WEB_IDLE_EXIT=<sec>` makes `cer web` shut its
  process down after N idle seconds. Unset for a normal `cer web` (unchanged behavior); the
  extension's native host sets it to 900.
- **`cer web` no longer crashes when a server is already running.** On `EADDRINUSE` it opens the
  existing `http://127.0.0.1:<port>` in the browser instead of dumping a traceback.

## [0.9.15] — 2026-08-27

### Added
- **Least-privilege injection** — `run_with_secrets` (MCP) and `concealer run` (CLI) accept a
  name filter so a command gets **only the secrets it names**, not every secret in the scope.
  MCP: `names: ["A", "B"]`. CLI: `concealer run --project p --name A <cmd>`. Default is unchanged
  (whole scope) for backward compatibility, but agents should name what they need — this shrinks
  the injected env and the audit `inject` line to just the required keys.
- **Managed MCP policy** — the secrets policy (redaction + least-privilege + narrow scoping) is now
  returned in the MCP `initialize` `instructions`, so it reaches **every** connecting agent, not just
  a Claude Code that reads a local `CONCEALER.md`. Advisory by protocol; the code guards
  (registered-agent gate, `rate_gate`, redaction) remain the non-bypassable enforcement.

## [0.9.14] — 2026-08-27

### Changed
- **PyPI page: dropped the redundant top logo** — the hero banner already shows the logo, so the
  extra logo above it is gone.
- **Scoop bucket published** (`fxerkan/scoop-bucket`): `scoop bucket add fxerkan https://github.com/fxerkan/scoop-bucket && scoop install concealer`. The in-repo `packaging/scoop/concealer.json` tracks the live PyPI wheel url/hash.

## [0.9.13] — 2026-08-27

### Changed
- **PyPI page polish** (metadata is fixed at upload time, so this needed a new release): the
  package `description` is now the tagline *"The local-only secret manager for the AI-coding era"*
  (with the docs link); **Project links** point Homepage → the docs site and Documentation →
  `/getting-started`. README images now use **absolute `raw.githubusercontent.com` URLs** so they
  render on PyPI (they were relative and showed as broken images).

## [0.9.12] — 2026-08-26

### Added
- **Native Windows support** (no WSL required). `age` reads the console rather than stdin, which the
  Unix build drives with `expect`; Windows has neither `expect` nor `/dev/tty`, so a new Windows-only
  helper (`concealer_win.py`) gives `age` a real ConPTY via **pywinpty** and types the passphrase into
  it — the same interaction, through the Windows console API. The Unix `expect` path is **unchanged**;
  `_age_pw` just takes an early Windows branch. The TUI works on Windows via **windows-curses**, and
  clipboard copy uses `clip` + PowerShell auto-clear. See `docs/WINDOWS.md` for setup and the security
  caveats (Windows `chmod` only flips the read-only bit — the vault relies on `icacls`/NTFS ACLs, and
  concealer best-effort-locks its `keys/` files to the current user).
- **Published to PyPI — `pipx install concealer`** now works on all platforms
  ([pypi.org/project/concealer](https://pypi.org/project/concealer/)). PyPI packaging
  (`pyproject.toml`, hatchling) ships the flat script as the `concealer` package with `webui.html`
  bundled and `pywinpty`/`windows-curses` as Windows-only deps. `sops`/`age` remain external binaries
  (install via scoop/winget/brew/apt). A **Scoop** manifest (real PyPI wheel url/hash) and **winget**
  notes live under `packaging/`.
- **Windows portability fixes found by the CI smoke test** (`packaging/ci/win_smoke.py`,
  run on `windows-latest`): (a) force UTF-8 on `stdout`/`stderr` — a redirected Windows
  stream defaults to cp1252, so printing `→`/box-drawing raised `UnicodeEncodeError` in
  pipes/CI; (b) `save()` can't use `/dev/stdin` on Windows, so it now writes the plaintext
  to an ACL-locked temp file in `keys/` and deletes it immediately (documented at-rest
  caveat in `docs/WINDOWS.md`). Both are Windows-only branches; Unix is byte-for-byte unchanged.
- **Verified green on a real `windows-latest` runner:** all five interfaces pass end-to-end —
  `age/pty` (pywinpty round-trip), `CLI` (init + agent register + set/get/list, masking),
  `web` (`/api/unlock` → age decrypt in-process, masked `/api/secrets`), `MCP`
  (`tools/list` + `list_secrets`, value never leaked), and `TUI` (windows-curses render + quit).

## [0.9.11] — 2026-08-26

### Changed
- **On lock, drop the in-memory key and run `gc.collect()`** (idle auto-lock and `POST /api/lock`
  both go through a shared `_lock_clear()`). This reclaims freed key/secret copies sooner.
- **Documented the in-memory-secrets ceiling honestly** (`docs/security.md`, `docs/web-ui.md`, TR
  mirrors). CPython does **not** zeroize memory: `str`/`bytes` are immutable and plaintext flows
  through unavoidable copies (`sops` output, `json.loads`, the age key passed to `sops` via the
  `SOPS_AGE_KEY` env var, `getpass`), so key/secret bytes may linger in the process heap, swap, or a
  core dump until overwritten. Lock reduces the reachable-copy window — it is **not** secure erasure.

## [0.9.10] — 2026-08-26

### Changed
- **Backup files now use the `.cerbak` extension** (was `.cer`). Manual downloads, auto-backups,
  rotation, and the web/CLI wording all emit `.cerbak`. Existing `.cer` backups still restore
  (import is extension-agnostic) and are still recognized by rotation, so nothing breaks.

### Added
- **Restore conflict handling.** `import` / restore now takes a conflict mode chosen up front:
  `overwrite` (default — update the matching record, prior behavior), `skip` (leave existing
  records untouched), or `duplicate` (always add incoming records as fresh copies with new ids).
  CLI: `concealer import <file> --mode=overwrite|skip|duplicate`; web: a select next to the
  Import button; API: `mode` in the `/api/import` body. Result now also reports `skipped`.

## [0.9.9] — 2026-08-26

### Changed
- **Per-field secret toggle for custom secrets in the web editor.** Each custom field row
  now has a 🔒/🔓 flag: flagged fields are masked (password + reveal), un-flagged fields show
  their value in plaintext in both the edit and view screens. Defaults from the field-name
  heuristic; the choice persists as a `field_meta.secret` override so non-secret values like
  `REGION=eu-central-1` no longer render as `••••••`.

### Fixed
- **Exposure record-picker header now stays pinned.** The table lives in its own scroll
  container, but the page-level `#view-leaks thead th` rule pinned headers at
  `top:calc(--hh + --sh)` (the app header/subbar offset), so inside the container the header
  floated mid-list over the rows. A more specific `#view-leaks .exgrid thead th` rule pins it
  to `top:0` of its own scroll box. It keeps the global opaque `--th-bg` header colour (an
  earlier attempt overrode it to `--panel`, making the header blend into the rows and letting
  values show through), and an `inset 0 -2px 0 var(--line2)` bottom line rides with the
  header so the separator no longer scrolls away.

## [0.9.8] — 2026-08-26

### Changed
- **Online leak check: record picker is now a table, not a dropdown.** The secret picker
  is a Secrets-grid-style table (checkbox · Name · Type · Collection · Scope · Tags ·
  Updated) with a left multi-select column and **Select all / Clear** at the top (plus a
  header checkbox). Wider and easier to scan; each row is a distinct record so same-named
  secrets in different scopes are picked individually. The scope/collection/tag filter row
  narrows which rows appear; header checkbox reflects "all in-scope selected".
- **Scan leaks shows live progress.** Clicking Scan opens a modal with a **determinate
  progress bar** ("Checking N / total") that advances as records are checked in small
  batches, so it's clear the work is running in the background. The modal is **cancellable**
  (partial results are still shown), and it reiterates that only a SHA-1 prefix is sent.

## [0.9.7] — 2026-08-26

### Fixed
- **Online leak check now targets exact records, not names.** The secret picker keyed on
  **name**, so two records sharing a name across different scopes/collections/tags/repos
  collapsed into one option — picking it silently checked *all* of them. The picker now
  lists **distinct records by id**, each labelled with its scope/collection/tags so
  duplicates are told apart, and `POST /api/exposure` accepts an `ids` list
  (`exposure_scan(ids=…)`) that checks only those records.

### Added
- **Target-narrowing filters before picking.** A row of multi-select dropdowns
  (tenant / project / environment / repo / collection / tag) above the secret picker
  narrows which records are listed; an empty picker selection then means "all records in
  the current scope" (count shown inline). The shared `msel` search now also matches an
  option's display label, so you can search the record picker by name even though options
  are id-valued.

## [0.9.6] — 2026-08-26

### Changed
- **Exposure tab now drives off the vault, not free text.** The **Online leak check** picks
  the secrets to check from a filterable/multi-select dropdown (the shared `msel` component)
  of secret names — empty selection = all. The **Email breach check** picks from a dropdown
  of email addresses **extracted from the vault** (only from non-secret fields — `url`,
  `notes`, and plaintext fields like `username`; masked secret values are never scanned) and
  checks each selected email, showing per-email results. No more hand-typing.
- **Remediation guide is now rendered, not raw.** The cleanup-guide modal renders the
  markdown (headings, blockquote, lists, bold, inline code) with a dependency-free
  shell/PowerShell **syntax highlighter** (comments, strings, flags, commands). **Each code
  block has its own copy button**, plus a **Copy all** in the footer. Highlighter is a
  single-pass tokenizer (no CDN/lib), and all code content is HTML-escaped (XSS-safe).

## [0.9.5] — 2026-08-26

### Added
- **Risks → "Exposure" tab — online leak research + git/log scanning.** A new tab that
  answers "is this secret leaked / reused anywhere" **without ever sending the secret
  value online**:
  - **Online leak check (`pwned_count`, `exposure_scan`, `POST /api/exposure`, CLI
    `expose`).** Checks each high-entropy secret value against HIBP Pwned Passwords using
    **k-anonymity** — only the first 5 hex of the value's SHA-1 leaves the machine; the
    full-hash comparison happens locally. **The value and its full hash never leave the
    box** (verified by test). Scope it to one secret, a project/repo/environment, or all.
    Results show breach count, severity, **CWE** references (798/259/321/…), and a
    keyhacks-style validate hint per token type. Click a row to open its editor.
  - **Email breach check (`hibp_breaches`, `POST /api/breach`).** HIBP account breach
    lookup for a user-supplied email (needs the user's own HIBP API key — set in Settings
    → HIBP API key, stored in the 0600 config, never returned; only the email is sent).
    Without a key it links to the manual HIBP page.
  - **Git / log / .gitignore scan (`git_scan`, `log_scan`, `gitignore_gaps`,
    `POST /api/gitscan`, CLI `gitscan`).** Finds secrets **committed in git history**
    (pickaxe `git log -S` on vault values — precise, local), present in **tracked files**
    (`git grep` token patterns), or in **log files**, plus secret-bearing files **missing
    from .gitignore/.claudeignore**. All read-only.
  - **History cleanup guide (`git_remediation`, `POST /api/gitremedy`).** A remediation
    document tailored to the repo/files/secrets (rotate-first, `git rm --cached`,
    `git filter-repo`/BFG, force-push coordination, pre-commit scanners). **concealer
    never runs history-rewriting commands** — it only generates the steps for you to run.
- **Scan folder button** now keeps its 🔎 icon (was overwritten by the i18n label).

### Security
- The online leak check is **opt-in** (only runs when you click Scan / run `expose`) and
  transmits only a SHA-1 prefix — a deliberate k-anonymity design so a full secret value
  is never exposed to a third party. CWE-798 (hard-coded credentials) and related CWEs are
  surfaced as reference links on findings.

## [0.9.4] — 2026-08-26

### Added
- **Environment / global variable scan.** `env_scan()` inspects the local machine's live
  environment (`os.environ`) plus shell profile files (`~/.bashrc`, `~/.zshrc`, `~/.zshenv`,
  `~/.profile`, `~/.config/fish/config.fish`, `/etc/environment`, …) for secret-looking
  `KEY=VALUE` / `set -x` assignments, reusing the same detection heuristics as the folder
  scan. Values never leave the server (masked). Wired into Scan folder (new **"also scan
  environment/global variables"** checkbox — path is now optional when history/env is
  selected) and the CLI (`scan --envvars`). macOS + Linux; Windows system/user env
  (registry) is deferred. Our own `SOPS_AGE_KEY*` / `CONCEALER_TOKEN` and noisy vars
  (`PATH`, `LS_COLORS`, …) are skipped.
- **Policy page — user-defined reminder rules + notifications.** A new **Policy** tab where
  you add/edit/delete rules (`GET/POST /api/policies`, `DELETE /api/policies/<id>`;
  `policy_eval()`), toggle each on/off and its notification bell, and see the secrets that
  **violate** each rule — click a row to open that secret's editor, or **bulk-edit** all
  violators at once (add tags / set rotation interval / set collection). Rule kinds:
  `rotation` (max interval / overdue / missing policy), `expiry` (expired / expiring within
  N days / missing expiry field), `reuse` (shared value), `naming` (name regex), `tagging`
  (required tags). Each policy carries an **audience** (`user`/`agent`/`cli`/`web`/`tui`/
  `mcp`/`all`) so different rules can target different consumers. Notify-enabled violations
  surface as a badge on the Policy tab and (with permission) a browser notification on
  unlock. CLI: `policy list` and `policy check` (exits non-zero if any violation —
  cron-friendly). The **MCP access limits (anti-bulk-exfiltration)** editor moved from
  Settings to the Policy page (same `CFG["limits"]` backing + `rate_gate`; unchanged
  semantics) as the built-in agent-access policy.

### Fixed
- **Web UI: browser Back/Forward no longer exits the app.** The SPA now keeps its active
  tab in history (`?v=<tab>` via `pushState`); Back/Forward moves between the last visited
  tabs instead of leaving the page, and Back on an open dialog just closes it. Restoring a
  view **never auto-reveals a secret** — values are only fetched on an explicit reveal, the
  detail modal is destroyed on Back, and Forward never re-opens it.

## [0.9.3] — 2026-08-26

### Added
- **Risks page — "Overview" tab.** A per-secret risk dashboard fed by a new read-only
  `GET /api/health` endpoint (`health_scan()`). Groups secrets into: ❌ expired,
  ⏰ expiring soon (≤30 days), 🔄 rotation overdue, ⚠️ high-risk reuse, and 🔥 most-used.
  A filter box narrows by project / repo / name / tag. **Clicking any row opens that
  secret's edit form directly.** Expiry is read from an `expires`-like field
  (`expires`/`expiry`/`expires_at`/`expiration`/`valid_until`/`not_after`), parsed as
  ISO date/datetime or unix epoch; usage counts + last-use come from the audit log
  (`access_stats()`), reuse severity from `leak_scan()`. Web-only (human owner); no
  secret values leave the server. The existing **Shell history** scan remains its own
  tab on the same page.

## [0.9.2] — 2026-08-26

### Security
- **`run_with_secrets` (MCP inject) is now rate-gated.** Injection passes `rate_gate`
  in a new all-or-nothing `atomic` mode: the distinct secret names a scope would inject
  count against the agent's rolling `window_quota` (already-disclosed names re-inject
  free; `window_quota=0` = full block). Exceeding the quota **refuses the whole call**
  (no partial env) and audits `inject_denied`. Closes the gap where one scope-wide inject
  bypassed the anti-bulk-exfiltration quota that already covered `list`/`search`.
- **Inject audit now records the executed command.** The `inject` audit `detail` appends
  the `run_with_secrets`/`run` shell command (run through `redact()` so no secret value
  leaks), so the log shows *what ran*, not just which secret names were injected.

### Fixed
- **Audit Logs table:** sticky column headers now stay pinned on scroll (previously only
  the Secrets table had sticky headers). Column widths no longer break when a KEY cell is
  very long — the audit grid uses `table-layout:fixed` with sensible default widths and
  persists manual column resizes.

## [0.9.1] — 2026-08-26

### Changed

- **Dark-theme accent recolored amber → redaction red (`#ff4d4d`).** The old amber-on-black
  wordmark (black `conceal` + amber-boxed `er`) read too close to an unrelated adult-site logo.
  The dark palette now uses a "classified redaction" red across the web UI, TUI (ANSI `203`),
  and the GitHub Pages docs. **Light theme and the matrix theme are unchanged.** Regenerated the
  logo (`logo-512/1024.png`, `logo.svg`), the og-image/hero (`hero.png`), the favicon, and the
  README/docs badges to match.

## [0.9.0] — 2026-08-20

### Added

- **Collections.** An optional free‑form `collection` field on every record — a user‑defined
  grouping axis independent of scope (`tenant/project/env/repo`) and tags. Nesting is a plain path
  string (`backend/payments`); no separate folder model. Filtering matches a collection and its
  sub‑paths. Available everywhere: CLI (`list --collection`, `mv`/`cp --to-collection`, `set --collection`, `dims`), TUI (Collection facet + `M` move / `C` copy keys + editable in the edit
  form), web (filter facet, Collection column, an in‑app collection **picker** — a `<select>` of
  existing collections with a `＋` button to type a new one — in both the editor and the per‑row
  **Move** dialog, plus a per‑row **Duplicate** action), and MCP (`list_secrets`/`set_secret` accept
  `collection`). See `docs/feature-plan.md` for the scope‑vs‑collection‑vs‑tag distinction.
- **Rotation policy.** An optional per‑record `rotation` policy (`every_days` + `mode: generate|manual`). `concealer rotate --due [--dry]` rotates every overdue record whose mode is
  `generate` and has a `value` field, and only *flags* `manual`/multi‑field records so it never
  breaks a provider‑bound credential. Overdue records are badged in `list` and the web grid. Set a
  policy with `set --rotate-days N [--rotate-mode manual]` or the web editor. **This rotates the
  value in the vault only** — rotate it at the provider yourself (or consume the generated value via
  `run_with_secrets`); it is not a provider integration. Run `rotate --due` from cron for
  "automatic" rotation.
- **Off‑machine audit anchor.** `concealer audit anchor [--file F] [--syslog] [--webhook U]` pushes
  the current audit head (`{ts, seq, hash}` — no secret material) to an append‑only, off‑machine
  sink. `audit verify` now compares the local chain against the last external anchor and reports
  `reason: "external_anchor"` if they diverge — catching a full chain re‑forge that the on‑disk
  `audit.key` otherwise permits. Configure once (persisted) and call from cron. New `COMPLIANCE.md`
  maps concealer to the SOC 2 Trust Services Criteria and is explicit that certification is
  organizational, not a tool feature.
- **Guided `init`.** `init` now shows the concealer ASCII banner (accent‑colored on a TTY) and lays
  its output out as numbered onboarding steps (set master password → save recovery codes → next
  steps: token, web, first secret, agent registration, backup).

### Changed

- **CLI/MCP output is now English-only.** All user-facing messages — CLI prompts, errors, `init`
  onboarding, `unlock`/`agent`/`harden`/`recover` output, rate-limit notices, MCP tool descriptions
  and responses, and web API error strings — were translated from Turkish to English. Turkish source
  comments are unchanged. The **TUI and web UI stay bilingual** (TR/EN) — their error/info messages
  follow the active language via `L()` / the `I18N` dict; the import "corrupt file" error is now a
  localized code (`imp_corrupt`) instead of raw text.

## [0.8.1] — 2026-08-19

### Fixed

- **Audit Logs: long values no longer break the table.** A single very long
  cell value (e.g. an `inject` record whose `key` is the comma-joined list of
  every injected secret name) forced the table wider than the viewport, which
  scrolled the whole page — including the fixed header. Cells now wrap
  (`overflow-wrap:anywhere`) and the **Key**/**Detail** columns clamp to 255
  chars with a `… ▾` expand toggle.

### Added

- **Audit Logs: Detail filter.** New multiselect filter on the Detail column
  (alongside Source/Action/Actor/Key).
- The **Key** filter dropdown now lists individual secret names (comma-joined
  `inject` keys are split), and filtering matches rows by membership.

### Changed

- **Audit Logs: date filtering consolidated.** The separate quick-period row
  and the two From/To inputs are merged into a single **Date range** dropdown
  placed first in the filter panel (presets + custom From/To in one popup),
  freeing horizontal room for the Key/Detail filters.

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
- **Settings → MCP access limits now shows a hardening warning.** `GET /api/settings` returns `hardened` (true when no plaintext `keys/age-key.txt` is
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
  secret-looking key name (`secret|token|passw|credential|api_key|access_key| private_key|bearer|pat` — no longer the broad `value|key|id`) **and** a
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

## [0.2.0][0.2.0] — 2026-08-18

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

## [0.1.0][0.1.0]

Initial baseline: single-file local secret manager over SOPS + age.

### Added

- Typed secrets (`api_key` / `database` / `website` / `custom`) with
  `tenant / project / environment / repo` scoping, tags, url, notes, full CRUD.
- CLI, localhost web UI (bilingual TR/EN), and MCP stdio server
  (`list_secrets`, `search_secrets`, `run_with_secrets` — values never exposed).
- HMAC-SHA256-chained audit log; scrypt master-password verifier; passphrase-
  wrapped portable key backup; idle auto-lock; leak scan; folder import; deploy
  renderers.
