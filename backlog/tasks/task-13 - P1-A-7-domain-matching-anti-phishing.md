---
id: TASK-13
title: 'P1/A-7: domain matching / anti-phishing'
status: Done
assignee: []
created_date: '2026-09-15 08:40'
updated_date: '2026-09-15 08:58'
labels:
  - P1
  - feature-A
milestone: m-0
dependencies:
  - TASK-9
priority: high
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Compare secret web_url registrable domain vs the tab origin. Agent-supplied target_url is a hint; the content script re-verifies location.origin. Default-deny on mismatch; audit the mismatch.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Registrable-domain compare; content-script re-verifies origin
- [ ] #2 Mismatch is default-denied and audited
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
registrable_domain compare in _af_pick_secret (default-deny mismatch, audited); content script re-verifies location.origin. Verified: evil-phish.com request refused.
<!-- SECTION:NOTES:END -->
