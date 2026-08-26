---
title: CLI Referansı
layout: default
nav_exclude: true
---

# CLI Referansı
{: .no_toc }

Her komut, parametreleriyle birlikte. `cer`, `concealer` için kısa takma addır — her iki ad da aynı şekilde çalışır.
{: .fs-5 .fw-300 }

```
concealer <command> [options]          # short: cer <command>
```

Çoğu komut bir **kapsam (scope)** kabul eder: `--tenant T  --project P  --env E  --repo R`. Atlanan bir boyut bir joker karakterdir.

1. TOC
{:toc}

---

## Ortak seçenekler

| Bayrak | Uygulandığı yer | Anlamı |
|---|---|---|
| `--tenant <T>` | çoğu | tenant boyutu |
| `--project <P>` | çoğu | project boyutu |
| `--env <E>` | çoğu | environment boyutu |
| `--repo <R>` | çoğu | repo boyutu |
| `--name <N>` | get/set/rm/rotate/list | secret adı |
| `--type <T>` | list/set | secret türü (bkz. [türler]({{ site.baseurl }}/tr/secret-types)) |
| `--tag <X>` | list | tek bir tag'e göre filtrele |
| `--tags a,b` | set | atanacak virgülle ayrılmış tag'ler |

Kapsam bayrakları, verilen boyutlarda tam eşleşme ile kayıtları seçer. Tek bir değeri değiştiren veya okuyan komutlar (`get`, `rm`, `rotate`), kapsamın **tam olarak bir** kayıtla eşleşmesini gerektirir, aksi hâlde bir "disambiguate" (belirsizliği giderme) hatasıyla iptal olurlar.

---

# Kasa ve anahtar yönetimi

## init

```bash
concealer init [--force]
```

Yeni bir kasa kurar: age anahtarını üretir, master password'ü ayarlamanızı ister, **8 tek kullanımlık kurtarma kodu** ve bir başlangıç `CONCEALER_TOKEN` yazdırır, ardından düz metin age anahtarını diskten kaldırır (key-at-rest).

| Seçenek | Anlamı |
|---|---|
| `--force` | mevcut bir kasanın üzerine yeniden başlat (yıkıcı) |

## unlock

```bash
eval "$(concealer unlock)"
```

Master password aracılığıyla bir insan için **zaman-sınırlı** bir token üretir. Bir `export CONCEALER_TOKEN=…` satırı yazdırır (~8s TTL). Mevcut kabuğunuza yüklemek için `eval "$(...)"` ile sarmalayın.

## harden

```bash
concealer harden
```

Eski düz metin anahtarlı bir kasayı key-at-rest modeline taşır: `keys/age-key.txt`'yi kaldırır (yalnızca şifreli yedek kalır), `.gitignore`'u tamamlar ve yeni bir CLI token'ı yazdırır. Master password'ü ister. Zaten sağlamlaştırılmışsa hiçbir şey yapmaz.

## passwd

```bash
concealer passwd
```

Master password'ü değiştirir. **Mevcut şifreyi** *ve* bir **kurtarma kodunu** gerektirir (ikinci faktör olarak tüketilir). Çalınmış bir master password tek başına anahtarı döndüremez.

## recover

```bash
concealer recover
```

Master password'ü mü unuttunuz? Bir **kurtarma kodu** ister, erişimi geri yükler ve yeni bir master password ayarlar.

## recovery

```bash
concealer recovery
```

Kurtarma kodu kümesini yeniden oluşturur (master password gerekir). 8 tek kullanımlık kodun yeni bir grubunu yazdırır; eski kodlar çalışmayı durdurur.

## agent

```bash
concealer agent register <name>
concealer agent list
concealer agent revoke <name|all>
```

Yapay zeka agent'ları (MCP) için uzun ömürlü, iptal edilebilir token'ları yönetir. Bkz. [Token'lar ve Kurtarma]({{ site.baseurl }}/tr/tokens-recovery) ve [MCP]({{ site.baseurl }}/tr/mcp).

| Alt komut | Anlamı |
|---|---|
| `register <name>` | master password'ü ister, süresi dolmayan iptal edilebilir bir token üretir, MCP sunucusu için `CONCEALER_TOKEN` env parçacığını yazdırır |
| `list` | token'ları gösterir: etiket, kaynak (`cli`/`agent`), son kullanma veya `revoked`, oluşturulma zaman damgası |
| `revoke <name>` | etikete göre bir token'ı iptal eder; `all` her token'ı iptal eder |

---

# Secret'lar

## set / add

```bash
concealer set --name N [--type T] [scope] [--tags a,b] <value | key=value ...>
```

Bir secret oluşturur veya günceller. `add`, `set` için bir takma addır. Aynı ad + kapsama sahip bir kayıt varsa, alanları **birleştirilir/güncellenir**; aksi hâlde yeni bir kayıt oluşturulur.

| Argüman | Anlamı |
|---|---|
| `--name N` | **zorunlu** — secret adı |
| `--type T` | secret türü; varsayılan `api_key` |
| `--tags a,b` | virgülle ayrılmış tag'ler (güncellemede mevcut tag'lerin yerini alır) |
| `<value>` | tek değerli bir tür için: çıplak değer → `value` alanı olarak saklanır |
| `key=value …` | tipli secret'lar için: bir veya daha fazla `field=value` çifti |
| scope bayrakları | `--tenant/--project/--env/--repo` |

