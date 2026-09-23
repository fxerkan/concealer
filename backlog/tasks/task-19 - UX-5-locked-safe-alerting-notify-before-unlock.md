---
id: TASK-19
title: 'UX-5: locked-safe alerting (notify before unlock)'
status: To Do
assignee: []
created_date: '2026-09-15 16:35'
labels:
  - feature-A
  - extension
  - ux
  - security
milestone: m-1
dependencies: []
priority: high
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A web-login request must alert the user even when the vault is LOCKED. Add an unauthenticated, loopback-only GET /api/autofill/notify returning ONLY {count, ids} (no vault data: no secret name/username, no domain) so the extension can badge + notify while locked. request_web_login must enqueue a pending job without requiring an unlocked session; secret matching + approval happen AFTER the user unlocks. Popup unlock screen shows 'N request(s) waiting — unlock to review'.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 With the vault locked, firing request_web_login produces a badge + notification
- [ ] #2 The locked-safe endpoint leaks no vault data (count/ids only)
- [ ] #3 After unlock, the request resolves to a secret and can be approved/denied
<!-- AC:END -->
