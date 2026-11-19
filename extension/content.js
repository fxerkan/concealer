// concealer — Secure Agentic Autofill content script (isolated world).
// Receives a fill job {username, password, domain} from the service worker, RE-VERIFIES the
// page origin (the agent-supplied URL was only a hint), fills the login form using the native
// value setter + input/change events (so SPA frameworks register the change), then scans the
// DOM to make sure the secret wasn't reflected anywhere visible. The value never leaves this
// isolated world — it is never postMessage'd to the page, never written to an attribute.

const SUFFIX = new Set(["com.tr", "net.tr", "org.tr", "gen.tr", "web.tr", "gov.tr", "edu.tr", "k12.tr", "av.tr", "bel.tr", "co.uk", "org.uk", "ac.uk", "com.au", "co.jp", "com.br", "co.nz", "co.za", "com.cn", "herokuapp.com", "github.io", "vercel.app", "netlify.app", "pages.dev", "workers.dev", "web.app", "firebaseapp.com", "azurewebsites.net", "cloudfront.net", "appspot.com", "onrender.com", "fly.dev", "ngrok.io", "ngrok-free.app", "blogspot.com", "s3.amazonaws.com"]);   // same list as the app's _AF_SUFFIX
function regDomain(host) {         // eTLD+1, mirrors the app's registrable_domain()
  const p = (host || "").toLowerCase().split(".").filter(Boolean);
  if (p.length < 2 || p.every(x => /^\d+$/.test(x)) || host.includes(":")) return (host || "").toLowerCase();   // localhost / IP: the host itself
  const n = SUFFIX.has(p.slice(-3).join(".")) ? 4 : SUFFIX.has(p.slice(-2).join(".")) ? 3 : 2;
  return p.slice(-n).join(".");
}

// Set an input's value via the native prototype setter so React/Vue/Angular controlled
// inputs actually see the change, then fire the events frameworks listen for.
function setValue(el, val) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
  setter.call(el, val);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

const vis = el => !el.disabled && !el.readOnly && el.type !== "hidden" && el.getClientRects().length > 0;
const hintOf = el => [el.name, el.id, el.getAttribute("autocomplete"), el.getAttribute("aria-label"), el.placeholder,
                      el.labels && el.labels[0] && el.labels[0].textContent].join(" ").toLowerCase();
const USERISH = /user|e-?mail|login|resolving/;
const labelOf = el => ((el.labels && el.labels[0] && el.labels[0].textContent) || el.getAttribute("aria-label") || el.placeholder || "").toLowerCase();
// What the page's AUTHOR declared the field to be (not what a label says): name / id / autocomplete.
const attrsOf = el => [el.name, el.id, el.getAttribute("autocomplete")].join(" ").toLowerCase();
const CRED = /user|e-?mail|login|resolving|account|tenant|alias/;
const isSearch = el => el.type === "search" || /search|combobox/.test(el.getAttribute("role") || "") || /search|query|filter|find/.test(hintOf(el)) ||
  !!el.closest('[role="search"], search') || /list|both/.test(el.getAttribute("aria-autocomplete") || "");
// Opening the menu by itself needs a field that IS a credential (password, email, or a name/id/
// autocomplete/label saying user/login/account/tenant). findFields()'s "first text box next to a
// password" guess is fine for filling, never for popping a menu over the page.
const autoField = el => el.type === "password" || (!isSearch(el) && (el.type === "email" || CRED.test(attrsOf(el)) || CRED.test(labelOf(el))));

// Login fields, incl. the AWS console's extra "Account ID or alias" box (IAM sign-in) and its
// chooser page, where one box (#resolving_input) comes first and the rest on the next page.
// Without a password box on the page, a field counts only if its own name/id/autocomplete says
// it is a credential: a share dialog's "Add user or email" box or a search bar must not open
// the menu just because its label mentions a user.
// concealer's own web UI (installed app 8787, dev 18787, or any page carrying the app's marker):
// no menu, no capture — its master password must never meet the extension.
const IS_VAULT = !!document.querySelector('meta[name="concealer-app"]') ||
  (/^(127\.0\.0\.1|localhost|concealer\.localhost)$/.test(location.hostname) && ["8787", "18787"].includes(location.port));
