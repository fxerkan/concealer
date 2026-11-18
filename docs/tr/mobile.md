---
title: Mobil (iOS ve Android)
description: "concealer mobil uygulaması: kasan iOS ve Android'de çevrimdışı; ana parola, Face ID ya da parmak iziyle açılır, ana makineyle eşitlenir — Android'de parola otomatik doldurma."
layout: default
nav_exclude: true
---

# Mobil (iOS ve Android)
{: .no_toc }

Kasan çevrimdışı olarak cebinde. Ana parolayla ya da Face ID / Touch ID / parmak iziyle açılır,
Wi‑Fi üzerinden ana makineyle eşitlenir; Android'de her uygulamadaki girişleri doldurur.
{: .fs-5 .fw-300 }

<video controls preload="none" playsinline poster="/assets/video/concealer-Mobile.jpg" aria-label="concealer mobil: Face ID ve Android otomatik doldurma" style="display:block;width:100%;border-radius:12px;margin:1.5rem 0;background:#000"><source src="/assets/video/concealer-Mobile.mp4" type="video/mp4"></video>

[App Store](https://apps.apple.com/app/id6816103801){: .btn .btn-primary } [Google Play](https://play.google.com/store/apps/details?id=com.fxerkan.concealer){: .btn }

## Ana makineye bağlanma

Bilgisayarında `concealer lan` (ya da `concealer service install`) çalıştır. Uygulama aynı Wi‑Fi'da
onu bulur; seç, ana parolayı yaz, tüm kasa içe aktarılır. Sonrasında çevrimdışı çalışır;
**Sync now** değişiklikleri iki yönlü birleştirir. Ağdan yalnızca şifreli paketler geçer.

## Face ID, Touch ID ve parmak iziyle kilit açma

**Ayarlar → Security & lock → Turn on Face ID unlock** (Android'de parmak izi). Uygulama açılırken
ve kilitliyken geri döndüğünde yüzünü ya da parmağını ister.

- Ana parola telefonun güvenli donanımında tutulur: iOS Keychain (yalnızca kayıtlı yüzlerle eşleşince
  okunur) ya da her kullanımda güçlü biyometri isteyen Android Keystore anahtarı.
- Yeni bir yüz ya da parmak eklenirse kapanır; uygulama haber verir, ana parola çalışır.

![Face ID'yi açma]({B}/assets/new/m-settings.jpg){: style="max-width:32%" } ![Açılışta Face ID]({B}/assets/new/m-faceid-prompt.jpg){: style="max-width:32%" } ![Eşleşmeyen yüz kasayı kilitli bırakır]({B}/assets/new/m-unlock.jpg){: style="max-width:32%" }

## Android parola otomatik doldurma

**Ayarlar → Password autofill → Use concealer for autofill** Android'in otomatik doldurma servisi
seçicisini açar; concealer'ı seç. Ardından:

1. Diğer uygulama ve tarayıcılardaki giriş alanları **Fill with concealer** önerir.
2. Dokununca concealer açılır: kilidi aç (parmak izi çalışır), girişi seç; o site ya da uygulamanınkiler önce gelir.
3. Yalnızca o kullanıcı adı ve parola geri verilip doldurulur.

Yeni bir yere giriş yaptığında Android bunu concealer'a kaydetmeyi ya da kayıtlı parolayı
güncellemeyi önerir. Otomatik doldurma servisinin kendisi kasa verisi tutmaz. Chrome'da ayarlardan
**Autofill using another service** açık olmalı.

![Fill with concealer → giriş seç → dolduruldu (filmden kareler)]({B}/assets/new/android-autofill.jpg)