*Sızmış bir secret değeri* gibi görünen alan adları (ait olmadıkları yerdeki secret-adı sezgiseliyle eşleşen) bir hatayla reddedilir.

```bash
concealer set --name OPENAI_API_KEY --project web --env prod 'sk-DUMMY-123' --tags ai
concealer set --name pg --type database --project web \
    host=db.local port=5432 database=app username=app password=sk-DUMMY-pw
```

## get

```bash
concealer get --name N [scope]
```

Secret değer(ler)ini yazdırır. **Tam olarak bir** kayıtla eşleşmelidir. `api_key` için çıplak değeri yazdırır; tipli secret'lar için `field=value` satırlarını yazdırır. Okuma, agent erişim kotasına sayılır ve audit log'a yazılır.

## list

```bash
concealer list [term] [scope] [--tag X] [--type T]
```

Eşleşen kayıtları maskeli bir tablo olarak listeler (`name  type  tenant  project  env  repo  tags`). İsteğe bağlı çıplak bir `term`, alanlar arasında alt dize (substring) ile filtreler.

| Seçenek | Anlamı |
|---|---|
| `[term]` | isteğe bağlı serbest metin filtresi |
| `--tag X` | tek bir tag'e göre filtrele |
| `--type T` | türe göre filtrele |
| scope bayrakları | boyuta göre daralt |

## search

```bash
concealer search <term>
```

