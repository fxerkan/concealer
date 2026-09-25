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

function findFields() {
  const pw = document.querySelector('input[type="password"]:not([disabled])');
  if (!pw) return null;
  const form = pw.form || document;
  // Username: prefer explicit hints, else the nearest preceding text/email/tel input.
  let user = form.querySelector(
    'input[autocomplete="username"], input[type="email"], input[name*="user" i], input[name*="email" i], input[id*="user" i], input[id*="email" i]');
  if (!user) {
    const cands = [...form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input:not([type])')]
      .filter(i => !i.disabled && i.type !== "password");
    user = cands[0] || null;
  }
  return { user, pw };
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
    // value="..." reflected into markup as an attribute (any field, incl. the password one).
    const attr = el.getAttribute("value");
    if (attr && attr.includes(secret)) return true;
    // secret copied into a DIFFERENT input's live value (e.g. a mirror/confirm field).
    if (el !== pwEl && typeof el.value === "string" && el.value.includes(secret)) return true;
  }
  return false;
}

// ---- On-page approval banner (rendered in the isolated world, so the page can't read it) ----
function afRemove(job) { const el = document.getElementById("__cer_af_" + job); if (el) el.remove(); }
function afEl(tag, style, text) { const e = document.createElement(tag); if (style) e.setAttribute("style", style); if (text != null) e.textContent = text; return e; }
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
    if (f.user && msg.username) setValue(f.user, msg.username);
    setValue(f.pw, msg.password);
    const exposed = exposureScan(f.pw, msg.password);
    reply({ ok: true, exposed, detail: exposed ? "secret exposed in DOM after fill" : "" });
  } catch (e) {
    reply({ ok: false, detail: "fill error" });
  }
  return true;   // async reply
});
