# Concealer — OWASP Cheat Sheet Red-Team Assessment

**Scope:** `concealer` (Python3 stdlib single-file: CLI + local HTTP web server on `127.0.0.1` + MCP stdio server + Chrome native-messaging host), `webui.html` (web SPA), `extension/` (Chrome MV3 extension).
**Method:** Manual white-box source review from an attacker's perspective, mapped to 10 OWASP Cheat Sheets. Independent second pass by Google Gemini 2.5 Pro (see §12 comparison).
**Threat model note:** Concealer is a *local-only, single-user* tool. Its own docs state the ceiling honestly: a full filesystem-root attacker who already owns the machine can defeat most protections (on-disk `audit.key`, in-memory plaintext). Findings below are graded *within* that stated model — i.e. attacks that do **not** require pre-existing root: a malicious web page in the user's browser, a malicious/compromised MCP agent, a hostile secret value, another local user, or a non-root local process.

> ⚠️ This is an internal pre-outsourcing self-assessment. Treat the FAIL/PARTIAL items as the starting backlog for the external firm, not as a clean bill of health.

---

## Severity summary (prioritized)

| # | Finding | Severity | Cheat sheet | Status |
|---|---------|----------|-------------|--------|
| F1 | `javascript:`/`data:` URI in a secret's `url` field renders as a clickable link in the SPA — stored XSS, cross-actor (malicious MCP agent → human owner) | **High** | HTML5, Injection | FAIL |
| F2 | No `Content-Security-Policy` anywhere (no meta, no header); SPA is built entirely on `innerHTML` + inline `on*` handlers, so there is zero XSS backstop | **High** | HTTP Headers, HTML5 | FAIL |
| F3 | No security response headers on any server reply (`X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Cache-Control` on secret JSON) | **Medium** | HTTP Headers | FAIL |
| F4 | No `Origin`/`Host` allow-list on the localhost API → DNS-rebinding exposure; only SameSite=Strict cookie stands between a browser and the API | **Medium** | Session, HTTP Headers | PARTIAL |
| F5 | Fragile manual JS-string escaping in `copyText('${esc(v)...}')` — a non-secret field value ending in `\` breaks out → DOM XSS | **Medium** | HTML5, Injection | PARTIAL |
| F6 | scrypt cost `N=16384 (2^14)` for the master password is below current OWASP guidance (`2^17`) for a KDF guarding an at-rest secret vault | **Medium** | Forgot Password / Password Storage | PARTIAL |
| F7 | `verify_master()` **fails open** (returns `True`) when `keys/master.json` is absent → deleting one file disables the 2nd-factor gate on delete/export/settings | **Low/Med** | Session, Forgot Password | PARTIAL |
| F8 | `verify_master()` gate on sensitive ops (settings/export/delete) is **not** rate-limited (only `/api/unlock` is) | **Low** | Forgot Password, Session | PARTIAL |
| F9 | `target="_blank"` links without `rel="noopener"` (2 sites) — reverse tabnabbing | **Low** | HTML5 | PARTIAL |
| F10 | Redaction (`redact()`) is exact-substring only → a child command that transforms a secret (base64/url-encode/split) leaks it past the MCP output filter | **Low (inherent)** | Secrets Mgmt, Secure-Coding-with-AI | PARTIAL |
| F11 | Brute-force cooldown state is per-process in-memory → a local restart of the web server resets it | **Low** | Session | PARTIAL |

Nothing rated Critical was found. F1/F2 together are the headline: a single hostile `url` value + absent CSP = script execution in the vault's own origin.

---

## 1. Browser Extension Vulnerabilities — **PASS (strong)**

**Evidence:** `extension/manifest.json`, `extension/popup.js`.

- **Manifest V3**, minimal permissions: `nativeMessaging`, `storage`, `clipboardWrite`. No `tabs`, no broad host access — `host_permissions` are pinned to `http://127.0.0.1:8787/*` and `localhost:8787/*` only.
- **No content scripts, no `web_accessible_resources`, no remote code.** Nothing is injected into arbitrary pages, so the classic extension XSS-into-page surface is absent.
- **Token handling is correct:** the unlock token lives in `chrome.storage.session` (memory-only, cleared on browser close), sent as `X-Concealer-Token`. It is never written to `storage.local`. Prefs in `storage.local` are non-sensitive (theme, timeouts).
- **DOM building uses `textContent`** for all secret/record-derived data (`render()`, `buildFields()`); the few `innerHTML` writes (`s_ver`, `s_info`) interpolate only trusted internal values (port, version, idle).
- **Native-messaging trust boundary is enforced by Chrome:** the host manifest's `allowed_origins` is limited to specific extension IDs (`install_chrome_extension`, `concealer:2642`), and the native host (`native_host`, `concealer:2574`) accepts only `{"cmd":"ensure"}`, coerces `port` to `int`, and shells out to nothing attacker-controlled.
- **`build.py`** strips the self-signed `key` for the store build — correct.

