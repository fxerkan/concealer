---
title: Feature Plan
layout: default
nav_order: 13
---
# Yeni özellikler — araştırma & iş planı

`comparison.md`'deki eksik hanelere (❌) karşılık 5 özellik değerlendirildi. Her biri için:
**gerçekten gerekli mi**, **concealer'ın tezine (yerel/tek-dosya/sunucusuz/tek-sahip) uyuyor mu**,
**iş kalemleri**, **artı/eksi**. Öneri sırası en sonda.

> Ponytail notu: bu tür bir aracın en büyük riski, "kurumsal Vault" özelliklerini sunucusuz bir
> script'e taklit ederek tezini bozmaktır. Aşağıda 3 özelliği "yap", 1'ini "kısıtlı yap",
> 1'ini "yapma / dokümante et" olarak işaretledim. Gerekçeler net.

---

## 1) Collection / folder / directory gruplama

### Scope'dan farkı var mı? (kritik soru)
concealer'da zaten **iki** gruplama ekseni var:

| Eksen | Yapı | Amaç | Çokluk |
|---|---|---|---|
| **scope** (`tenant/project/environment/repo`) | sabit 4 kademe, hiyerarşik | "kim sahibi / nerede çalışıyor" | tek değer / eksen |
| **tags[]** | serbest metin, düz | çapraz kesen etiketleme | çok değerli |

Bir "collection/folder" bunların üçüncüsü olurdu: **kullanıcı tanımlı, tek-ebeveynli, taşınabilir kap**.
Dürüst tespit: collection'ın sağladığı değerin ~%80'i zaten `tags` + `filt()` tam-metin arama +
scope ile karşılanıyor. Gerçek boşluk şu: kullanıcının **serbestçe adlandırıp içine secret
"taşıyıp kopyalayabileceği"** bir kap yok. Bu, semantik olarak *birincil gruplama ekseni olarak
kullanılan bir etiket*e denktir.

**Gereklilik: orta-düşük.** Tek-sahipli yerel bir kasada 4-kademe scope + tags + arama çoğu ihtiyacı
karşılar. Ama kullanıcı açıkça "oluştur / taşı / kopyala" akışı istiyor — bu, tag'lerin sağlamadığı
tek şey (tag çok-değerli ve "taşıma" kavramı yok).

### Lazy tasarım (önerilen)
Ayrı bir "collections" veri modeli, klasör CRUD'u, iç içe ağaç **kurmadan**:

- Kayıt modeline **tek opsiyonel alan**: `collection: str` (boş = "(none)"). `norm()`'a
  `e.setdefault("collection", "")` bir satır. Legacy kayıtlar otomatik boş.
- Nested istenirse: `collection` değeri `"backend/payments"` gibi `/` ile yol taşısın — ayrı model
  yok, sadece string. UI ağacı string'i `/`'den bölerek çizer. `# ponytail: yol string'i, ayrı
  ağaç modeli throughput derdi olursa`.
- **filt()**'e `collection` filtresi**: `DIMS`'e dokunmadan `filt()` imzasına opsiyonel `coll=` ekle
  (1 koşul). `label()`/scope'u değiştirme.
- **Taşı** = `collection` alanını güncelle (mevcut update yolu). **Kopyala** = kaydı klonla, yeni
  `id` üret (`norm()` zaten üretir), `collection`'ı değiştir. İki küçük komut/uç.

### İş kalemleri
- **Veri**: `norm()`+`entry_public()`+`_entry_from_body()`'ye `collection` (3 satır). Arama
  `hay`'ına ekle (`filt()` içinde `collection`'ı `DIMS+[...]` dizisine kat).
- **CLI**: `list --collection X`; `mv --name .. --to-collection Y`; `cp --name .. --to-collection Y`
  (kopya için yeni id + `--name` override opsiyonu). `dims` çıktısına collection listesi.
- **Web**: sol tarafta "Group by: scope | collection | tag" toggle + collection ağacı; kayıt
  formuna `collection` input (datalist ile mevcut değerler). Sürükle-bırak taşıma opsiyonel
  (YAGNI — önce sağ-tık "Move to…"). i18n tr+en stringleri.