function findFields() {
  if (IS_VAULT) return null;
  const pw = [...document.querySelectorAll('input[type="password"]')].find(vis) || null;
  const scope = (pw && pw.form) || document;
  const texts = [...scope.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input:not([type])')]
    .filter(el => vis(el) && !isSearch(el) && (pw || CRED.test(attrsOf(el))));
  // The visible label wins over id/autocomplete: AWS reuses #resolving_input (autocomplete=username)
  // as "Account ID or alias" once "IAM user" is picked on its root/IAM chooser page.
  const isAcct = t => /account|alias|tenant/.test(t) && !/user ?name|e-?mail/.test(t);
  const acct = texts.find(el => el.type !== "email" && (labelOf(el) ? isAcct(labelOf(el)) : isAcct(hintOf(el)))) || null;
  const rest = texts.filter(el => el !== acct);
  const user = rest.find(el => USERISH.test(hintOf(el)) || el.type === "email") || (pw ? rest[0] : null) || null;
  if (!pw && !user && !acct) return null;   // a lone search/text box is not a login form
  return { acct, user, pw };
}

// Saved field names are slugs of what the page showed ("Region" -> region), the same as the app's _af_fname().
const slug = t => (t || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
function fieldByKey(k) {   // password boxes are never matched: only the password goes there
  for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=password]):not([type=submit]):not([type=button]), select, textarea')) {
    if (!vis(el)) continue;
    const label = (el.labels && el.labels[0] && el.labels[0].textContent) || el.getAttribute("aria-label") || el.placeholder;
    if ([label, el.name, el.id].some(x => x && slug(x) === k)) return el;
  }
  return null;
}

// After filling, make sure the secret didn't get REFLECTED somewhere a scraper (or the
// agent's DOM read) could pick it up. We check the two real leak channels: the value baked
// into an element attribute, or copied into a non-password input/textarea. We deliberately
// do NOT scan document.body.innerText — pages that legitimately display the value (login
// hints, demo pages) would false-positive, and a password isn't rendered as body text in
// normal apps anyway.
function exposureScan(pwEl, secret, filled) {
  if (!secret) return false;
  for (const el of document.querySelectorAll("input, textarea")) {
    if (filled.has(el)) continue;   // a field concealer itself just filled (username "test" + password "test" is not a leak)
    // value="..." reflected into ANOTHER field's markup. The password box's own attribute is
    // skipped: controlled-input frameworks (React, e.g. AWS sign-in) mirror it there by design.
    const attr = el.getAttribute("value");
    if (el !== pwEl && attr && attr.includes(secret)) return true;
    // secret copied into a DIFFERENT input's live value (e.g. a mirror/confirm field).
    if (el !== pwEl && typeof el.value === "string" && el.value.includes(secret)) return true;
  }
  return false;
}

