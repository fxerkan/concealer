# Concealer — AI-Agent Credential Access: Technical Analysis & Task List

**Author:** Claude Code session (research + design handoff)
**Date:** 2026-09-15
**Purpose:** Design two new concealer capabilities so AI agents can *use* website/login
secrets without the secret value ever entering the model's context — and so the
existing programmatic path (`run_with_secrets`) reliably works for website secrets.
Intended as input for a backlog task to be implemented in a separate session.

---

## 0. TL;DR

Two independent features, different risk/effort profiles:

- **Feature A — Secure Agentic Autofill (fill-without-reveal).** The concealer
  browser extension injects a website/login secret directly into a page's login form,
  over a human-approved, end-to-end-encrypted channel. The agent (and the LLM) never
  see the value. This is the market-standard pattern (see §1) and is the "right" way
  to let a browser-driving agent log in. concealer already has ~70% of the plumbing
  (extension + native host + local HTTP server + audit + agent auth); it lacks the
  content-script + approval-handshake + agent-facing trigger.

- **Feature B — Reliable programmatic delivery of website secrets.** `run_with_secrets`
  **already injects** website/login secrets as env vars — but a **name-sanitization
  bug** (§3) makes them unreferenceable when the secret name contains characters that
  are invalid in POSIX env identifiers (e.g. `grafana-rpifx` → `grafana-rpifx_PASSWORD`).
  Fix that, add a discoverable name-mapping, and optionally add a **session-broker**
  tool (concealer performs the login and hands back a session token/cookie) for the
  exact case that started this: "agent needs an authenticated session to a web app".

**Why this matters (the triggering incident):** an agent needed to log into a
Grafana behind Cloudflare Access. It could not: (1) `run_with_secrets` *seemed* to not
inject the `grafana-rpifx` website secret (actually the hyphenated env name bug), and
(2) even with the value, typing a password into a web form via browser automation is
prohibited by the agent's safety rules. Feature A solves (2) properly; Feature B fixes (1).

---

## 1. Market research — the reference architecture exists

The pattern is **1Password "Secure Agentic Autofill" / "1Password for Claude"**
(announced Oct 2025, Claude integration July 2026). It is exactly Feature A:

- Credentials are injected by the **1Password browser extension** directly into the
  browser's login form. **The password and the MFA OTP never reach the model, its
  context, or Anthropic's systems.**
- Transport is a **new protocol built on the Noise Framework** — an end-to-end
  encrypted channel between the *approving* device (1Password desktop app) and the
  *headless* browser-extension instance.
- **Human-in-the-loop:** when the agent needs to sign in, it sends a request over the
  channel to autofill items matching the target site; this triggers an **approval
  prompt in the desktop app for each autofill**. Only on approval is the item sent
  (encrypted) to the extension, which injects **only the minimum required fields**.
- **Task-scoped / agentic lockdown:** the moment the agent controls the browser, the
  vault locks to *only* the credentials granted for the current task; concealer-style
  "everything in scope" is not exposed. concealer brokers across multiple sites within
  one task so multi-step flows don't re-prompt each step.
- **Anti-phishing:** automatic credential↔site mapping (right creds for the right
  domain), and the extension **scans the page after every autofill to ensure no secret
  remains exposed** in the DOM.
- Pairing validation: the desktop app validates the remote pairing partner and rejects
  untrusted parties.

Sources:
- https://1password.com/blog/closing-the-credential-risk-gap-for-browser-use-ai-agents
- https://www.browserbase.com/blog/1password-agentic-autofill
- https://www.1password.dev/agentic-autofill
- https://1password.com/blog/1password-for-claude
- https://1password.com/press/2026/july/1password-for-claude

**Implication for concealer:** the design target is well-defined and validated. We can
build the same shape, scaled to concealer's local-first / loopback architecture. We do
not need Noise/remote pairing for the local case — the "approving device" and the
"browser" are the same machine, so the channel is loopback + the existing token/HttpOnly
model. (Noise-style pairing becomes relevant only if you later support a remote/headless
browser à la Browserbase — see §6 "Future".)

---