- **TUI**: mevcut facet mantığına (`facets()`, `_tui_main`) `collection` faseti; taşıma için bir
  tuş (örn `m`) + hedef seçici. Kopyala için `c` zaten kopya-değer; çakışmayı kontrol et.
- **MCP**: `list_secrets`/`set_secret` inputSchema'ya `collection` (opsiyonel). Değer sızdırmaz,
  gruplama alanı zararsız. `rate_gate` yolunu değiştirme.
- **Doküman/CHANGELOG**, `VERSION` bump.

### Artı / Eksi
- **➕** Ucuz (tek string alan), geriye uyumlu, kullanıcının istediği "oluştur/taşı/kopyala" akışını
  verir. scope'u kirletmez.
- **➕** Ağaç görünümü büyük kasalarda gezinmeyi iyileştirir (tags düz kalıyor).
- **➖** scope + tags ile **kavramsal örtüşme** → kullanıcı "bu proje mi, collection mı, tag mı?"
  kararsızlığı yaşayabilir (UX borcu). Dokümanda net ayrım şart: *scope = nerede çalışır,
  collection = nasıl düzenlemek istersin, tag = çapraz etiket*.
- **➖** Üç eksenli filtre UI'sı karmaşıklaşır.
- **Karar**: **Yap ama lazy** (tek alan + group-by). Ayrı klasör-entity modeli **yapma**.

---

## 2) Automatic rotation

### Sunucusuz gerçeklik
concealer'ın **daemon'u yok**. "Otomatik" olabilecek tek şey: kullanıcının `cron`/`launchd`'inin
`concealer rotate ...` çağırması. Yani concealer'ın sağlayabileceği "otomatiklik" =
**rotasyon politikası metadatası + "vadesi geldi" tespiti + toplu `rotate --due` komutu**.

Daha derin bir gerçek: bir değeri kasada döndürmek, o değeri **sağlayıcıda** (DB sunucusu, AWS,
API dashboard) da döndürmedikçe uygulamayı **bozar**. Gerçek sağlayıcı-taraflı rotasyon =
her backend için entegrasyon = concealer'ın tezine aykırı dev bir yüzey. Bu yüzden güvenli
otomatik rotasyon yalnız **concealer'ın kendi ürettiği** (başka bir şeyin `run_with_secrets` ile
okuduğu) rastgele token'lar için anlamlı.

### Lazy tasarım (önerilen)
- Kayıt başına opsiyonel `rotation: {"every_days": int, "last": iso, "mode": "generate"|"manual"}`
  (yeni alt-nesne, `norm()` default `{}`).
- Mevcut `rotate` komutu (`concealer:2001`) **zaten** rastgele üretiyor — ona `--due` toplu modu
  ekle: politikası olan ve `last + every_days < now` olan kayıtları gez, `mode=="generate"`
  olanları döndür, `last`'ı güncelle, `audit("rotate", detail="auto")`. `mode=="manual"` olanları
  yalnız **işaretle** (kullanıcı elle döndürsün) — değeri kırma.
- **"Vadesi geldi" rozeti**: web'de ve `list` çıktısında overdue sayacı (audit'teki `last_access`
  gibi türetilir). Yeni bir MCP aracı **gerekmez**.
- Otomatikliği kullanıcı kurar: `crontab: 0 3 * * * concealer rotate --due`. README'de tek satır.

### İş kalemleri
- `norm()` + `entry_public()`'a `rotation`; web formuna interval alanı; `rotate --due` döngüsü
  (~15 satır); overdue hesaplayan yardımcı; web rozeti + i18n; CHANGELOG + VERSION.
- **Güvenlik uyarısı**: `generate` modu yalnız "self-owned" tiplerde (api_key gibi) açık olsun;
  `database.password` gibi sağlayıcı-bağlı alanlarda **varsayılan kapalı** + UI uyarısı
  "bu değeri döndürmek uygulamayı bozabilir".

### Artı / Eksi
- **➕** comparison.md'deki ❌'yi ⚠️'ye çevirir; dürüst ve teze uygun (politika + cron).
- **➕** Küçük diff, mevcut `rotate`'i genişletir.
- **➖** "Gerçek" otomatik rotasyon değil — sağlayıcıda döndürmez. Yanlış anlaşılırsa üretim kırar.
  Dokümanda **çok net** olmalı: "concealer değeri kasada döndürür; sağlayıcıda **siz** döndürün ya
  da `run_with_secrets` ile üreteni siz tüketin."
