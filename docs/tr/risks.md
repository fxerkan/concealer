---
title: Riskler
layout: default
nav_exclude: true
---

# Riskler
{: .no_toc }

Zayıf, bayat, yeniden kullanılan ve sızmış secret'ları bulun — bir sağlık genel bakışı ve **hiçbir secret değerini hiçbir yere göndermeyen**, isteğe bağlı çevrimiçi/çevrimdışı maruz kalma kontrolleri.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

**Riskler** sekmesinin dört alt görünümü vardır: **Genel bakış**, **Yeniden kullanım**, **Shell history** ve **Maruz kalma**.

![Riskler — sağlık genel bakışı]({{ site.baseurl }}/assets/app-risks.png)

---

## Genel bakış

Üzerinde işlem yapmaya değer secret'ları öne çıkaran bir sağlık panosu (`GET /api/health`): **Süresi geçmiş**, **Süresi dolmak üzere**, **Rotate gecikmiş**, **Yüksek risk (yeniden kullanım)** ve **En çok kullanılan**. Her kayıt ne kadar geciktiğini gösterir (örn. *5 gün önce doldu*, *12 gün gecikmiş*). Bir satıra tıklayıp o secret'ın düzenleyicisini açın.

---

## Yeniden kullanım

Aynı secret **değerini** birden fazla kaydın kullandığını bulur ve patlama yarıçapını puanlar — o değer sızarsa, onu paylaşan her şey aynı anda açığa çıkar (`GET /api/leaks`). Paylaşılan değeri göründüğü her yerde rotate edin ya da servis-başına ayrı kimlik bilgilerine bölün.

![Yeniden kullanım — paylaşılan secret'lar patlama yarıçapına göre puanlanır]({{ site.baseurl }}/assets/app-risks-reused.png)

---

## Shell history

Shell geçmişinizi (`GET /api/history`) `bash`/`zsh`/`fish` geçmişine açık şekilde yazılmış secret/kimlik bilgisi değerleri için tarar. Vault'a ait olanları içe aktarın, sonra geçmişten temizleyin. Ayrıca [Web Arayüzü]({{ site.baseurl }}/tr/web-ui) sayfasındaki **Klasör tara**'ya bakın (ve canlı ortam / shell-profil değişkenlerini taramak için `scan --envvars`).

![Shell history — açık şekilde yazılmış secret'lar]({{ site.baseurl }}/assets/app-risks-shell-history.png)

---

## Maruz kalma

*"Bu secret bir yerde sızmış ya da commit'lenmiş mi"* sorusunu yanıtlar — isteğe bağlıdır ve bir secret değeri **asla** üçüncü bir tarafa açılmayacak şekilde tasarlanmıştır.

![Maruz kalma — çevrimiçi sızıntı kontrolü, e-posta ihlali ve git/log taraması]({{ site.baseurl }}/assets/app-risks-exposure.png)

### Çevrimiçi sızıntı kontrolü

Her yüksek-entropili secret değerini **HIBP Pwned Passwords**'a karşı **k-anonimlik** ile kontrol eder: değerin SHA-1'inin yalnızca ilk 5 hex karakteri makineden çıkar; tam-hash karşılaştırması yerel yapılır. **Değer ve tam hash'i kutuyu asla terk etmez.**

- Önce hedefi tenant / project / environment / repo / collection / tag filtreleriyle daraltın, sonra belirli kayıtları seçin (boş = kapsamdaki tümü).
- Sonuçlar ihlal sayısını, **CWE** referanslarını (798 gömülü kimlik bilgileri, 259, 321, …) ve token türüne göre keyhacks tarzı bir doğrulama ipucunu gösterir. Bir satıra tıklayıp düzenleyicisini açın.
- CLI: `concealer expose`.

{: .note }
> Yalnızca kısa bir SHA-1 öneki iletilir ve yalnızca **Sızıntı tara**'ya tıkladığınızda / `expose` çalıştırdığınızda. Varsayılan olarak kapalıdır.

### E-posta ihlali kontrolü

Bir e-postayı **HIBP hesap ihlallerine** karşı sorgular (`POST /api/breach`). concealer'ın vault'tan çıkardığı adreslerden seçin (yalnızca secret olmayan alanlardan — `url`, `notes`, `username` gibi düz-metin alanlar; maskeli secret değerleri asla taranmaz). Kendi HIBP API anahtarınızı gerektirir (**Ayarlar → HIBP API anahtarı**, `0600` config'te saklanır, asla döndürülmez — yalnızca e-posta gönderilir). Anahtar olmadan manuel HIBP sayfasına bağlanır.

### Git geçmişi, izlenen dosyalar & loglar

Salt-okunur tarama (`POST /api/gitscan`, CLI `gitscan`) şu secret'ları bulur:

- **git geçmişinde commit'lenmiş** (vault değerlerinizde pickaxe `git log -S` — kesin, yerel),
- **izlenen dosyalarda** (`git grep` token desenleri) veya **log dosyalarında** bulunan, ve
- **`.gitignore` / `.claudeignore`'da eksik** secret içeren dosyalar.

**Temizlik kılavuzunu göster** repo/dosya/secret'lara göre uyarlanmış bir düzeltme belgesi üretir (önce-rotate, `git rm --cached`, `git filter-repo` / BFG, force-push koordinasyonu, pre-commit tarayıcılar), blok-başına kopyala düğmeleriyle. **concealer geçmişi yeniden yazan komutları asla çalıştırmaz** — yalnızca çalıştırmanız için adımları yazar.

---

## JSON API

| Metod & yol | Amaç |
|---|---|
| `GET /api/health` | rotation / expiry / yeniden kullanım / kullanım sağlık genel bakışı |
| `GET /api/leaks` | yeniden kullanılan-değer risk raporu |
| `GET /api/history` | shell-history secret taraması |
| `POST /api/exposure` | çevrimiçi sızıntı kontrolü (k-anonimlik); `ids` tam kayıtları seçer |
| `POST /api/breach` | bir e-posta için HIBP hesap ihlali sorgusu |
| `POST /api/gitscan` | git geçmişi / izlenen-dosyalar / loglar / .gitignore taraması |
| `POST /api/gitremedy` | geçmiş-temizleme kılavuzunu üret |

{: .note }
> Tüm maruz kalma kontrolleri **insan sahibinin** araçlarıdır (master parola ile açılır) ve isteğe bağlıdır — siz Tara'ya tıklayana dek hiçbir şey çalışmaz.
