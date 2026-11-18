---
title: Changelog
description: "What's new in concealer: save sign-ins and AutoFill, Touch ID and passkey unlock, Face ID and fingerprint on mobile, Android password autofill, and a film for every interface."
layout: default
nav_order: 13
---

# Changelog
{: .no_toc }

What changed, release by release. Every detail is in
[CHANGELOG.md](https://github.com/fxerkan/concealer/blob/main/CHANGELOG.md).
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

## 1.2.2 — 2026-11-18

### Chrome extension: saves your sign-ins

After a successful sign-in the extension asks to save it, or to update a password that changed.
Account ID, region and the page's other fields come along, and AutoFill now fills every saved
field back by its name. Saving while the vault is locked needs no master password: the sign-in is
encrypted to the vault's public key and added at your next unlock.
[More →]({B}/chrome-extension.html#autofill-and-saving-sign-ins)

![Save sign-in to concealer?]({B}/assets/new/ext-save-page.jpg)

### Touch ID and passkey unlock (web UI and extension)

Add a passkey in Settings → Security & lock, then unlock with Touch ID, Windows Hello or a
security key. The master password keeps working. [More →]({B}/web-ui.html#features)

![Unlock with passkey / Touch ID]({B}/assets/new/web-passkey-unlock.jpg)

### Mobile: Face ID, Touch ID and fingerprint unlock

The app opens with your face or finger. The master password stays in the phone's secure hardware
and is released only after a match. [More →]({B}/mobile.html#face-id-touch-id-and-fingerprint-unlock)

![Turning on Face ID]({B}/assets/new/m-settings.jpg){: style="max-width:32%" } ![Face ID at launch]({B}/assets/new/m-faceid-prompt.jpg){: style="max-width:32%" } ![Face not recognized]({B}/assets/new/m-unlock.jpg){: style="max-width:32%" }

### Android: concealer as the password autofill service

Sign-in fields in every app and browser offer "Fill with concealer"; you unlock, pick the
sign-in and it is filled. New sign-ins can be saved the same way. [More →]({B}/mobile.html#android-password-autofill)

![Fill with concealer → pick → filled]({B}/assets/new/android-autofill.jpg)

### A redesigned Settings page

One page with a side menu: Security & lock, Appearance, AI agents, Browser extension,
Integrations, Sync, Portability, Backup, About.

![Settings]({B}/assets/new/web-settings.jpg)

### Also new

- A short film for every interface, on its page: [Chrome extension]({B}/chrome-extension.html),
  [CLI]({B}/cli-reference.html), [Web UI]({B}/web-ui.html), [TUI]({B}/tui.html),
  [MCP]({B}/mcp.html), [Mobile]({B}/mobile.html).
- A **Created** column in the web UI, next to Updated, and sorting by date columns works again.
- The extension popup opens on your 20 most used secrets; "Fill with concealer" and
  "Save sign-in to concealer" in the right-click menu.
- Mobile auto-lock gains 15 min, 30 min and 1 hour; the master password box gets the cursor.
- `cer run [scope] -- <cmd>` accepts the usual `--` separator.

## 1.2.1 — 2026-11-17

- Web UI: the secrets table header no longer covers the open filter dropdowns.

## 1.2.0 — 2026-11-16

- Chrome extension: AutoFill on sign-in pages, agent sign-in (`request_web_login`) with your
  approval, an unlock page, and a context menu. See the [full changelog](https://github.com/fxerkan/concealer/blob/main/CHANGELOG.md#120--2026-11-16).
