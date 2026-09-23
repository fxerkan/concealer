---
id: TASK-10
title: 'P1/A-4: web-UI approval modal'
status: Done
assignee: []
created_date: '2026-09-15 08:40'
updated_date: '2026-09-15 08:58'
labels:
  - P1
  - feature-A
  - webui
milestone: m-0
dependencies:
  - TASK-7
priority: high
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Web-UI modal: 'Agent X wants to sign in to <domain> using <secret> (user: ...)' with [Approve once] [Approve for this task] [Deny], showing the domain match. Wired to the grant model. Bilingual TR/EN strings. Optional desktop notification.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Modal shows agent, domain, secret, user and domain-match state
- [ ] #2 Once/task/deny wired to grant model; TR+EN strings present
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Web-UI approval modal (approve once/task/deny, domain match, no-reveal note), TR+EN. Verified live in Chrome: modal renders, approve flips job to approved, console clean.
<!-- SECTION:NOTES:END -->
