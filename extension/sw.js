// concealer — Secure Agentic Autofill service worker (fill-without-reveal).
// Polls the loopback concealer app for APPROVED fill jobs, claims the value (which only
// ever travels app -> here -> the page's content script, never to the agent/LLM), and
// hands it to the content script running on the matching tab. The content script re-verifies
// the origin and fills the form. Status is reported back to the app.
const PORT = 8787;                       // concealer default; matches host_permissions
const BASE = `http://127.0.0.1:${PORT}`;
const POLL_ALARM = "concealer-autofill-poll";

async function token() { return (await chrome.storage.session.get("tok")).tok || null; }

async function api(path, opts = {}) {
  const tok = await token();
  if (!tok) return null;                 // vault locked in the popup -> nothing to do
  const h = Object.assign({ "Content-Type": "application/json", "X-Concealer-Token": tok }, opts.headers || {});
  const r = await fetch(BASE + path, Object.assign({}, opts, { headers: h }));
  if (r.status === 401) return null;      // session expired
  return r.ok ? r.json() : null;
}

function regDomain(host) {                // naive eTLD+1; the app made the same choice
  const p = (host || "").split(".").filter(Boolean);
  return p.length >= 2 ? p.slice(-2).join(".") : (host || "");
}

// Claim one approved job and drive the fill on a matching tab.
async function handleJob(job) {
  // Find an open tab whose registrable domain matches the job's domain.
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
  const tab = tabs.find(t => {
    try { return regDomain(new URL(t.url).hostname) === job.domain; } catch { return false; }
  });
  if (!tab) return;                       // no tab for this domain yet; leave the job for the next poll
  const creds = await api("/api/autofill/claim", { method: "POST", body: JSON.stringify({ job: job.id }) });
  if (!creds) return;                     // someone else claimed it, or it expired
  let res;
  try {
    res = await chrome.tabs.sendMessage(tab.id, { type: "concealer-fill", domain: job.domain,
                                                  username: creds.username, password: creds.password });
  } catch (e) {
    res = { ok: false, detail: "content script not reachable" };
  }
  await api("/api/autofill/result", { method: "POST",
    body: JSON.stringify({ job: job.id, ok: !!(res && res.ok), exposed: !!(res && res.exposed),
                           detail: (res && res.detail) || "" }) });
}

async function poll() {
  const jobs = await api("/api/autofill/jobs");   // approved jobs, no values
  if (!jobs || !jobs.length) return;
  for (const job of jobs) await handleJob(job);
}

// Surface pending requests so the human notices WITHOUT the vault being unlocked and without
// hunting for a background tab: a toolbar badge + a browser notification per new request. This
// uses the LOCKED-SAFE /api/autofill/notify endpoint (count + opaque ids only, no vault data),
// so alerting works even when the vault is locked — the user unlocks to review.
const _notified = new Set();
function applyNotify(n) {
  chrome.action.setBadgeBackgroundColor({ color: "#e5484d" });
  chrome.action.setBadgeText({ text: n.count ? String(n.count) : "" });
  for (const id of n.ids) {
    if (_notified.has(id)) continue;
    _notified.add(id);
    chrome.notifications.create("cer-" + id, {
      type: "basic", iconUrl: chrome.runtime.getURL("icons/icon128.png"),
      title: "concealer — sign-in request",
      message: "A sign-in autofill was requested. Click the concealer icon to review and approve.",
      priority: 2, requireInteraction: true },
      () => { if (chrome.runtime.lastError) console.warn("notify:", chrome.runtime.lastError.message); });
  }
  for (const id of [..._notified]) if (!n.ids.includes(id)) _notified.delete(id);
}
// Long-poll loop: hangs on the server until the pending set changes (near-instant), and the
// active fetch keeps this MV3 worker awake. On connection failure, back off and clear the badge.
let _looping = false;
async function loopNotify() {
  if (_looping) return; _looping = true;
  let seen = [];
  for (;;) {
    let n = null;
    try { const r = await fetch(BASE + "/api/autofill/notify?poll=1&wait=" + encodeURIComponent(seen.join(","))); n = r.ok ? await r.json() : null; }
    catch (e) { n = null; }
    if (n) { applyNotify(n); seen = n.ids; if (n.count) { driveBanners(); poll(); } else broadcast({ type: "af-banner-clear-all" }); }
    else { chrome.action.setBadgeText({ text: "" }); seen = []; await new Promise(r => setTimeout(r, 5000)); }
  }
}
async function pollNotify() {   // one-shot (used by alarm as a backstop)
  let n; try { const r = await fetch(BASE + "/api/autofill/notify"); n = r.ok ? await r.json() : null; } catch (e) { n = null; }
  if (n) applyNotify(n); else chrome.action.setBadgeText({ text: "" });
}