- **Karar**: **Yap (politika + `rotate --due`)**. Sağlayıcı entegrasyonu **yapma**.

---

## 3) Dynamic / leased secrets — İPTAL

> **Bu özellik iptal edildi** (kullanıcı kararı). Aşağıdaki analiz gerekçe olarak korunuyor.
> concealer bu satırda "→ HashiCorp Vault" konumunu koruyor.


### Tez çatışması (kritik)
Vault'un dynamic secrets'ı: talep anında backend'den **kısa ömürlü** kimlik üretir, lease süresi
dolunca **otomatik iptal** eder. Bunun için üç şey şart: (a) her backend'e **admin kimliği**
(kasada saklı), (b) mint/revoke yapan **çalışan bir servis**, (c) lease'i süreyle **expire eden bir
daemon**. concealer'ın hiçbiri yok ve olması tezini (sunucusuz, tek-dosya, offline) bozar.
`comparison.md` bu satırda zaten "→ HashiCorp Vault" diyor.

**Gereklilik: düşük / tez-aykırı.** Hedef kitle (yerel tek geliştirici + AI agent) için gerçek
dynamic secrets'a ihtiyaç, zaten Vault'u gerektiren bir ölçekte başlar. Bunu concealer'a koymak,
"gerçek" sanılıp güvenilecek ama iptal/expiry garantisi veremeyecek bir yarım-çözüm doğurur —
güvenlik açısından **negatif değer**.

### Yapılabilecek en fazlası (yine de önermiyorum çekirdekte)
- **TTL'li efemeral secret**: `concealer lease --type token --ttl 1h` rastgele değer üretir,
  `expires` ile saklar; `get`/`run_with_secrets` süresi geçeni **reddeder** ve kasadan siler.
  Ama bu yalnız **kendi ürettiği** değerler için işe yarar (gerçek DB kimliği değil) → Vault'a
  kıyasla oyuncak. `rotation` (özellik 2) + kısa interval bunun %90'ını zaten verir.
- Gerçek backend mint istenirse: kullanıcının sağladığı bir **mint script**'ini `run_with_secrets`
  benzeri child-env'de çalıştırıp lease'i kaydetmek → bu bir **eklenti/reçete**, çekirdek değil.
  README'de "cron + kendi mint script'in" reçetesi olarak dokümante edilebilir.

### Artı / Eksi
- **➕** comparison ❌'sini kapatma cazibesi.
- **➖➖** Tezi bozar, sunucusuz mimaride **iptal/expiry garantisi verilemez** (offline'ken lease
  nasıl expire olacak? get anında lazy-expire dışında yok). Yanlış güven → gerçek risk.
- **➖** Bakım yükü yüksek, hedef kitle küçük.
- **Karar**: **Çekirdeğe koyma (YAGNI + tez-aykırı).** İki hafif alternatif: (a) özellik 2'nin kısa
  intervali, (b) README'de "mint script + cron" reçetesi. `comparison.md`'yi olduğu gibi bırak —
  bu satırda "Vault kullan" demek dürüst ve konumlandırmayı güçlendirir.

---

## 4) İlk `init`'te ASCII logo + adım adım rehber

### Durum
`init()` (`concealer:896`) düz metin basıyor. TUI'da zaten bir ASCII banner var: `_splash()`
(`concealer:1805`) — oradaki glyph mantığı yeniden kullanılabilir. Marka kuralı: "er" vurgulu;
terminalde `<span>` yok ama **ANSI renk** ile "er" vurgulanabilir (TTY ise; pipe'a yazarken renksiz).

### Lazy tasarım (önerilen)
- Tek çok-satırlı banner string'i (veya `_splash`'tan türet). `sys.stdout.isatty()` ise ANSI ile
  "er"i accent renkte bas, değilse düz.
- `init()` sonundaki çıktıyı **numaralı adımlara** böl: 1) kaydedilecekler (token, recovery kodları),
  2) `concealer web` ile ilk giriş, 3) ilk secret ekleme örneği, 4) agent kaydı (`agent register`),
  5) yedek kurulumu. Zaten basılan bilgiler (token, kodlar) bu iskelete otursun.
