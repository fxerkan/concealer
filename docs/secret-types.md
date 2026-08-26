---
title: Secret Types
layout: default
nav_order: 6
---

# Secret Types
{: .no_toc }

Each type renders a type-aware form with exactly the fields that make sense. Fields marked **secret** are stored masked and revealed only on demand (audited). Plain fields (host, url, username…) stay readable and can become optional table columns.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

## Field catalog

Pick a type when creating a secret — each one drives a different set of fields:

![The secret type picker — one form per credential shape]({{ site.baseurl }}/assets/secret-types.png)

Secret fields are marked 🔒; plain fields are shown as-is.

| Type | Fields |
|------|--------|
| `api_key` *(default)* | 🔒`value` |
| `access_token` | 🔒`token` · 🔒`refresh_token` · `expires` · `scopes` |
| `oauth` | `client_id` · 🔒`client_secret` · `auth_url` · `token_url` · `scopes` |
| `jwt` | 🔒`token` · `issuer` · `audience` · `expires` |
| `ssh_key` | 🔒`private_key` · `public_key` · 🔒`passphrase` · `host` · `user` |
| `certificate` | `certificate` · 🔒`private_key` · `chain` · `expires` |
| `database` | `host` · `port` · `database` · `schema` · `username` · 🔒`password` · `auth_type` · 🔒`jdbc_url` |
| `server` | `host` · `port` · `username` · 🔒`password` · 🔒`ssh_key` |
| `website` | `web_url` · `username` · 🔒`password` |
| `login` | `web_url` · `username` · 🔒`password` · 🔒`totp` |
| `pin` | 🔒`pin` · `label` |
| `wifi` | `ssid` · 🔒`password` · `security` |
| `membership` | `provider` · `member_id` · 🔒`password` |
| `secure_note` | 🔒`note` |
| `custom` | any key/value you define |

`jdbc_url` is treated as secret because a connection string carries embedded credentials.

Each type renders exactly the inputs it needs — a cloud credential carries its client/secret/URLs, a database its host/port/user/password, a website its URL/login, and `custom` any free-form key/value:

![Cloud credential form]({{ site.baseurl }}/assets/secrets-cloud.png)
![Database secret form]({{ site.baseurl }}/assets/secrets-db.png)
![Website login form]({{ site.baseurl }}/assets/secrets-web.png)
![Custom key/value secret form]({{ site.baseurl }}/assets/secrets-custom.png)

---

## No PII by design

There are deliberately **no** credit-card, passport, or national-ID types. This vault is for **machine and account credentials**, not identity documents.

---

## How masking is decided

A field is treated as secret if **any** of these hold (checked in order):

1. **Per-record override** — `field_meta[field].secret`. Setting `secret: false` is the only way to force a template-secret field to render plain.
2. **Type template** — the 🔒 marks in the table above.
3. **Field-name heuristic** — the name matches `pass | secret | token | value | key | credential | apikey`.
4. **Value heuristic** — the value contains embedded credentials like `scheme://user:pass@host` (DSNs, `jdbc_url`, `redis://:pw@…`), even in an otherwise plain field.

Masking style: `field_meta[field].mask == "full"` renders `••••••••`; otherwise partial masking shows the first 4 and last 2 characters (`abcd…yz`).

---

## Setting typed secrets from the CLI

Pass `field=value` pairs; the bare-value form is only for single-value types like `api_key`.

```bash
# api_key — bare value
concealer set --name OPENAI_API_KEY --project web sk-DUMMY-123

# database — field=value pairs
concealer set --name pg --type database --project web --env prod \
    host=db.local port=5432 database=app schema=public \
    username=app password=sk-DUMMY-pw auth_type=password

# custom — any keys you like
concealer set --name webhook --type custom --project web \
    url=https://hooks.example/abc signing_secret=sk-DUMMY-sig
```

When these are injected via `run` / `run_with_secrets`, a typed secret becomes per-field environment variables: `PG_HOST`, `PG_PORT`, `PG_PASSWORD`, … (the field name uppercased and prefixed with the secret name). An `api_key` injects as a single `OPENAI_API_KEY=…`.
