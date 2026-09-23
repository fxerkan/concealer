---
id: TASK-11
title: 'P1/A-5: extension manifest + service worker'
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
  - TASK-8
priority: high
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
manifest.json: add scripting + activeTab (prefer on-demand over ambient content_scripts), keep host_permissions loopback. Service worker holds the authenticated loopback channel, claims jobs, injects via the content script, relays status.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 SW claims jobs over loopback and injects on demand
- [ ] #2 host_permissions stay loopback; minimal ambient access
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
manifest: content_scripts + sw.js service worker + tabs/alarms perms; SW polls approved jobs, claims value, drives content script, posts result. build.py updated; zip builds.
<!-- SECTION:NOTES:END -->