**Minor / hardening:** the popup has no `<meta http-equiv="Content-Security-Policy">`, but MV3 applies a strict default extension CSP (no inline eval, `script-src 'self'`), so this is low-impact. Clipboard auto-clear is implemented (good).

---

## 2. Forgot Password — **PASS (with F6/F7/F8 caveats)**

**Evidence:** `write_master`/`verify_master` (`concealer:1226`), recovery codes (`concealer:1276`+), `passwd`/`recover`.

- Correct model for a local tool: **no email/security-questions/user-enumeration surface** (single user, no accounts). "Reset" = **8× ~100-bit one-time recovery codes**, shown once, stored only as `scrypt` hash + code-wrapped age key (`write_recovery`).
- **`passwd` requires and consumes a recovery code as a 2nd factor** — a stolen master password *alone* cannot rotate the key/take over. This is exactly the anti-takeover control the cheat sheet wants.
- Codes use a low-confusion alphabet with no modulo bias (`256 % 32 == 0`); comparisons use `hmac.compare_digest` (constant-time). ✅

**Gaps:**
- **F6 — KDF strength.** `_scrypt` uses `N=16384 (2^14), r=8, p=1` (`concealer:1223`). OWASP Password Storage guidance for scrypt is `N=2^17, r=8, p=1` minimum. For a KDF that is the sole gate on an at-rest secret vault, 2^14 is under-provisioned against offline cracking of `master.json`/the age backup. **Recommend bumping to `2^16`–`2^17`** and persisting `n/r/p` (already stored per-record, so migration is easy).
- **F7 — fail-open.** `verify_master` returns `True` when neither `master.json` nor the backup exists (`concealer:1237`). Intended for the pre-init state, but it means an attacker who can delete `keys/master.json` neutralizes the 2nd-factor check on delete/export/settings. Recommend failing closed once a vault is initialized.
- **F8 — no throttling on `verify_master`.** Only `/api/unlock` has the 5-fails/300s cooldown (`_unlock_note`, `concealer:3003`). The `verify_master` gate on `/api/settings`, `/api/export`, `/api/secret DELETE` is unthrottled — an attacker holding a live session can grind the master password there. Low impact (needs an already-unlocked session) but should share the cooldown.

---

## 3. HTML5 Security — **FAIL**

**Evidence:** `webui.html`.

