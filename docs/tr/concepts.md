---
title: Kavramlar
layout: default
nav_exclude: true
---

# Kavramlar
{: .no_toc }

concealer'ın arkasındaki zihinsel model: kasa (vault) nasıl saklanır, kapsamlar nasıl çözümlenir, anahtar nasıl korunur ve audit log nasıl kurcalanmaya karşı kanıt sağlar.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

## Kasa (vault)

Kasa, `secrets.enc.yaml` konumunda bulunan **tek bir şifreli JSON dokümanıdır** (SOPS tarafından YAML olarak saklanır). Yapısı şöyledir:

```json
{ "secrets": [ { "id": "...", "name": "...", "type": "...",
                 "tenant": "", "project": "", "environment": "", "repo": "",
                 "tags": [], "url": "", "notes": "",
                 "fields": { "...": "..." },
                 "created": "...", "updated": "..." } ] }
```

Her işlem **yükle → dict'e çöz → değiştir → kaydet → yeniden şifrele** akışıdır. concealer her iki yön için de `sops` çağırır; age anahtarı `sops`'a **bellekte** (`SOPS_AGE_KEY`) verilir, asla bir geçici dosya aracılığıyla değil.

Bir kayıt yükleme sırasında normalize edilir (`norm()`), böylece eski/legacy kayıtlar şeffaf biçimde yükseltilir.

---

## Kapsamlar (scope) ve kalıtım

Her secret dört **kapsam boyutu** taşır:

```
tenant / project / environment / repo
```

- **Boş** bir boyut bir **joker karakterdir** (geniş çapta geçerli olan bir varsayılan).
- `run` / `run_with_secrets` üzerinde **en spesifik eşleşme kazanır**:
  `acme/proj-a/prod`, `proj-a`'yı geçersiz kılar, o da `global`'i geçersiz kılar.
- `run` üzerinde belirtilmeyen boyutlar mevcut git deposundan **otomatik algılanır** (`repo` ve `project`).

Aynı mantıksal secret adının (örneğin `DATABASE_URL`) birçok proje ve ortam için çakışma olmadan var olmasını sağlayan şey budur — adı bozmakla değil, kapsam ile ayırt edersiniz.

### Kapsam için CLI bayrakları

| Bayrak | Boyut |
|---|---|
| `--tenant` | tenant |
| `--project` | project |
| `--env` | environment |
| `--repo` | repo |

Çoğu komut bunların herhangi bir alt kümesini artı `--name` ve `--type`'ı kabul eder.

---

## Secret türleri ve maskeleme

Her secret'ın, türe duyarlı bir form tanımlayan bir **türü** vardır — yalnızca o tür için anlamlı olan alanları girersiniz. `secret` olarak işaretlenen alanlar (password / token / value / private_key / …) **maskeli olarak saklanır** ve yalnızca talep üzerine gösterilir (ve bu gösterim denetlenir/audit edilir).

Maskeleme **kayda duyarlıdır** ve şu sırayla çözümlenir:

1. **Alan başına geçersiz kılma (override)** — `field_meta[field] = {secret: bool, mask: "partial"|"full"}`. Geçersiz kılmalar varsayılan olarak yalnızca maskeleme *ekleyebilir*; bir alan yalnızca `secret: false` değerini açıkça ayarlarsanız düz olarak gösterilir.
2. **Tür şablonu** — alanın türü için bildirilen gizliliği.
3. **Ad sezgiseli** — adı `pass|secret|token|value|key|credential|apikey` ile eşleşen bir alan.
4. **Değer sezgiseli** — gömülü kimlik bilgileri içeren bir değer (`scheme://user:pass@…`, örneğin bir `jdbc_url` veya DSN), aksi takdirde "düz" bir alanda olsa bile maskelenir.

Tam alan kataloğu için bkz. [Secret Türleri]({{ site.baseurl }}/tr/secret-types).

---

## Diskteki anahtar (key-at-rest)

age **özel anahtarı, sağlamlaştırılmış (hardened) bir kasada asla düz metin olarak diske yazılmaz**. Yalnızca sarmalanmış olarak var olur:

- **master password** ile → `keys/age-key.txt.age`
- her **kurtarma kodu (recovery code)** ile → `keys/recovery.json`
- her **kilit açma token'ı (unlock token)** ile → `keys/agents.json`

Kullanım anında `concealer` anahtar metnini şu sırayla çözümler ve `sops`'a bellekte teslim eder:

1. süreç-içi bellek önbelleği (`_KEY_CACHE`)
2. ortamdan `CONCEALER_TOKEN` (`keys/agents.json` aracılığıyla)
3. mevcutsa legacy düz metin `keys/age-key.txt` (eski kasalar)
4. bir TTY üzerinde etkileşimli master-password istemi

`0600 keys/age-key.txt` içeren eski kasalar hâlâ çalışır; bunları diskteki anahtar (key-at-rest) modeline taşımak için [`concealer harden`]({{ site.baseurl }}/tr/cli-reference#harden) çalıştırın.

---

## Token'lar

İnsanlar ve agent'lar, şifreyi tekrar tekrar yazmak yerine **iptal edilebilir token'lar** ile kilit açar:

- **İnsan**: `concealer unlock`, `CONCEALER_TOKEN` olarak dışa aktarılan bir **TTL** token'ı (~8s) üretir.
- **Agent**: `concealer agent register <name>`, MCP sunucusunun ortamı için **uzun ömürlü, iptal edilebilir** bir token üretir.

Token değeri **yalnızca** istemci ortamında yaşar. Kasa yalnızca onun scrypt hash'ini + age anahtarının token ile sarmalanmış bir kopyasını saklar. Token'ı iptal edin, o kopya işe yaramaz hâle gelir. Bkz. [Token'lar ve Kurtarma]({{ site.baseurl }}/tr/tokens-recovery).

---

## Kurtarma kodları (recovery codes)

`init`, **8 tek kullanımlık kod** yazdırır (bir kez gösterilir; yalnızca scrypt hash'leri + kodla sarmalanmış bir anahtar saklanır). Herhangi bir kod:

- master password'ü unutursanız kasayı kurtarır (`concealer recover`) ve
- `concealer passwd` tarafından **ikinci faktör olarak zorunlu tutulur** (tüketilir), böylece çalınmış bir master password tek başına anahtarı döndüremez.

Kümeyi yeniden oluşturmak için `concealer recovery` kullanın.

---

## Audit zinciri

Her erişim — CLI, Web veya MCP — `keys/audit.log`'a bir satır ekler:

- **HMAC-SHA256 ile zincirlenir** — her girdinin hash'i bir öncekine bağlıdır.
- İmzalı yükte **monoton `seq`**.
- **`keys/audit.head`** kuyruğu sabitler, böylece son satırların silinmesi/kırpılması tespit edilebilir.

`concealer audit verify`, zinciri yeniden hesaplar ve sabit noktayı (anchor) kontrol eder. Girdileri değiştirmek, silmek, yeniden sıralamak veya kırpmak doğrulamayı bozar.

Audit log, **anahtar adlarını ve eylemleri kaydeder, değerleri asla kaydetmez**.

{: .note }
> **Dürüst tavan:** `keys/audit.key` yerel olarak saklanır, dolayısıyla tam erişime sahip bir dosya sistemi-root saldırganı zinciri yeniden dövebilir. Gerçek değişmezlik, makine dışı bir anahtar/sabit nokta gerektirir. Bu gizlenmemiş, belgelenmiştir — bkz. [Güvenlik Modeli]({{ site.baseurl }}/tr/security).
