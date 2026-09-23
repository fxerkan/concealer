---
id: TASK-20
title: 'UX-6: notification click focuses the approval surface'
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
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
chrome.action.openPopup() throws 'no active browser window' off a notification. On notification click, focus an existing concealer web-UI tab (or open one) so the approval modal / unlock screen is brought to the front. Clear the notification after.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Clicking the notification focuses/opens the concealer approval surface; no SW error
<!-- AC:END -->
