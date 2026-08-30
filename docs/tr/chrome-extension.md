---
title: Chrome Eklentisi
layout: default
nav_exclude: true
---

# Chrome Eklentisi
{: .no_toc }

Kasanı aç ve secret değerlerini `cer web` yazmadan doğrudan Chrome araç çubuğundan kopyala. Popup
yerel sunucuyu ihtiyaç anında başlatır ve boşta kalınca kendini kilitler.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

## Nedir

concealer eklentisi, **yerel** kasan için ince bir araç-çubuğu arayüzüdür. Yalnızca kendi
makinendeki (`127.0.0.1`) concealer sunucusuyla konuşur — bulut yok, hesap yok, telemetri yok. Bir
secret'a tıkla, değeri panoya kopyalansın; pano birkaç saniye sonra otomatik temizlenir.

![concealer popup — secret listesi]({{ site.baseurl }}/assets/ext-list.png)

Çok alanlı secret'lar (bir veritabanının host/user/password'ü, bir OAuth uygulamasının
key/secret/token'ı…) alt satırlara açılır; böylece **tam olarak** ihtiyacın olan alanı kopyalarsın —
istersen önce görüp doğrularsın.

![concealer popup — alan bazlı kopyalama]({{ site.baseurl }}/assets/ext-fields.png)

---

## Kurulum & ayar

Tek seferlik iki adım: **(1)** eklentiyi Chrome'a ekle, sonra **(2)** popup'ın kasanı
başlatabilmesi için native yardımcıyı kaydet. Platformunu seç:

<div class="cer-tabs">
<div class="cer-tabbar">
<button class="cer-tab is-active" data-tab="mac">🍎 macOS / Linux</button>
<button class="cer-tab" data-tab="win">🪟 Windows</button>
<button class="cer-tab" data-tab="ext">🧩 Chrome Eklentisi</button>
</div>
<div class="cer-panel is-active" data-panel="mac" markdown="1">
**1. concealer'ı kur** (henüz yoksa):

```bash
brew install fxerkan/tap/concealer
```

**2. Native yardımcıyı kaydet** (tek seferlik OS ayarı):

```bash
cer chrome-extension
```

Sonra concealer araç-çubuğu simgesine tıkla. Bu adım tamamlanana kadar eklenti kurulum kartını
gösterir. Kaldırmak için: `cer chrome-extension --uninstall`.
</div>
<div class="cer-panel" data-panel="win" markdown="1">
**1. concealer'ı kur** (henüz yoksa):

```powershell
scoop bucket add fxerkan https://github.com/fxerkan/scoop-bucket
scoop install concealer
```

**2. Native yardımcıyı kaydet** (tek seferlik OS ayarı):

```powershell
cer chrome-extension
```

Bu, native-host manifesti ile Chrome / Edge / Chromium için `HKCU\…\NativeMessagingHosts` kayıt
defteri anahtarlarını yazar. Ardından araç-çubuğu simgesine tıkla.
Ortam ayrıntıları için [Windows rehberi]({{ site.baseurl }}/tr/WINDOWS)'ne bak.
</div>
<div class="cer-panel" data-panel="ext" markdown="1">
**Chrome Web Mağazası'ndan** — _çok yakında (inceleme aşamasında)._ Yayınlandığında normal bir
eklenti gibi kurulur; yine de bir kez `cer chrome-extension` çalıştırırsın (mağaza native host
kaydedemez).

**Paketlenmemiş yükleme (şimdi çalışır):**

1. `git clone https://github.com/fxerkan/concealer.git`
2. `chrome://extensions` → **Geliştirici modu**'nu aç
3. **Paketlenmemiş öğe yükle** → `extension/` klasörünü seç
4. OS'una uygun kurulum komutunu çalıştır (diğer sekmeler), sonra simgeye tıkla.
</div>
</div>

{: .note }
> Native yardımcı **concealer'ın içine gömülüdür** (`concealer native-host`) — ayrıca kurulacak
> bir program yoktur. `cer chrome-extension` yalnızca onu tarayıcına kaydeder ve Chrome'un dar
> başlatma ortamında `sops`/`age` bulunabilsin diye `PATH`/kasa yolunu sabitler.

---

## Kullanım

- **Kopyala** — tek alanlı secret'a tıkla, değer anında kopyalanır. Çok alanlılarda tıkla-aç, sonra
  istediğin alanın 📋 düğmesini kullan. 👁 gizli bir alanı gösterir (birkaç saniye sonra tekrar gizler).
- **Ara** — isim, etiket, proje veya ortama göre filtrele.
- **Otomatik kilit** — başlıktaki sayaç popup'ı kendi kısa süresiyle kilitler (sunucudan ayrı ve asla
  ondan uzun değil) ve süre biterken kırmızı yanıp söner.
- **🎲 Üret** — güçlü parola / hex / base64url / UUID üret, tek tıkla kopyala.
- **🌐 / ürün adı** — tam web arayüzünü yeni sekmede açar.
- Üret, Web UI ve Ayarlar kilitliyken bile çalışır.

## Temalar

Web arayüzüyle eşleşen üç yerleşik tema — **Dark**, **White**, **Matrix**. **Ayarlar ⚙️**'dan seç
(tarayıcı bazında saklanır).

![concealer popup — Matrix teması]({{ site.baseurl }}/assets/ext-matrix.png)

## Ayarlar

**⚙️ Ayarlar**'da: tema, pano otomatik-temizleme (0–600 sn, varsayılan 20), eklenti otomatik-kilit
(10 sn – sunucu süresi, varsayılan 60), gösterimi otomatik-gizleme (5–30 sn, varsayılan 10). Ayrıca
port, sunucu otomatik-kilidi, kasanın sertleştirilmiş olup olmadığı ve bir **Geliştirici** satırı.

## Geliştirici derlemeleri

Paketlenmemiş bir derlemenin **eklenti ID'si farklıdır**. **Ayarlar → Geliştirici**'de gösterilen
komutla onu native host'a yetkilendir:

```bash
cer chrome-extension --add-id <extension-id>   # ID'yi Ayarlar gösterir
cer chrome-extension --list                    # yetkili tüm ID'leri göster
```

## Gizlilik & güvenlik

- Eklenti **yalnızca** `http://127.0.0.1:8787` (kendi makinen) ile konuşur. Uzak istek yok, veri
  toplama yok. [Gizlilik politikası](https://github.com/fxerkan/concealer/blob/main/PRIVACY.md).
- Secret değerleri asla loglanmaz; pano ayarladığın süre sonunda silinir.
- Popup'ı doğrulayan token `chrome.storage.session`'da (yalnızca bellek, tarayıcı kapanınca yok
  olur) tutulur ve `X-Concealer-Token` olarak gönderilir.
