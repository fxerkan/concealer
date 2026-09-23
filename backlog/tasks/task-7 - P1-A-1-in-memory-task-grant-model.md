---
id: TASK-7
title: 'P1/A-1: in-memory task-grant model'
status: Done
assignee: []
created_date: '2026-09-15 08:39'
updated_date: '2026-09-15 08:58'
labels:
  - P1
  - feature-A
milestone: m-0
dependencies: []
priority: high
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Grant store near _SESSIONS: {agent, domain, secret_id, exp, max_uses}. Helpers to mint/verify/expire. Memory-only (cleared on idle auto-lock like _SESS_KEY).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 mint/verify/expire helpers with time + max-uses enforcement
- [ ] #2 Grants cleared on idle auto-lock
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
In-memory grant store _AF_GRANTS with mint/consume/expire (ttl+max_uses); cleared with the last session in _lock_clear.
<!-- SECTION:NOTES:END -->
