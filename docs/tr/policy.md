---
title: Politika
layout: default
nav_exclude: true
---

# Politika
{: .no_toc }

Kendi hatırlatma kurallarınızı tanımlayın — rotation, expiry, yeniden kullanım, adlandırma, etiketleme — sonra bunları ihlal eden secret'ları görün ve toplu düzeltin.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

![Politika — hatırlatma kuralları, ihlaller ve MCP erişim limitleri]({{ site.baseurl }}/assets/app-policy.png)

## Kurallar

**Politika** sekmesinde kural ekleyin, düzenleyin, silin ve açıp kapatın (`GET/POST /api/policies`, `DELETE /api/policies/<id>`). Her kural, onu **ihlal eden** secret'ları listeler — bir satıra tıklayıp o secret'ın düzenleyicisini açın ya da tüm ihlal edenleri tek seferde **Toplu düzenle** (etiket ekle / rotation aralığı ayarla / collection ayarla).

Kural türleri:

| Tür | Bir secret'ı şu durumda işaretler… |
|---|---|
| **Rotation** | rotation politikası yoksa, gecikmişse ya da aralığı belirlediğiniz bir maksimumu aşıyorsa |
| **Expiry** | süresi geçmişse, *N* gün içinde doluyorsa ya da bir expiry alanı eksikse |
| **Yeniden kullanım** | değeri başka bir kayıtla paylaşılıyorsa |
| **Adlandırma** | adı verdiğiniz bir regex ile eşleşmiyorsa |
| **Etiketleme** | zorunlu kıldığınız etiketler eksikse |

### Hedef (audience)

Her kural bir **hedef** taşır (`user` / `agent` / `cli` / `web` / `tui` / `mcp` / `all`) — böylece farklı kurallar vault'un farklı tüketicilerine uygulanabilir.

### Bildirimler

Bir kuraldaki 🔔 zilini açıp ihlallerinden haberdar olun: bildirim-açık ihlaller **Politika sekmesinde bir rozet** ve — tarayıcı izniyle — **açılışta bir tarayıcı bildirimi** olarak belirir.

### CLI'dan

```bash
concealer policy list      # yapılandırılmış kuralları göster
concealer policy check     # herhangi bir kural ihlal edilirse sıfırdan farklı çıkış (cron dostu)
```

---

## MCP erişim limitleri (toplu-sızdırma önleme)

Yerleşik ajan-erişim politikası Politika sayfasının altında yer alır (buraya Ayarlar'dan taşındı). AI ajanları secret'ları yalnızca **kayıtlı bir ajan token'ı** ile okuyabilir; iki ajan-başına limit, bir ajanın tekrarlı sorgularla tüm vault'u yeniden birleştirmesini engeller:

- **Çağrı başına (per call)** — tek bir yanıtın döndürebileceği satır sayısını sınırlar.
- **Pencere kotası (distinct)** — bir ajanın yuvarlanan pencere içinde açığa çıkarabileceği **farklı** secret adı sayısını sınırlar (zaten açıklanmış adlar ücretsiz yeniden listelenir; ajanı tamamen engellemek için kotayı **0** yapın).
- **Pencere (sn)** — yuvarlanan pencerenin uzunluğu.

Tüm ajanlar için bir varsayılan ve ajan-başına geçersiz kılmalar ayarlayın. Kapının uçtan uca nasıl çalıştığı için [AI Ajanları için MCP]({{ site.baseurl }}/tr/mcp)'ye bakın.

{: .note }
> Politika sayfası **insan sahibinin** arayüzüdür (master parola ile açılır) ve yapılandırdığı ajan hız limitlerine kendisi tabi değildir.
