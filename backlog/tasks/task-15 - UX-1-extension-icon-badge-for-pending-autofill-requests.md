---
id: TASK-15
title: 'UX-1: extension icon badge for pending autofill requests'
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
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Service worker polls /api/autofill/pending and sets chrome.action badge (count + red bg) so a pending request is always visible on the toolbar icon. Clear when none.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Badge shows pending count; clears when handled/none
<!-- AC:END -->