## 2. Current concealer architecture (relevant parts)

Single-file Python 3 stdlib app: `concealer` (~3650 lines). No external deps.
Modes: `concealer mcp` (JSON-RPC stdio), `concealer web [port]` (loopback SPA + `/api`),
`concealer native-host` (Chrome native messaging), `concealer tui`, plus CLI.

| Concern | Where | Notes |
|---|---|---|
| Secret types | `concealer:158–178` (`TYPES`) | 15 types incl. `website`, `login` |
| `website` fields | `concealer:170` | `web_url`(plain), `username`(plain), `password`(secret). **No `totp`.** |
| `login` fields | `concealer:171` | website + `totp`(secret) |
| Injection | `concealer:1616–1655` (`collect_secrets`, `inject_env`) | env-only; **all fields of all types injected** |
| Env naming | `concealer:1634–1637` | `api_key`→bare `NAME`; else `NAME_FIELDUPPER` |
| MCP tools | `concealer:3559–3644` (`MCP_TOOLS`, `_mcp_call`) | list/search/run_with_secrets/set_secret |
| Agent auth | `concealer:1380–1423` | `keys/agents.json`; scrypt-hashed token; only `source=="agent"` may call MCP |
| Rate gate | `concealer:116–155` | per-agent distinct-name disclosure quota; injection is atomic |
| Audit | `concealer:388–441` | HMAC-chained JSONL, `keys/audit.log`, actor/source/action/key |
| Native host | `concealer:2625–2670` | stdio 4-byte-length JSON; launches `concealer web` on demand |
| Extension | `extension/` (`popup.js`, `manifest.json`) | popup + copy-to-clipboard; **no content_scripts, no autofill** |
| Web server | `concealer:3149–3508` | `BaseHTTPRequestHandler`; CSP + anti-rebinding (Host/Origin loopback-only); token via `X-Concealer-Token` header or HttpOnly cookie |
| Web unlock | `concealer:3307–3330` | master password → session token in memory (`_SESSIONS`, `_SESS_KEY`) |

**Extension ↔ app today:** popup.js → `chrome.runtime.sendNativeMessage` → `native-host`
ensures `concealer web` is up on 127.0.0.1:8787 → popup.js does `fetch('/api/...')`
with `X-Concealer-Token`. Manifest permissions: `nativeMessaging`, `storage`,
`clipboardWrite`; host_permissions loopback only. **No `content_scripts`, `scripting`,
`activeTab`, or `tabs` — so it currently cannot touch page DOM.**

---

## 3. ROOT CAUSE — why the website secret "didn't inject" (Feature B bug)

`run_with_secrets` **does** inject `website`/`login` secrets. For a secret named `pg`
of type `database` you get `pg_HOST`, `pg_PASSWORD`, … For `website` you'd get
`NAME_WEB_URL`, `NAME_USERNAME`, `NAME_PASSWORD`.

The failure with `grafana-rpifx` was the **env-var name**:

```python
# concealer:1636-1637
for fn, fv in e["fields"].items():
    kv[f"{name}_{fn.upper()}"] = str(fv)     # name is used verbatim
```

→ produces `grafana-rpifx_WEB_URL`, `grafana-rpifx_USERNAME`, `grafana-rpifx_PASSWORD`.

Hyphen (`-`) is **not a valid POSIX shell identifier char**. Consequences observed:
- `compgen -e` / `printenv | sed` **do not list** these names (not valid identifiers),
  so probing "what got injected" showed nothing → looked like "website not injected".
- `${!varname}` indirection and `$grafana-rpifx_PASSWORD` cannot reference them.
- Only awkward forms like `env | grep '^grafana-rpifx_'` or `python -c 'os.environ[...]'`
  can read them — which no caller expects.

So the injector silently produces **unusable** env vars for any secret whose *name*
(or *field name*) contains characters outside `[A-Za-z0-9_]`, or that starts with a digit.

**This is the highest-value, lowest-effort fix.** See Feature B tasks.

---

## 4. FEATURE A — Secure Agentic Autofill (fill-without-reveal)

### 4.1 Goal & threat model