- **F1 (High) — `javascript:` URI stored XSS.** The SPA renders a secret's `url` as a live link with **no scheme validation**: `` `<a href="${esc(e.url)}" target="_blank">` `` (`webui.html:1848`, `:2001`). `esc()` (`webui.html:926`) escapes `& < > "` only — it does **not** restrict the URL scheme. A `url` value of `javascript:fetch('/api/secrets').then(...)` becomes a one-click script-execution in the vault's own origin. **Cross-actor:** `set_secret` over MCP accepts `url` (`_mcp_call`, `concealer:3455`), so a **compromised/malicious AI agent can plant the payload and the human owner triggers it** by clicking ↗ in the web UI. This is the most serious finding.
- **F2 (High) — no CSP.** `webui.html` has only `charset`/`viewport` metas; the server sets no CSP header. The entire SPA is `innerHTML` + inline `onclick=` handlers (dozens: `webui.html:1848`, `:1895`, `:1921`, `:2198`…), so a strict CSP can't simply be bolted on — but that also means **there is no backstop** if any injection (F1/F5) fires.
- **F5 (Med) — fragile JS-string escaping.** `copyText('${esc(v).replace(/'/g,"\\'")}', …)` (`webui.html:1997`) hand-escapes a non-secret field value into a single-quoted JS string inside an `onclick`. `esc()` doesn't touch backslash, so a value ending in `\` turns `\'` into an escaped-then-broken quote → breakout / DOM XSS. Newlines in the value also break the string.
- **F9 (Low) — reverse tabnabbing.** 2× `target="_blank"` without `rel="noopener"` (`webui.html:1848`, `:2001`); other external links (`:1602`, `:1618`, `:1623`) correctly add it.
- **Aside (not security):** `copyText` is declared twice (`webui.html:1663` and `:2007`) — the second shadows the first. Harmless collision, worth cleaning up.

**Positives:** record-derived data is otherwise consistently wrapped in `esc()` before hitting `innerHTML`; audit-detail is passed as JSON with `'`→`&#39;` inside a single-quoted attribute (`:2198`), which holds. The favicon uses an inline SVG data-URI (fine). No `postMessage`, no `localStorage` of secret values, no `document.write`/`eval`.

**Fix priority:** (1) allow-list URL schemes to `http/https/mailto` before rendering `href` (reject/neutralize others); (2) build values into DOM via `textContent`/`dataset` + `addEventListener` instead of inline handlers, which then *lets* you add a real CSP.

---

## 4. HTTP Headers — **FAIL**

**Evidence:** `_json`/`do_GET` (`concealer:3053`, `:3062`).

Every response sets only `Content-Type` (+ `Set-Cookie`/`Content-Disposition` where relevant). **Missing across the board:**
- **F2** `Content-Security-Policy` — see §3.
- **F3** `X-Content-Type-Options: nosniff` — absent; JSON/HTML could be MIME-sniffed.
- **F3** `X-Frame-Options: DENY` / CSP `frame-ancestors 'none'` — absent; the SPA is framable → clickjacking of the unlocked UI by a local malicious page.
- **F3** `Referrer-Policy: no-referrer` — absent.
- **F3** `Cache-Control: no-store` on secret-bearing JSON (`/api/secrets`, `/api/secret/*?reveal=1`) — absent; revealed values may land in the browser disk cache.

**Positives:** the unlock cookie is `HttpOnly; SameSite=Strict; Path=/` (`concealer:3167`). `Secure` is correctly omitted (plain-HTTP loopback; `Secure` would break it). These are cheap to add centrally in `_json`/the HTML handler and cost nothing functionally.

---

## 5. HTTP Strict Transport Security — **N/A (documented)**

Concealer serves plain HTTP bound to `127.0.0.1` only (`ThreadingHTTPServer(("127.0.0.1", port))`, `concealer:3347`). Loopback traffic never crosses a network, so TLS/HSTS do not apply and adding them would be theatre. **This is the correct choice** — the relevant control is the loopback bind + no `0.0.0.0` exposure, both present. The one adjacent risk (a browser reaching the loopback API from a hostile origin) is a same-origin/DNS-rebinding problem, covered by F4, not HSTS.

---

## 6. Injection Prevention — **PARTIAL**

- **SQL/template injection:** N/A — no database, no server-side templating; storage is SOPS-encrypted JSON.
- **XSS (client-side injection):** the real injection exposure — see F1/F5 in §3.
- **Path handling:** `/api/browse` (`concealer:3123`) does `os.path.abspath(os.path.expanduser())` and lists **directory names only** (never file contents), gated by a valid session; it discloses FS layout to the *authenticated owner* only. Acceptable but note it walks outside any root.
- **Log injection:** audit lines are `json.dumps`'d objects (`audit`, `concealer:365`), so newlines in `detail` are escaped — no forged log lines. ✅
- **Header injection:** `Content-Disposition: filename={fn}` (`concealer:3141`) uses only server-fixed `audit.csv`/`audit.json` — not attacker-controlled. ✅
- **Field-name injection:** `_clean_fields`/`_bad_field_name` reject secret-looking field *names* on set (`concealer:631`) — a nice anti-leak touch.

