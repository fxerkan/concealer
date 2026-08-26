---
title: Taşınabilirlik & Yedekleme
layout: default
nav_exclude: true
---

# Taşınabilirlik & Yedekleme
{: .no_toc }

Kasa bu makinenin donanımına değil, bir **şifreye** (veya bir kurtarma koduna) bağlıdır. İstediğiniz yere taşıyın.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

## Başka bir makineye taşıma

Şunları `CONCEALER_HOME`'dan kopyalayın:

```
secrets.enc.yaml
.sops.yaml
keys/age-key.txt.age      # master-password ile sarmalanmış age anahtarı
keys/master.json          # scrypt doğrulayıcı
keys/recovery.json        # kurtarma kodu sarmaları
keys/agents.json          # token sarmaları (opsiyonel)
keys/audit.log            # audit geçmişi (opsiyonel)
keys/audit.head           # kuyruk çıpası (opsiyonel)
```

Herhangi bir `CONCEALER_TOKEN`'ı **kopyalamayın** — token'lar bilinçli olarak makineye özeldir. Yeni makinede:

```bash
eval "$(concealer unlock)"     # master password'ü sorar, burada taze bir token üretir
concealer list                 # çalışır — makineden bağımsız
```

Kopyalanmış bir klasör, birisi master password'ü (veya bir kurtarma kodunu) yazana kadar **atıldır**. Güvenlik özelliği budur: makineye bağlanmadan taşınabilirlik ve dosyalarla birlikte hiçbir plaintext anahtar seyahat etmez.

---

## Şifreli export / import paketleri

Tek bir taşınabilir, şifre korumalı dosya için:

```bash
concealer export                     # concealer-export-YYYY-MM-DD.age yazar (master pw sorar)
concealer export mybundle.age        # özel dosya adı

concealer import mybundle.age        # paket şifresini sorar; +yeni / ~güncellenmiş bildirir
```

`import` ayrıca `.cerbak` yedeklerini de geri yükler (eski `.cer` dosyaları da geri yüklenir — içe aktarma uzantıdan bağımsızdır). Var olan kayıtların nasıl ele alınacağını `--mode=overwrite|skip|duplicate` ile seçin (varsayılan `overwrite`).

---

## Otomatik `.cerbak` yedekleri (cron / launchd)

Web **Ayarlar**'ında bir yedekleme şifresi ve dizini yapılandırın (şifre age ile sarmalanmış saklanır, asla plaintext değil), ardından çalıştırın:

```bash
concealer backup                 # yapılandırılan dizine bir .cerbak yazar
concealer backup --dir /path     # dizini geçersiz kıl ve kalıcılaştır
```

Anahtar erişimi `CONCEALER_TOKEN`'dan (veya bir TTY master-password isteminden) gelir, dolayısıyla bir token mevcut olduğunda gözetimsiz çalışır. Bunu cron veya bir launchd agent'ıyla zamanlayın. Web UI'ın otomatik yedeklemesi, yapılandırılan aralık geçtiğinde kilit açımında da tetiklenebilir.

---

## Geri yükleme

```bash
concealer import backup-file.cerbak     # yedekleme şifresini sorar
```

---

## Genel kural

| Elinizde… | Kasayı geri yükleyebilir misiniz |
|---|---|
| Dosyalar **ve** master password | ✅ evet — herhangi bir makinede `unlock` |
| Dosyalar **ve** bir kurtarma kodu | ✅ evet — `recover`, ardından yeni bir şifre ayarla |
| **Yalnızca** dosyalar | ❌ hayır — şifre veya kod olmadan atıl |
| Başka bir makineden bir `CONCEALER_TOKEN` | ❌ hayır — token'lar transfer olmaz |
