// In-page unlock (see unlock.html). Same handshake as the popup's unlock(): the token goes to
// chrome.storage.session, where the popup and the service worker pick it up.
const BASE = "http://127.0.0.1:8787";
const $ = id => document.getElementById(id);
function ensure() {   // start the app if it idle-exited (same native host the popup uses)
  return new Promise(res => { try { chrome.runtime.sendNativeMessage("com.concealer.host", { cmd: "ensure", port: 8787 }, () => { void chrome.runtime.lastError; res(); }); } catch (e) { res(); } });
}
$("f").addEventListener("submit", async ev => {
  ev.preventDefault();
  const pw = $("pw").value; if (!pw) return;
  $("go").disabled = true; $("st").className = ""; $("st").textContent = "unlocking…";
  try {
    await ensure();
    const r = await fetch(BASE + "/api/unlock", { method: "POST", body: JSON.stringify({ pw }),
      headers: { "Content-Type": "application/json", "X-Concealer-Client": "ext" } });
    const j = await r.json();
    if (!j.ok) { $("st").className = "err"; $("st").textContent = "wrong password"; return; }
    $("pw").value = "";
    const p = await chrome.storage.local.get("idle");
    const s = await (await fetch(BASE + "/api/session", { headers: { "X-Concealer-Token": j.tok } })).json();
    const idle = Math.min(p.idle == null ? 60 : p.idle, s.idle || 60);   // popup's effIdle()
    await chrome.storage.session.set({ tok: j.tok, deadline: Date.now() + idle * 1000 });
    chrome.runtime.sendMessage({ type: "af-unlocked" });   // SW tells this tab to show the entries
  } catch (e) { $("st").className = "err"; $("st").textContent = "connection error"; }
  finally { $("go").disabled = false; }
});
