"use strict";
// concealer popup: ensure the local web server is up (via native host), unlock with the
// master password, then list secrets and copy field values. Token lives in
// chrome.storage.session (memory-only) and is sent as X-Concealer-Token — the SPA's HttpOnly
// cookie can't ride cross-origin fetches from an extension page.
const PORT = 8787;                       // concealer default; matches manifest host_permissions
const HOST = "com.concealer.host";       // native messaging host
const BASE = `http://127.0.0.1:${PORT}`;

const $ = s => document.querySelector(s);
let TOKEN = null, ROWS = [], _timer = null;
let CLIP_CLEAR = 20;      // clipboard wipe seconds
let EXT_IDLE = 60;        // extension's own auto-lock (shorter than the server's), seconds
let REVEAL_HIDE = 10;     // re-mask a revealed field after N seconds
let IDLE = 0;             // server idle-lock (seconds), from /api/session
let THEME = "dark";       // dark | light | matrix (same palettes as the web UI)

function toast(msg){ const t=$("#toast"); t.textContent=msg; t.hidden=false; clearTimeout(t._h); t._h=setTimeout(()=>t.hidden=true,2200); }
// Chrome sizes the popup to content; a position:fixed modal adds none, so on a short (locked)
// page it gets clipped. Grow <body> to the modal's height while it's open, reset on close.
function fitModal(id){ const s=$("#"+id).querySelector(".sheet"); if(s) document.body.style.minHeight=(s.offsetHeight+28)+"px"; }  // offsetHeight forces sync layout
function closeModal(id){ $("#"+id).hidden=true; document.body.style.minHeight=""; }
function show(id){ for(const s of ["setup","unlock","list"]) $("#"+s).hidden = (s!==id); }
function setStatus(msg,err){ const s=$("#status"); s.textContent=msg||""; s.className="status"+(err?" err":""); }

async function getToken(){ return (await chrome.storage.session.get("tok")).tok || null; }
async function setToken(t){ TOKEN=t; if(t) await chrome.storage.session.set({tok:t}); else await chrome.storage.session.remove("tok"); }
async function getDeadline(){ return (await chrome.storage.session.get("deadline")).deadline || 0; }
async function setDeadline(ms){ if(ms) await chrome.storage.session.set({deadline:ms}); else await chrome.storage.session.remove("deadline"); }
async function loadPrefs(){
  const p=await chrome.storage.local.get(["clip","idle","reveal","theme"]);
  CLIP_CLEAR = p.clip==null?20:p.clip;
  EXT_IDLE   = p.idle==null?60:p.idle;
  REVEAL_HIDE= p.reveal==null?10:p.reveal;
  applyTheme(p.theme||"dark");
}
function applyTheme(name){
  THEME=name;
  if(name==="dark") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme",name);
  for(const n of ["dark","light","matrix"]){ const b=$("#th_"+n); if(b) b.classList.toggle("active", n===name); }
}
async function setTheme(name){ applyTheme(name); await chrome.storage.local.set({theme:name}); }
function effIdle(){ return Math.min(EXT_IDLE, IDLE||EXT_IDLE); }   // never exceed the server's idle

function api(path, opts={}){
  const h = Object.assign({"X-Concealer-Client":"ext"}, opts.headers||{});
  if(TOKEN) h["X-Concealer-Token"]=TOKEN;
  return fetch(BASE+path, Object.assign({}, opts, {headers:h}));
}

// ---- auto-lock countdown (extension's own, capped at the server's remaining) ----
function stopTimer(){ if(_timer){ clearInterval(_timer); _timer=null; } const el=$("#timer"); el.hidden=true; el.classList.remove("warn"); }
function startTimer(remaining){
  stopTimer();
  const deadline = Date.now() + Math.max(0,remaining)*1000;
  const el=$("#timer");
  const tick=()=>{
    const rem=Math.round((deadline-Date.now())/1000);
    if(rem<=0){ stopTimer(); autoLock(); return; }
    const m=String(Math.floor(rem/60)).padStart(2,"0"), s=String(rem%60).padStart(2,"0");
    el.textContent=`auto-lock ${m}:${s}`; el.hidden=false;
    el.classList.toggle("warn", rem<=10);   // blink red near the end
  };
  tick(); _timer=setInterval(tick,1000);
}