Let an AI agent that is driving a browser (Claude in Chrome / computer-use / any MCP
browser tool) log into a site using a concealer `website`/`login` secret, such that:
- the **value never enters the agent/LLM context** (only "filled: ok/failed"),
- **a human approves each fill** (or a task-scoped grant),
- fill targets are **domain-matched** to the secret (anti-phishing),
- after fill, concealer verifies the secret isn't left exposed in the DOM,
- everything is **audited**.

Trust boundary: the **concealer extension content-script** and the **concealer app**
are trusted; the **agent** is untrusted w.r.t. secret values. The agent may *ask* for a
fill and may *observe* that a fill happened, but cannot read the value.

### 4.2 Architecture (local-first)

```
[Agent/LLM]                         [Concealer app]                 [Browser]
   |  (1) request_web_login             (web server :8787)          concealer extension
   |    {secret hint, tab origin} --->  approval gate               (content-script)
   |                                     |  (2) human approves         ^
   |                                     |  (3) push fill job  --------|  (4) inject into
   |  (5) {status: filled|denied} <----- |     (value, field map)     |     login form DOM
   |     NEVER the value                 |  (6) post-fill DOM scan <---|  (5') report result
```

Two viable transports for step (3)/(5'):

- **A1 (recommended): extension long-polls / SSE the concealer web server.** The
  content-script (or the extension service worker) holds an authenticated channel to
  `127.0.0.1:8787`. When a fill is approved, the app hands the value to the extension
  over that loopback channel (never through the agent). Reuses existing token/HttpOnly
  + anti-rebinding machinery. **No page JS ever receives the value** — the content
  script sets `input.value` in an isolated world and dispatches events.
- **A2: native messaging.** The app pushes the fill job to the extension via the
  existing `native-host` stdio channel; extension relays to its content-script. Also
  fine; slightly more moving parts (service-worker ↔ native host lifetime).

The **agent's trigger** (step 1) is a **new MCP tool** (§4.4) OR, ideally, concealer
registers as a **provider for the host's credential-request tool** (Claude Code /
Claude-in-Chrome already define a "dedicated credential-request tool" abstraction —
this is the same slot 1Password plugged into). Supporting the host abstraction is the
long-term integration; the MCP tool is the concealer-native fallback that works today.

### 4.3 Approval & scoping

Reuse & extend:
- **Approval surface:** the concealer **web UI** (already the unlock/settings surface)
  shows a modal "Agent `claude-code` wants to sign in to `grafana.fxerkan.com` using
  `grafana-rpifx` (user: …). [Approve once] [Approve for this task] [Deny]". Desktop
  notification optional (macOS `osascript`/`terminal-notifier`).
- **Domain match (anti-phishing):** compare the *tab's registrable domain* (agent-
  supplied, then re-verified by the extension from `location.origin`, which the agent
  cannot spoof) against the secret's `web_url` host. Refuse / warn on mismatch.
- **Task scope:** issue a short-lived **grant token** bound to (agent, target domain,
  secret id, expiry, max-uses). "Approve for this task" lets multi-step/multi-page
  flows fill without re-prompting until expiry. Store in memory only (like `_SESSIONS`).
- **Rate/audit:** fills go through the existing `rate_gate` and `audit()` (`action:
  "web_autofill"`, actor=agent, key=secret name, detail=domain). Never log the value.

### 4.4 New MCP tool (agent-facing)

```jsonc
// name: "request_web_login"
{
  "description": "Ask concealer to autofill a website/login secret into the CURRENT browser tab, without exposing the value. A human approves; concealer's extension injects the credentials into the page's login form. Returns only status.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "target_url": { "type": "string", "description": "URL/origin of the login page the agent is on" },
      "name":       { "type": "string", "description": "Optional exact secret name; else concealer matches by domain" },
      "project": {"type":"string"}, "environment": {"type":"string"}, "repo": {"type":"string"}, "tenant": {"type":"string"}
    },
    "required": ["target_url"]
  }
}
// returns: "filled: <name> into <domain> (fields: username,password[,totp])"
//        | "denied by user" | "no matching secret" | "domain mismatch: secret is for X"
//        | "pending: waiting for the concealer extension on this tab"
```

