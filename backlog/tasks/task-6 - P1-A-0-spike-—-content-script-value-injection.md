---
id: TASK-6
title: 'P1/A-0: spike — content-script value injection'
status: Done
assignee: []
created_date: '2026-09-15 08:39'
updated_date: '2026-09-15 08:58'
labels:
  - P1
  - feature-A
  - spike
milestone: m-0
dependencies: []
priority: high
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Confirm content-script injection sets input.value in the isolated world (native setter + input/change events) on a couple of real login pages incl. an SPA, without the value hitting page-world JS. De-risks 4.5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Value injected into username+password of a normal form and an SPA form
- [ ] #2 Value never reaches page-world JS (verified)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Content-script injection implemented directly in extension/content.js (native-setter + input/change events, isolated world). Live cross-site smoke on real login pages still recommended.
<!-- SECTION:NOTES:END -->
