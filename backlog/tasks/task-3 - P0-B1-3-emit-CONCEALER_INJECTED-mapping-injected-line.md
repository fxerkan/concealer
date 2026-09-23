---
id: TASK-3
title: 'P0/B1-3: emit CONCEALER_INJECTED mapping + injected: line'
status: Done
assignee: []
created_date: '2026-09-15 08:39'
updated_date: '2026-09-15 08:45'
labels:
  - P0
  - feature-B1
milestone: m-0
dependencies: []
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Because emitted names no longer equal secret names, agents cannot guess them. Emit CONCEALER_INJECTED=<comma-separated identifier list> into the child env (names only, never values) and add an 'injected: ...' line to the run_with_secrets MCP result header (alongside the existing [scope] line).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Child sees CONCEALER_INJECTED with the injected identifiers, no values
- [ ] #2 run_with_secrets MCP result lists injected identifiers
- [ ] #3 No secret value ever appears in the mapping or result
<!-- AC:END -->
