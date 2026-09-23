---
id: TASK-12
title: 'P1/A-6: content script — fill + post-fill DOM scan'
status: Done
assignee: []
created_date: '2026-09-15 08:40'
updated_date: '2026-09-15 08:59'
labels:
  - P1
  - feature-A
  - extension
milestone: m-0
dependencies:
  - TASK-11
priority: high
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Isolated-world content script: detect login form (password input + nearest username, autocomplete/ARIA hints), set values via native setter + dispatch input/change, then post-fill DOM exposure scan (value not reflected into attributes/hidden fields), report status. Never postMessage the value to page world.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Fills username/password (and totp when present) via native setter + events
- [ ] #2 Post-fill scan asserts no value left exposed; status reported
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
content.js: login-form detection, native-setter fill + events, origin re-verify, post-fill DOM exposure scan, status report; value never posted to page world.
<!-- SECTION:NOTES:END -->