- İnteraktif kısım minimal: parola akışı (`_ask_new_password`) zaten var; ekstra sihirbaz **gerekmez**
  (YAGNI). İstenirse sonda tek `[Enter] ile web'i şimdi başlat?` promptu.

### İş kalemleri
- Banner sabiti + `isatty` renk yardımcısı (~10 satır); `init()` çıktısının yeniden düzeni; belki
  aynı banner'ı `help`/`version` başlığına da koy. i18n gerekmez (init çıktısı zaten tek dil/teknik).
- CHANGELOG + VERSION.

### Artı / Eksi
- **➕** Saf UX kazancı, düşük risk, tamamen additive. İlk izlenim + onboarding netliği.
- **➕** Marka tutarlılığı (accent "er").
- **➖** Neredeyse yok. ASCII banner bazı dar terminallerde taşabilir → ≤ ~64 sütun tut, çok dar ise
  gizle (`_splash` zaten genişlik kontrolü yapıyor, aynı deseni kullan).
- **Karar**: **Yap.** Net "just do it" özelliği; en yüksek değer/çaba oranı.

---

## 5) Audit tavanı düzeltmesi + SOC2 gibi sertifikalar

### İki ayrı şey olduğunu net görelim
**(a) Teknik: audit tamper-evidence tavanı.** Bugün `audit.key` diskte (`_audit_key`,
`concealer:228`) → FS-root saldırgan zinciri **baştan yeniden imzalayabilir**. `audit_verify`
ekleme/silme/yeniden-sıralama/kuyruk-kırpmayı yakalar ama tam yeniden-yazımı yakalayamaz (kodda
zaten dürüstçe yazılı).

**(b) Kurumsal: SOC2/FedRAMP.** Bunlar **kodla alınan şeyler değildir.** SOC2, bir **organizasyonun**
kontrollerinin (erişim yönetimi, değişiklik yönetimi, izleme, olay müdahale) lisanslı bir CPA
firması tarafından 3–12 ay boyunca denetlenmesidir. Açık kaynak tek-dosya bir araç "SOC2 alamaz";
onu **işleten şirket** alır ve concealer o denetimde **bir kontrol** olarak yer alır. FedRAMP daha
da ağır (devlet, bulut, 3PAO). Dolayısıyla doğru hedef: concealer'ı **SOC2-kanıt-dostu** yapmak.

### Teknik çözüm — audit tavanını yükselt (önerilen)
Tam değişmezlik yerel diskte imkânsız (root her şeyi görür); çözüm **anchor'ı makineden çıkarmak**:

