// concealer — Secure Agentic Autofill service worker (fill-without-reveal).
// Polls the loopback concealer app for APPROVED fill jobs, claims the value (which only
// ever travels app -> here -> the page's content script, never to the agent/LLM), and
// hands it to the content script running on the matching tab. The content script re-verifies
// the origin and fills the form. Status is reported back to the app.
const PORT = 8787;                       // concealer default; matches host_permissions
const BASE = `http://127.0.0.1:${PORT}`;
const POLL_ALARM = "concealer-autofill-poll";

// Honour the popup's extension auto-lock deadline here too, so the on-page menu locks with it.
async function token() {
  const { tok, deadline } = await chrome.storage.session.get(["tok", "deadline"]);
  if (tok && deadline && Date.now() > deadline) {
    await chrome.storage.session.remove(["tok", "deadline"]);
    fetch(BASE + "/api/lock", { method: "POST", headers: { "X-Concealer-Token": tok } }).catch(() => {});
    return null;
  }
  return tok || null;
}

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

// Multi-step sign-ins (AWS root: e-mail page, then password page): after a username-only fill
// (or AWS IAM: account page, then username+password page) the rest waits here, in memory, for
// the SAME tab's next page for 2 minutes — never on disk.
const _cont = new Map();   // tabId -> {domain, username, password, exp}
async function sendFill(tabId, creds) {
  let res;
  try { res = await chrome.tabs.sendMessage(tabId, Object.assign({ type: "concealer-fill" }, creds)); }
  catch (e) { res = { ok: false, detail: "content script not reachable" }; }
  if (res && res.ok && res.partial && creds.password) _cont.set(tabId, { domain: creds.domain, username: creds.username, password: creds.password, exp: Date.now() + 120000 });
  else _cont.delete(tabId);
  return res;
}
// Human clicked a suggestion (page panel or popup). The URL comes from Chrome's tab record,
// not from the page, and the app re-checks that the record belongs to that site.
async function fillWithId(tabId, id) {
  const t = await chrome.tabs.get(tabId);
  const creds = await api("/api/autofill/fill", { method: "POST", body: JSON.stringify({ id, url: t.url }) });
  if (!creds) return { ok: false, detail: "locked, or this secret isn't for this site" };
  chrome.storage.local.set({ ["last:" + creds.domain]: id });   // per Chrome profile: each profile keeps its own default account
  return sendFill(tabId, creds);
}
async function suggest(tab, hasPw) {
  let host = ""; try { host = new URL(tab.url).hostname; } catch (e) { return { rows: [] }; }
  const c = _cont.get(tab.id);
  if (hasPw && c && c.exp > Date.now() && c.domain === regDomain(host)) {
    const res = await sendFill(tab.id, { domain: c.domain, username: c.username, password: c.password });
    if (res && res.ok) return { continued: true };
  }
  let rows; try { rows = await api("/api/autofill/match?url=" + encodeURIComponent(tab.url)); } catch (e) { return { rows: [] }; }   // app down: stay quiet
  if (rows === null) return { locked: true };
  const last = (await chrome.storage.local.get("last:" + regDomain(host)))["last:" + regDomain(host)];
  rows.sort((a, b) => (b.id === last) - (a.id === last));
  return { rows };
}

// Claim one approved job and drive the fill on a matching tab. Several tabs can share the
// domain (an open AWS console next to the sign-in page): try them, most recently used first,
// until one actually has a login form.
async function handleJob(job) {
  const tabs = (await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] }))
    .filter(t => { try { return regDomain(new URL(t.url).hostname) === job.domain; } catch { return false; } })
    .sort((a, b) => (b.active - a.active) || ((b.lastAccessed || 0) - (a.lastAccessed || 0)));
  if (!tabs.length) return;               // no tab for this domain yet; leave the job for the next poll
  const creds = await api("/api/autofill/claim", { method: "POST", body: JSON.stringify({ job: job.id }) });
  if (!creds) return;                     // someone else claimed it, or it expired
  let res = null;
  for (const t of tabs) { res = await sendFill(t.id, creds); if (res && res.ok) break; }
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
chrome.tabs.onRemoved.addListener(id => _cont.delete(id));
// Right-click on any input → "Autofill with concealer" opens the on-page menu at that field.
function ctxMenu() { chrome.contextMenus.removeAll(() => chrome.contextMenus.create({ id: "cer-fill", title: "Autofill with concealer", contexts: ["editable"] })); }
chrome.runtime.onInstalled.addListener(ctxMenu);
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "cer-fill" && tab) chrome.tabs.sendMessage(tab.id, { type: "af-open-menu" }, { frameId: info.frameId || 0 }).catch(() => {});
});
chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  if (!msg) return;
  // The popup nudges an immediate poll right after the user approves/opens.
  if (msg.type === "concealer-poll") { Promise.resolve(tick()).then(() => reply({ ok: true })); return true; }
  if (msg.type === "af-suggest" && _s.tab) { suggest(_s.tab, msg.hasPw).then(reply, () => reply(null)); return true; }
  if (msg.type === "af-fill") {
    const tabId = _s.tab ? _s.tab.id : msg.tabId;   // page panel: its own tab; popup: the tab it names
    fillWithId(tabId, msg.id).then(reply, () => reply({ ok: false, detail: "fill error" })); return true;
  }
  // The in-page unlock frame (unlock.html) succeeded: let that tab's menu show the entries.
  if (msg.type === "af-unlocked" && _s.tab) { chrome.tabs.sendMessage(_s.tab.id, { type: "af-unlocked" }, { frameId: 0 }).catch(() => {}); tick(); return; }
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

// Address-bar shortcut: type `cer` ⇥ ↵ to open the web UI — no IP/port to remember. The native
// host starts the server first if it isn't running (e.g. after its idle self-exit).
chrome.omnibox.setDefaultSuggestion({ description: "Open the concealer vault" });
chrome.omnibox.onInputEntered.addListener(async (_text, disposition) => {
  await new Promise(res => { try { chrome.runtime.sendNativeMessage("com.concealer.host", { cmd: "ensure", port: PORT }, () => { void chrome.runtime.lastError; res(); }); } catch (e) { res(); } });
  const tabs = await chrome.tabs.query({});
  const open = tabs.find(t => t.url && (t.url.startsWith(BASE) || t.url.startsWith("http://localhost:" + PORT) || t.url.startsWith("http://concealer.localhost:" + PORT)));
  if (open) { await chrome.tabs.update(open.id, { active: true }); await chrome.windows.update(open.windowId, { focused: true }); }
  else if (disposition === "currentTab") chrome.tabs.update({ url: BASE + "/" });
  else chrome.tabs.create({ url: BASE + "/" });
});

// Typed addresses: `cer/` or `concealer.localhost` (no port) don't resolve to anything, but the
// tab still reports the URL — catch it and send the tab to the vault (server started first).
// Uses the existing `tabs` permission only. The omnibox keyword above can't do this: Chrome
// runs a web search when Enter is pressed with nothing typed after the keyword.
const ALIAS = /^https?:\/\/(cer|concealer|concealer\.localhost)\.?(:80)?\/?$/i;
chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (!info.url || !ALIAS.test(info.url)) return;
  await new Promise(res => { try { chrome.runtime.sendNativeMessage("com.concealer.host", { cmd: "ensure", port: PORT }, () => { void chrome.runtime.lastError; res(); }); } catch (e) { res(); } });
  chrome.tabs.update(tabId, { url: BASE + "/" });
});