// ---- On-page approval banner (rendered in the isolated world, so the page can't read it) ----
function afRemove(job) { const el = document.getElementById("__cer_af_" + job); if (el) el.remove(); }
// Styles go through CSSOM (style.cssText): a strict page CSP (AWS sign-in) blocks setAttribute("style").
function afEl(tag, style, text) { const e = document.createElement(tag); if (style) e.style.cssText = style; if (text != null) e.textContent = text; return e; }
function afBtn(label, bg, fn) {
  const b = afEl("button", "cursor:pointer;border:0;border-radius:8px;padding:7px 12px;font:600 12px system-ui;" +
    "color:" + (bg ? "#0a0b0d" : "#e8e8e6") + ";background:" + (bg || "transparent") + ";" + (bg ? "" : "border:1px solid #ff6b6b;color:#ff6b6b;"), label);
  b.addEventListener("click", fn); return b;
}
function afShowBanner(m) {
  if (document.getElementById("__cer_af_" + m.job)) return;   // already up
  const ok = m.match === "ok";
  const wrap = afEl("div", "position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483647;" +
    "background:#101216;color:#e8e8e6;border:1px solid #ff4d4d;border-radius:12px;padding:13px 15px;" +
    "font:13px/1.45 -apple-system,system-ui,sans-serif;box-shadow:0 14px 44px rgba(0,0,0,.55);" +
    "max-width:460px;width:calc(100% - 28px);box-sizing:border-box");
  wrap.id = "__cer_af_" + m.job;
  wrap.appendChild(afEl("div", "font-weight:700;margin-bottom:6px", "🔐 concealer — sign-in request"));
  const line = afEl("div", "margin-bottom:4px");
  line.append(afEl("b", "", m.agent), document.createTextNode(" wants to sign in to "), afEl("b", "", m.domain));
  wrap.appendChild(line);
  if (ok) wrap.appendChild(afEl("div", "color:#8a909b;margin-bottom:10px", "Using " + m.secretName + (m.username ? " (" + m.username + ")" : "") + " — the password is never shown to the agent."));
  else wrap.appendChild(afEl("div", "color:#ff6b6b;margin-bottom:10px", m.match === "nomatch" ? "⚠ No secret matches this domain." : "⚠ Domain doesn't match the secret."));
  const acts = afEl("div", "display:flex;gap:8px;justify-content:flex-end");
  const decide = (action, scope) => { chrome.runtime.sendMessage({ type: "af-decide", job: m.job, action, scope }); afRemove(m.job); };
  if (ok) {
    acts.append(afBtn("Approve once", "#ff4d4d", () => decide("approve", "once")),
                afBtn("This task", "#ff4d4d", () => decide("approve", "task")),
                afBtn("Deny", null, () => decide("deny")));
  } else {
    acts.append(afBtn("Dismiss", null, () => decide("deny")));
  }
  wrap.appendChild(acts);
  document.documentElement.appendChild(wrap);
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (!msg || IS_VAULT) return;   // the vault's own UI shows approvals itself; nothing of ours goes there
  if (msg.type === "af-banner") { afShowBanner(msg); return; }
  if (msg.type === "af-banner-clear") { afRemove(msg.job); return; }
  if (msg.type === "af-banner-clear-all") { for (const el of document.querySelectorAll("[id^='__cer_af_']")) el.remove(); return; }
  if (msg.type !== "concealer-fill") return;
  // Anti-phishing: the fill is only allowed if THIS page's origin matches the approved domain.
  if (regDomain(location.hostname) !== msg.domain) {
    reply({ ok: false, detail: "origin mismatch" });
    return true;
  }
  const f = findFields();
  if (!f) { reply({ ok: false, detail: "no login form found" }); return true; }
  try {
    // every saved field by name: the page field whose label / name / id matches it gets the value
    const done = new Set();
    for (const [k, v] of Object.entries(msg.extra || {})) {
      const el = fieldByKey(k);
      if (el && !done.has(el)) { setValue(el, v); done.add(el); }
    }
    // standard boxes the names didn't reach (e.g. "username" saved, the page says "IAM username")
    if (f.acct && msg.account && !done.has(f.acct)) { setValue(f.acct, msg.account); done.add(f.acct); }
    if (f.user && msg.username && !done.has(f.user)) { setValue(f.user, msg.username); done.add(f.user); }
    if (f.pw && msg.password) setValue(f.pw, msg.password);
    const exposed = !!f.pw && exposureScan(f.pw, msg.password, done);
    // partial: no password box yet (multi-step sign-in) — the SW holds the rest for the next page.
    reply({ ok: true, partial: !f.pw, exposed, detail: exposed ? "secret exposed in DOM after fill" : "" });
  } catch (e) {
    reply({ ok: false, detail: "fill error" });
  }
  return true;   // async reply
});

