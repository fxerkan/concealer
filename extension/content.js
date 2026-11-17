// concealer — Secure Agentic Autofill content script (isolated world).
// Receives a fill job {username, password, domain} from the service worker, RE-VERIFIES the
// page origin (the agent-supplied URL was only a hint), fills the login form using the native
// value setter + input/change events (so SPA frameworks register the change), then scans the
// DOM to make sure the secret wasn't reflected anywhere visible. The value never leaves this
// isolated world — it is never postMessage'd to the page, never written to an attribute.

function regDomain(host) {
  const p = (host || "").split(".").filter(Boolean);
  return p.length >= 2 ? p.slice(-2).join(".") : (host || "");
}

// Set an input's value via the native prototype setter so React/Vue/Angular controlled
// inputs actually see the change, then fire the events frameworks listen for.
function setValue(el, val) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
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

// Login fields, incl. the AWS console's extra "Account ID or alias" box (IAM sign-in) and its
// chooser page, where one box (#resolving_input) comes first and the rest on the next page.
function findFields() {
  const pw = [...document.querySelectorAll('input[type="password"]')].find(vis) || null;
  const scope = (pw && pw.form) || document;
  const texts = [...scope.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input:not([type])')].filter(vis);
  // The visible label wins over id/autocomplete: AWS reuses #resolving_input (autocomplete=username)
  // as "Account ID or alias" once "IAM user" is picked on its root/IAM chooser page.
  const isAcct = t => /account|alias/.test(t) && !/user ?name|e-?mail/.test(t);
  const acct = texts.find(el => el.type !== "email" && (labelOf(el) ? isAcct(labelOf(el)) : isAcct(hintOf(el)))) || null;
  const rest = texts.filter(el => el !== acct);
  const user = rest.find(el => USERISH.test(hintOf(el)) || el.type === "email") || (pw ? rest[0] : null) || null;
  if (!pw && !user && !acct) return null;   // a lone search/text box is not a login form
  return { acct, user, pw };
}

// After filling, make sure the secret didn't get REFLECTED somewhere a scraper (or the
// agent's DOM read) could pick it up. We check the two real leak channels: the value baked
// into an element attribute, or copied into a non-password input/textarea. We deliberately
// do NOT scan document.body.innerText — pages that legitimately display the value (login
// hints, demo pages) would false-positive, and a password isn't rendered as body text in
// normal apps anyway.
function exposureScan(pwEl, secret) {
  if (!secret) return false;
  for (const el of document.querySelectorAll("input, textarea")) {
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
  if (!msg) return;
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
    if (f.acct && msg.account) setValue(f.acct, msg.account);
    if (f.user && msg.username) setValue(f.user, msg.username);
    if (f.pw && msg.password) setValue(f.pw, msg.password);
    const exposed = !!f.pw && exposureScan(f.pw, msg.password);
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
let _sugHost = null, _sugAnchor = null, _scanT = 0, _contKey = "";
function sugClose() { if (_sugHost) { _sugHost.remove(); _sugHost = null; _sugAnchor = null; } }
function sugShow(anchor, res) {
  sugClose();
  const host = document.createElement("div"); _sugHost = host; _sugAnchor = anchor;
  const r = anchor.getBoundingClientRect();
  host.style.cssText = `position:absolute;z-index:2147483647;top:${r.bottom + scrollY + 4}px;left:${r.left + scrollX}px`;
  const root = host.attachShadow({ mode: "closed" });   // page CSS/JS can't style or read into it
  const box = afEl("div", "background:#101216;color:#e8e8e6;border:1px solid #ff4d4d;border-radius:10px;padding:6px;" +
    "font:12px/1.4 -apple-system,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.45);min-width:240px;max-width:380px");
  const head = afEl("div", "display:flex;justify-content:space-between;align-items:center;padding:2px 4px 6px;font-weight:700");
  const brand = afEl("span", "", "🔐 conceal"); brand.appendChild(afEl("span", "color:#ff4d4d", "er"));
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
  if (res.locked) {
    // The master password is typed into an EXTENSION frame, not into this page's DOM, so the
    // site can't read or keylog it. After unlock the SW sends "af-unlocked" and the menu refills.
    box.appendChild(afEl("div", "padding:0 6px 4px;color:#8a909b", "Vault is locked — unlock to fill"));
    const fr = afEl("iframe", "display:block;width:100%;height:62px;border:0;background:#101216");
    fr.src = chrome.runtime.getURL("unlock.html");
    box.appendChild(fr);
  } else if (!res.rows.length) {
    item("No saved sign-in for this site", "add a website/login secret with this site's URL", sugClose);
  } else {
    for (const c of res.rows) item(c.name, [c.account && "account " + c.account, c.username].filter(Boolean).join(" · "), async () => {
      sugClose();
      const out = await chrome.runtime.sendMessage({ type: "af-fill", id: c.id });
      if (!out || !out.ok) console.warn("concealer: fill failed", out && out.detail);
    });
  }
  root.appendChild(box); document.documentElement.appendChild(host);
}
async function ask(hasPw) { try { return await chrome.runtime.sendMessage({ type: "af-suggest", hasPw }); } catch (e) { return null; } }
// always: show even "nothing saved" (explicit right-click); otherwise stay quiet on sites without a match.
async function openMenu(anchor, always) {
  const res = await ask(false);
  if (!res || res.continued) return;
  if (always || res.locked || (res.rows && res.rows.length)) sugShow(anchor, res);
}
function loginField(el) { const f = findFields(); return f && [f.acct, f.user, f.pw].includes(el) ? el : null; }
let _opening = null;   // focusin + click fire together on one click: ask once
function onField(e) {
  const el = loginField(e.target);
  if (!el || _opening === el || (_sugHost && _sugAnchor === el)) return;
  _opening = el; openMenu(el, false).finally(() => { _opening = null; });
}
document.addEventListener("focusin", onField, true);
document.addEventListener("click", onField, true);
document.addEventListener("mousedown", e => {   // click outside closes (the panel is one retargeted node)
  if (_sugHost && e.target !== _sugHost && e.target !== _sugAnchor) sugClose();
}, true);
document.addEventListener("keydown", e => { if (e.key === "Escape") sugClose(); }, true);
// Multi-step sign-in: when a password box shows up, let the SW finish a pending fill. Throttled,
// not debounced — pages with constant DOM churn (AWS's animated ad) would reset a debounce forever.
function scan() {
  _scanT = 0;
  const f = findFields();
  if (!f || !f.pw) { _contKey = ""; return; }   // password box gone (next step): re-arm for the one that follows
  if (location.href + "|pw" === _contKey) return;
  _contKey = location.href + "|pw"; ask(true);
}
new MutationObserver(() => { if (!_scanT) _scanT = setTimeout(scan, 300); })
  .observe(document.documentElement, { childList: true, subtree: true });
scan();
chrome.runtime.onMessage.addListener(msg => {
  if (msg && msg.type === "af-unlocked" && _sugAnchor) { openMenu(_sugAnchor, true); return; }
  if (!msg || msg.type !== "af-open-menu") return;
  const a = document.activeElement, f = findFields();
  const anchor = (a && a.tagName === "INPUT" && a) || (f && (f.acct || f.user || f.pw));
  if (anchor) openMenu(anchor, true);
});
