# App Store — App Review Information

The app now has a built-in **offline demo mode**, so the reviewer can evaluate everything
with no host, account, or network. This is what the notes below tell them to use — no demo
server or tunnel is required anymore.

## Sign-In Information
Leave **"Sign-in required" UNCHECKED** (set via API). There is no account — access is a
master password + a self-hosted host, and the demo needs neither.

## Contact
Erkan · Çiftçi · +90 530 264 8400 · concealer@fxerkan.com

## Notes (already filled into App Store Connect via the ASC API)

Concealer is a local-only, self-hosted secret manager. It has NO user accounts and NO
company servers — nothing is sent to us or any third party.

TO REVIEW WITHOUT ANY SETUP:
On the first screen, tap "Try the demo - no host needed". This loads a local sample vault
(dummy data) so you can explore the entire app offline: browse secrets, tap one to view it
(values are masked with a reveal/copy control), add/edit/delete secrets, switch theme, and
see the auto-lock timer. No host, account, or network is required for the demo.

HOW THE REAL APP WORKS (optional to test):
Normally the app connects to a small "concealer host" the user runs on their own local
network, unlocks an end-to-end-encrypted vault with a master password, then works offline.
There is no username; the only credentials are a host address + a master password. Every
secret value is end-to-end encrypted with the master password and never transmitted or
stored in plaintext.

Questions: concealer@fxerkan.com

## Demonstration video
`mobile/store/demo-video.mp4` (iOS demo-mode walkthrough) — optional to attach via the
Attachment field; the built-in demo already makes the app fully reviewable.