// ---- On-page menu (human flow): focusing/clicking a login field on a site the vault has
// credentials for opens a concealer menu under it (also via right-click "Autofill with
// concealer"). Only names/usernames/account ids come here; the password is fetched by the SW
// only after the user picks an entry, and goes straight into the form.
let _sugHost = null, _sugAnchor = null, _scanT = 0, _contKey = "", _pendingId = "";
function sugClose() { if (_sugHost) { _sugHost.remove(); _sugHost = null; _sugAnchor = null; } _pendingId = ""; }
async function fillPick(anchor, id) {
  const out = await chrome.runtime.sendMessage({ type: "af-fill", id });
  if (out && out.locked) { unlockThenFill(anchor, id); return; }   // locked meanwhile: unlock right here
  if (!out || !out.ok) console.warn("concealer: fill failed", out && out.detail);
}
// The master password is typed into an EXTENSION frame, not into this page's DOM, so the site can't
// read or keylog it. On success the SW sends "af-unlocked": the picked entry fills, or the menu refills.
function unlockThenFill(anchor, id) { sugShow(anchor, { locked: true, rows: [], unlock: true }, true); _pendingId = id || ""; }
function sugShow(anchor, res, manual) {
  sugClose();
  const host = document.createElement("div"); _sugHost = host; _sugAnchor = anchor;
  const r = anchor.getBoundingClientRect();
  host.style.cssText = `position:absolute;z-index:2147483647;top:${r.bottom + scrollY + 4}px;left:${r.left + scrollX}px`;
  const root = host.attachShadow({ mode: "closed" });   // page CSS/JS can't style or read into it
  const box = afEl("div", "background:#101216;color:#e8e8e6;border:1px solid #ff4d4d;border-radius:10px;padding:6px;" +
    "font:12px/1.4 -apple-system,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.45);min-width:240px;max-width:380px");
  const head = afEl("div", "display:flex;justify-content:space-between;align-items:center;padding:2px 4px 6px;font-weight:700");
  const brand = afEl("span", "display:inline-flex;align-items:center;gap:6px", "");
  const logo = document.createElement("img"); logo.src = chrome.runtime.getURL("icons/icon48.png");
  logo.style.cssText = "width:16px;height:16px"; logo.alt = "";
  const name = afEl("span", "", "conceal"); name.appendChild(afEl("span", "color:#ff4d4d", "er"));
  brand.append(logo, name);
  const x = afEl("button", "all:unset;cursor:pointer;color:#8a909b;padding:0 4px", "×");
  x.addEventListener("click", sugClose);
  head.append(brand, x); box.appendChild(head);
  const item = (top, sub, fn) => {
    const b = afEl("button", "all:unset;display:block;box-sizing:border-box;width:100%;cursor:pointer;padding:6px 8px;border-radius:7px");
    b.addEventListener("mouseenter", () => b.style.background = "#1d2128");
    b.addEventListener("mouseleave", () => b.style.background = "");
    b.appendChild(afEl("div", "font-weight:600", top));
    if (sub) b.appendChild(afEl("div", "color:#8a909b", sub));
    b.addEventListener("click", fn); box.appendChild(b);
  };
  const sub = c => [c.account && "account " + c.account, c.username].filter(Boolean).join(" · ");
  if (res.locked && res.unlock) {
    const fr = afEl("iframe", "display:block;width:100%;height:36px;border:0;background:#101216");
    fr.src = chrome.runtime.getURL("unlock.html") + "?focus=1";   // the user asked for it: cursor goes in
    fr.addEventListener("load", () => fr.focus());
    box.appendChild(fr);
  } else if (res.locked && res.rows.length) {
    // Locked, but this site matched these the last time the vault was open: pick one, then unlock.
    box.appendChild(afEl("div", "padding:0 8px 2px;color:#8a909b", "🔒 Locked — pick one to unlock and fill"));
    for (const c of res.rows) item(c.name, sub(c), () => unlockThenFill(anchor, c.id));
  } else if (res.locked) {
    // Nothing known for this site yet: one small line, no password box until the user asks for it.
    item("🔒 Unlock to fill…", "", () => unlockThenFill(anchor, ""));
  } else if (!res.rows.length) {
    box.appendChild(afEl("div", "padding:2px 8px 4px;color:#8a909b", "No saved sign-in for this site."));
    item("Save a sign-in for this site…", "what is typed on the page now; every field stays editable", () => {
      sugClose(); chrome.runtime.sendMessage({ type: "af-captured", data: capture(), manual: true }).catch(() => {});
    });
  } else {
    for (const c of res.rows) item(c.name, sub(c), () => { sugClose(); fillPick(anchor, c.id); });
  }
  root.appendChild(box); document.documentElement.appendChild(host);
}
async function ask(hasPw) { try { return await chrome.runtime.sendMessage({ type: "af-suggest", hasPw }); } catch (e) { return null; } }
// always: show even "nothing saved" (explicit right-click); otherwise stay quiet on sites without a match.
async function openMenu(anchor, always) {
  const res = await ask(false);
  if (!res || res.continued) return;
  res.rows = res.rows || [];
  if (always || res.locked || (res.rows && res.rows.length)) sugShow(anchor, res, always);
}
function loginField(el) { const f = findFields(); return f && [f.acct, f.user, f.pw].includes(el) ? el : null; }
let _opening = null;   // focusin + click fire together on one click: ask once
function onField(e) {
  const el = loginField(e.target) && autoField(e.target) ? e.target : null;
  if (!el || _opening === el || (_sugHost && _sugAnchor === el)) return;
  _opening = el; openMenu(el, false).finally(() => { _opening = null; });
}
// The menu closes as soon as the user is somewhere else: a click or focus outside it, Esc (also
// from inside the unlock frame, relayed by the SW), focus leaving for one of the page's own
// frames, a scroll that would leave it floating, or its field leaving the page.
const outside = t => t !== _sugHost && t !== _sugAnchor;
document.addEventListener("focusin", e => { if (_sugHost && outside(e.target)) sugClose(); }, true);
document.addEventListener("focusin", onField, true);
document.addEventListener("click", onField, true);
document.addEventListener("mousedown", e => { if (_sugHost && outside(e.target)) sugClose(); }, true);
document.addEventListener("keydown", e => { if (e.key === "Escape") sugClose(); }, true);
document.addEventListener("scroll", e => { if (_sugHost && e.target !== document) sugClose(); }, true);
window.addEventListener("blur", () => setTimeout(() => { if (_sugHost && outside(document.activeElement)) sugClose(); }, 0));
// Multi-step sign-in: when a password box shows up, let the SW finish a pending fill. Throttled,
// not debounced — pages with constant DOM churn (AWS's animated ad) would reset a debounce forever.
function scan() {
  _scanT = 0;
  if (_sugAnchor && !_sugAnchor.isConnected) sugClose();
  const f = findFields();
  if (!f || !f.pw) { _contKey = ""; return; }   // password box gone (next step): re-arm for the one that follows
  if (location.href + "|pw" === _contKey) return;
  _contKey = location.href + "|pw"; ask(true);
}
new MutationObserver(() => { if (!_scanT) _scanT = setTimeout(scan, 300); })
  .observe(document.documentElement, { childList: true, subtree: true });