// ---- native host / server bring-up ----
function ensureServer(){
  return new Promise(res=>{
    try{
      chrome.runtime.sendNativeMessage(HOST, {cmd:"ensure", port:PORT}, resp=>{
        if(chrome.runtime.lastError) return res({ok:false, err:chrome.runtime.lastError.message});
        res(resp||{ok:false, err:"no response from native host"});
      });
    }catch(e){ res({ok:false, err:String(e)}); }
  });
}
async function sessionUp(){
  try{ const r=await api("/api/session"); if(!r.ok) return null; return await r.json(); }
  catch(e){ return null; }
}

async function boot(){
  setStatus("checking server…");
  await loadPrefs();
  TOKEN = await getToken();
  const ens = await ensureServer();
  const hostMissing = ens.ok===false && /not found|forbidden|access/i.test(ens.err||"");
  let s = await sessionUp();
  if(!s && !hostMissing){   // host is (probably) starting the server → poll briefly while it binds
    for(let i=0;i<20 && !s;i++){ await new Promise(r=>setTimeout(r,250)); s=await sessionUp(); }
  }
  if(!s){
    setStatus("");
    if(hostMissing) show("setup");   // native host not registered → show the `cer chrome-extension` card
    else setStatus("Couldn't reach the concealer server ("+(ens.err||"no connection")+").", true);
    return;
  }
  setStatus(""); IDLE = s.idle||0;
  if(s.unlocked){
    const dl=await getDeadline();
    const extRem = dl ? (dl-Date.now())/1000 : effIdle();
    const rem = Math.min(extRem, s.remaining||effIdle());
    if(rem<=0){ await autoLock(); return; }
    $("#lock").hidden=false; startTimer(rem); await loadSecrets();
  } else { await setToken(null); await setDeadline(0); lockUI(); }   // purge any stale token
}

async function unlock(){
  const pw = $("#pw").value; if(!pw) return;
  $("#unlockbtn").disabled=true; setStatus("unlocking…");
  try{
    const r = await api("/api/unlock", {method:"POST", body:JSON.stringify({pw})});
    const j = await r.json();
    if(j.ok){ await setToken(j.tok); $("#pw").value=""; setStatus("");
      const rem=effIdle(); await setDeadline(Date.now()+rem*1000);
      $("#lock").hidden=false; startTimer(rem); await loadSecrets(); }
    else { setStatus("wrong password", true); }
  }catch(e){ setStatus("connection error", true); }
  finally{ $("#unlockbtn").disabled=false; }
}

async function loadSecrets(){
  setStatus("loading…");
  try{
    const r = await api("/api/secrets");
    if(r.status===401){ await setToken(null); await setDeadline(0); lockUI(); return; }
    ROWS = await r.json();
    setStatus(""); show("list"); render(""); $("#search").focus();
  }catch(e){ setStatus("couldn't load secrets", true); }
}

function scopeText(e){ return [e.project, e.environment].filter(Boolean).join("/"); }
function matches(e,q){
  if(!q) return true; q=q.toLowerCase();
  return [e.name, e.type, e.project, e.environment, e.repo, (e.tags||[]).join(" ")]
    .some(v => (v||"").toLowerCase().includes(q));
}

function render(q){
  const box=$("#rows"); box.textContent="";
  const list = ROWS.filter(e=>matches(e,q));
  if(!list.length){ const d=document.createElement("div"); d.className="empty"; d.textContent="no secrets"; box.appendChild(d); return; }
  for(const e of list){
    const fnames=Object.keys(e.fields||{});
    const multi=fnames.length>1;
    const item=document.createElement("div"); item.className="item";
    const row=document.createElement("div"); row.className="row";
    row.title=multi?"click to show fields":"click to copy value";
    const nm=document.createElement("div"); nm.className="nm"; nm.textContent=e.name;
    const sc=document.createElement("div"); sc.className="sc"; sc.textContent=scopeText(e);
    const cp=document.createElement("div"); cp.className="cp"; cp.textContent=multi?"▸":"⧉";
    row.append(nm,sc,cp);
    const panel=document.createElement("div"); panel.className="fields"; panel.hidden=true;
    row.onclick=()=>{
      if(!multi){ copyField(e, fnames[0]||"", cp, "⧉"); return; }
      if(panel.hidden){
        if(!panel.dataset.built){ buildFields(e,panel); panel.dataset.built="1"; }
        panel.hidden=false; cp.textContent="▾"; row.classList.add("open");
      } else { panel.hidden=true; cp.textContent="▸"; row.classList.remove("open"); }
    };
    item.append(row,panel); box.appendChild(item);
  }
}