`term` için **tüm alanlarda** (ad, kapsam, tag'ler, url, notlar) arama yapar. Değerler maskeli kalır.

## rm

```bash
concealer rm --name N [scope]
```

Bir kaydı siler. **Tam olarak bir** kayıtla eşleşmelidir.

## rotate

```bash
concealer rotate --name N [scope] [new-value]
```

Eşleşen bir secret'ın `value` değerini döndürür. `new-value` geçmezseniz, kriptografik olarak rastgele 32 baytlık URL-güvenli bir token üretilir. Tam olarak bir kayıtla eşleşmelidir; yeni değeri **maskeli** olarak yazdırır.

## dims

```bash
concealer dims
```

Kullanımda olan farklı kapsam değerlerini gösterir (kasa genelindeki tüm `tenant`, `project`, `environment`, `repo` değerleri). Nesneleri nasıl kapsamlandırdığınızı keşfetmek için kullanışlıdır.

## leaks

```bash
concealer leaks
```

**Yeniden kullanılan (paylaşılan) secret değerlerini** bulur — aynı düz metin değerin birden fazla ad/kapsam altında saklanması — ve patlama yarıçapını (blast radius) puanlar (önem derecesi, sayı, etkilenen projeler ve ortamlar). Değerler maskeli gösterilir.

## history

```bash
concealer history [--purge]
```

Geride bırakılmış secret'lar için **kabuk geçmişi (shell history)** dosyalarınızı tarar (nedenleriyle birlikte). Varsayılan olarak dry-run (deneme çalışması).

| Seçenek | Anlamı |
|---|---|
| `--purge` | sorunlu satırları siler (önce bir `*.concealer.bak` yedeği yazar) |

Bir purge sonrasında, bellekteki geçmişin geri yazılmaması için açık kabuklarda `history -c` çalıştırın.

---

# Tarama · dağıtım · çalıştırma

## scan

```bash
concealer scan [<folder>] [--import] [--history] [--envvars] [scope]
```

Bir klasörün `.env`/config dosyalarından (ve isteğe bağlı olarak shell geçmişi / ortam değişkenlerinden) aday secret'ları çıkarır, ardından isteğe bağlı olarak bunları kaynağa göre tag'lenmiş şekilde kasaya aktarır. Varsayılan olarak dry-run. `--history` veya `--envvars` verildiğinde `<folder>` isteğe bağlıdır.

| Seçenek | Anlamı |
|---|---|
| `<folder>` | taranacak dizin (`--history`/`--envvars` verilirse isteğe bağlı) |
| `--import` | adayları gerçekten içe aktar (varsayılan dry-run'dır) |
| `--history` | shell geçmişini de tara |
| `--envvars` | canlı ortamı + shell-profil dosyalarını (`~/.bashrc`, `~/.zshrc`, `/etc/environment`, …) da tara; macOS + Linux |
| scope bayrakları | içe aktarımda atanacak kapsam; `project` varsayılan olarak klasörün temel adıdır (basename) |

```bash
concealer scan ./myrepo --history --import --project myrepo --env dev
```

## deploy

```bash
concealer deploy --target <t> [scope]
```

Eşleşen secret'ları stdout'ta bir dağıtım biçimine dönüştürür — hiçbir şey gönderilmez; çıktıyı istediğiniz yere yönlendirirsiniz (pipe).

| Seçenek | Anlamı |
|---|---|
| `--target <t>` | aşağıdaki hedeflerden biri; varsayılan `dotenv` |
| scope bayrakları | hangi secret'ların dönüştürüleceği |

**Hedefler:** `dotenv` · `export` · `docker` · `json` · `k8s` · `aws-secrets` · `aws-ssm` · `github`

```bash
concealer deploy --target dotenv --project web --env prod > .env
```

## run

```bash
concealer run [scope] <cmd...>
```

Eşleşen secret'ları bir alt ortama enjekte eder ve komutu **exec** eder. Değerler asla terminalde görünmez. Belirtilmeyen `repo`/`project`, mevcut git deposundan otomatik algılanır; en spesifik kapsam eşleşmesi kazanır.

- `api_key` secret'ları `NAME=value` olarak enjekte edilir.
- Tipli secret'lar alan başına `NAME_FIELD=value` olarak enjekte edilir (büyük harfli alan adı).

```bash
concealer run --project web --env prod npm run deploy
```

---

# Aktarım · audit · arayüzler

## export

```bash
concealer export [file]
```

Tüm kasanın **şifre-korumalı bir `.age` paketini** dışa aktarır. Onaylamak için master password'ü ister, ardından paketi yazar. Varsayılan dosya adı: `concealer-export-YYYY-MM-DD.age`.

## import

```bash
concealer import <bundle.age|.cerbak|.cer> [--mode=overwrite|skip|duplicate]
```

Bir paketi içe aktarır veya bir `.cerbak` yedeğini geri yükler (eski `.cer` dosyaları da geri yüklenir — içe aktarma uzantıdan bağımsızdır). Paket şifresini ister. Kaç kaydın eklendiğini / güncellendiğini / atlandığını raporlar.

| `--mode` | Zaten var olan bir kayıtta… |
|---|---|
| `overwrite` *(varsayılan)* | eşleşen kaydı güncelle (önceki davranış) |
| `skip` | mevcut kaydı olduğu gibi bırak |
| `duplicate` | gelen kaydı her zaman yeni bir id ile taze kopya olarak ekle |

## backup

```bash
concealer backup [--dir D]
```

Web **Ayarlar (Settings)** bölümünde yapılandırılan yedekleme şifresini kullanarak bir `.cer` kasa yedeği yazar (age ile sarmalanmış). cron / launchd için tasarlanmıştır. Anahtar erişimi `CONCEALER_TOKEN`'dan (veya bir TTY master-password isteminden) gelir.

| Seçenek | Anlamı |
|---|---|
| `--dir D` | yedekleme çıktı dizinini geçersiz kıl (ve kalıcı hâle getir) |

## audit

```bash
concealer audit
concealer audit verify
```

- `audit` — en son audit girdilerini yazdırır (`ts  source  action  key  [actor]  detail`).
- `audit verify` — HMAC zincirini yeniden hesaplar ve kuyruk sabit noktasını (anchor) kontrol eder; bütünlüğü raporlar.

## config

```bash
concealer config [key [val]]
```

Çalışma zamanı ayarlarını okur veya ayarlar.

| Biçim | Anlamı |
|---|---|
| `config` | tüm ayarları yazdır |
| `config <key>` | tek bir ayarı yazdır |
| `config <key> <val>` | bir ayarı ayarla ve kalıcı hâle getir |

Ayarlanabilir anahtarlar: `idle` (web boşta-kilitleme saniyesi, tam sayı), `confirm_ops` (onay gerektiren işlemlerin virgülle ayrılmış listesi).

## tui

```bash
concealer tui
```

Etkileşimli terminal arayüzü — gezinmek, aramak, ekleyip silmek ve secret'ları yerinde göstermek için ok tuşları.

## web

```bash
concealer web [port]
```

Web arayüzünü + JSON API'yi `http://127.0.0.1:<port>` üzerinde sunar (yalnızca localhost; varsayılan `8787`). Master password ile kilit açın. Bkz. [Web Arayüzü]({{ site.baseurl }}/tr/web-ui).

## mcp

```bash
CONCEALER_TOKEN=<agent-token> concealer mcp
```

Yapay zeka agent'ları için MCP stdio sunucusunu çalıştırır. `CONCEALER_TOKEN` içinde **kayıtlı bir agent** token'ı gerektirir; bir token olmadan fail-closed (kapalı hata) verir. Bkz. [MCP]({{ site.baseurl }}/tr/mcp).

## version / help

```bash
concealer version      # or --version, -v
concealer help         # or --help, -h, or no args
```

---

## Hızlı referans

```
VAULT / KEY     init [--force] · unlock · harden · passwd · recover · recovery
                agent register|list|revoke <name>
SECRETS         list · search · get · set/add · rm · rotate · dims · leaks · history [--purge]
SCAN / DEPLOY   scan <folder> [--import] [--history] · deploy --target <t> · run <cmd...>
TRANSFER/AUDIT  export [file] · import <bundle> · backup [--dir D] · audit [verify]
INTERFACE       config [key [val]] · tui · web [port] · mcp · version · help
```