scan();
chrome.runtime.onMessage.addListener(msg => {
  if (!msg || IS_VAULT) return;
  if (msg.type === "af-menu-close") { sugClose(); return; }
  if (msg.type === "af-unlocked" && _sugAnchor) {
    const a = _sugAnchor, id = _pendingId;
    if (id) { sugClose(); fillPick(a, id); } else openMenu(a, true);
    return;
  }
  if (msg.type !== "af-open-menu") return;
  const a = document.activeElement, f = findFields();
  const anchor = (a && a.tagName === "INPUT" && a) || (f && (f.acct || f.user || f.pw));
  if (anchor) openMenu(anchor, true);
});

// ---- Save sign-ins (password-manager style). On submit, the values typed into the login form go
// to the SW (which keeps them in memory for 2 minutes, keyed by tab, with the URL Chrome reports).
// It asks the app whether this sign-in is new or changed and then shows the prompt below, also on
// the page the sign-in lands on. Nothing is written until the user clicks Save.
function capture() {
  const f = findFields() || {};
  const scope = (f.pw && f.pw.form) || (f.user && f.user.form) || document;
  const extra = {};
  for (const el of scope.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input:not([type])')) {
    if (!vis(el) || isSearch(el) || [f.acct, f.user].includes(el) || !el.value.trim()) continue;
    const k = (labelOf(el) || el.name || el.id || "").trim();
    if (k) extra[k] = el.value.trim();
  }
  return { username: f.user ? f.user.value.trim() : "", password: f.pw ? f.pw.value : "",
           account: f.acct ? f.acct.value.trim() : "", extra, title: document.title.trim().slice(0, 80) };
}
let _capT = 0;
function onSubmitish() {
  if (IS_VAULT || Date.now() - _capT < 1000) return;
  const c = capture();
  if (!c.password && !c.username && !c.account) return;
  _capT = Date.now();
  chrome.runtime.sendMessage({ type: "af-captured", data: c }).catch(() => {});
  // SPA sign-in (no navigation): once the password box is gone, the sign-in went through. A box that
  // stays (wrong password, a "show password" click) never prompts; a real navigation prompts from the SW.
  setTimeout(() => { const f = findFields(); if (!f || !f.pw) chrome.runtime.sendMessage({ type: "af-gone" }).catch(() => {}); }, 1500);
}
document.addEventListener("submit", onSubmitish, true);
document.addEventListener("click", e => {   // SPA sign-ins often have no <form> submit: catch the button click
  const b = e.target.closest && e.target.closest('button, input[type="submit"], [role="button"]');
  if (b && !(_saveHost && e.composedPath().includes(_saveHost)) && findFields()) onSubmitish();
}, true);
document.addEventListener("keydown", e => { if (e.key === "Enter" && loginField(e.target)) onSubmitish(); }, true);

