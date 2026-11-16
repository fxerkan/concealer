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
company servers - nothing is sent to us or any third party.

NO HIDDEN OR REMOTELY SWITCHED FEATURES:
The app is a single bundled screen set (Capacitor, all code shipped in the binary). It loads
no remote code, has no remote configuration, no feature flags, and no server of ours that can
change what it shows. The demo runs the exact same screens and code as a real vault - the only
difference is that the data is a built-in sample and Sync is switched off (a red DEMO badge is
shown). Every screen in the app: Connect, Unlock, Secret list (search/filter/sort), Secret
detail (reveal/copy), Add/Edit, Sync conflicts, Settings.

TO REVIEW WITHOUT ANY SETUP:
On the first screen, tap "Try the demo - no host needed". This loads a local sample vault
(dummy data) so you can explore the entire app offline: browse secrets, tap one to view it
(values are masked with a reveal/copy control), add/edit/delete secrets, switch theme, and
see the auto-lock timer. No host, account, or network is required for the demo.

TO REVIEW THE SYNC FEATURE (the only part the demo cannot show, about 2 minutes on a Mac on
the same Wi-Fi as the device):
  1. pip install concealer        (open source: https://github.com/fxerkan/concealer)
  2. concealer init               (choose any master password)
  3. concealer lan                (starts the host and advertises it on the local network)
  4. In the app, the Mac appears under "Servers on your network"; tap it, enter the same
     master password, tap Connect. Secrets then sync both ways.
The app only ever talks to that host on the user's own network. The Local Network permission
is used solely to find it (Bonjour service _concealer._tcp).

EXTERNAL LINKS (all open in Safari / Mail, fixed in the binary):
"Rate concealer" -> this app's App Store page; "Support" -> mailto:concealer@fxerkan.com;
version label -> the open-source repository.

Questions: concealer@fxerkan.com

## Reply to App Review (rejection of 1.0 build 1790511038, guideline 5.6)

Hello, thank you for the review. We believe the pattern you flagged was the "Rate concealer"
button in Settings: in the rejected build it opened a page on our website
(concealer.fxerkan.com/rate/?p=ios) that chose the destination from a platform parameter. We
understand that a destination decided by a remote page looks like behaviour that can be
changed after review, and we have removed it. In the new build the button opens this app's
App Store page from a URL fixed in the binary, and nothing in the app depends on a remote
page or remote configuration.

The app has no hidden features. All code ships in the binary; there is no remote code, remote
config or feature flag. The "Try the demo" mode runs the same screens as a real vault with
built-in sample data. The one feature the demo cannot exercise is sync with the user's own
computer; the App Review notes now include a 2-minute setup so you can test it, and a
walkthrough video is attached. If a different feature prompted the rejection, please tell us
which screen or behaviour and we will address it right away.

## Demonstration video
`mobile/store/demo-video.mp4` (iOS demo-mode walkthrough) — optional to attach via the
Attachment field; the built-in demo already makes the app fully reviewable.
