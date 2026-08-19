---
title: Web Arayüzü
layout: default
nav_exclude: true
---

# Web Arayüzü
{: .no_toc }

concealer'ın kendisi tarafından yerel olarak sunulan profesyonel bir tek sayfalık uygulama — tam CRUD, filtreleme, secret başına deploy ve kurcalamaya karşı korunaklı bir denetim (audit) görüntüleyicisi.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

## Başlatma

```bash
concealer web            # http://127.0.0.1:8787 (varsayılan port)
concealer web 8080       # özel port
```

**Yalnızca** `127.0.0.1` adresine bağlanır — bu tek kullanıcılı yerel bir kolaylıktır, sağlamlaştırılmış çok kullanıcılı bir sunucu değil. Tarayıcıda master parola ile kilidi açın.

![concealer Web Arayüzü — aranabilir, kapsamlanmış secret'lar]({{ site.baseurl }}/assets/app-secrets.png)

---

## Özellikler

- **TR / EN** arayüz geçişi (sağ üst) — tüm arayüz iki dillidir.
- Türe duyarlı formlarla tam **CRUD** · duyarlı (telefon/tablet) düzen.
- Arama + tür / tenant / project / environment / repo / **etiketler** için **aranabilir, çoklu seçim** filtreleri.
- **Sıralanabilir, yeniden düzenlenebilir sütunlar** — herhangi bir özel alan (`web_url`, `host`, …) dahil, kendi sütunu olarak.
- **Secret başına Deploy** — bir secret'ı `export` / `docker` / `k8s` / `aws-secrets` / `aws-ssm` / `github` / … hedeflerine göndermek için tam CLI/manifest'i oluşturur.
- **Otomatik temizlemeli panoya kopyala** (20sn) · parola **göster/gizle** geçişi.
- Meta veri: url, etiketler, notlar.
- **Boşta kalınca otomatik kilitleme** (varsayılan 300sn; `CONCEALER_IDLE=…` ile veya Ayarlar sayfasından ayarlanır).
- **Denetim Günlüğü (Audit Log) görüntüleyicisi** — action / source / key / tarihe göre filtreleme, sayfalama, satır ayrıntısı, **zincir doğrulaması**, CSV/JSON dışa aktarma.
- **Riskler** görünümü — aynı değerin projeler arasında yeniden kullanıldığı yerleri bulur ve etki alanını (blast radius) puanlar.
- **Klasör tara** — bir dizini (veya shell geçmişini) başıboş secret'lar için tarayıp içe aktarır, kaynağa göre etiketleyerek, sunucu tarafı klasör tarayıcısı ve OS-yerel seçici ile birlikte.
- **Ayarlar** — boşta kalma zaman aşımı, hangi işlemlerin onay gerektirdiği ve **agent başına MCP hız sınırları** ([MCP]({{ site.baseurl }}/tr/mcp) bölümüne bakın).

---

![Zincir doğrulamalı denetim günlüğü görüntüleyicisi]({{ site.baseurl }}/assets/app-audit-logs.png)

**Riskler** görünümü, aynı değerin projeler arasında yeniden kullanıldığı yerleri bulur ve etki alanını puanlar:

![Risk görünümü — yeniden kullanılan secret değerleri sızıntı riskine göre puanlanır]({{ site.baseurl }}/assets/app-risks.png)

**Klasör tara**, bir dizini (veya shell geçmişini) başıboş secret'lar için tarar ve bunları kaynağa göre etiketleyerek içe aktarır:

![Bir klasörü veya shell geçmişini sızmış secret'lar için tarayın]({{ site.baseurl }}/assets/app-scan-folder.png)

---

## Oturum ve kilitleme

- Kilit açma, age anahtarını **yalnızca o oturum için belleğe** (`_SESS_KEY`) çözer — istek yolunda age/tty istemi yok, diskte açık anahtar yok.
- Oturumun **sabit bir boşta kalma otomatik kilidi** vardır: `idle` saniye hareketsizlikten sonra oturum ve bellekteki anahtar temizlenir. Aktivite TTL'yi **uzatmaz** — sabit ömürlü bir kilittir.
- Arayüzden hemen **Kilitle**, ya da boşta kalınca otomatik olarak gerçekleşir.

---

## JSON API (genel bakış)

SPA, aynı port üzerinde küçük bir JSON API ile konuşur. Seçili uç noktalar:

| Metot ve yol | Amaç |
|---|---|
| `POST /api/unlock` | `{pw}` ile kilidi açar; bir `HttpOnly` oturum çerezi ayarlar |
| `POST /api/lock` | oturumu ve bellekteki anahtarı temizler |
| `GET /api/session` | kilit durumu, boşta kalma zaman aşımı, kalan saniye |
| `GET /api/types` | tür → alan şeması eşlemesi |
| `GET /api/secrets` | scope/tag/type/query filtreleriyle (maskelenmiş) listeler |
| `GET /api/secret/<id>?reveal=1` | bir kaydı getirir; `reveal=1` açığa çıkarır + denetler |
| `POST /api/secrets` | bir kayıt oluşturur |
| `GET /api/audit` | sayfalanmış, filtrelenebilir denetim satırları |
| `GET /api/audit/verify` | zincir + tail-anchor bütünlük kontrolü |
| `GET /api/audit/export?format=csv\|json` | denetim günlüğünü indirir |
| `GET/POST /api/settings` | idle, confirm-ops, MCP limitleri, kayıtlı agent'lar (POST master parola gerektirir) |
| `GET /api/leaks` | yeniden kullanılan değer risk raporu |
| `GET /api/history` | shell geçmişi secret taraması |
| `POST /api/scan` | kuru çalışma (dry-run) klasör taraması (maskelenmiş adayları döndürür) |
| `GET /api/backup` | otomatik yedekleme durumu (parolayı asla döndürmez) |
| `GET /api/browse` · `GET /api/pickdir` | sunucu tarafı klasör tarayıcı / OS-yerel seçici |
| `POST /api/copy` | denetim günlüğüne bir pano kopyalamasını kaydeder |

Herkese açık olmayan tüm uç noktalar geçerli, kilidi açılmış bir oturum çerezi gerektirir veya `401 locked` döndürür.

{: .note }
> Web arayüzü **insan sahibinin** arayüzüdür — master parola ile kilidi açıldığından, MCP için geçerli olan agent başına sızdırma önleme (anti-exfiltration) hız sınırlarına tabi değildir.
