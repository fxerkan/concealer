---
title: Secret Türleri
layout: default
nav_exclude: true
---

# Secret Türleri
{: .no_toc }

Her tür, yalnızca anlamlı olan alanları içeren, türe duyarlı bir form sunar. **secret** olarak işaretlenen alanlar maskelenmiş şekilde saklanır ve yalnızca talep üzerine (denetlenerek) açığa çıkarılır. Düz alanlar (host, url, username…) okunabilir kalır ve isteğe bağlı tablo sütunlarına dönüşebilir.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

## Alan kataloğu

Secret alanlar 🔒 ile işaretlenir; düz alanlar olduğu gibi gösterilir.

| Tür | Alanlar |
|------|--------|
| `api_key` *(varsayılan)* | 🔒`value` |
| `access_token` | 🔒`token` · 🔒`refresh_token` · `expires` · `scopes` |
| `oauth` | `client_id` · 🔒`client_secret` · `auth_url` · `token_url` · `scopes` |
| `jwt` | 🔒`token` · `issuer` · `audience` · `expires` |
| `ssh_key` | 🔒`private_key` · `public_key` · 🔒`passphrase` · `host` · `user` |
| `certificate` | `certificate` · 🔒`private_key` · `chain` · `expires` |
| `database` | `host` · `port` · `database` · `schema` · `username` · 🔒`password` · `auth_type` · 🔒`jdbc_url` |
| `server` | `host` · `port` · `username` · 🔒`password` · 🔒`ssh_key` |
| `website` | `web_url` · `username` · 🔒`password` |
| `login` | `web_url` · `username` · 🔒`password` · 🔒`totp` |
| `pin` | 🔒`pin` · `label` |
| `wifi` | `ssid` · 🔒`password` · `security` |
| `membership` | `provider` · `member_id` · 🔒`password` |
| `secure_note` | 🔒`note` |
| `custom` | tanımladığınız herhangi bir anahtar/değer |

`jdbc_url` secret olarak ele alınır çünkü bir bağlantı dizesi (connection string) gömülü kimlik bilgileri taşır.

Her tür, tam olarak ihtiyaç duyduğu girdileri sunar — bir bulut kimlik bilgisi kendi client/secret/URL değerlerini, bir veritabanı kendi host/port/user/password değerlerini, bir web sitesi kendi URL/login bilgilerini taşır ve `custom` serbest biçimli herhangi bir anahtar/değeri taşır:

![Bulut kimlik bilgisi formu]({{ site.baseurl }}/assets/secrets-cloud.png)
![Veritabanı secret formu]({{ site.baseurl }}/assets/secrets-db.png)
![Web sitesi login formu]({{ site.baseurl }}/assets/secrets-web.png)
![Özel anahtar/değer secret formu]({{ site.baseurl }}/assets/secrets-custom.png)

---

## Tasarım gereği PII yok

Kredi kartı, pasaport veya kimlik numarası türleri kasıtlı olarak **yoktur**. Bu kasa **makine ve hesap kimlik bilgileri** içindir, kimlik belgeleri için değil.

---

## Maskeleme nasıl belirlenir

Bir alan, aşağıdakilerden **herhangi biri** geçerliyse (sırayla kontrol edilir) secret olarak ele alınır:

1. **Kayıt bazında geçersiz kılma** — `field_meta[field].secret`. `secret: false` ayarlamak, template gereği secret olan bir alanı düz olarak sunmaya zorlamanın tek yoludur.
2. **Tür template'i** — yukarıdaki tablodaki 🔒 işaretleri.
3. **Alan adı sezgiseli** — ad şu kalıba uyar: `pass | secret | token | value | key | credential | apikey`.
4. **Değer sezgiseli** — değer, `scheme://user:pass@host` gibi gömülü kimlik bilgileri içerir (DSN'ler, `jdbc_url`, `redis://:pw@…`), aksi halde düz olan bir alanda bile.

Maskeleme stili: `field_meta[field].mask == "full"` ise `••••••••` gösterilir; aksi halde kısmi maskeleme ilk 4 ve son 2 karakteri gösterir (`abcd…yz`).

---

## Türlü secret'ları CLI'dan ayarlama

`field=value` çiftleri geçin; salt değer biçimi yalnızca `api_key` gibi tek değerli türler içindir.

```bash
# api_key — salt değer
concealer set --name OPENAI_API_KEY --project web sk-DUMMY-123

# database — field=value çiftleri
concealer set --name pg --type database --project web --env prod \
    host=db.local port=5432 database=app schema=public \
    username=app password=sk-DUMMY-pw auth_type=password

# custom — istediğiniz anahtarlar
concealer set --name webhook --type custom --project web \
    url=https://hooks.example/abc signing_secret=sk-DUMMY-sig
```

Bunlar `run` / `run_with_secrets` aracılığıyla enjekte edildiğinde, türlü bir secret alan başına ortam değişkenlerine dönüşür: `PG_HOST`, `PG_PORT`, `PG_PASSWORD`, … (alan adı büyük harfe çevrilir ve secret adıyla ön eklenir). Bir `api_key` tek bir `OPENAI_API_KEY=…` olarak enjekte edilir.
