---
title: TUI
layout: default
nav_exclude: true
---

# Terminal Arayüzü (TUI)
{: .no_toc }

Aynı şifreli kasa üzerinde etkileşimli bir terminal arayüzü — kabuğunuzdan çıkmadan secret'ları gözatın, arayın, ekleyin, silin ve görüntüleyin.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

## Başlatma

```bash
concealer tui        # or: cer tui
```

CLI ile aynı şekilde kilit açın — ortamınızdaki bir `CONCEALER_TOKEN` (`unlock` / `init`'ten gelen) ya da TTY üzerinde bir master-password sorusu.

![concealer TUI açılış ekranı]({{ site.baseurl }}/assets/tui-splash-screen.png)

---

## Gözatma ve arama

Ekranda üç panel bulunur — **1 · Filtreler**, **2 · Secret'lar**, **3 · Detaylar**. Odağı bunlar arasında taşıyın, gözatın, görüntüleyin, kopyalayın ve tamamen klavyeyle düzenleyin. Secret alanları siz onları görüntüleyene kadar **maskeli** kalır — her yerdeki gibi aynı kayıt-farkındalıklı maskeleme kuralları geçerlidir (bkz. [Secret Türleri]({{ site.baseurl }}/tr/secret-types)).

![concealer TUI — aranabilir secret listesi]({{ site.baseurl }}/assets/tui-secrets.png)

---

## Klavye kısayolları
{: .no_toc }

Bu tabloyu uygulama içinde görmek için istediğiniz zaman <kbd>?</kbd> tuşuna basın. İki dillidir (TR/EN geçişi için <kbd>L</kbd> tuşuna basın).

### Paneller ve odak

| Tuşlar | Eylem |
|---|---|
| <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> | Görünür paneller arasında odağı döngüyle gezdirir |
| <kbd>←</kbd> <kbd>→</kbd> / <kbd>h</kbd> <kbd>l</kbd> | Paneller arasında odağı taşır |
| <kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd> | Doğrudan Filtreler / Secret'lar / Detaylar paneline atlar |

### Gezinme

| Tuşlar | Eylem |
|---|---|
| <kbd>↑</kbd> <kbd>↓</kbd> / <kbd>j</kbd> <kbd>k</kbd> | Seçimi yukarı / aşağı taşır |
| <kbd>g</kbd> / <kbd>G</kbd> | En üste / en alta atlar |
| <kbd>PgUp</kbd> / <kbd>PgDn</kbd>, <kbd>Ctrl</kbd>+<kbd>U</kbd> / <kbd>Ctrl</kbd>+<kbd>D</kbd> | Sayfa yukarı / aşağı |

### Arama ve filtreler

| Tuşlar | Eylem |
|---|---|
| <kbd>s</kbd> or <kbd>/</kbd> | Canlı arama — yazdıkça filtreler |
| <kbd>Esc</kbd> | Aramayı temizler / arama modundan çıkar |
| <kbd>Space</kbd> / <kbd>Enter</kbd> | Filtreler panelinde: bir faceti açıp kapatır (tür, project, env, tenant, repo, tag) |
| <kbd>x</kbd> | Tüm etkin filtreleri temizler |

### Görüntüleme ve kopyalama

| Tuşlar | Eylem |
|---|---|
| <kbd>m</kbd> | Secret'lar panelinde: seçili kaydın **tüm** alanlarını görüntüler / gizler |
| <kbd>↑</kbd> <kbd>↓</kbd> / <kbd>j</kbd> <kbd>k</kbd> then <kbd>Enter</kbd> / <kbd>m</kbd> | Detaylar panelinde: bir alan seçip yalnızca onu görüntüler |
| <kbd>c</kbd> | **Değeri** panoya kopyalar |
| <kbd>u</kbd> | **Kullanıcı adını** kopyalar |
| <kbd>w</kbd> | **url**'yi kopyalar |

Pano **45 saniye sonra otomatik temizlenir** (`pbcopy` / `xclip` / `wl-copy` kullanır). *Yapıştırma* yoktur — TUI secret'ları dışarı okur; bir değeri **içeri** koymak için aşağıdaki ekleme/düzenleme özelliklerini kullanın.

### Kasayı düzenleme

| Tuşlar | Eylem |
|---|---|
| <kbd>a</kbd> | Yeni bir secret ekler (tür-farkındalıklı form) |
| <kbd>e</kbd> | Seçili secret'ı düzenler |
| <kbd>d</kbd> | Seçili secret'ı siler (onay ile) |
| <kbd>r</kbd> | Değerini rastgele bir değerle döndürür |

### Uygulama

| Tuşlar | Eylem |
|---|---|
| <kbd>R</kbd> | Kasayı diskten yeniden yükler |
| <kbd>Ctrl</kbd>+<kbd>L</kbd> | Yeniden çizmeye zorlar |
| <kbd>L</kbd> | Dili değiştirir (TR / EN) |
| <kbd>?</kbd> | Uygulama içi yardımı gösterir |
| <kbd>q</kbd> / <kbd>Ctrl</kbd>+<kbd>Q</kbd> | Çıkar |

{: .note }
> **Terminal görüntüleme:** concealer UTF-8 terminallerde kutu karakterleri (`┌│─`) çizer ve gerektiğinde ASCII'ye (`+-\|`) geri döner (örn. VS Code'un tümleşik terminali). `CONCEALER_TUI_ASCII=1` (ASCII) veya `=0` (UTF-8) ile zorlayın.

---

## Ekleme ve düzenleme

Ekleme ve düzenleme, web arayüzü ve CLI ile aynı **tür-farkındalıklı** modeli kullanır: bir tür seçin, yalnızca ona uygun alanları doldurun; secret alanları maskeli olarak saklanır.

![concealer TUI — tür-farkındalıklı düzenleme formu]({{ site.baseurl }}/assets/tui-edit.png)

Her görüntüleme, oluşturma, güncelleme ve silme, `source` kaydedilerek [kurcalamaya karşı korumalı audit log'a]({{ site.baseurl }}/tr/concepts#audit-chain) yazılır — TUI birinci sınıf bir arayüzdür, bir baypas değil.

---

## Hangi arayüzü ne zaman kullanmalı

| İsteğiniz… | Kullanın |
|---|---|
| Scripting, CI, `run`/`deploy` içine aktarma | [CLI]({{ site.baseurl }}/tr/cli-reference) |
| Zengin formlar, filtreler, deploy renderer'ları, audit görüntüleyici | [Web Arayüzü]({{ site.baseurl }}/tr/web-ui) |
| Terminal içinde hızlı klavye ile gözatma | **TUI** (bu sayfa) |
| Secret'ları görmeden kullanan ajanlar | [MCP]({{ site.baseurl }}/tr/mcp) |
