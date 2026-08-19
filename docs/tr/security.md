---
title: Güvenlik Modeli
layout: default
nav_exclude: true
---

# Güvenlik Modeli & Notlar
{: .no_toc }

Neyin neyi koruduğu — ve dürüst tavanlar, açıkça belirtilmiş haliyle.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

## Kriptografi (devredilmiş)

- **Şifreleme:** **age** X25519 üzerinde AES-256-GCM (SOPS aracılığıyla). concealer bunların **hiçbirini** uygulamaz — %100'ünü `sops`/`age`'e devreder.
- Sarmalanmış anahtar yedekleri ve UI doğrulayıcı için **anahtar türetme**: **scrypt / age-scrypt** (stdlib `hashlib.scrypt`).
- concealer'ın kendisinin gerçekleştirdiği tek kripto, stdlib scrypt **master-password doğrulayıcısı** ve **HMAC audit zinciridir**. Kendi geliştirmesi bir şifre yok, kendi geliştirmesi bir KDF yok, plaintext secret depolaması yok.

Tasarım ilkesi: *en tembel güvenli tasarım, en az güvenlik kodu yazdığınızdır.* SOPS ve age geniş çapta incelenmiştir; bunları yeniden kullanmak, güvenlik açısından kritik kısımların dünya tarafından zaten incelenmiş olması anlamına gelir.

---

## Key-at-rest

Sağlamlaştırılmış bir kasada age özel anahtarı **hiçbir zaman diskte plaintext olarak bulunmaz**. Yalnızca sarmalanmış kopyalar vardır:

- master-password ile sarmalanmış (`keys/age-key.txt.age`),
- kurtarma kodu ile sarmalanmış (`keys/recovery.json`),
- token ile sarmalanmış (`keys/agents.json`).

Anahtar `sops`'a **bellekte** ulaşır (`SOPS_AGE_KEY`), asla bir temp dosyasında değil. `0600 keys/age-key.txt` içeren eski kasalar hâlâ çalışır; migrate etmek için `concealer harden` çalıştırın.

---

## Token'lar

Kilit açma token'ları **istemci tarafında** tutulur (`CONCEALER_TOKEN`). Kasa yalnızca bir scrypt hash + token ile sarmalanmış bir anahtar saklar. Her token **iptal edilebilir** ve süre sonu destekler. Agent'lar kendi token'ını alır — paylaşılan şifre yok. Kopyalanmış bir kasa klasörü, master password veya bir kurtarma kodu olmadan atıldır.

---

## İkinci faktör olarak kurtarma kodları

Kurtarma kodları da anahtarı sarmalar: herhangi biri kasayı kurtarır ve `passwd` bir ikinci faktör olarak birini **tüketir** — böylece çalınmış bir master password *tek başına* anahtarı döndüremez veya kasayı ele geçiremez.

---

## Audit kurcalama kanıtı

Audit log, değerleri değil, anahtar **adlarını ve eylemlerini** tutar. Şu yollarla kurcalamaya karşı kanıtlıdır:

- bir **HMAC-SHA256 zinciri** (her giriş bir öncekine bağlıdır),
- imzalı yükte monoton bir **`seq`**, ve
- kuyruk kesmeyi (son satırların silinmesini) yakalayan bir **`keys/audit.head`** çıpası.

`concealer audit verify` zinciri yeniden hesaplar ve çıpayı kontrol eder.

{: .warning }
> **Dürüst tavan:** `keys/audit.key` yerel olarak saklanır, dolayısıyla tam erişime sahip bir filesystem-root saldırganı zinciri yeniden taklit edebilir. Gerçek değişmezlik, makine dışı bir anahtar/çıpa gerektirir. Bu kısıtlama gizlenmemiş, kodda belgelenmiştir.

---

## Web UI kapsamı

Web sunucusu **yalnızca** `127.0.0.1`'e bağlanır ve **tek kullanıcılıdır**. Bunu, sağlamlaştırılmış çok kullanıcılı bir sunucu olarak değil, yerel bir kolaylık olarak değerlendirin. Oturum, anahtarı yalnızca belleğe çözer ve onu temizleyen katı bir boşta otomatik kilitlemeye sahiptir.

---

## Sızdırma önleme (MCP)

Agent'lar kapılıdır: yalnızca **kayıtlı** agent token'ları MCP araçlarını çağırabilir ve `list`/`search`/`get` sonuçları, toplu döküm alınmasını önlemek için agent başına bir **hız kapısından** (`per_call`, `window_quota`, `window_sec`) geçer. `run_with_secrets` değerleri çıktıdan gizler. Bkz. [MCP]({{ site.baseurl }}/tr/mcp).

---

## Asla commit edilmeyenler

`keys/`, `secrets.enc.yaml`, `secrets.enc.json` ve `.sops.yaml` git tarafından yok sayılır ve öyle kalmalıdır. concealer deposu **aracı** gönderir, asla bir kasa değil. Herhangi bir `git add` öncesi, bunlardan hiçbirinin stage'lenmediğini doğrulayın.

---

## Tasarım gereği PII yok

Bilinçli olarak **hiçbir** kredi kartı / pasaport / kimlik numarası türü yoktur. Bu kasa, kimlik belgeleri için değil, makine ve hesap kimlik bilgileri içindir.

---

## Tehdit modeli özeti

| Tehdit | Önlem | Kalıntı risk |
|---|---|---|
| Secret'ın bir AI sohbetine yapıştırılması | MCP açığa çıkarmadan enjekte eder; değerler gizlenir | Agent kayıtlı ve hız sınırlı olmalı |
| Dizüstünün çalınması (disk kopyalanmış) | Key-at-rest: yalnızca sarmalanmış anahtar, plaintext yok | Master password gücü |
| Master password'ün sızması | `passwd` ikinci faktör olarak bir kurtarma kodu gerektirir | Kurtarma kodları ayrı saklanmalı |
| Kasanın kazara commit edilmesi | `.gitignore` kasa dosyalarını korur | Kullanıcının `git add` disiplini |
| Audit log'un kurcalanması | HMAC zinciri + seq + kuyruk çıpası | FS-root saldırgan yeniden taklit edebilir (yerel anahtar) |
| Agent'ın her şeyi dökmeye çalışması | Kayıt kapısı + agent başına hız sınırları | Sınırlar agent başına ayarlanabilir |