// On-page approval banners: when UNLOCKED, fetch the pending details (domain/secret) and show a
// banner ON the matching login tab, so the user approves right where the sign-in is happening.
// Locked → /api/autofill/pending is 401 → we do nothing here (the notification+badge cover it).
const _banners = new Set();
async function driveBanners() {
  const pend = await api("/api/autofill/pending");
  if (pend === null) return;                       // locked, or app down
  const live = new Set(pend.map(j => j.id));
  for (const id of [..._banners]) if (!live.has(id)) { _banners.delete(id); broadcast({ type: "af-banner-clear", job: id }); }
  if (!pend.length) return;
  let tabs = []; try { tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] }); } catch (e) { return; }
  for (const j of pend) {
    const tab = tabs.find(t => { try { return regDomain(new URL(t.url).hostname) === j.domain; } catch (e) { return false; } });
    if (!tab) continue;
    _banners.add(j.id);
    try { await chrome.tabs.sendMessage(tab.id, { type: "af-banner", job: j.id, agent: j.agent, domain: j.domain, secretName: j.secret_name, username: j.username, match: j.match }); } catch (e) { /* no content script on that tab */ }
  }
}
async function broadcast(msg) {
  try { const ts = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] }); for (const t of ts) { try { await chrome.tabs.sendMessage(t.id, msg); } catch (e) {} } } catch (e) {}
}
// Clicking the notification opens/FOCUSES the concealer approval surface (the web UI, which
// shows the approval modal — or the unlock screen if still locked). openPopup() is unreliable
// off a notification ("no active browser window"), so we focus a real tab instead.
chrome.notifications.onClicked.addListener(async (nid) => {
  try {
    const tabs = await chrome.tabs.query({});
    const existing = tabs.find(t => t.url && (t.url.startsWith(BASE) || t.url.startsWith("http://localhost:" + PORT)));
    if (existing) {
      await chrome.tabs.update(existing.id, { active: true });
      await chrome.windows.update(existing.windowId, { focused: true });
    } else {
      await chrome.tabs.create({ url: BASE + "/" });
    }
  } catch (e) { /* ignore */ }
  chrome.notifications.clear(nid);
});

// Poll on an alarm (survives SW sleep) and whenever a tab finishes loading (catches the
// case where the agent navigates to the login page right after approval).
chrome.alarms.create(POLL_ALARM, { periodInMinutes: 0.5 });   // backstop only (long-poll is primary); Chrome clamps <0.5 anyway
chrome.runtime.onInstalled.addListener(() => { chrome.alarms.create(POLL_ALARM, { periodInMinutes: 0.5 }); loopNotify(); });
chrome.runtime.onStartup.addListener(() => { chrome.alarms.create(POLL_ALARM, { periodInMinutes: 0.5 }); loopNotify(); });
loopNotify();   // start immediately on worker load
function tick() { pollNotify(); poll(); driveBanners(); }
chrome.alarms.onAlarm.addListener(a => { if (a.name === POLL_ALARM) tick(); });
chrome.tabs.onUpdated.addListener((id, info) => { if (info.status === "complete") tick(); });
chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  if (!msg) return;
  // The popup nudges an immediate poll right after the user approves/opens.
  if (msg.type === "concealer-poll") { Promise.resolve(tick()).then(() => reply({ ok: true })); return true; }
  // The on-page banner sends the user's decision; the SW has the token to act on it.
  if (msg.type === "af-decide") {
    (async () => {
      _banners.delete(msg.job);
      try {
        if (msg.action === "approve") await api("/api/autofill/approve", { method: "POST", body: JSON.stringify({ job: msg.job, scope: msg.scope || "once" }) });
        else await api("/api/autofill/deny", { method: "POST", body: JSON.stringify({ job: msg.job }) });
      } catch (e) {}
      poll();   // fill promptly on approve
      reply({ ok: true });
    })();
    return true;
  }
});
