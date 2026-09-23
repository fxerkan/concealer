---
id: TASK-2
title: 'P0/B1-2: use env_key() in inject_env (both branches)'
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
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Apply env_key() in inject_env for both the api_key bare-name path (kv[name]) and the multi-field path (NAME_FIELD). Detect collisions within one injection; on collision fail loudly listing the conflicting secret names rather than silently clobbering.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 website/login/database secrets with hyphenated names inject referenceable env vars
- [ ] #2 api_key hyphenated names sanitized too
- [ ] #3 Collision within one injection raises a clear error naming the conflict
<!-- AC:END -->