// one child row per field: name + value (non-secret shown, secret masked) + copy (+ reveal for secret)
function buildFields(e,panel){
  for(const [fname,f] of Object.entries(e.fields||{})){
    const fr=document.createElement("div"); fr.className="frow";
    const fn=document.createElement("div"); fn.className="fn"; fn.textContent=fname; fn.title=fname;
    const fv=document.createElement("div"); fv.className="fv"; fv.textContent = f.secret ? "••••••••" : (f.value ?? "");
    fr.append(fn,fv);
    if(f.secret){
      const eye=document.createElement("button"); eye.className="ghost ico"; eye.textContent="👁"; eye.title="reveal";
      eye.onclick=ev=>{ ev.stopPropagation(); revealField(e,fname,fv,eye); };
      fr.append(eye);
    }
    const cp=document.createElement("button"); cp.className="ghost ico"; cp.textContent="📋"; cp.title="copy";
    cp.onclick=ev=>{ ev.stopPropagation(); copyField(e,fname,cp,"📋"); };
    fr.append(cp);
    panel.appendChild(fr);
  }
}

async function fieldValue(e,fname){
  const f=(e.fields||{})[fname]||{};
  if(!f.secret) return f.value ?? "";
  if(!e._revealed){
    const r=await api("/api/secret/"+e.id+"?reveal=1&intent=copy");
    if(r.status===401){ await setToken(null); await setDeadline(0); lockUI(); throw new Error("locked"); }
    e._revealed=(await r.json()).fields||{};
  }
  return e._revealed[fname]?.value ?? "";
}

async function copyField(e,fname,btn,restore){
  try{
    const val=await fieldValue(e,fname);
    if(val===""){ toast("no value to copy"); return; }
    await navigator.clipboard.writeText(val);
    api("/api/copy",{method:"POST",body:JSON.stringify({key:e.name,field:fname})}).catch(()=>{});
    btn.textContent="✓"; btn.classList.add("ok");
    toast(CLIP_CLEAR>0 ? `copied ${fname||"value"} — clears in ${CLIP_CLEAR}s` : `copied ${fname||"value"}`);
    if(CLIP_CLEAR>0) setTimeout(()=>navigator.clipboard.writeText("").catch(()=>{}), CLIP_CLEAR*1000);
    setTimeout(()=>{ btn.textContent=restore; btn.classList.remove("ok"); }, 2000);
  }catch(err){ if(err.message!=="locked") toast("copy failed"); }
}

async function revealField(e,fname,fvEl,btn){
  try{
    const on=btn.classList.toggle("on");
    clearTimeout(btn._h);
    if(on){
      fvEl.textContent=await fieldValue(e,fname); btn.textContent="🙈";
      if(REVEAL_HIDE>0) btn._h=setTimeout(()=>{ fvEl.textContent="••••••••"; btn.textContent="👁"; btn.classList.remove("on"); }, REVEAL_HIDE*1000);
    } else { fvEl.textContent="••••••••"; btn.textContent="👁"; }
  }catch(err){ if(err.message!=="locked"){ toast("reveal failed"); btn.classList.remove("on"); } }
}

// ---- lock ----
function lockUI(){ stopTimer(); ROWS=[]; $("#lock").hidden=true; show("unlock"); $("#pw").value=""; $("#pw").focus(); }
async function lock(){ try{ await api("/api/lock",{method:"POST"}); }catch(e){} await setToken(null); await setDeadline(0); lockUI(); setStatus(""); }
async function autoLock(){ try{ await api("/api/lock",{method:"POST"}); }catch(e){} await setToken(null); await setDeadline(0); lockUI(); toast("auto-locked"); }

// ---- open full web UI (works locked — you unlock there) ----
async function openWeb(){ await ensureServer(); chrome.tabs.create({url:BASE}); window.close(); }

// ---- generate password (client-side, crypto; works locked) ----
function genValue(){
  const fmt=$("#g_fmt").value;
  if(fmt==="uuid") return crypto.randomUUID();
  const n=Math.max(1,Math.min(512,parseInt($("#g_len").value)||24));
  if(fmt==="hex"||fmt==="base64url"){
    const b=new Uint8Array(fmt==="hex"?Math.ceil(n/2):n); crypto.getRandomValues(b);
    if(fmt==="hex") return [...b].map(x=>x.toString(16).padStart(2,"0")).join("").slice(0,n);
    return btoa(String.fromCharCode(...b)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"").slice(0,n);
  }
  let set=""; if($("#g_lower").checked)set+="abcdefghijklmnopqrstuvwxyz";
  if($("#g_upper").checked)set+="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if($("#g_digit").checked)set+="0123456789";
  if($("#g_sym").checked)set+="!@#$%^&*()-_=+[]{};:,.<>?";
  if(!set)set="abcdefghijklmnopqrstuvwxyz";
  const out=new Uint8Array(n); crypto.getRandomValues(out);
  return [...out].map(x=>set[x%set.length]).join("");   // ponytail: mod-bias negligible at set≤95, len≥16
}
function regen(){ $("#g_out").value=genValue(); }
function genOpts(){ const f=$("#g_fmt").value; $("#g_lenwrap").style.display=(f==="uuid")?"none":""; $("#g_classes").style.display=(f==="password")?"":"none"; }
function openGen(){ $("#genModal").hidden=false; genOpts(); regen(); fitModal("genModal"); }

