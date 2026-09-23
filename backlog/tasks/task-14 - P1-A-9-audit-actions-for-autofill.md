---
id: TASK-14
title: 'P1/A-9: audit actions for autofill'
status: Done
assignee: []
created_date: '2026-09-15 08:40'
updated_date: '2026-09-15 08:58'
labels:
  - P1
  - feature-A
  - audit
milestone: m-0
dependencies:
  - TASK-9
priority: medium
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add audit actions web_autofill_request/approve/fill/deny/exposed via existing audit(); actor=agent, key=secret name, detail=domain. Never log the value.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All five autofill lifecycle actions audited, values never logged
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Audit actions web_autofill_request/approve/deny/fill/exposed wired; values never logged. Verified in audit tail.
<!-- SECTION:NOTES:END -->
