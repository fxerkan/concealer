---
title: Değişiklikler
description: "concealer'da yenilikler: girişleri kaydetme ve AutoFill, Touch ID ve passkey, mobilde Face ID ve parmak izi, Android parola otomatik doldurma ve her arayüz için bir film."
layout: default
nav_exclude: true
---

# Değişiklikler
{: .no_toc }

Sürüm sürüm neler değişti. Tüm ayrıntılar
[CHANGELOG.md](https://github.com/fxerkan/concealer/blob/main/CHANGELOG.md) içinde.
{: .fs-5 .fw-300 }

## 1.2.2 — 2026-11-18

### Chrome eklentisi: girişlerini kaydeder

Başarılı bir girişten sonra eklenti kaydetmeyi ya da değişen parolayı güncellemeyi önerir. Hesap
ID, bölge ve sayfadaki diğer alanlar da gelir; AutoFill kaydedilen her alanı adıyla geri doldurur.
Kasa kilitliyken kaydetmek ana parola istemez: giriş kasanın açık anahtarıyla şifrelenir ve bir
sonraki kilit açışta eklenir.

![Girişi concealer'a kaydet?]({B}/assets/new/ext-save-page.jpg)

### Touch ID ve passkey ile kilit açma (web arayüzü ve eklenti)

Ayarlar → Güvenlik ve kilit altından passkey ekle; Touch ID, Windows Hello ya da güvenlik
anahtarıyla aç. Ana parola da çalışır.

![Passkey / Touch ID ile aç]({B}/assets/new/web-passkey-unlock.jpg)

### Mobil: Face ID, Touch ID ve parmak iziyle kilit açma

Uygulama yüzün ya da parmağınla açılır. Ana parola telefonun güvenli donanımında durur, yalnızca
eşleşme sonrası verilir.

![Face ID'yi açma]({B}/assets/new/m-settings.jpg){: style="max-width:32%" } ![Açılışta Face ID]({B}/assets/new/m-faceid-prompt.jpg){: style="max-width:32%" } ![Yüz tanınmadı]({B}/assets/new/m-unlock.jpg){: style="max-width:32%" }

### Android: parola otomatik doldurma servisi olarak concealer

Her uygulama ve tarayıcıdaki giriş alanları "Fill with concealer" önerir; kilidi açıp girişi
seçersin, doldurulur. Yeni girişler de aynı yolla kaydedilir.

![Fill with concealer → seç → dolduruldu]({B}/assets/new/android-autofill.jpg)

### Yeniden tasarlanan Ayarlar sayfası

Yan menülü tek sayfa: Güvenlik ve kilit, Görünüm, AI ajanları, Tarayıcı eklentisi,
Entegrasyonlar, Eşitleme, Taşınabilirlik, Yedek, Hakkında.

![Ayarlar]({B}/assets/new/web-settings.jpg)

### Diğer yenilikler

- Her arayüz için kendi sayfasında kısa bir film: Chrome eklentisi, CLI, Web UI, TUI, MCP, Mobil.
- Web arayüzünde **Oluşturuldu** sütunu; tarih sütunlarına göre sıralama yeniden çalışıyor.
- Eklenti popup'ı en çok kullandığın 20 secret ile açılır; sağ tık menüsünde "Fill with concealer"
  ve "Save sign-in to concealer".
- Mobilde 15 dk, 30 dk ve 1 saat otomatik kilit; ana parola kutusu imleci alır.
- `cer run [kapsam] -- <komut>` alışılmış `--` ayıracını kabul eder.

## 1.2.1 — 2026-11-17

- Web arayüzü: secret tablosunun başlığı açık filtre menülerini artık örtmüyor.
