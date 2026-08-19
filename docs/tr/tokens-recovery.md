---
title: Token'lar & Kurtarma
layout: default
nav_exclude: true
---

# Token'lar, Kilit Açma & Kurtarma
{: .no_toc }

Her komutta master password'ü yeniden yazmadan kasanın kilidini nasıl açacağınız ve şifreyi unutursanız kasaya nasıl geri gireceğiniz.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

## Kilit açma token'ları

concealer, her işlemde master password sormak yerine **iptal edilebilir token'lar** kullanır. Token değeri **yalnızca** ortamınızda yaşar (`CONCEALER_TOKEN`); kasa yalnızca token'ın scrypt hash'ini ve age anahtarının token ile sarmalanmış bir kopyasını saklar. Token'ı iptal edin, o kopya işe yaramaz hale gelsin.

### İnsan kilidi (TTL token)

```bash
eval "$(concealer unlock)"      # master password → shell'inizde CONCEALER_TOKEN (~8s)
```

`unlock`, bir `export CONCEALER_TOKEN=…` satırı yazdırır; `eval "$(...)"` bunu mevcut shell'e yükler. Süresi dolduğunda `unlock`'u tekrar çalıştırın.

### Agent token'ı (uzun ömürlü, iptal edilebilir)

```bash
concealer agent register claude     # master password → MCP için süresiz, iptal edilebilir token
concealer agent list                # etiket · kaynak · süre/iptal · oluşturulma
concealer agent revoke claude       # birini iptal et (veya `all`)
```

Agent token'ları MCP sunucusunun ortamı içindir; böylece agent'lar hiçbir zaman bir şifre görmez. Bkz. [MCP]({{ site.baseurl }}/tr/mcp).

{: .note }
> Token'lar **bilinçli olarak makineye özeldir**. Kopyalanmış bir kasa klasörü, yeni makinede birisi master password'ü yazıp taze bir token üretene kadar atıldır.

---

## Kurtarma kodları

`concealer init`, **8 tek kullanımlık kurtarma kodu** yazdırır ve bunlar **yalnızca bir kez** gösterilir. Yalnızca bunların scrypt hash'i ve age anahtarının kodla sarmalanmış bir kopyası saklanır — kodların kendisi asla plaintext olarak kalıcı hale getirilmez.

Herhangi bir kod:

- master password'ü unutursanız **kasayı kurtarır**, ve
- `passwd` tarafından **ikinci faktör olarak gereklidir** (kullanımda tüketilir).

Bunları makineden ayrı bir yerde saklayın (bir password manager, basılı kağıt). Tüm seti şununla yeniden oluşturun:

```bash
concealer recovery      # mevcut master password'e ihtiyaç duyar; eski kodlar çalışmayı bırakır
```

---

## Master password'ü değiştirme

```bash
concealer passwd
```

**Mevcut şifreyi** *ve* bir **kurtarma kodunu** (tüketilir) ister. Bir kod gerektirmesi, master password'ünüzü öğrenen kişinin bile, başka bir yerde sakladığınız kodlardan biri olmadan kasayı ele geçiremeyeceği anlamına gelir. Kod mu kalmadı? Önce `concealer recovery` çalıştırın.

---

## Master password'ü mü unuttunuz?

```bash
concealer recover
```

Bir kurtarma kodu ister, erişimi geri yükler ve yeni bir master password ayarlar.

---

## Eski bir kasayı sağlamlaştırma

key-at-rest'ten önce oluşturulan kasalar diskte bir `0600 keys/age-key.txt` tutar. Plaintext anahtarın kaldırılması için bunları migrate edin:

```bash
concealer harden       # plaintext age anahtarını kaldırır, taze bir CLI token yazdırır
```

Sağlamlaştırmadan sonra age anahtarı diskte yalnızca password, kurtarma kodu ve token ile sarmalanmış biçimlerde bulunur. Bkz. [Kavramlar → Key-at-rest]({{ site.baseurl }}/tr/concepts#key-at-rest).

---

## Hızlı harita

| İstediğim… | Komut |
|---|---|
| Shell'imin kilidini bir süreliğine açmak | `eval "$(concealer unlock)"` |
| Bir agent'a erişim vermek | `concealer agent register <name>` |
| Token'ları görmek / iptal etmek | `concealer agent list` · `concealer agent revoke <name\|all>` |
| Şifremi değiştirmek | `concealer passwd` (bir kurtarma kodu gerektirir) |
| Şifremi unuttum | `concealer recover` |
| Yeni kurtarma kodları almak | `concealer recovery` |
| Eski bir plaintext anahtarı kaldırmak | `concealer harden` |
