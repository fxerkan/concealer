---
id: TASK-22
title: 'UX-8: on-page approval banner on the login tab'
status: To Do
assignee: []
created_date: '2026-09-15 17:19'
labels:
  - feature-A
  - extension
  - ux
milestone: m-1
dependencies: []
priority: high
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Most contextual approval surface: when unlocked, the SW pushes pending-request details to the content script on the MATCHING login tab, which renders an isolated-world banner (agent, domain, secret) with Approve once / This task / Deny right on the page. Decisions relay through the SW (which holds the session token) to /api/autofill/{approve,deny}. Banner auto-clears when the job is handled/expired.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A pending request shows an on-page banner on the matching login tab
- [ ] #2 Approve/Deny on the banner resolves the job and (on approve) fills the form
- [ ] #3 Banner clears when the job is handled elsewhere or expires
<!-- AC:END -->
