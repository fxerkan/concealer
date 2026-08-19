---
title: Comparison
layout: default
nav_order: 12
---
# How concealer compares

{: .no_toc }

Where concealer sits next to cloud password managers, DevOps secret platforms, and other local/file‑based tools — with an honest read on what it does *not* do.
{: .fs-5 .fw-300 }

1. TOC
   {:toc}

---

## TL;DR

concealer is a **local‑only, single‑file, zero‑infra, AI‑agent native** secret manager: a typed, scoped, audited front end over [SOPS](https://github.com/getsops/sops) + [age](https://github.com/FiloSottile/age). It is not trying to be 1Password or HashiCorp Vault. It occupies a gap those tools leave open:

> An encrypted, git‑friendly vault a developer (or an AI agent) can run on one machine with no server, no SaaS account, no daemon, and no cloud — but with the typing, scoping, audit trail, and agent‑safe MCP access that raw `sops`/`age`/`pass` don't give you.

If you need team sharing, SSO, dynamic database credentials, or mobile autofill, concealer is the wrong tool — the tables below say so plainly.

---

## The three markets it's measured against

| Category                                       | Examples                                                                           | What they optimize for                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Cloud password managers**              | 1Password, Bitwarden, Keeper, LastPass, Dashlane, NordPass                         | Human end‑users, autofill, cross‑device sync, sharing              |
| **DevOps / enterprise secret platforms** | HashiCorp Vault, AWS/Azure/GCP Secret Manager, Doppler, Infisical, CyberArk Conjur | Fleets of services, dynamic secrets, rotation, RBAC, CI/CD injection |
| **Local / file‑based OSS**              | SOPS+age (raw),`pass`/`gopass`, KeePassXC, git‑crypt, **secretctl**            | Owning your data, no server, git‑versionable                        |

concealer lives in the third market but borrows the *ergonomics* (typing, scoping, audit, UI) usually only found in the first two.

---

## Master comparison matrix

Legend: ✅ yes · ⚠️ partial / with caveats · ❌ no · — n/a or unknown · **★ = only concealer**

The **Capability** and **concealer** columns stay pinned while you scroll right to see every other tool; scroll down inside the table for the remaining rows. Rows marked ★ are capabilities **no other tool in this table matches**.

<style>
.cmp-wrap{--cbg:#0d0f13;--chead:#1b1f27;--czA:#0c0e12;--czB:#101319;--ccer:#1a160c;--ccerhd:#2a2410;--cline:#242a33;--ctxt:#e8e8e6;--cstar:#ffb020;--cuniqcap:#1c1810;
  max-height:560px;overflow:auto;border:1px solid var(--cline);border-radius:12px;position:relative;margin:14px 0}
html[data-cer-theme="light"] .cmp-wrap{--cbg:#fff;--chead:#eef0f3;--czA:#fff;--czB:#f6f7f9;--ccer:#fff6e2;--ccerhd:#ffe7bd;--cline:#e2e6eb;--ctxt:#1a1d23;--cstar:#b06f00;--cuniqcap:#fff7ea}
.cmp-wrap .table-wrapper{display:contents}
.cmp{border-collapse:separate;border-spacing:0;min-width:1560px;font-size:12.5px;line-height:1.4;color:var(--ctxt);background:var(--cbg)}
.cmp th,.cmp td{box-sizing:border-box;border-bottom:1px solid var(--cline);border-right:1px solid var(--cline);padding:9px 12px;text-align:left;vertical-align:top;white-space:nowrap}
.cmp thead th{position:sticky;top:0;z-index:3;background:var(--chead);font-weight:700}
.cmp tbody tr:nth-child(odd) td{background:var(--czA)}
.cmp tbody tr:nth-child(even) td{background:var(--czB)}
.cmp .cap{position:sticky;left:0;z-index:2;width:216px;min-width:216px;max-width:216px;white-space:normal;font-weight:600}
.cmp thead th.cap{z-index:5}
.cmp .cer{position:sticky;left:216px;z-index:2;width:190px;min-width:190px;max-width:190px;white-space:normal;background:var(--ccer)!important}
.cmp thead th.cer{z-index:5;background:var(--ccerhd)!important}
.cmp tbody tr.u td{background:rgba(255,176,32,.07)}
.cmp tbody tr.u .cap{box-shadow:inset 4px 0 0 var(--cstar);background:var(--cuniqcap)}
.cmp .star{color:var(--cstar);font-weight:800;margin-left:4px}
.cmp small{opacity:.8}
.cmp-tools{display:flex;justify-content:flex-end;margin:6px 0 -6px}
.cmp-expand{cursor:pointer;border:1px solid var(--cline);background:var(--chead);color:var(--ctxt);border-radius:8px;padding:6px 12px;font-size:13px;font-weight:600}
.cmp-expand:hover{border-color:var(--cstar)}
.cmp-backdrop{display:none;position:fixed;inset:0;background:rgba(0,0,0,.66);z-index:999}
.cmp-close{display:none;position:fixed;top:26px;right:32px;z-index:1001;cursor:pointer;border:1px solid var(--cline);background:var(--chead);color:var(--ctxt);border-radius:8px;padding:8px 14px;font-size:14px;font-weight:700;box-shadow:0 6px 20px rgba(0,0,0,.4)}
body.cmp-open .cmp-backdrop,body.cmp-open .cmp-close{display:block}
body.cmp-open .cmp-wrap.cmp-full{position:fixed;inset:24px;max-height:none;height:calc(100vh - 48px);width:calc(100vw - 48px);z-index:1000;box-shadow:0 24px 90px rgba(0,0,0,.6)}
body.cmp-open .cmp-wrap.cmp-full .cmp{font-size:13.5px}
</style>
<div class="cmp-tools"><button type="button" class="cmp-expand">⤢ Expand / zoom</button></div>
<div class="cmp-wrap" id="cmpwrap" markdown="0">
<table class="cmp">
<thead><tr>
<th class="cap">Capability</th><th class="cer">concealer</th><th>secretctl</th><th>pass / gopass</th><th>KeePassXC</th><th>1Password</th><th>Bitwarden<br>(+ Secrets&nbsp;Mgr)</th><th>Keeper</th><th>LastPass</th><th>HashiCorp Vault</th><th>Doppler</th><th>Infisical</th><th>AWS Secrets Mgr</th><th>SOPS+age (raw)</th>
</tr></thead>
<tbody>
<tr><td class="cap">Deployment</td><td class="cer">Local, single file</td><td>Local, single binary</td><td>Local</td><td>Local</td><td>SaaS</td><td>SaaS or self‑host</td><td>SaaS</td><td>SaaS</td><td>Self‑host / HCP</td><td>SaaS</td><td>SaaS or self‑host</td><td>Cloud only</td><td>Local</td></tr>
<tr><td class="cap">Requires a server / daemon</td><td class="cer">❌ none</td><td>❌ none</td><td>❌</td><td>❌</td><td>cloud</td><td>⚠️ self‑host runs a server</td><td>cloud</td><td>cloud</td><td>✅ server</td><td>✅</td><td>✅</td><td>✅</td><td>❌</td></tr>
<tr><td class="cap">Open source</td><td class="cer">✅</td><td>✅ Apache‑2.0</td><td>✅</td><td>✅</td><td>❌</td><td>✅</td><td>❌</td><td>❌</td><td>⚠️ BUSL</td><td>❌</td><td>✅</td><td>❌</td><td>✅</td></tr>
<tr><td class="cap">Cost</td><td class="cer">Free</td><td>Free</td><td>Free</td><td>Free</td><td>~$3/mo+</td><td>Free tier; SM $6–12/u/mo</td><td>~$3.75/u/mo+</td><td>~$3/mo+</td><td>Free OSS / $$$ ent.</td><td>paid tiers</td><td>Free OSS / paid cloud</td><td>usage‑based</td><td>Free</td></tr>
<tr><td class="cap">Encryption backend</td><td class="cer">age (X25519) via SOPS</td><td>AES‑256‑GCM (Argon2id)</td><td>GPG (or age)</td><td>AES / ChaCha</td><td>proprietary</td><td>proprietary</td><td>proprietary</td><td>proprietary</td><td>own / transit</td><td>managed</td><td>managed</td><td>KMS</td><td>age / PGP / KMS</td></tr>
<tr><td class="cap">Storage format</td><td class="cer">Encrypted YAML/JSON, git‑friendly</td><td>Encrypted SQLite (0600)</td><td>GPG files + git</td><td>single <code>.kdbx</code></td><td>proprietary cloud</td><td>proprietary</td><td>proprietary</td><td>proprietary</td><td>backend store</td><td>cloud</td><td>cloud / DB</td><td>cloud</td><td>encrypted file</td></tr>
<tr><td class="cap">Git‑versionable vault</td><td class="cer">✅ <small>values encrypted, keys visible</small></td><td>❌ SQLite blob</td><td>✅</td><td>⚠️ blob only</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>⚠️</td><td>❌</td><td>⚠️</td><td>❌</td><td>✅</td></tr>
<tr class="u"><td class="cap">Typed secrets <small>(db/api/ssh/…)</small><span class="star">★</span></td><td class="cer">✅ templates</td><td>—</td><td>❌</td><td>⚠️</td><td>⚠️ item types</td><td>⚠️ item types</td><td>⚠️</td><td>⚠️</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td></tr>
<tr><td class="cap">Scoping</td><td class="cer">✅ first‑class <small>(tenant/project/env/repo)</small></td><td>⚠️ wildcards <small>(aws/*)</small></td><td>⚠️ dirs</td><td>⚠️ groups</td><td>⚠️ vaults/tags</td><td>⚠️ collections</td><td>⚠️ folders</td><td>⚠️</td><td>✅ paths/policies</td><td>✅ configs/envs</td><td>✅ envs/folders</td><td>✅ ARNs</td><td>❌</td></tr>
<tr><td class="cap">Field‑aware masking</td><td class="cer">✅ per‑field + heuristics</td><td>—</td><td>❌</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>n/a</td><td>n/a</td><td>⚠️</td><td>n/a</td><td>❌</td></tr>
<tr><td class="cap">Web UI</td><td class="cer">✅ built‑in SPA</td><td>❌ <small>(desktop app)</small></td><td>❌</td><td>❌ <small>(desktop app)</small></td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>❌</td></tr>
<tr><td class="cap">TUI / CLI</td><td class="cer">✅ both</td><td>✅ CLI</td><td>✅ CLI</td><td>⚠️</td><td>✅ CLI</td><td>✅ CLI</td><td>⚠️</td><td>⚠️</td><td>✅ CLI</td><td>✅ CLI</td><td>✅ CLI</td><td>✅ CLI</td><td>✅ CLI</td></tr>
<tr><td class="cap">Tamper‑evident audit log</td><td class="cer">✅ HMAC‑chained + head anchor</td><td>✅ HMAC‑chained</td><td>⚠️ git log</td><td>❌</td><td>⚠️ cloud logs</td><td>⚠️</td><td>✅</td><td>⚠️</td><td>✅</td><td>✅</td><td>✅</td><td>✅ CloudTrail</td><td>❌</td></tr>
<tr><td class="cap">AI‑agent / MCP native</td><td class="cer">✅ MCP server, agent gate, rate‑limit</td><td>✅ MCP, no plaintext</td><td>❌</td><td>❌</td><td>⚠️ 3rd‑party</td><td>❌</td><td>❌</td><td>❌</td><td>⚠️ SDK</td><td>⚠️ SDK</td><td>⚠️ SDK</td><td>⚠️ SDK</td><td>❌</td></tr>
<tr class="u"><td class="cap">Anti‑bulk‑exfiltration for agents<span class="star">★</span></td><td class="cer">✅ per‑agent quotas</td><td>—</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>⚠️ policy</td><td>❌</td><td>❌</td><td>⚠️ IAM</td><td>❌</td></tr>
<tr><td class="cap">Dynamic / leased secrets</td><td class="cer">❌</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>✅</td><td>⚠️</td><td>✅</td><td>⚠️ rotation</td><td>❌</td></tr>
<tr><td class="cap">Automatic rotation</td><td class="cer">❌ manual</td><td>—</td><td>❌</td><td>❌</td><td>⚠️</td><td>⚠️</td><td>✅</td><td>⚠️</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>❌</td></tr>
<tr><td class="cap">Multi‑user / RBAC / SSO</td><td class="cer">❌ single‑owner</td><td>❌ single‑owner</td><td>⚠️ keys</td><td>❌</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅ IAM</td><td>⚠️ recipients</td></tr>
<tr><td class="cap">Mobile app / browser autofill</td><td class="cer">❌</td><td>❌</td><td>⚠️</td><td>⚠️</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td></tr>
<tr><td class="cap">Works fully offline</td><td class="cer">✅</td><td>✅</td><td>✅</td><td>✅</td><td>⚠️ cache</td><td>⚠️</td><td>⚠️</td><td>⚠️</td><td>⚠️</td><td>❌</td><td>❌</td><td>❌</td><td>✅</td></tr>
<tr><td class="cap">Recovery codes / 2nd‑factor key rotation</td><td class="cer">✅ one‑time codes, code‑gated <code>passwd</code></td><td>—</td><td>❌</td><td>⚠️ keyfile</td><td>✅ recovery kit</td><td>⚠️</td><td>✅</td><td>⚠️</td><td>⚠️ unseal keys</td><td>⚠️</td><td>⚠️</td><td>✅</td><td>❌</td></tr>
<tr><td class="cap">External dependencies</td><td class="cer"><code>sops</code>, <code>age</code>, <code>expect</code></td><td>none <small>(single binary)</small></td><td><code>gpg</code> / <code>git</code></td><td>Qt app</td><td>—</td><td>—</td><td>—</td><td>—</td><td>many</td><td>—</td><td>—</td><td>—</td><td><code>sops</code>, <code>age</code></td></tr>
</tbody>
</table>
</div>
<div class="cmp-backdrop"></div>
<button type="button" class="cmp-close">✕ Close</button>
<script>
/* Fullscreen zoom for the comparison matrix. Block comments only. */
(function(){
  var wrap=document.getElementById('cmpwrap');
  var btn=document.querySelector('.cmp-expand');
  var back=document.querySelector('.cmp-backdrop');
  var close=document.querySelector('.cmp-close');
  if(!wrap||!btn)return;
  function open(){document.body.classList.add('cmp-open');wrap.classList.add('cmp-full');}
  function shut(){document.body.classList.remove('cmp-open');wrap.classList.remove('cmp-full');}
  btn.addEventListener('click',open);
  if(back)back.addEventListener('click',shut);
  if(close)close.addEventListener('click',shut);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')shut();});
})();
</script>

*Pricing figures are indicative 2026 list prices and change often — treat them as order‑of‑magnitude, not quotes. secretctl figures are from its public README (Apache‑2.0, Go, SQLite, AES‑256‑GCM + Argon2id, MCP). “—” marks a capability its docs don't state.*

---

## Where concealer wins

- **Zero infrastructure.** No server, no container, no cloud tenant, no daemon. `init`, and you have a vault. Vault/Doppler/Infisical all assume a running service; concealer is a script.
- **Git‑native.** The vault is an encrypted YAML/JSON file — keys visible, values encrypted — so it diffs and versions in the same repo as your code. Raw SOPS gives you this too, but without the typing/scoping/UI/audit on top.
- **Agent‑first.** It's the only tool in the table with a **built‑in MCP server designed around AI‑agent threat models**: registered‑agent‑only gate, per‑agent bulk‑exfiltration quotas, and values that never reach the agent (`run_with_secrets` injects to a child env and redacts output). Everyone else bolts agents on via a generic SDK with no exfiltration ceiling.
- **Tamper‑evident by design.** An HMAC‑chained audit log with a head anchor catches tail‑truncation — stronger than a plain file or `git log`, without needing a cloud audit pipeline.
- **No lock‑in, no telemetry, one file to read.** The entire tool is one auditable Python script. Compare to trusting a proprietary cloud vault (see: the 2022 LastPass breach) or standing up Vault.

## Where concealer loses (use something else)

- **Teams.** No SSO, no RBAC, no per‑user sharing. It's a single‑owner vault. → 1Password / Bitwarden / Vault.
- **Dynamic secrets & leases.** No short‑lived DB creds minted on demand. → HashiCorp Vault.
- **Automatic rotation & CI/CD sync fabric.** Manual rotation only. → Doppler / Infisical / Vault Secrets Sync.
- **Consumer UX.** No mobile app, no browser autofill, no passkeys. → 1Password / Bitwarden / Keeper.
- **Compliance posture at scale.** No FedRAMP/SOC2 attestations (those are *organizational* — earned by the entity operating a tool, not shipped by the tool; see [`COMPLIANCE.md`](../COMPLIANCE.md)). The audit log’s local ceiling — an FS‑root attacker with `audit.key` can re‑forge — is now mitigated by off‑machine anchor push (`audit anchor` → append‑only file/syslog/webhook), which `audit verify` checks to catch a full re‑forge. → Keeper / Vault / cloud KMS for turnkey attestations.

---

## Closest neighbors, sharpened

- **vs. raw SOPS + age** — same crypto and same git‑friendly file, but concealer adds typed records, scoping, masking, a web UI + TUI, an audit chain, unlock tokens, recovery codes, and the MCP server. SOPS is the engine; concealer is the car.
- **vs. `pass` / `gopass`** — those are GPG‑over‑files with git. concealer swaps fragile GnuPG/`gpg-agent` for age, adds structured/typed secrets and scoping instead of one‑secret‑per‑file, and ships a UI and agent API.
- **vs. KeePassXC** — KeePassXC is an excellent *personal* single‑file vault with autofill, but it's a GUI desktop app, not git‑friendly (opaque `.kdbx` blob), and has no CLI‑first scoping, audit chain, or agent interface.
- **vs. Infisical (self‑host)** — Infisical is the closest "developer secrets" competitor with an open‑source self‑host option, but it's a full client‑server platform (DB, web service, RBAC). concealer is the answer when even that is too much to run.
- **vs. secretctl** — the closest philosophical neighbor: also local‑first, open‑source, single‑binary, with an HMAC‑chained audit log and an MCP integration that keeps plaintext away from agents. The differences are in storage and ergonomics — secretctl stores an encrypted **SQLite** file (AES‑256‑GCM + Argon2id, not git‑diffable) and ships a desktop app; concealer stores a **git‑friendly SOPS/age YAML** vault with first‑class typed secrets, four‑dimension scoping, a built‑in web SPA + TUI, and per‑agent anti‑bulk‑exfiltration quotas. Pick secretctl for a self‑contained binary + native GUI; pick concealer for a git‑versionable, typed, scoped vault you can also drive from the browser.

---

## Picking the right tool

| If you need…                                                 | Reach for                                       |
| ------------------------------------------------------------- | ----------------------------------------------- |
| A personal/single‑dev vault with no server, versioned in git | **concealer**                             |
| Safe secret access for local AI agents / MCP clients          | **concealer**                             |
| Team sharing, SSO, mobile autofill                            | 1Password / Bitwarden                           |
| Dynamic DB creds, leases, encryption‑as‑a‑service          | HashiCorp Vault                                 |
| Managed multi‑env secrets synced into CI/CD                  | Doppler / Infisical                             |
| Just encrypt a config file in a repo                          | **concealer**                             |
| Cloud‑native app secrets on one provider                     | AWS/Azure/GCP Secret Manager                    |

---

## Sources

- [Infisical — Best Secrets Management Tools 2026](https://infisical.com/blog/best-secret-management-tools)
- [Bytebase — Best Secrets Manager for Database Credentials 2026: Vault vs Infisical vs Doppler](https://www.bytebase.com/blog/best-secrets-manager-for-database-credentials/)
- [guptadeepak.com — Top Secrets Management Tools Compared](https://guptadeepak.com/top-5-secrets-management-tools-hashicorp-vault-aws-doppler-infisical-and-azure-key-vault-compared/)
- [Bitwarden — Pricing 2026 vs 1Password &amp; LastPass](https://checkthat.ai/brands/bitwarden/pricing)
- [ProPicked — Best Password Managers 2026](https://propicked.com/blog/best-password-manager-2026-1password-bitwarden-dashlane-keeper-nordpass)
- [LibHunt — age vs gopass](https://www.libhunt.com/compare-age-vs-gopass)
- [Secret Management with SOPS and age (gist)](https://gist.github.com/patlegu/4494c8af543444289e50c4a9d5f6eae7)