Notes:
- The tool returns a **status string only** — no values, ever.
- It must correlate "the current tab" with the extension. Simplest: the agent passes
  `target_url`; concealer enqueues a job keyed by domain; the extension content-script
  running on that tab claims the job after verifying its own `location`. (Optionally the
  agent passes a tab id from the browser MCP if available.)

### 4.5 Extension changes

- `manifest.json`: add `"content_scripts"` (or `"scripting"` + `"activeTab"` for
  on-demand injection — preferred, less ambient access), keep host_permissions loopback.
- **Content script (isolated world):** detect login form (heuristics: `input[type=
  password]`, nearest username field, ARIA/autocomplete attributes; reuse well-known
  selectors), receive the fill job from the service worker, set values via the native
  setter + dispatch `input`/`change` events so SPA frameworks register them, then run
  the **post-fill DOM scan** (assert the value isn't reflected into attributes, hidden
  fields, or logged) and report status. Never `postMessage` the value to page world.
- **Service worker:** hold the authenticated loopback channel (A1) or native channel
  (A2); pass the job to the content script; relay status back to the app.
- **Approval affordance:** if you want the approval in the extension popup instead of
  the web UI, add a job-review view; but centralizing approval in the web UI reuses the
  master-unlock trust and keeps one audit surface.

### 4.6 Security requirements (must-haves)

1. Value flows **app → extension → DOM** only; never app → agent, never page-world JS.
2. **Human approval** per fill (or per task grant); default-deny on domain mismatch.
3. **Origin re-verification** in the content script (agent-supplied URL is a hint, not
   trusted); the content script asserts `location.origin` matches the approved domain.
4. **Post-fill exposure scan**; on failure, surface a warning and audit it.
5. **Task-scoped grants** expire (time + max-uses); memory-only.
6. Keep **anti-rebinding** (Host/Origin loopback+chrome-extension only) on the channel.
7. TOTP: for `login` type with `totp`, compute the OTP **in the app or content script**,
   never return the seed. (Add TOTP/RFC-6238 to `login` handling.)
8. Everything **audited** (fill requested / approved / filled / denied / exposed).

### 4.7 Task breakdown (Feature A)

- [ ] **A-0 Spike:** confirm content-script value injection works on a couple of real
  login pages (incl. an SPA) without the value hitting page world. De-risks 4.5.
- [ ] **A-1 Grant model:** in-memory task-grant store (agent, domain, secret id, exp,
  max_uses); helpers to mint/verify/expire. (~`concealer` core, near `_SESSIONS`.)
- [ ] **A-2 Job queue + channel:** app-side queue of pending fill jobs keyed by domain;
  loopback SSE/long-poll endpoint `GET /api/autofill/jobs` + `POST /api/autofill/result`
  (token-auth, anti-rebinding). (A1 transport.)
- [ ] **A-3 MCP tool `request_web_login`:** enqueue job, block on approval+result (with
  timeout), return status-only. Wire `rate_gate` + `audit`.
- [ ] **A-4 Approval UI:** web-UI modal (+ optional desktop notification) with once/
  task/deny; domain-match display; wired to the grant model.
- [ ] **A-5 Extension manifest + service worker:** add `scripting`/`activeTab`; SW holds
  channel, claims jobs, injects via content script.
- [ ] **A-6 Content script:** form detection, isolated-world fill, event dispatch,
  post-fill DOM exposure scan, status report.
- [ ] **A-7 Domain matching / anti-phishing:** registrable-domain compare (secret
  `web_url` ↔ tab origin); default-deny mismatch; audit.
- [ ] **A-8 TOTP for `login`:** RFC-6238 in app/content-script; never expose seed.
- [ ] **A-9 Audit actions:** `web_autofill_request/approve/fill/deny/exposed`.
- [ ] **A-10 Docs + threat model** in `docs/` (mirror `chrome-extension.md`).
- [ ] **A-11 (optional) Host integration:** implement concealer as a provider for the
  Claude Code / Claude-in-Chrome credential-request abstraction, so no concealer-
  specific MCP tool is needed. Track the host's provider API.

