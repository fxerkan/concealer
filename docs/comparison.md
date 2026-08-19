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

concealer is a **local‑only, single‑file, zero‑infra** secret manager: a typed, scoped, audited front end over [SOPS](https://github.com/getsops/sops) + [age](https://github.com/FiloSottile/age). It is not trying to be 1Password or HashiCorp Vault. It occupies a gap those tools leave open:

> An encrypted, git‑friendly vault a developer (or an AI agent) can run on one machine with no server, no SaaS account, no daemon, and no cloud — but with the typing, scoping, audit trail, and agent‑safe MCP access that raw `sops`/`age`/`pass` don't give you.

If you need team sharing, SSO, dynamic database credentials, or mobile autofill, concealer is the wrong tool — the tables below say so plainly.

---

## The three markets it's measured against

| Category                                       | Examples                                                                           | What they optimize for                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Cloud password managers**              | 1Password, Bitwarden, Keeper, LastPass, Dashlane, NordPass                         | Human end‑users, autofill, cross‑device sync, sharing              |
| **DevOps / enterprise secret platforms** | HashiCorp Vault, AWS/Azure/GCP Secret Manager, Doppler, Infisical, CyberArk Conjur | Fleets of services, dynamic secrets, rotation, RBAC, CI/CD injection |
| **Local / file‑based OSS**              | SOPS+age (raw),`pass`/`gopass`, KeePassXC, git‑crypt                          | Owning your data, no server, git‑versionable                        |

concealer lives in the third market but borrows the *ergonomics* (typing, scoping, audit, UI) usually only found in the first two.

---

## Master comparison matrix

Legend: ✅ yes · ⚠️ partial / with caveats · ❌ no · — n/a

| Capability                                          | **concealer**                            | 1Password                                                                                              | Bitwarden (+ Secrets Mgr)     | Keeper                | LastPass     | HashiCorp Vault      | Doppler         | Infisical          | AWS Secrets Mgr | SOPS+age (raw)   | pass / gopass   | KeePassXC        |
| --------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------- | --------------------- | ------------ | -------------------- | --------------- | ------------------ | --------------- | ---------------- | --------------- | ---------------- |
| **Deployment**                                | Local, single file                             | SaaS                                                                                                   | SaaS or self‑host            | SaaS                  | SaaS         | Self‑host / HCP     | SaaS            | SaaS or self‑host | Cloud only      | Local            | Local           | Local            |
| **Requires a server/daemon**                  | ❌ none                                        | cloud                                                                                                  | ⚠️ self‑host runs a server | cloud                 | cloud        | ✅ server            | ✅              | ✅                 | ✅              | ❌               | ❌              | ❌               |
| **Open source**                               | ✅                                             | ❌                                                                                                     | ✅                            | ❌                    | ❌           | ⚠️ BUSL            | ❌              | ✅                 | ❌              | ✅               | ✅              | ✅               |
| **Cost**                                      | Free                                           | ~$3/mo+           | Free tier; SM$6–12/u/mo     | ~$3.75/u/mo+ | ~$3/mo+     | Free OSS /$$$ ent. | paid tiers                    | Free OSS / paid cloud | usage‑based | Free                 | Free            | Free               |                 |                  |                 |                  |
| **Encryption backend**                        | age (X25519) via SOPS                          | proprietary                                                                                            | proprietary                   | proprietary           | proprietary  | own/transit          | managed         | managed            | KMS             | age/PGP/KMS      | GPG (or age)    | AES/ChaCha       |
| **Storage format**                            | Encrypted YAML/JSON, git‑friendly             | proprietary cloud                                                                                      | proprietary                   | proprietary           | proprietary  | backend store        | cloud           | cloud/DB           | cloud           | encrypted file   | GPG files + git | single`.kdbx`  |
| **Git‑versionable vault**                    | ✅ (values encrypted, keys visible)            | ❌                                                                                                     | ❌                            | ❌                    | ❌           | ⚠️                 | ❌              | ⚠️               | ❌              | ✅               | ✅              | ⚠️ blob only   |
| **Typed secrets** (db/api/ssh/…)             | ✅ templates                                   | ⚠️ item types                                                                                        | ⚠️ item types               | ⚠️                  | ⚠️         | ❌                   | ❌              | ❌                 | ❌              | ❌               | ❌              | ⚠️             |
| **Scoping**                                   | ✅ first‑class<br />(tenant/project/env/repo) | ⚠️ vaults/tags                                                                                       | ⚠️ collections              | ⚠️ folders          | ⚠️         | ✅ paths/policies    | ✅ configs/envs | ✅ envs/folders    | ✅ ARNs         | ❌               | ⚠️ dirs       | ⚠️ groups      |
| **Field‑aware masking**                      | ✅ per‑field override + heuristics            | ✅                                                                                                     | ✅                            | ✅                    | ✅           | n/a                  | n/a             | ⚠️               | n/a             | ❌               | ❌              | ✅               |
| **Web UI**                                    | ✅ built‑in SPA                               | ✅                                                                                                     | ✅                            | ✅                    | ✅           | ✅                   | ✅              | ✅                 | ✅              | ❌               | ❌              | ❌ (desktop app) |
| **TUI / CLI**                                 | ✅ both                                        | ✅ CLI                                                                                                 | ✅ CLI                        | ⚠️                  | ⚠️         | ✅ CLI               | ✅ CLI          | ✅ CLI             | ✅ CLI          | ✅ CLI           | ✅ CLI          | ⚠️             |
| **Tamper‑evident audit log**                 | ✅ HMAC‑chained + head anchor                 | ⚠️ cloud logs                                                                                        | ⚠️                          | ✅                    | ⚠️         | ✅                   | ✅              | ✅                 | ✅ CloudTrail   | ❌               | ⚠️ git log    | ❌               |
| **AI‑agent / MCP native**                    | ✅ MCP server, agent gate, rate‑limit         | ⚠️ 3rd‑party                                                                                        | ❌                            | ❌                    | ❌           | ⚠️ SDK             | ⚠️ SDK        | ⚠️ SDK           | ⚠️ SDK        | ❌               | ❌              | ❌               |
| **Anti‑bulk‑exfiltration for agents**       | ✅ per‑agent quotas                           | ❌                                                                                                     | ❌                            | ❌                    | ❌           | ⚠️ policy          | ❌              | ❌                 | ⚠️ IAM        | ❌               | ❌              | ❌               |
| **Dynamic / leased secrets**                  | ❌                                             | ❌                                                                                                     | ❌                            | ❌                    | ❌           | ✅ signature feature | ⚠️            | ✅                 | ⚠️ rotation   | ❌               | ❌              | ❌               |
| **Automatic rotation**                        | ❌ manual                                      | ⚠️                                                                                                   | ⚠️                          | ✅                    | ⚠️         | ✅                   | ✅              | ✅                 | ✅              | ❌               | ❌              | ❌               |
| **Multi‑user / RBAC / SSO**                  | ❌ single‑owner                               | ✅                                                                                                     | ✅                            | ✅                    | ✅           | ✅                   | ✅              | ✅                 | ✅ IAM          | ⚠️ recipients  | ⚠️ keys       | ❌               |
| **Mobile app / browser autofill**             | ❌                                             | ✅                                                                                                     | ✅                            | ✅                    | ✅           | ❌                   | ❌              | ❌                 | ❌              | ❌               | ⚠️            | ⚠️             |
| **Works fully offline**                       | ✅                                             | ⚠️ cache                                                                                             | ⚠️                          | ⚠️                  | ⚠️         | ⚠️                 | ❌              | ❌                 | ❌              | ✅               | ✅              | ✅               |
| **Recovery codes / 2nd‑factor key rotation** | ✅ one‑time codes, code‑gated`passwd`      | ✅ recovery kit                                                                                        | ⚠️                          | ✅                    | ⚠️         | ⚠️ unseal keys     | ⚠️            | ⚠️               | ✅              | ❌               | ❌              | ⚠️ keyfile     |
| **External dependencies**                     | `sops`, `age`, `expect` only             | —                                                                                                     | —                            | —                    | —           | many                 | —              | —                 | —              | `sops`,`age` | `gpg`/`git` | Qt app           |

*Pricing figures are indicative 2026 list prices and change often — treat them as order‑of‑magnitude, not quotes.*

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
- **Compliance posture at scale.** No FedRAMP/SOC2 attestations. Audit log’s ceiling is documented (an FS‑root attacker with `audit.key` can re‑forge). → Keeper / Vault / cloud KMS.

---

## Closest neighbors, sharpened

- **vs. raw SOPS + age** — same crypto and same git‑friendly file, but concealer adds typed records, scoping, masking, a web UI + TUI, an audit chain, unlock tokens, recovery codes, and the MCP server. SOPS is the engine; concealer is the car.
- **vs. `pass` / `gopass`** — those are GPG‑over‑files with git. concealer swaps fragile GnuPG/`gpg-agent` for age, adds structured/typed secrets and scoping instead of one‑secret‑per‑file, and ships a UI and agent API.
- **vs. KeePassXC** — KeePassXC is an excellent *personal* single‑file vault with autofill, but it's a GUI desktop app, not git‑friendly (opaque `.kdbx` blob), and has no CLI‑first scoping, audit chain, or agent interface.
- **vs. Infisical (self‑host)** — Infisical is the closest "developer secrets" competitor with an open‑source self‑host option, but it's a full client‑server platform (DB, web service, RBAC). concealer is the answer when even that is too much to run.

---

## Picking the right tool

| If you need…                                                 | Reach for                                       |
| ------------------------------------------------------------- | ----------------------------------------------- |
| A personal/single‑dev vault with no server, versioned in git | **concealer**                             |
| Safe secret access for local AI agents / MCP clients          | **concealer**                             |
| Team sharing, SSO, mobile autofill                            | 1Password / Bitwarden                           |
| Dynamic DB creds, leases, encryption‑as‑a‑service          | HashiCorp Vault                                 |
| Managed multi‑env secrets synced into CI/CD                  | Doppler / Infisical                             |
| Just encrypt a config file in a repo                          | SOPS + age (or concealer if you want structure) |
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