---

## 7. OS Command Injection Defense — **PASS**

**Evidence:** all `subprocess` call sites (`concealer:197,218,223,880,992,1126,1139,1208,1449,1890,1905,2598`).

- **Every external call uses argv lists, not `shell=True`.** `sops`, `age`, `age-keygen`, `git`, `logger`, `osascript`, `zenity`/`kdialog`, `powershell` are all invoked as `["prog", arg, …]`, so shell metacharacters in secret values/paths are inert.
- **The two `sh -c` uses are safe:**
  - Clipboard auto-clear `sh -c f"sleep {CLIP_CLEAR}; … {' '.join(tool)}"` (`concealer:1905`): `CLIP_CLEAR` is an **int module constant** (`=45`, `concealer:1745`) and `tool` is a fixed literal list — no user data enters the string.
  - MCP `run_with_secrets` runs `/bin/sh -c <command>` (`concealer:3441`) — this is **arbitrary command execution by design** (the agent explicitly asks to run a command). It is gated by the registered-agent token and rate-limited; secret values are injected via the child env and `redact()`-ed from output. Not an injection *flaw*.
- **`age` via `expect`:** args are `shlex.quote`'d into the spawn line (`_age_pw`, `concealer:1208`); the passphrase is passed through the `CONCEALER_PW` env var, not the command line. (Minor: env vars are readable by same-user processes — acceptable in the local model.)

No command-injection vector found. Strongest area of the codebase.

---

## 8. Secrets Management — **PASS (strong, with F10)**

**Evidence:** key-at-rest (`_unlock_key`, `_env`, `concealer:1402/185`), tokens (`mint_token`/`resolve_token`, `:1354`), MCP gate (`_mcp_call`, `:3419`), `redact` (`:1657`).

- **Encryption delegated to SOPS + age** — no home-grown crypto (per policy). The only crypto Concealer performs is stdlib `scrypt` (verifier) + HMAC-SHA256 audit chain.
- **Key-at-rest:** on a hardened vault the age private key is **not** on disk in plaintext; it's stored age-encrypted under the master password (`age-key.txt.age`) and passed to sops via `SOPS_AGE_KEY` **in memory**, never a temp file (`_env`, `concealer:187`). Resolution order (cache → `CONCEALER_TOKEN` → legacy file → TTY) is sound; legacy plaintext-key vaults still work.
- **Tokens:** the token value stays client-side; only `scrypt(token)` + token-wrapped key are on disk (`keys/agents.json`). Revoke/expiry honored (`_find_token`). CLI/human tokens TTL 8h; agent tokens long-lived + revocable.
- **MCP least-privilege & anti-exfiltration:** `_mcp_call` **fails closed** unless the token is a *registered agent* (`source=="agent"`); `rate_gate` caps `per_call` rows and distinct-name `window_quota` across list+search, persisted to `keys/ratestate.json` (names+timestamps only, never values). `run_with_secrets` supports `names=` for narrow injection. This is a genuinely good agent-exfiltration defense.
- **In-memory zeroization:** honestly documented as best-effort only (`_lock_clear`, `concealer:3009`) — CPython won't wipe heap/swap. Correct to disclose; a true fix needs `mlock`/secure buffers (out of scope for a stdlib tool).

**Gap — F10 (inherent):** `redact()` (`concealer:1657`) removes secrets from MCP output by **exact substring replace**. A child command under `run_with_secrets` that base64-encodes, URL-encodes, uppercases, or splits the injected value will emit a form `redact` won't catch → the transformed secret reaches the agent. This is a fundamental limit of inject-then-redact, not a bug, but it should be documented as a residual risk (the model can reconstruct a secret it can transform). Mitigations are partial (redact common encodings) — the real control is the `names=`/scope narrowing already in place.

---

## 9. Secure Coding with AI — **PASS**