// ---- settings (works locked) ----
async function openSettings(){
  const maxIdle = IDLE||300;
  $("#s_clip").value=CLIP_CLEAR;
  const si=$("#s_idle"); si.max=maxIdle; si.value=Math.min(EXT_IDLE,maxIdle);
  $("#s_reveal").value=REVEAL_HIDE;
  $("#s_ver").innerHTML=`conceal<span class="ac">er</span> · v${chrome.runtime.getManifest().version}`;
  const info=$("#s_info");
  info.innerHTML=`<div><span>Port</span><span>${PORT}</span></div><div><span>Server auto-lock</span><span>${IDLE?Math.round(IDLE/60)+" min":"—"}</span></div>`;
  $("#s_devcmd").textContent = "cer chrome-extension --add-id " + (chrome.runtime.id||"");
  $("#setModal").hidden=false; fitModal("setModal");
  try{ const s=await (await api("/api/settings")).json(); if(s&&"hardened"in s){ info.innerHTML+=`<div><span>Vault hardened</span><span>${s.hardened?"yes":"no"}</span></div>`; fitModal("setModal"); } }catch(e){}
}
async function saveSettings(){
  const maxIdle=IDLE||300;
  let clip=parseInt($("#s_clip").value); if(isNaN(clip)||clip<0)clip=0; if(clip>600)clip=600;
  let idle=parseInt($("#s_idle").value); if(isNaN(idle)||idle<10)idle=10; if(idle>maxIdle)idle=maxIdle;
  let rev=parseInt($("#s_reveal").value); if(isNaN(rev)||rev<5)rev=5; if(rev>30)rev=30;
  CLIP_CLEAR=clip; EXT_IDLE=idle; REVEAL_HIDE=rev;
  await chrome.storage.local.set({clip,idle,reveal:rev});
  $("#s_clip").value=clip; $("#s_idle").value=idle; $("#s_reveal").value=rev;
  if(TOKEN){ await setDeadline(Date.now()+idle*1000); startTimer(idle); }   // apply new idle immediately
}

// ---- wiring ----
$("#unlockbtn").onclick=unlock;
$("#pw").addEventListener("keydown",e=>{ if(e.key==="Enter") unlock(); });
$("#search").addEventListener("input",e=>render(e.target.value));
$("#lock").onclick=lock;
$("#openweb").onclick=openWeb;
$("#brand").onclick=openWeb;
$("#gen").onclick=openGen;
$("#genClose").onclick=()=>closeModal("genModal");
$("#genModal").onclick=e=>{ if(e.target.id==="genModal") closeModal("genModal"); };
$("#g_fmt").onchange=()=>{ genOpts(); regen(); };
$("#g_len").oninput=regen;
for(const id of ["g_lower","g_upper","g_digit","g_sym"]) $("#"+id).onchange=regen;
$("#g_regen").onclick=regen;
$("#g_copy").onclick=async()=>{
  const v=$("#g_out").value; if(!v) return;
  await navigator.clipboard.writeText(v);
  toast(CLIP_CLEAR>0?`copied — clears in ${CLIP_CLEAR}s`:"copied");
  if(CLIP_CLEAR>0) setTimeout(()=>navigator.clipboard.writeText("").catch(()=>{}),CLIP_CLEAR*1000);
};
$("#setupcopy").onclick=async()=>{ await navigator.clipboard.writeText($("#setupcmd").textContent); toast("copied command"); };
$("#s_devcopy").onclick=async()=>{ await navigator.clipboard.writeText($("#s_devcmd").textContent); toast("copied command"); };
for(const n of ["dark","light","matrix"]) $("#th_"+n).onclick=()=>setTheme(n);
$("#settings").onclick=openSettings;
$("#setClose").onclick=()=>{ saveSettings(); closeModal("setModal"); };
$("#setModal").onclick=e=>{ if(e.target.id==="setModal"){ saveSettings(); closeModal("setModal"); } };
$("#s_web").onclick=openWeb;
boot();
