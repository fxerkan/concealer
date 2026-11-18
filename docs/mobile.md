---
title: Mobile (iOS & Android)
description: "The concealer mobile app: your vault offline on iOS and Android, unlocked with the master password, Face ID or a fingerprint, synced with your host — and Android's password autofill."
layout: default
nav_order: 7.3
---

# Mobile (iOS & Android)
{: .no_toc }

Your vault, offline in your pocket. It opens with the master password, or Face ID / Touch ID / a
fingerprint, syncs with the host on your Wi‑Fi, and on Android fills sign-ins in every app.
{: .fs-5 .fw-300 }

<video controls preload="none" playsinline poster="/assets/video/concealer-Mobile.jpg" aria-label="concealer mobile: Face ID unlock and Android password autofill" style="display:block;width:100%;border-radius:12px;margin:1.5rem 0;background:#000"><source src="/assets/video/concealer-Mobile.mp4" type="video/mp4"></video>

[App Store](https://apps.apple.com/app/id6816103801){: .btn .btn-primary } [Google Play](https://play.google.com/store/apps/details?id=com.fxerkan.concealer){: .btn }

1. TOC
{:toc}

---

## Connect to your host

Run `concealer lan` (or `concealer service install`) on your computer. The app finds it on the
same Wi‑Fi; pick it, type the master password, and the whole vault is imported. After that it
works offline, and **Sync now** merges changes both ways. Only encrypted bundles cross the network.

## Face ID, Touch ID and fingerprint unlock

**Settings → Security & lock → Turn on Face ID unlock** (or fingerprint on Android). The app then
asks for your face or finger when it opens and when you come back to it while locked.

- The master password is kept in the phone's secure hardware: the iOS Keychain, readable only after
  a match on the faces currently enrolled, or an Android Keystore key that needs a strong biometric
  every time.
- Enrolling a new face or finger turns it off; the app tells you and the master password works.
- Locking by hand doesn't pop the prompt; **Unlock with Face ID** is one tap away.

![Turning on Face ID, then the unlock prompt]({B}/assets/new/m-settings.jpg){: style="max-width:32%" } ![Face ID prompt at launch]({B}/assets/new/m-faceid-prompt.jpg){: style="max-width:32%" } ![A face that doesn't match leaves the vault locked]({B}/assets/new/m-unlock.jpg){: style="max-width:32%" }

## Android password autofill

**Settings → Password autofill → Use concealer for autofill** opens Android's autofill-service
picker; choose concealer. From then on:

1. Sign-in fields in other apps and browsers offer **Fill with concealer**.
2. Tapping it opens concealer: unlock (the fingerprint works) and pick the sign-in. The ones for
   that site or app come first.
3. Only that username and password are handed back and filled.

After you sign in somewhere new, Android offers to save it to concealer, or to update the saved
password. The autofill service itself never holds vault data. Chrome needs **Autofill using another
service** turned on in its settings.

![Fill with concealer → pick a sign-in → filled (frames from the film)]({B}/assets/new/android-autofill.jpg)

## Security

At rest the phone keeps only the vault bundle encrypted with your master password. Decrypted
secrets live in memory while the app is unlocked, and it locks itself after the auto-lock time.
