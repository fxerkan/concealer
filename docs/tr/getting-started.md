---
title: Başlarken
layout: default
nav_exclude: true
---

# Başlarken
{: .no_toc }

concealer'ı kurun, kasanızı oluşturun, ilk secret'ınızı saklayın ve kullanın — yaklaşık beş dakikada.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

## 1. Kurulum

```bash
# Homebrew (recommended) — pulls in sops, age and expect automatically
brew install fxerkan/tap/concealer
```

Ya da tek betiği doğrudan çalıştırın (PATH üzerinde `python3`, `sops`, `age`, `expect` gerekir). Manuel yol ve bağımlılık ayrıntıları için [Kurulum]({{ site.baseurl }}/tr/installation) sayfasına bakın.

Doğrulayın:

```bash
concealer version        # concealer 0.8.0
cer version              # `cer` is the short alias for `concealer`
```

---

## 2. Kasayı başlatın

```bash
concealer init
```

`init`, age anahtarını üretir, sizden bir **master password** belirlemenizi ister ve ardından **bir kez** şunları yazdırır:

- **8 adet tek kullanımlık kurtarma kodu** — bunları *başka bir yerde* saklayın (parola yöneticisi, kağıt). Master password'ü unutursanız herhangi biri kasayı kurtarır.
- Bir başlangıç `export CONCEALER_TOKEN=…` satırı — her komutta parolayı yeniden yazmamanız için süresi sınırlı bir CLI token'ı.

`init` sonrasında düz metin age anahtarı diskten kaldırılır — geriye yalnızca şifrelenmiş, parolayla sarmalanmış kopyalar kalır (**key-at-rest**). Kasa klasörünü kopyalamak, parolanız veya bir kurtarma kodunuz olmadan saldırgana hiçbir şey kazandırmaz.

{: .warning }
> Master password ve kurtarma kodları **bir kez** gösterilir ve asla düz metin olarak saklanmaz. Hepsini kaybederseniz kasa kurtarılamaz — amaç da budur.

---

## 3. Shell oturumunuzun kilidini açın

Secret'lara dokunan CLI komutları ortamınızda bir unlock token'ına ihtiyaç duyar. Ya `init`'in yazdırdığı satırı yapıştırın ya da yeni bir tane üretin:

```bash
eval "$(cer unlock)"           # asks the master password, exports CONCEALER_TOKEN (~8h TTL)
```

{: .note }
> Buradan itibaren kısa takma ad **`cer`** (concealer'a bir symlink) kullanıyoruz — her komut iki isim altında da çalışır. Hangisini isterseniz seçin.

Token değeri **yalnızca** shell ortamınızda (`CONCEALER_TOKEN`) yaşar. Kasa sadece onun hash'ini saklar. [Token'lar ve Kurtarma]({{ site.baseurl }}/tr/tokens-recovery) sayfasına bakın.

---

## 4. İlk secret'ınızı saklayın

```bash
# a simple API key (type defaults to api_key)
cer set --name OPENAI_API_KEY --project web --env prod 'sk-DUMMY-123' --tags ai

# a typed database secret (fields as key=value pairs)
cer set --name MAIN_DB --type database --tenant acme --project billing --env prod \
    host=db.acme.io port=5432 database=billing username=svc password=sk-DUMMY-pw auth_type=password
```

Her secret bir **scope** taşır — `tenant / project / environment / repo`. Boş boyutlar joker karakter gibi davranır. [Kavramlar → Scope'lar]({{ site.baseurl }}/tr/concepts#scopes--inheritance) sayfasına bakın.

---

## 5. Bul, oku, kullan

```bash
cer list --type database --tenant acme      # masked table
cer search OPENAI                            # search all fields
cer get --name OPENAI_API_KEY --project web --env prod   # print the value (audited)

# inject secrets into a command's environment and run it — no value leaks to the terminal
cer run --project web --env prod npm run deploy
```

`run`, siz belirtmediğinizde geçerli git repo'sundan `repo` ve `project`'i otomatik algılar, ardından en spesifik eşleşen secret'ları ortam değişkenleri olarak enjekte eder.

---

## 6. Web UI'ı açın

```bash
cer web        # http://127.0.0.1:8787 (localhost only) — unlock with the master password
```

Tür duyarlı formlar, aranabilir çoklu seçim filtreleri, secret başına deploy renderer'ları, otomatik temizlemeli panoya kopyalama ve kurcalamayı belli eden bir denetim günlüğü görüntüleyici ile tam CRUD. [Web UI]({{ site.baseurl }}/tr/web-ui) sayfasına bakın.

---

## 7. Bir AI ajanının secret'ları kullanmasını sağlayın (onları görmeden)

```bash
cer agent register claude                # prints a CONCEALER_TOKEN for this agent
claude mcp add --scope user concealer \
  --env CONCEALER_TOKEN=<token-from-above> \
  -- /path/to/concealer/concealer mcp
```

Ajan artık MCP üzerinden `list_secrets`, `search_secrets`, `run_with_secrets` ve `set_secret` yapabilir — ancak düz metin değerler gördüğü her şeyden **redakte edilir**. [MCP]({{ site.baseurl }}/tr/mcp) sayfasına bakın.

---

## Sonraki adımlar

- [CLI Referansı]({{ site.baseurl }}/tr/cli-reference) — her komut ve bayrak
- [Güvenlik Modeli]({{ site.baseurl }}/tr/security) — neyin neyi koruduğu ve dürüst sınırlar
- [Taşınabilirlik ve Yedekleme]({{ site.baseurl }}/tr/portability) — başka bir makineye güvenle taşıyın