let _saveHost = null, _savePid = "";
function saveClose() { if (_saveHost) { _saveHost.remove(); _saveHost = null; _savePid = ""; } }
// The page's other fields, offered under "+ Add field" so the user picks one instead of guessing ids.
function pageFields(skip) {
  const out = [];
  for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=password]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]), select, textarea')) {
    if (skip.includes(el) || !el.getClientRects().length) continue;
    const label = ((el.labels && el.labels[0] && el.labels[0].textContent) || el.getAttribute("aria-label") || el.placeholder || el.name || el.id || "").trim().replace(/\s+/g, " ");
    if (label) out.push({ label: label.slice(0, 60), value: (el.value || "").trim() });
  }
  return out;
}
async function copyText(v, btn) {
  try { await navigator.clipboard.writeText(v); } catch (e) { return; }
  btn.textContent = "✓"; setTimeout(() => btn.textContent = "📋", 1500);
  setTimeout(() => navigator.clipboard.writeText("").catch(() => {}), 20000);   // same 20 s wipe as the popup's default
}
function saveShow(m) {
  if (_saveHost && _savePid === m.pid && !m.locked) return;   // already showing this one
  saveClose(); _savePid = m.pid;
  const host = document.createElement("div"); _saveHost = host;
  host.style.cssText = "position:fixed;top:14px;right:14px;z-index:2147483647";
  const root = host.attachShadow({ mode: "closed" });
  const box = afEl("div", "background:#101216;color:#e8e8e6;border:1px solid #ff4d4d;border-radius:12px;padding:12px;width:340px;max-height:calc(100vh - 28px);overflow:auto;" +
    "font:12px/1.4 -apple-system,system-ui,sans-serif;box-shadow:0 14px 44px rgba(0,0,0,.55);box-sizing:border-box");
  const head = afEl("div", "display:flex;align-items:center;gap:7px;font-weight:700;font-size:13px;margin-bottom:8px");
  const logo = document.createElement("img"); logo.src = chrome.runtime.getURL("icons/icon48.png"); logo.style.cssText = "width:16px;height:16px";
  head.append(logo, afEl("span", "flex:1", m.status === "update" ? "Update saved password?" : "Save sign-in to concealer?"));
  const x = afEl("button", "all:unset;cursor:pointer;color:#8a909b;padding:0 4px", "×"); x.addEventListener("click", () => { chrome.runtime.sendMessage({ type: "af-save-skip" }); saveClose(); });
  head.appendChild(x); box.appendChild(head);
  const inp = "all:unset;box-sizing:border-box;width:100%;min-width:0;background:#16191f;border:1px solid #2a2f38;border-radius:7px;padding:6px 8px;color:#e8e8e6;font:12px -apple-system,system-ui,sans-serif";
  const ico = "all:unset;cursor:pointer;padding:4px 6px;border:1px solid #2a2f38;border-radius:7px;flex:none";
  const row = (label, val, type) => {
    const w = afEl("label", "display:block;margin-bottom:6px;color:#8a909b"); w.append(label);
    const line = afEl("div", "display:flex;gap:6px;margin-top:2px");
    const i = afEl("input", inp); i.type = type || "text"; i.value = val || ""; i.autocomplete = "off"; line.appendChild(i);
    w.appendChild(line); box.appendChild(w); return i;
  };
  const d = m.data;
  const name = row("Name", m.name || d.title || m.domain), url = row("URL", m.url), user = row("Username", d.username);
  const pw = row("Password", d.password, "password");
  const eye = afEl("button", ico, "👁"); eye.title = "show / hide"; eye.addEventListener("click", () => { pw.type = pw.type === "password" ? "text" : "password"; });
  const cp = afEl("button", ico, "📋"); cp.title = "copy"; cp.addEventListener("click", () => copyText(pw.value, cp));
  pw.parentElement.append(eye, cp);
  const acct = d.account ? row("Account ID", d.account) : null;
  const extras = afEl("div", ""); box.appendChild(extras);
  const addExtra = (k, v) => {
    const r = afEl("div", "display:flex;gap:6px;margin-bottom:6px");
    const ki = afEl("input", inp + ";flex:1"); ki.placeholder = "field name"; ki.value = k || "";
    const vi = afEl("input", inp + ";flex:1.4"); vi.placeholder = "value"; vi.value = v || "";
    const rm = afEl("button", "all:unset;cursor:pointer;color:#8a909b;padding:0 4px", "×"); rm.addEventListener("click", () => r.remove());
    r.append(ki, vi, rm); extras.appendChild(r); return ki;
  };
  for (const [k, v] of Object.entries(d.extra || {})) addExtra(k, v);
  // "+ Add field": the page's own fields (label + what is typed there), or an empty custom one
  const pick = afEl("select", inp + ";color:#ff6b6b;cursor:pointer;margin-bottom:8px");
  const lf = findFields() || {};
  const fields = pageFields([lf.acct, lf.user].filter(Boolean));
  pick.appendChild(new Option("+ Add field…", ""));
  fields.forEach((f, n) => pick.appendChild(new Option(f.label + (f.value ? "  —  " + f.value.slice(0, 24) : ""), String(n))));
  pick.appendChild(new Option("Custom field (type a name)", "custom"));
  pick.addEventListener("change", () => {
    const v = pick.value; pick.value = "";
    if (v === "custom") addExtra().focus();
    else if (v) addExtra(fields[+v].label, fields[+v].value);
  });
  box.appendChild(pick);
  const msg = afEl("div", "color:#8a909b;margin-bottom:6px"); box.appendChild(msg);
  // locked: no master password here — Save parks it encrypted and the next unlock adds it
  if (m.locked) msg.textContent = "Vault is locked — saving needs no password; it's added at your next unlock.";
  const acts = afEl("div", "display:flex;gap:6px;justify-content:flex-end");
  const save = afBtn(m.status === "update" ? "Update" : "Save", "#ff4d4d", async () => {
    const extra = {};
    for (const r of extras.children) { const [ki, vi] = r.querySelectorAll("input"); if (ki.value.trim() && vi.value.trim()) extra[ki.value.trim()] = vi.value.trim(); }
    const data = { name: name.value.trim(), url: url.value.trim(), username: user.value.trim(), password: pw.value, account: acct ? acct.value.trim() : "", extra, title: d.title };
    if (!data.password) { msg.textContent = "Password is empty"; return; }
    save.disabled = true;
    const out = await chrome.runtime.sendMessage({ type: "af-save", pid: m.pid, data }).catch(() => null);
    save.disabled = false;
    if (!out || out.error) { msg.style.color = "#ff6b6b"; msg.textContent = "⚠ Couldn't save" + (out && out.error ? ": " + out.error : ""); return; }
    msg.style.color = "#7ee787";
    msg.textContent = out.status === "queued" ? "✓ Saved — added to the vault at your next unlock" :
      out.status === "same" ? "✓ Already saved" : (out.status === "update" ? "✓ Updated " : "✓ Saved ") + out.name;
    setTimeout(saveClose, 1400);
  });
  acts.append(afBtn("Never for this site", null, () => { chrome.runtime.sendMessage({ type: "af-never" }); saveClose(); }), save);
  box.appendChild(acts);
  root.appendChild(box); document.documentElement.appendChild(host);
}
chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  if (!msg || window.top !== window || IS_VAULT) return;
  if (msg.type === "af-save-prompt") { saveShow(msg); return; }
  if (msg.type === "af-save-open") {   // context menu / popup: save what is on the page right now, editable
    chrome.runtime.sendMessage({ type: "af-captured", data: capture(), manual: true }).catch(() => {});
  }
});
