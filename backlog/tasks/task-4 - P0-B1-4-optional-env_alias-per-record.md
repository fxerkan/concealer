---
id: TASK-4
title: 'P0/B1-4: optional env_alias per record'
status: Done
assignee: []
created_date: '2026-09-15 08:39'
updated_date: '2026-09-15 08:45'
labels:
  - P0
  - feature-B1
milestone: m-0
dependencies: []
priority: medium
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow an explicit per-secret env_alias so the owner can pin e.g. grafana-rpifx -> GRAFANA for stable scripts. Honored by env_key()/inject_env when present.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A record with env_alias emits GRAFANA_* instead of the sanitized name
- [ ] #2 Absent alias falls back to env_key() sanitization
<!-- AC:END -->
