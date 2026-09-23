---
id: TASK-9
title: 'P1/A-3: MCP tool request_web_login'
status: Done
assignee: []
created_date: '2026-09-15 08:40'
updated_date: '2026-09-15 08:59'
labels:
  - P1
  - feature-A
  - mcp
milestone: m-0
dependencies:
  - TASK-8
priority: high
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
New MCP tool: enqueue a fill job for target_url (optional name/scope), block on approval+result with a timeout, return a STATUS STRING ONLY (never a value). Wire rate_gate + audit. Registered-agent gate applies.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Returns filled/denied/no-match/domain-mismatch/pending status strings only
- [ ] #2 No secret value ever returned to the agent
- [ ] #3 rate_gate + audit + registered-agent gate enforced
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
MCP request_web_login enqueues via loopback, polls status, returns status-string only; rate_gate + audit + registered-agent gate. Verified end-to-end: blocking approval path returns 'filled: <domain>', value never returned.
<!-- SECTION:NOTES:END -->
