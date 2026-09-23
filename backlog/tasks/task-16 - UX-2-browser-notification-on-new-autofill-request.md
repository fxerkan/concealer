---
id: TASK-16
title: 'UX-2: browser notification on new autofill request'
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
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SW fires chrome.notifications for each NEW pending request ('Agent X wants to sign in to DOMAIN'). Add 'notifications' permission. Dedupe by job id.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A notification appears when a request arrives; not repeated for the same job
<!-- AC:END -->