---

## 5. FEATURE B — Reliable programmatic delivery of website secrets

Two sub-parts: **B1 fix the env-name bug** (required), **B2 session-broker** (the
elegant answer to "agent needs an authenticated web session"). B1 is small and high value.

### 5.1 B1 — Env-var name sanitization (bug fix)

Problem: §3. Fix the naming in `inject_env` (`concealer:1634-1637`).

Design:
- Sanitize each emitted env name to a valid identifier: uppercase; replace any char
  not in `[A-Z0-9_]` with `_`; if it starts with a digit, prefix `_`.
  `grafana-rpifx` + `password` → `GRAFANA_RPIFX_PASSWORD`.
- **Collision safety:** two different names could sanitize to the same identifier
  (`a-b` and `a.b`). Detect collisions within a single injection and either suffix a
  short hash or fail loudly listing the conflict. (Rare; but must not silently clobber.)
- **Discoverability:** because the emitted name no longer equals the secret name, the
  agent can't guess it. Mitigate by **printing the mapping** (names only, never values)
  to the child via a well-known env var, e.g. `CONCEALER_INJECTED=GRAFANA_RPIFX_USERNAME,
  GRAFANA_RPIFX_PASSWORD,GRAFANA_RPIFX_WEB_URL` and/or returning the injected identifier
  list in the `run_with_secrets` tool result (already returns a `[scope]` header — add
  an "injected: …" line). This is safe (identifiers, not values) and removes all guessing.
- Optionally support an explicit **alias** per secret (`field_meta`/record `env_alias`)
  so the owner can pin `grafana-rpifx` → `GRAFANA` for stable scripts.
- **api_key** bare-name path (`kv[name]=…`) has the same bug for hyphenated api_key
  names — sanitize there too.
- Backward-compat: this changes emitted names. Gate behind a minor version note; the
  old hyphenated names were unusable anyway, so risk is low. Consider emitting BOTH the
  sanitized and (for valid-identifier names) the legacy name for one release.

Tasks:
- [ ] **B1-1** `env_key(name, field=None)` sanitizer + unit tests (hyphen, dot, leading
  digit, unicode, collision).
- [ ] **B1-2** Use it in `inject_env` for both `api_key` and multi-field branches.
- [ ] **B1-3** Emit `CONCEALER_INJECTED` (mapping, names only) + add "injected:" line to
  the `run_with_secrets` MCP result.
- [ ] **B1-4** Optional `env_alias` on records; honored by the sanitizer.
- [ ] **B1-5** Docs: document the naming rule in `cli-reference.md` + MCP tool desc.
      Update the MCP `run_with_secrets` description to say website/login are supported
      and how the env names are derived.

### 5.2 B2 — Session-broker tool (optional, high-leverage)

The triggering need was not "give me the password" but "give me an **authenticated
session** to this web app". concealer can perform the login server-side and return a
**session token/cookie**, so the agent gets usable auth **without the password**.

New MCP tool sketch:

```jsonc
// name: "web_login_session"
{
  "description": "Perform a server-side login using a stored website/login secret and return only the resulting session (cookie/bearer). The password is never returned.",
  "inputSchema": {
    "type":"object",
    "properties": {
      "name": {"type":"string"},
      "login_url": {"type":"string", "description":"form POST URL or auth endpoint"},
      "flow": {"type":"string","enum":["form_post","http_basic","bearer_exchange"],"default":"form_post"},
      "field_map": {"type":"object","description":"form field names, e.g. {user:'user',pass:'password'}"},
      "project":{"type":"string"},"environment":{"type":"string"},"repo":{"type":"string"}
    },
    "required":["name","login_url"]
  }
}
// returns: {"cookies":[{"name":"grafana_session","value":"...","domain":"...","secure":true,"httponly":true}], "expires":"..."}
//   -> the SESSION token is returned (that's the point), but NEVER the password.
```

