---
id: TASK-1
title: 'P0/B1-1: env_key() name sanitizer + self-test'
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
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add env_key(name, field=None) that produces a valid POSIX env identifier: uppercase, replace any char not in [A-Z0-9_] with _, prefix _ if it starts with a digit. Root cause: concealer:1634-1637 uses the secret name verbatim so 'grafana-rpifx' -> 'grafana-rpifx_PASSWORD' (invalid identifier, unreferenceable).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 env_key('grafana-rpifx','password') == 'GRAFANA_RPIFX_PASSWORD'
- [ ] #2 Leading-digit names get a _ prefix; dots/unicode become _
- [ ] #3 Runnable self-test (assert-based demo/__main__) covers hyphen, dot, leading digit, collision
<!-- AC:END -->
