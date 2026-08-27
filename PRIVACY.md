# Privacy Policy — concealer Chrome extension

_Last updated: 2026-08-27_

The **concealer** Chrome extension is a companion UI for the locally-installed
[concealer](https://github.com/fxerkan/concealer) secret manager. It is designed to keep your
secrets on your own machine.

## What data the extension collects

**None.** The extension does not collect, transmit, sell, or share any personal data, browsing
history, or secret values with the developer or any third party. There is no analytics, no
tracking, and no remote server operated by the developer.

## Where your data goes

- The extension communicates **only** with a concealer server running on your own computer at
  `http://127.0.0.1:8787` (localhost). No request is ever made to a remote host.
- Your master password is sent only to that local server to unlock your vault; it is never stored
  by the extension.
- Secret values are read from the local server when you click to copy them, placed on your system
  clipboard, and the clipboard is automatically cleared after a configurable timeout. Secret
  values are never logged, synced, or sent anywhere else.

## Local storage used by the extension

- `chrome.storage.session` (in-memory, cleared when the browser closes): a short-lived session
  token used to talk to your local server.
- `chrome.storage.local`: your UI preferences only — theme, clipboard-clear seconds, extension
  auto-lock seconds, reveal auto-hide seconds. No secret values are stored.

## Permissions

- **nativeMessaging** — to start and talk to the local concealer helper so the vault can be opened
  on demand.
- **host permission for `127.0.0.1` / `localhost` (port 8787)** — to talk to your own local server.
- **storage** — to save the UI preferences and the in-memory session token described above.
- **clipboardWrite** — to copy a secret value you selected to the clipboard.

## Contact

Questions: open an issue at <https://github.com/fxerkan/concealer/issues>.
