---
id: TASK-21
title: 'UX-7: ''Fill this page'' in the extension popup'
status: To Do
assignee: []
created_date: '2026-09-15 17:09'
labels:
  - feature-A
  - extension
  - ux
milestone: m-1
dependencies: []
priority: high
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
User-initiated autofill: the popup detects a website/login secret matching the active tab's domain and shows a 'Fill this page' button. On click it reveals the secret's fields (owner session) and hands username/password to the content script to fill — no agent, no approval handshake (the human clicked).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 On a login page with a matching secret, the popup shows 'Fill this page' and fills user+password on click
<!-- AC:END -->
