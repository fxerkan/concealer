# Concealer — App Encryption Declaration

**App:** Concealer AI Secret Manager (com.fxerkan.concealer)
**Publisher:** Erkan Çiftçi · concealer@fxerkan.com
**Date:** 2026-09-26

## 1. Summary
Concealer is a secret manager. It uses encryption to protect the user's own data at rest
and in transit. It uses **only standard, published cryptographic algorithms** — no
proprietary or non-standard cryptography of any kind. It is a mass-market product and its
source and algorithms are publicly documented.

## 2. Encryption used
| Purpose | Algorithm (all standard / published) |
|---|---|
| Vault encryption (age passphrase mode) | ChaCha20-Poly1305 (AEAD) |
| Key derivation from master password | scrypt |
| Vault key wrapping (age recipients) | X25519 (ECDH) + ChaCha20-Poly1305 |
| Sync/backup bundles between app and host | age (ChaCha20-Poly1305 + scrypt), end-to-end |
| Audit-log integrity (host) | HMAC-SHA256 |
| Vault-at-rest on host | SOPS + age (ChaCha20-Poly1305 / AES-256-GCM) |

No algorithm is proprietary. No cryptography is home-grown: encryption is delegated to the
open-source `age` construction (ChaCha20-Poly1305, scrypt, X25519) on the device and to
SOPS + age on the host. There are no accounts and no company servers; all keys and data
stay on the user's own devices.

## 3. Export classification
Because Concealer uses only standard published algorithms and is a mass-market application,
it is classified as **ECCN 5D992.c** (mass-market encryption commodity/software). Under the
U.S. Export Administration Regulations this classification:
- does **not** require a CCATS / one-time review filing, and
- **does** require a year-end / semi-annual self-classification report emailed to:
  - U.S. Bureau of Industry and Security — crypt@bis.doc.gov
  - U.S. NSA / ENC Encryption Request Coordinator — enc@nsa.gov
  (Send the app name, publisher, ECCN 5D992.c, and this algorithm list. This is a routine
  formality for standard-crypto mass-market apps; consult a trade-compliance advisor if you
  distribute at scale or are unsure.)

## 4. Answering App Store Connect (recommended — no upload needed)
The simplest correct path is to **answer the export-compliance questionnaire** instead of
uploading a CCATS:
1. "Does your app use encryption?" → **Yes**.
2. "Does your app qualify for any of the exemptions provided in Category 5, Part 2…?" →
   **Yes** — the app uses only standard encryption algorithms (mass-market, 5D992.c).
3. No CCATS document is required. (You may still upload this declaration as supporting
   material — `Concealer-App-Encryption.pdf` — if you choose the upload route.)

To stop App Store Connect from asking on every build, this key was added to the app's
Info.plist:
```
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```
Rationale: all encryption in the app qualifies for the Category 5 Part 2 standard-encryption
exemption, so no per-build export-compliance answer is needed. If you prefer the stricter
declaration, set this to `<true/>`, answer the questionnaire as in §4, and keep the §3
self-classification report on file. Either way the §3 report is the actual compliance
artifact — the Info.plist value only controls Apple's prompt.
