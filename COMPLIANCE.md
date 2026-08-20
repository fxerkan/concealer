# Compliance posture — concealer

**Read this first.** SOC 2, ISO 27001, and FedRAMP are **not features a tool can ship**. They are
attestations that an *organization* earns when a licensed auditor (a CPA firm for SOC 2, a 3PAO for
FedRAMP) examines that organization's controls over a period of time. An open‑source, single‑file,
local tool cannot "be SOC 2 certified." What concealer *can* do is behave like a **well‑controlled
component** so that a company operating it has less work to pass its own audit.

This document maps concealer's mechanisms to the SOC 2 Trust Services Criteria (TSC), and is
explicit about **where the tool ends and the operating organization begins**.

---

## What concealer provides vs. what your organization owns

| Concern | concealer provides | Your organization owns |
| --- | --- | --- |
| Access control | Master password (scrypt), per‑agent revocable tokens, registered‑agent MCP gate, per‑agent anti‑bulk‑exfiltration quotas | Who gets the master password / tokens; OS user accounts; disk encryption; physical access |
| Audit / monitoring | HMAC‑chained audit log with monotonic `seq`, local head anchor, **off‑machine anchor push** (`audit anchor`), exportable log | Where anchors are shipped; log retention; alerting; periodic review cadence |
| Change management | Vault is an encrypted, git‑versionable file; every mutation is audited | Code review, branch protection, CI on the repo holding the vault |
| Confidentiality | age (X25519) via SOPS; values never printed to agents; key‑at‑rest (no plaintext age key on disk) | Backup handling; key/recovery‑code custody; endpoint security |
| Availability | Zero‑infra (nothing to keep running); `.cer` backups + auto‑backup | Backup schedule/testing; disaster recovery |

concealer is a **single control in scope**, not a compliance program.

---

## SOC 2 Trust Services Criteria — mapping

### Security (Common Criteria, required)
- **CC6 Logical access.** scrypt master‑password verifier (`write_master`/`verify_master`);
  revocable, expiring tokens (`keys/agents.json`); MCP access refused unless the caller is a
  **registered agent**; two‑factor `passwd` (recovery code consumed). → *Tool: strong. Org owns
  credential distribution & least‑privilege decisions.*
- **CC7 System monitoring.** Tamper‑evident audit log (HMAC chain + `seq` + head anchor). The known
  ceiling — an FS‑root attacker with `keys/audit.key` can re‑forge the chain — is now mitigated by
  `concealer audit anchor`, which pushes the head hash to an **append‑only, off‑machine sink**
  (file on another host, remote syslog, or webhook). `audit verify` compares the local chain against
  the last external anchor and flags a full re‑forge that local checks alone cannot. → *Tool:
  detection, not prevention. Org owns the external sink and its immutability.*
- **CC8 Change management.** Vault diffs in git (keys visible, values encrypted); lifecycle events
  audited. → *Org owns the repo controls.*

### Availability
- No server/daemon to fail; `.cer` password‑protected backups + scheduled auto‑backup. → *Org owns
  backup testing and RPO/RTO.*

### Confidentiality
- age/SOPS encryption; record‑aware masking (`entry_public`); agents receive **redacted** output only
  (`run_with_secrets`); age private key not stored in plaintext on a hardened vault. → *Strong at the
  tool layer.*

### Processing Integrity
- Deterministic encrypt/decrypt via SOPS; `norm()` schema migration is backward‑compatible; audit
  `seq` is monotonic. → *Partial; concealer is a store, not a processing pipeline.*

### Privacy
- concealer stores *secrets*, not personal data by design (PII‑bearing card/passport types are
  deliberately absent — see `TYPES`). → *Org owns any PII policy if it repurposes fields.*

---

## Hardening the audit ceiling (operational guidance)

The audit chain's tamper‑evidence is only as strong as the anchor's inaccessibility to the attacker:

1. **Ship anchors off‑machine.** Schedule `concealer audit anchor --file /mnt/remote/anchors.log`
   (or `--syslog` to a remote collector, or `--webhook https://…`) from cron/launchd, e.g. hourly.
   The anchor records only `{ts, seq, hash}` — no secret material.
2. **Make the sink append‑only.** A WORM bucket, an append‑only remote syslog, or a separate host the
   vault operator cannot rewrite. Anchoring to the same disk buys nothing against a root attacker.
3. **Verify regularly.** `concealer audit verify` returns `reason: "external_anchor"` if the local
   chain no longer matches the last off‑machine head — that is your re‑forge alarm.
4. **Residual ceiling (documented, honest).** Anchoring frequency = detection granularity: entries
   added *after* the last anchor and then re‑forged are not caught by the external check (the local
   head anchor still catches tail truncation of the newest entries). For continuous immutability you
   need a true external log service; that is out of scope for a zero‑infra tool.

---

## What "getting SOC 2" would actually require (if you operate concealer as a service)

Only relevant if a legal entity runs concealer as part of a product/service:

1. Define system boundaries and pick TSC (Security is mandatory; add others as promised to customers).
2. Implement organizational controls: onboarding/offboarding, access reviews, vendor management,
   incident response, change management, risk assessment, employee security training.
3. Run for an observation window (Type I = point‑in‑time; Type II = typically 3–12 months of evidence).
4. Engage a licensed CPA firm; remediate findings; receive the report.
5. concealer appears in that report **as one control** (secret storage + audit), with this document as
   supporting evidence.

FedRAMP is heavier still (US government, authorized cloud, 3PAO assessment, continuous monitoring) and
is not applicable to a local tool.

**Bottom line:** concealer aims to be *audit‑friendly*, not *audit‑certified*. Certification is
organizational and cannot be claimed by the tool itself.