- **Harici anchor push**: `concealer audit anchor` mevcut head hash'i (`_read_anchor`) makine-dışı,
  **append-only** bir hedefe yazsın — sırayla en lazy olanı: (1) `logger`/syslog (uzak syslog'a
  forward'lanıyorsa), (2) bir git remote'a commit, (3) kullanıcının verdiği bir webhook/e-posta,
  (4) RFC3161 zaman-damgası (TSA) — bu en güçlüsü ama harici bağımlılık/ağ ister. Lazy MVP: head
  hash'i stdout'a bas + opsiyonel dosyaya/URL'ye POST. Saldırgan yerelde zinciri yeniden yazsa bile
  harici kopya ile **uyuşmazlık** ortaya çıkar → tespit.
- **Asimetrik imza opsiyonu**: audit satırlarını HMAC yerine (ya da ek olarak) bir imza anahtarıyla
  imzala; **doğrulama public key ile** yapılsın, private key token-sarmalı/makine-dışı tutulsun.
  Root yine runtime'da unlock anında yakalayabilir → tek başına tam çözüm değil, ama "doğrulayan
  imzalayanı bilmek zorunda değil" özelliğini verir. `# ponytail: harici anchor asıl çözüm; imza
  ikincil.`
- **`chattr +a` / OS append-only** yalnız savunma-derinliği; root yener, güvenme.

**MVP kararı**: harici anchor push (syslog + opsiyonel webhook/dosya) yeterli ve lazy. TSA'yı
opsiyonel bırak.

### SOC2 için yapılması gerekenler (kod değil, çoğu süreç)
concealer'ın "sertifika almak"tan çok **bir SOC2 denetimini kolaylaştırması** hedeflenmeli:
1. **Kanıt-dostu özellikler** (kısmen var): değişmez-eğilimli audit (yukarıdaki anchor ile
   güçlendir), audit **export** (zaten `/api/audit/export` var), erişim gözden geçirme (agent
   listesi + `last_access`), en-az-yetki (rate_gate, registered-agent gate).
2. **Erişim kontrolü kanıtı**: kim-neye-erişti raporu (audit'ten türet), periyodik "access review"
   export'u.
3. **Değişiklik yönetimi**: vault git'te versiyonlu (zaten), secret yaşam döngüsü audit'te.
4. **`COMPLIANCE.md`** yaz: concealer özelliklerini SOC2 Trust Services Criteria'ya (Security,
   Availability, Confidentiality, Processing Integrity, Privacy) eşle; **neyi karşıladığını ve
   neyin organizasyonun sorumluluğunda olduğunu** dürüstçe ayır. Bu doküman, concealer kullanan bir
   şirketin denetçisine sunacağı hazır malzeme olur.
5. **Sertifikanın kendisi**: yalnız concealer'ı SaaS olarak sunan bir tüzel kişi, bir denetçiyle
   Type I (nokta) → Type II (dönem) süreci işletirse alınır. Tek-dosya OSS araç için uygulanamaz —
   bunu `comparison.md`'de zaten dürüstçe yazılı tutmak en doğrusu.

### İş kalemleri
- `audit anchor` komutu + opsiyonel hedefler (syslog/dosya/webhook); web'de "anchor durumu";
  `audit_verify`'a harici-anchor karşılaştırması (varsa). Doküman: `COMPLIANCE.md` (SOC2 TSC eşlemesi),
  `comparison.md`'de audit satırını "harici anchor ile güçlendirilebilir" diye güncelle. CHANGELOG+VERSION.
- **Yapma**: kod içinde "SOC2 uyumluyuz" iddiası (yanıltıcı + yasal risk). Sadece "SOC2 denetimini
  destekleyen kanıtlar üretir" de.

### Artı / Eksi
- **➕** Harici anchor, comparison'daki dokümante tavanı gerçekten yükseltir (küçük, teze uygun).
- **➕** `COMPLIANCE.md` satış/benimseme değeri yüksek, kod riski sıfır.
- **➖** Tam değişmezlik yerelde hâlâ imkânsız — dürüst dille sınırı belirt.
- **➖** "SOC2 sertifikası" bir kod özelliği değil; beklenti yönetimi şart.
- **Karar**: **Teknik: harici anchor'ı yap. Sertifika: kod değil — `COMPLIANCE.md` + dürüst konumlandırma.**

---

## Önerilen sıra & özet

| # | Özellik | Karar | Çaba | Değer | Not |
|---|---|---|---|---|---|
| 4 | init ASCII + rehber | **Yap** | XS | Yüksek | En iyi değer/çaba; additive, risksiz |
| 5a | Audit harici anchor | **Yap** | S | Yüksek | Dokümante tavanı gerçekten yükseltir |
| 5b | `COMPLIANCE.md` (SOC2 eşleme) | **Yap** | S | Yüksek | Kod değil doküman; sertifika ≠ özellik |
| 2 | Auto-rotation (politika + `rotate --due`) | **Yap, lazy** | M | Orta | Sağlayıcı entegrasyonu YOK; net uyarı |
| 1 | Collection (tek alan + group-by) | **Yap, lazy** | M | Orta | Ayrı klasör-modeli YOK; scope/tag ayrımını dokümante et |
| 3 | Dynamic/leased secrets | **Yapma** | L | Düşük | Tez-aykırı; "Vault kullan" dürüst konum |

**Uygulama sırası**: 4 → 5a → 5b → 2 → 1. (3 atlanır; istenirse README reçetesi.)

Her özellik `VERSION` bump + `CHANGELOG.md` (Keep a Changelog) + i18n (tr/en) gerektirir; hiçbiri
kriptoya, `_age_pw` expect desenine, key-at-rest sırasına, `rate_gate`/registered-agent kapısına
dokunmamalı. Tüm eklemeler `norm()` ile geriye uyumlu (legacy kayıtlar default'lar).