Design notes / caveats:
- Handles **CSRF-token flows** (GET login page, scrape token, POST) for `form_post`.
- **MFA/OTP:** if the secret has `totp`, compute and submit it. Interactive MFA
  (push/email OTP like Cloudflare Access) is out of scope — return a clear "manual MFA
  required" error. (This is why the Grafana-behind-Cloudflare-Access case still needs
  Feature A / human step for the CF Access email OTP layer.)
- Return value **is** a session credential — treat it as a (short-lived) secret: audit,
  optionally rate-gate, and document that the agent now holds a session (lower blast
  radius than the password, and revocable/expiring).
- This is more work and more fragile than B1; ship B1 first.

Tasks:
- [ ] **B2-1** `form_post` flow with CSRF-token scrape; `http_basic`; `bearer_exchange`.
- [ ] **B2-2** TOTP submission when secret has `totp`.
- [ ] **B2-3** MCP tool `web_login_session` + audit + (optional) rate-gate.
- [ ] **B2-4** Clear errors for interactive-MFA / SSO / IdP redirects (unsupported).
- [ ] **B2-5** Docs + examples (Grafana form login as the worked example).

---

## 6. Recommended sequencing & effort

| Phase | Items | Effort | Value |
|---|---|---|---|
| **P0 (quick win)** | B1-1…B1-5 (env-name sanitization + mapping output) | S | High — fixes the exact bug; unblocks all hyphenated/website secrets today |
| **P1 (core Feature A)** | A-0 spike → A-1…A-7, A-9 | M–L | High — the "right" browser-login capability, no value to model |
| **P2** | A-8 (TOTP), A-10 (docs), B2 (session broker) | M | Medium |
| **P3 (future)** | A-11 host provider integration; remote/headless pairing (Noise) for Browserbase-style setups; per-secret approval policies | L | Strategic |

**Future (P3) — remote/headless:** the local design uses loopback trust. If you later
want an agent on a *different* machine or a headless cloud browser (Browserbase model),
adopt the Noise-framework pairing 1Password uses: an E2E channel between the approving
concealer app and the remote extension instance, with pairing-partner validation. The
local loopback design in §4 is forward-compatible (swap the transport, keep the job/
grant/approval/audit core).

---

## 7. Open questions for the implementing session

1. Approval UX: centralize in the **web UI** (reuses unlock trust, one audit surface) —
   confirm, vs. building an approval view in the extension popup.
2. Transport for Feature A: **A1 loopback SSE/long-poll** (recommended) vs **A2 native
   messaging**. A1 reuses the anti-rebinding'd web server; pick one.
3. Do we target the **host credential-request abstraction** (A-11) now or ship the
   concealer-native MCP tool first? (Recommend: MCP tool first, host provider later.)
4. B1 backward-compat: emit **both** legacy + sanitized names for one release, or clean
   break with a CHANGELOG note? (Legacy hyphenated names were unusable → lean clean break
   + `CONCEALER_INJECTED` mapping.)
5. Should `website` gain a `totp` field (today only `login` has it), or steer users to
   `login` for anything needing MFA?
6. Session-broker (B2): is it in scope, or is Feature A enough for browser logins and B1
   enough for CLI/API logins?

---

## 8. Appendix — exact code touch-points

- Env naming bug: `concealer:1634-1637` (inside `inject_env`, def ~`1640`).
- MCP tool registry: `MCP_TOOLS` `concealer:3559-3578`; dispatch `_mcp_call` `~3580-3626`;
  add branch + schema entry there.
- Rate gate to reuse: `rate_gate()` `concealer:116-155`; audit: `audit()` `388-441`.
- Web server + endpoints: `concealer:3149-3508` (add `/api/autofill/*`); keep CSP +
  anti-rebinding `3163-3184`; token check `_tok()` `3185-3194`.
- Native host (if A2): `native_host()` `concealer:2625-2670`.
- Extension: `extension/manifest.json` (add `scripting`/`activeTab` + a content script),
  `extension/popup.js` / service worker (new channel + job relay), new `content.js`.
- Session token model to mirror for grants: `_SESSIONS`/`_SESS_KEY` `concealer:3317-3318`.
- Secret type defs (add `totp` to `website` if chosen): `TYPES` `concealer:158-178`.
