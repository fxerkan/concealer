// Pure sync/merge logic shared by the app (index.html) and the node test. No DOM, no crypto, no network.
export const DIMS = ["tenant","project","environment","repo"];
export const scopeStr = e => DIMS.map(k=>e[k]||"*").join("/");
export const live = arr => arr.filter(e=>!e.deleted);
// host now_iso() format exactly: YYYY-MM-DDTHH:MM:SS+00:00 (no millis) so LWW string compare == chronological
export const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, "+00:00");
export const newId = () => [...crypto.getRandomValues(new Uint8Array(6))].map(b=>b.toString(16).padStart(2,"0")).join("");

// canonical content (ignores id/created/updated) so we can tell whether a record actually changed
export const canon = e => JSON.stringify({n:e.name||"",t:e.type||"",d:DIMS.map(k=>e[k]||""),
  tg:(e.tags||[]).slice().sort(),u:e.url||"",no:e.notes||"",f:e.fields||{},del:!!e.deleted});
export const nameKey = e => (e.name||"")+"|"+scopeStr(e);
export const newer = (a,b) => ((a.updated||"")>=(b.updated||"") ? a : b);
export function dedupeById(arr){ const m=new Map(); arr.forEach(e=>m.set(e.id,e)); return [...m.values()]; }

// 3-way merge: match by id, else by name+scope (catches cross-device duplicates). Returns the auto-merged
// set (with {__conflict:i} placeholders for undecided rows) and the conflicts needing a human decision.
export function analyze(base, local, host){
  const Bid=new Map(), Bn=new Map(); base.forEach(e=>{Bid.set(e.id,e); Bn.set(nameKey(e),e);});
  const Hid=new Map(host.map(e=>[e.id,e]));
  const Hn=new Map(); host.forEach(e=>{ if(!e.deleted) Hn.set(nameKey(e),e); });
  const baseOf = e => Bid.get(e.id) || Bn.get(nameKey(e)) || null;
  const usedH=new Set(), merged=[], conflicts=[];
  for(const l of local){
    let h=Hid.get(l.id), dup=false;
    if(!h && !l.deleted){ const c=Hn.get(nameKey(l)); if(c && !usedH.has(c.id)){ h=c; dup=true; } }
    if(h) usedH.add(h.id);
    if(!h){ merged.push(l); continue; }                            // only on this phone
    if(canon(l)===canon(h)){ merged.push(newer(l,h)); continue; }  // same content
    const b=baseOf(l), lc=!b||canon(l)!==canon(b), hc=!b||canon(h)!==canon(b);
    if(dup || (lc&&hc)){ conflicts.push({l,h,dup}); merged.push({__conflict:conflicts.length-1}); }
    else if(lc) merged.push(l);                                    // only this phone changed → take mine
    else merged.push(h);                                           // only host changed → take host
  }
  for(const h of host){ if(!usedH.has(h.id) && !local.some(l=>l.id===h.id)) merged.push(h); }  // only on host
  return {merged, conflicts};
}
// turn one conflict into the resulting record(s) per the chosen strategy
export function resolveOne(c, strat){
  const {l,h,dup}=c, now=nowIso();
  const tomb = e => ({...e, fields:{}, field_meta:{}, deleted:now, updated:now});
  if(strat==="host") return dup ? [ {...h}, tomb(l) ] : [ {...h} ];
  if(strat==="mine") return dup ? [ {...l, updated:now}, tomb(h) ] : [ {...l, updated:now} ];
  if(strat==="merge"){ const r={...l, fields:{...h.fields, ...l.fields}, updated:now};
    return dup ? [ r, tomb(h) ] : [ r ]; }
  if(strat==="both") return [ {...h}, {...l, id:newId(), name:(l.name||"secret")+"-mobile", updated:now} ];
  return [ {...l} ];   // "skip" is handled by the caller (no push); never reached here
}
// apply a global strategy to an analyze() result → final record set (deduped by id)
export function resolveAll(merged, conflicts, strat){
  const out=[];
  for(const m of merged){ if(m && m.__conflict!=null) out.push(...resolveOne(conflicts[m.__conflict], strat)); else out.push(m); }
  return dedupeById(out);
}
