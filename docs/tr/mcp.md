---
title: AI Ajanları için MCP
layout: default
nav_exclude: true
---

# AI Ajanları için MCP
{: .no_toc }

concealer, AI ajanlarının secret'ları hiç **görmeden** **kullanabilmesi** için bir MCP stdio sunucusu ile birlikte gelir. Ajan, isimleri listeleyebilir ve değerleri bir komutun ortamına enjekte edebilir — plaintext değerler, okuduğu her şeyden ayıklanır.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

**Ajanlar secret isimlerini listeler — değerler gizli kalır:**

![Bir ajan MCP üzerinden concealer secret'larını listeliyor — yalnızca isimler ve scope'lar, asla değerler]({{ site.baseurl }}/assets/mcp-secret-list.gif)

**Ve bir secret'ı hiç görmeden kullanır** (burada, bir Home Assistant token'ı enjekte ediliyor — ajanın bağlamından ayıklanmış):

![Claude Code, concealer MCP üzerinden bir Home Assistant token'ı enjekte ediyor — değer ayıklanmış]({{ site.baseurl }}/assets/demo-ha-token.gif)

---

## Bir ajan kaydedin, ardından bağlayın

Sertleştirilmiş (anahtarı diskte şifreli) bir kasada MCP sunucusu kilidi bir **token** ile açar; bu yüzden ona parolanız yerine bir ajan token'ı verin. Asla soru sormaz ve istediğiniz zaman iptal edebilirsiniz.

```bash
concealer agent register claude          # prompts master pw, prints a CONCEALER_TOKEN
```

Sunucuyu, o token'ı ortamına ekleyerek ajanınızın yapılandırmasına ekleyin. Örnek (Claude Code):

```bash
claude mcp add --scope user concealer \
  --env CONCEALER_TOKEN=<token-from-above> \
  -- /path/to/concealer/concealer mcp
```

Veya bir `.mcp.json` / istemci yapılandırmasında:

```json
{
  "mcpServers": {
    "concealer": {
      "command": "/path/to/concealer/concealer",
      "args": ["mcp"],
      "env": { "CONCEALER_TOKEN": "<token-from-above>" }
    }
  }
}
```

İstediğiniz zaman iptal edin:

```bash
concealer agent revoke claude        # or `all`
```

---

## Kayıt zorunludur (fail-closed)

Sunucu, token'ı bir **kayıtlı ajan** olmayan (`source == "agent"`) **her** çağrıyı reddeder. Bir insan/CLI token'ı ya da hiç token yoksa *erişim reddedilir* — hiçbir secret sızmaz. Sertleştirilmiş bir kasada geçerli bir token olmadan sunucu fail-closed davranır.

Her MCP çağrısı, audit log'a `source = mcp` ve `actor = <agent label>` ile yazılır.

---

## Ajana sunulan araçlar

### `list_secrets`
Secret'ları scope / tag / tür'e göre listeler. **Asla değer döndürmez.**

| Param | Type | Notes |
|---|---|---|
| `tenant` / `project` / `environment` / `repo` | string | scope filtreleri (isteğe bağlı) |
| `tag` | string | tag'e göre filtreler |
| `type` | string | türe göre filtreler |

### `search_secrets`
İsim / scope / tag / url / notlar içinde arar. **Asla değer döndürmez.**

| Param | Type | Notes |
|---|---|---|
| `term` | string | **zorunlu** — arama dizesi |

### `run_with_secrets`
Eşleşen secret'lar ortamına enjekte edilmiş bir komut çalıştırır. **Değerler**, döndürülen çıktıdan **ayıklanır**.

| Param | Type | Notes |
|---|---|---|
| `command` | string | **zorunlu** — çalıştırılacak kabuk komutu (`/bin/sh -c`) |
| `tenant` / `project` / `environment` / `repo` | string | scope; atlanırsa `repo`/`project` git deposundan otomatik algılanır |

Ajan, bir sorgu çalıştırmak için bir DB parolası kullanabilir — parola asla bağlamında görünmez.

### `set_secret`
Bir secret oluşturur veya günceller. Bir değer **yazar** ama asla döndürmez. Aynı isim+scope yerinde güncellenir.

| Param | Type | Notes |
|---|---|---|
| `name` | string | **zorunlu** |
| `type` | string | varsayılan `api_key` |
| `value` | string | `value` alanı için kısayol |
| `fields` | object | tipli secret'lar için `{field: value}` haritası |
| `tenant` / `project` / `environment` / `repo` | string | scope |
| `tags` | string[] | tag'ler |
| `url` / `notes` | string | meta veri |
| `actor` | string | kendinizi tanımlayın; audit'e kaydedilir (`source=mcp`) |

Sızmış bir secret değerine benzeyen alan isimleri reddedilir.

---

## Toplu-sızdırmaya-karşı limitler

`list_secrets` ve `search_secrets` sonuçları, ajan-başına bir **hız kapısından** geçer; böylece ele geçirilmiş ya da aşırı hevesli bir ajan tüm kasayı dışarı dökemez. İki limit vardır (ajan başına, varsayılanlar gösterilmiştir):

| Limit | Default | Meaning |
|---|---|---|
| `per_call` | 10 | tek yanıtta döndürülen maksimum satır |
| `window_quota` | 25 | kayan pencerede açığa çıkan maksimum **farklı secret ismi** (list + search birlikte) |
| `window_sec` | 3600 | kayan pencerenin uzunluğu, saniye cinsinden |

- Zaten açıklanmış isimler **ücretsiz** yeniden listelenir (idempotent) — `window_quota == 0` olmadıkça; bu bir tam bloktur.
- Bir değeri okumak (`get` / MCP görüntüleme) de farklı-isim kotasına sayılır, dolayısıyla get-döngüleri de kısıtlanır.
- Durum, `keys/ratestate.json` içinde yaşar (git tarafından yok sayılır; yalnızca isimler + zaman damgaları, asla değerler) böylece bir MCP yeniden başlatmasından sağ çıkar.

Varsayılanları düzenleyin ya da web **Ayarlar** sayfasında **ajan-başına geçersiz kılmalar** ayarlayın (`GET/POST /api/settings`). Limitler yalnızca MCP için geçerlidir — web arayüzü insan sahibidir ve muaftır.

---

## Ajanın görebildiği ve göremediği

| Görebilir | Göremez |
|---|---|
| Secret **isimlerini**, türlerini, scope'larını, tag'lerini listeleme | Herhangi bir secret **değerini** görme |
| Bir secret'ı *kullanan* bir komut çalıştırma | Değeri komut çıktısından okuma (ayıklanmış) |
| İsimle secret oluşturma/güncelleme | Az önce yazdığı bir değeri geri alma |

Kayıt + hız kapısı + ayıklama birlikte, bir ajanın secret'ların bir *kullanıcısı* olduğu, asla bir okuyucusu olmadığı anlamına gelir.
