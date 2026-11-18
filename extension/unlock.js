// In-page unlock (see unlock.html). Same handshake as the popup's unlock(): the token goes to
// chrome.storage.session, where the popup and the service worker pick it up.
let PORT = 8787, BASE = "http://127.0.0.1:8787";   // popup ⚙ "App port" (dev instance) overrides
const $ = id => document.getElementById(id);
// Cursor in the password box: on load, and whenever the host page focuses this frame (a page can't
// autofocus inside a cross-origin frame, but focusing the frame itself is allowed).
$("pw").focus(); window.addEventListener("focus", () => $("pw").focus());
function ensure() {   // start the app if it idle-exited (same native host the popup uses)
  if (PORT !== 8787) return Promise.resolve();   // dev instance: started by hand, never by the installed helper
  return new Promise(res => { try { chrome.runtime.sendNativeMessage("com.concealer.host", { cmd: "ensure", port: PORT }, () => { void chrome.runtime.lastError; res(); }); } catch (e) { res(); } });
}
// 👆 when this vault has a passkey: the SW opens the passkey page and joins the unlocked vault
chrome.storage.local.get("port").then(p => fetch("http://127.0.0.1:" + (p.port || 8787) + "/api/passkeys/options"))
  .then(r => r.json()).then(o => { $("pk").hidden = !o.length; }).catch(() => {});
$("pk").addEventListener("click", () => { chrome.runtime.sendMessage({ type: "af-passkey" }); $("st").textContent = "confirm with Touch ID in the new tab…"; });
$("f").addEventListener("submit", async ev => {
  ev.preventDefault();
  const pw = $("pw").value; if (!pw) return;
  $("go").disabled = true; $("st").className = ""; $("st").textContent = "unlocking…";
  const sp = (await chrome.storage.local.get("port")).port; if (sp) { PORT = sp; BASE = "http://127.0.0.1:" + sp; }
  try {
    try { await fetch(BASE + "/api/session"); } catch (e) { await ensure(); }   // spawn the helper only if the app is down
    const r = await fetch(BASE + "/api/unlock", { method: "POST", body: JSON.stringify({ pw }),
      headers: { "Content-Type": "application/json", "X-Concealer-Client": "ext" } });
    const j = await r.json();
    if (!j.ok) { $("st").className = "err"; $("st").textContent = "wrong password"; return; }
    $("pw").value = "";
    if (j.saved_while_locked) $("st").textContent = "✓ " + j.saved_while_locked + " sign-in(s) saved while locked were added";
    else $("st").textContent = "";
    const p = await chrome.storage.local.get("idle");
    const s = await (await fetch(BASE + "/api/session", { headers: { "X-Concealer-Token": j.tok } })).json();
    const idle = Math.min(p.idle == null ? 60 : p.idle, s.idle || 60);   // popup's effIdle()
    await chrome.storage.session.set({ tok: j.tok, deadline: Date.now() + idle * 1000 });
    chrome.runtime.sendMessage({ type: "af-unlocked" });   // SW tells this tab to show the entries
  } catch (e) { $("st").className = "err"; $("st").textContent = "connection error"; }
  finally { $("go").disabled = false; }
});