**Evidence:** MCP contract (`_mcp_call`, `MCP_INSTRUCTIONS` `concealer:3389`), `rate_gate`, `redact`.

Concealer is itself an "AI handling secrets" product, and its MCP surface follows the cheat sheet's spirit well:
- **The agent never receives plaintext by default** — `list/search` return masked rows, values inject into a child env and are redacted from output.
- **Fail-closed authЗ:** unregistered token → access denied; every MCP call audited with `source=mcp`, `actor=<agent>`.
- **Least-privilege is enforced *and* advertised** — the `initialize` `instructions` and tool descriptions tell agents to pass `names=` and narrow scope; `rate_gate` punishes bulk enumeration.
- **Prompt-injection resistance:** an agent can't escalate — it can't read the age key, can't disable the rate gate (that's a master-password web action), can't self-register.

Residual: F10 (redaction bypass by transformation) is the main AI-specific leak path; and a *human* running the CLI with an agent token is subject to the same quota (`_cli_actor`) — good.

---

## 10. Session Management — **PARTIAL (strong core, F4/F11)**

**Evidence:** `serve_web`/`valid`/`remaining` (`concealer:3020`+), unlock (`:3145`), `_lock_clear`.

- **Token entropy:** `secrets.token_urlsafe(18)` = 144-bit session token (`concealer:3158`). ✅
- **No session fixation:** a fresh token is minted on each successful unlock. ✅
- **Idle auto-lock is a *hard* fixed lifetime** — activity does **not** slide the TTL (`valid`, `concealer:3028`); on expiry the session **and the in-memory age key** are dropped + `gc.collect()`. Both server timer and client timer enforce it. ✅
- **Logout** (`/api/lock`) clears server-side session + key. ✅
- **Brute-force:** 5 consecutive unlock fails → 300s cooldown, returns HTTP 429 (`_unlock_note`, `concealer:3003`). ✅
- **Cross-origin cookie theft:** `HttpOnly` blocks JS theft; `SameSite=Strict` blocks cross-site CSRF cookie riding. ✅

**Gaps:**
- **F4 (Med) — no `Origin`/`Host` validation → DNS rebinding.** The server trusts any `Host`/`Origin`. SameSite=Strict is the *only* thing stopping a malicious web page (or a rebinding attack that makes `evil.com` resolve to `127.0.0.1`) from driving the API in the victim's browser. Cookies are origin-bound so rebinding won't carry the cookie, but the defense would be far more robust with an explicit `Host ∈ {127.0.0.1, localhost}:port` + `Origin` allow-list, rejecting everything else. Cheap to add.
- **F11 (Low) — brute-force state is in-memory** (`_UNLOCK_FAIL` dict): killing/restarting the local web server resets the 5-fail counter. Local-only, low impact, but a persistent counter would close it.

---

## 11. Consolidated remediation backlog (for the outsourced firm)

**Do first (High):**
1. **F1** — URL-scheme allow-list (`http`/`https`/`mailto`) before rendering any `href` from record data; neutralize `javascript:`/`data:`/`vbscript:`.
2. **F2** — refactor the SPA off inline `on*` handlers → `addEventListener`, then ship a real `Content-Security-Policy` (`default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'`).

