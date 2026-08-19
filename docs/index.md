---
title: Home
layout: default
nav_order: 1
---

# concealer

**Local-only, single-file secret manager for the AI-coding era.**
Encrypted with [SOPS](https://github.com/getsops/sops) + [age](https://github.com/FiloSottile/age). No cloud, no telemetry, no account. CLI · Web UI · MCP · TUI.

`concealer` (short alias: `cer`) is a thin, auditable wrapper around two battle-tested tools — it does **not** implement its own cryptography. Everything is encrypted by `sops`/`age`; concealer only adds the UX: typed secrets, scoping, tags, a professional web UI, tamper-evident audit logs, and an MCP server so AI agents can *use* secrets without ever *seeing* them.

---

## Why it exists

Coding assistants (Claude Code, Codex, Gemini CLI, Cursor…) read your project files. The moment an API key lands in a `.env`, a `credentials.json`, or gets pasted into a chat, it can be read by the agent, captured in logs, committed to git by accident, or copied across dozens of repos with the same ambiguous name.

concealer keeps secrets **on your machine**, decryptable anywhere with just the master password, and lets agents *inject* a secret into a command's environment while the plaintext value stays **redacted** from their context.

| Design goal | How |
|---|---|
| Local-only, provably offline | No account, no sync server, no telemetry |
| Portable, not machine-bound | Vault decrypts on any machine with the master password |
| Git-friendly & inspectable | Encrypted vault is a plain SOPS file; the tool is one readable script |
| AI-safe by design | MCP lists names & injects values — plaintext is redacted from output |
| One place, many projects | Disambiguated by `tenant / project / environment / repo` |

---

## Built on SOPS + age

concealer delegates **100% of encryption** to:

| Tool | Role |
|------|------|
| **[SOPS](https://github.com/getsops/sops)** | Encrypts/decrypts the vault (`secrets.enc.yaml`). Per-value AES-256-GCM, git-friendly. |
| **[age](https://github.com/FiloSottile/age)** | The encryption backend (X25519). Private key is passphrase-wrapped (scrypt) for a portable backup. |

The security-critical code is the part the world has already reviewed. concealer is glue.

---

## Documentation

- **[Getting Started]({{ site.baseurl }}/getting-started)** — install, init, first secret in 5 minutes
- **[Installation]({{ site.baseurl }}/installation)** — Homebrew, manual, dependencies, environment variables
- **[Concepts]({{ site.baseurl }}/concepts)** — vault, scopes/inheritance, key-at-rest, audit chain
- **[CLI Reference]({{ site.baseurl }}/cli-reference)** — every command and its parameters
- **[Secret Types]({{ site.baseurl }}/secret-types)** — typed fields and masking rules
- **[Web UI]({{ site.baseurl }}/web-ui)** — the local SPA and JSON API
- **[MCP for AI agents]({{ site.baseurl }}/mcp)** — tools, registration, anti-exfiltration limits
- **[Tokens, Unlock & Recovery]({{ site.baseurl }}/tokens-recovery)** — unlock, agent tokens, recovery codes, password change
- **[Security Model]({{ site.baseurl }}/security)** — crypto, key-at-rest, tamper evidence, honest ceilings
- **[Portability & Backup]({{ site.baseurl }}/portability)** — move machines, `.cer` backups, export/import

---

<sub>MIT License · [Source on GitHub](https://github.com/fxerkan/concealer) · [CHANGELOG](https://github.com/fxerkan/concealer/blob/main/CHANGELOG.md)</sub>
