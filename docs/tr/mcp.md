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

**Nasıl çalışır — değer, ajanın context'ine hiç girmez:**

![concealer MCP akışı — ajan isimleri listeler, sonra adlandırılmış bir secret'ı bir alt sürece enjekte ederek komutu çalıştırır; değer context'in dışında kalır ve çıktı maskelenmiş döner]({{ site.baseurl }}/assets/concealer-mcp-flow.png)

**Ajanlar secret isimlerini listeler — değerler gizli kalır:**

![Bir ajan MCP üzerinden concealer secret'larını listeliyor — yalnızca isimler ve scope'lar, asla değerler]({{ site.baseurl }}/assets/mcp-secret-list.gif)

**Ve bir secret'ı hiç görmeden kullanır** (burada, bir Home Assistant token'ı enjekte ediliyor — ajanın bağlamından ayıklanmış):

![Claude Code, concealer MCP üzerinden bir Home Assistant token'ı enjekte ediyor — değer ayıklanmış]({{ site.baseurl }}/assets/demo-ha-token.gif)

---

## Bir ajan kaydedin, ardından bağlayın

Kurulum **her** MCP-uyumlu ajan için aynıdır — Claude Code, Codex, Gemini CLI, opencode, Cursor, Cline, Continue veya DeepSeek tabanlı bir istemci. İki adım:

1. **Token üretin — ajan başına bir kez.** Sertleştirilmiş (anahtarı diskte şifreli) bir kasada MCP sunucusu kilidi parolanız yerine bir **token** ile açar. Asla soru sormaz ve istediğiniz zaman iptal edebilirsiniz. Audit log'un çağrıları doğru aktöre yazması ve her birini ayrı ayrı iptal edebilmeniz için **her araç için ayrı bir ajan** kaydedin.

   ```bash
   concealer agent register claude
   ```

   Bir kez master parolanızı sorar, ardından bir `export CONCEALER_TOKEN=…` satırı yazdırır. O token'ı kopyalayın — aşağıda `<token>` yerine yapıştıracaksınız.

2. **concealer'ı bir stdio MCP sunucusu olarak ekleyin** — token'ı ortamında olacak şekilde ajanınızın yapılandırmasına. Ajanınızı seçin:

> Örnekler `concealer`'ı `PATH`'inizden çağırır (Homebrew kurulumu). Ajanınız kabuk `PATH`'inizi devralmıyorsa mutlak yolu kullanın — örn. `/opt/homebrew/bin/concealer`.

### Claude Code

```bash
claude mcp add --scope user concealer --env CONCEALER_TOKEN=<token> -- concealer mcp
```

### Codex CLI

```bash
codex mcp add concealer --env CONCEALER_TOKEN=<token> -- concealer mcp
```

Eşdeğer olarak, `~/.codex/config.toml` içinde:

```toml
[mcp_servers.concealer]
command = "concealer"
args = ["mcp"]
env = { CONCEALER_TOKEN = "<token>" }
```

### Gemini CLI

```bash
gemini mcp add --scope user -e CONCEALER_TOKEN=<token> concealer concealer mcp
```

### opencode

opencode'un `mcp add` komutu yalnızca **uzak** (`--url`) sunucu kaydeder — yerel bir komut alamaz, bu yüzden stdio sunucusunu yapılandırma dosyanıza `~/.config/opencode/opencode.jsonc` ekleyin:

```jsonc
{
  "mcp": {
    "concealer": {
      "type": "local",
      "command": ["concealer", "mcp"],
      "enabled": true,
      "env": { "CONCEALER_TOKEN": "<token>" }
    }
  }
}
```

`opencode mcp list` ile doğrulayın — concealer `✓ connected` görünmeli.

### Cursor / Cline / Continue / DeepSeek ve diğer MCP istemcileri

DeepSeek bir **modeldir**, ajan değil — herhangi bir MCP-uyumlu istemcinin içinde çalıştırın. Bu istemcilerin hepsi aynı stdio-sunucu JSON'unu okur. Bunu istemcinin MCP yapılandırmasına ekleyin (`.mcp.json`, `~/.cursor/mcp.json`, Cline/Continue ayarları vb.):

```json
{
  "mcpServers": {
    "concealer": {
      "command": "concealer",
      "args": ["mcp"],
      "env": { "CONCEALER_TOKEN": "<token>" }
    }
  }
}
```

### İptal

Tek bir ajanı ya da tüm token'ları istediğiniz zaman iptal edin:

```bash
concealer agent revoke claude
```

```bash
concealer agent revoke all
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