**Do next (Medium):**
3. **F3** — add `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, and `Cache-Control: no-store` on secret responses (central, in `_json` + HTML handler).
4. **F4** — `Origin`/`Host` allow-list on the API (anti-DNS-rebinding).
5. **F5** — stop hand-escaping into JS strings; use `dataset` + event delegation.
6. **F6** — raise scrypt to `N=2^16`–`2^17`.

**Do when convenient (Low):**
7. **F7** fail closed post-init; **F8** throttle `verify_master`; **F9** add `rel="noopener"`; **F10** document + optionally redact common encodings; **F11** persist brute-force state.

**Explicitly acceptable (keep documented):** loopback-only HTTP (no HSTS), best-effort in-memory zeroization, on-disk `audit.key` ceiling, redaction-by-substring residual — all already honestly disclosed in `docs/security.md` and code comments.

---

## 12. Second opinion — Google Gemini 2.5 Pro (independent pass) & comparison

I ran the *same* 10-cheat-sheet prompt through Gemini 2.5 Pro (`gemini-cli`, API-key auth) against the same source tree, blind to this report. The comparison is instructive — and a caution about trusting a single automated auditor.

### Where we agree (both flagged, real)
- **No CSP** → both rank it High. (my F2 = Gemini #2)
- **Missing security headers** (`X-Content-Type-Options`, `X-Frame-Options`) → both. (my F3 = Gemini #5)
- **`innerHTML`-heavy SPA is fragile without CSP** → both. (my §3 = Gemini #4/#7)
- **scrypt work factor below OWASP** → both. (my F6 = Gemini #6) — though Gemini said `N=2^15`; the **actual value is `N=2^14` (16384)**, i.e. *weaker* than Gemini reported.
- **Extension is well-scoped** (localhost, `storage.session` token) → both PASS/PARTIAL.
- **age/SOPS core encryption is excellent** → both.

### Where Gemini was WRONG (important — these would waste the outsourced firm's time or give false comfort)
1. **Gemini's #1 "Critical: OS Command Injection via `shell=True`" is a hallucination.** It claims `subprocess.run(..., shell=True)` with unsanitized secret data in functions `do_scan_history` / `do_purge_history` / `do_git_scan`. **Verified false:** `grep` finds **zero** `shell=True` in the entire codebase, and **none of those function names exist** (real names: `history_scan`, `history_purge`, `git_scan`; all use argv lists). Gemini invented both the vulnerability and the code. My §7 verdict (PASS, no command injection) stands.
2. **Gemini gave Session Management a PASS "because the server correctly validates the `Host` header to prevent DNS rebinding."** **No such validation exists** — that is precisely my open finding **F4**. Gemini hallucinated a control and then credited it. A dangerous false-negative.
3. **Gemini missed the single most serious real issue — F1**, the `javascript:` URI stored-XSS in the `url` field. It concluded "no immediate unescaped sinks were found." My manual href-scheme trace found the live sink.
4. **Gemini's Forgot Password reasoning is factually wrong:** it says the tool "correctly omits any password reset/recovery mechanism." Concealer *has* a full recovery subsystem (8 one-time recovery codes, `recover`, and a recovery-code 2nd factor on `passwd`). Right verdict (PASS), wrong reason — it never saw the mechanism.
5. **Gemini claims the vault defaults to a non-hardened state with a plaintext key on disk "until you run `concealer harden`."** Outdated: `init` now **auto-hardens** (`concealer:1470` removes the plaintext key at setup). Only *legacy* vaults carry a plaintext key.
6. **Gemini marked "Secure Coding with AI" as N/A** ("can't tell if AI was used to build it") — it misread the cheat sheet and completely missed that concealer *is* an AI-facing secrets tool with an MCP attack surface (my §9, the most relevant angle).

### Net
Gemini contributed no *unique real* finding beyond what manual review already had, produced **one fabricated Critical**, **one hallucinated passing control**, **two factual errors**, and **missed the top real finding (F1) plus the entire recovery + MCP surfaces**. Manual white-box review was materially more accurate. **Recommendation:** use the LLM pass only as a checklist prompt, and require the outsourced firm to *reproduce every finding against line-level evidence* — exactly the failure mode Gemini demonstrates (asserting vulns in functions that don't exist).

> On the HSTS split: Gemini rated it FAIL and elevated "plaintext HTTP on localhost" to a High issue (local malware sniffing the master password on the loopback). I rate the *HSTS cheat sheet specifically* as N/A (no TLS is possible or warranted on loopback), but Gemini's underlying point — that same-user malware can observe loopback traffic and process memory — is a fair defense-in-depth caveat and is already in Concealer's documented threat-model ceiling.

---

*Assessment performed by manual white-box source review (Claude) + independent Gemini 2.5 Pro pass, 2026-09-01. No secret values were accessed or exposed during this review; the Gemini API key used for the second pass was injected via `concealer run_with_secrets` (least-privilege, single name) and never written to disk.*
