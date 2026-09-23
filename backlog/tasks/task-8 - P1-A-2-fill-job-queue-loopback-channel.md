---
id: TASK-8
title: 'P1/A-2: fill-job queue + loopback channel'
status: Done
assignee: []
created_date: '2026-09-15 08:40'
updated_date: '2026-09-15 08:58'
labels:
  - P1
  - feature-A
milestone: m-0
dependencies:
  - TASK-7
priority: high
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
App-side queue of pending fill jobs keyed by registrable domain. Endpoints GET /api/autofill/jobs (long-poll/SSE) + POST /api/autofill/result, token-auth, keeping CSP + anti-rebinding (Host/Origin loopback + chrome-extension only).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Extension can claim a job for its domain over authenticated loopback
- [ ] #2 Result posted back; anti-rebinding preserved
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Job queue _AF_JOBS + loopback endpoints /api/autofill/{jobs,claim,result}; anti-rebinding + token auth preserved. Verified via curl round-trip.
<!-- SECTION:NOTES:END -->
