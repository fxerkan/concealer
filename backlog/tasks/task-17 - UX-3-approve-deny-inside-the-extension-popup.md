---
id: TASK-17
title: 'UX-3: approve/deny inside the extension popup'
status: To Do
assignee: []
created_date: '2026-09-15 15:15'
labels:
  - feature-A
  - extension
  - ux
milestone: m-1
dependencies: []
priority: high
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Popup shows a 'Pending autofill request' section (agent, domain, secret, user, domain-match) with Approve once / Approve for task / Deny, calling the existing /api/autofill/{approve,deny} endpoints. This makes the extension the approval surface the user expected.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Popup lists pending requests and can approve(once/task)/deny; refreshes after action
<!-- AC:END -->
