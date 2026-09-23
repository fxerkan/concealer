---
id: TASK-18
title: 'UX-4: tighten post-fill exposure scan'
status: To Do
assignee: []
created_date: '2026-09-15 15:15'
labels:
  - feature-A
  - extension
milestone: m-1
dependencies: []
priority: medium
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
content.js exposureScan currently flags the secret if it appears anywhere in document.body.innerText — false-positives on pages that legitimately display the value (e.g. demo/login-hint pages). Narrow to: value reflected into an attribute or into a non-password input. Keep it advisory.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Demo login page (prints creds) no longer false-flags web_autofill_exposed; real reflection still caught
<!-- AC:END -->
