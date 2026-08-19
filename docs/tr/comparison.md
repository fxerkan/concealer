---
title: Karşılaştırma
layout: default
nav_exclude: true
---
# concealer nasıl karşılaştırılır

{: .no_toc }

concealer'ın bulut parola yöneticileri, DevOps secret platformları ve diğer yerel/dosya tabanlı araçların yanında nerede durduğu — ve *yapmadığı* şeyler hakkında dürüst bir değerlendirme.
{: .fs-5 .fw-300 }

1. TOC
   {:toc}

---

## Özet

concealer **yalnızca yerel, tek dosyalı, sıfır altyapılı** bir secret yöneticisidir: [SOPS](https://github.com/getsops/sops) + [age](https://github.com/FiloSottile/age) üzerine kurulu, tiplenmiş, kapsamlanmış ve denetimli bir ön yüz. 1Password veya HashiCorp Vault olmaya çalışmıyor. Bu araçların açık bıraktığı bir boşluğu dolduruyor:

> Bir geliştiricinin (veya bir AI ajanının) tek bir makinede sunucusuz, SaaS hesabı olmadan, daemon olmadan ve bulut olmadan çalıştırabileceği, şifreli ve git dostu bir kasa — ancak ham `sops`/`age`/`pass`'ın vermediği tipleme, kapsamlama, denetim izi ve ajan güvenli MCP erişimiyle.

Ekip paylaşımına, SSO'ya, dinamik veritabanı kimlik bilgilerine veya mobil otomatik doldurmaya ihtiyacınız varsa concealer yanlış araçtır — aşağıdaki tablolar bunu açıkça söylüyor.

---

## Ölçüldüğü üç pazar

| Kategori                                       | Örnekler                                                                           | Neyi optimize ederler                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Bulut parola yöneticileri**              | 1Password, Bitwarden, Keeper, LastPass, Dashlane, NordPass                         | İnsan son kullanıcılar, otomatik doldurma, cihazlar arası senkronizasyon, paylaşım              |
| **DevOps / kurumsal secret platformları** | HashiCorp Vault, AWS/Azure/GCP Secret Manager, Doppler, Infisical, CyberArk Conjur | Servis filoları, dinamik secret'lar, rotasyon, RBAC, CI/CD enjeksiyonu |
| **Yerel / dosya tabanlı OSS**              | SOPS+age (ham),`pass`/`gopass`, KeePassXC, git‑crypt, **secretctl**            | Verilerinize sahip olma, sunucusuz, git ile sürümlenebilir                        |

concealer üçüncü pazarda yaşar ama genellikle yalnızca ilk ikisinde bulunan *ergonomiyi* (tipleme, kapsamlama, denetim, arayüz) ödünç alır.

---

## Ana karşılaştırma matrisi

Gösterge: ✅ evet · ⚠️ kısmen / uyarılarla · ❌ hayır · — yok veya bilinmiyor · **★ = yalnızca concealer**

**Yetenek** ve **concealer** sütunları, diğer her aracı görmek için sağa kaydırırken sabit kalır; kalan satırlar için tablonun içinde aşağı kaydırın. ★ ile işaretlenen satırlar, **bu tablodaki başka hiçbir aracın eşleşmediği** yeteneklerdir.

<style>
.cmp-wrap{--cbg:#0d0f13;--chead:#1b1f27;--czA:#0c0e12;--czB:#101319;--ccer:#1a160c;--ccerhd:#2a2410;--cline:#242a33;--ctxt:#e8e8e6;--cstar:#ffb020;
  max-height:560px;overflow:auto;border:1px solid var(--cline);border-radius:12px;position:relative;margin:14px 0}
html[data-cer-theme="light"] .cmp-wrap{--cbg:#fff;--chead:#eef0f3;--czA:#fff;--czB:#f6f7f9;--ccer:#fff6e2;--ccerhd:#ffe7bd;--cline:#e2e6eb;--ctxt:#1a1d23;--cstar:#b06f00}
.cmp{border-collapse:separate;border-spacing:0;min-width:1560px;font-size:12.5px;line-height:1.4;color:var(--ctxt);background:var(--cbg)}
.cmp th,.cmp td{box-sizing:border-box;border-bottom:1px solid var(--cline);border-right:1px solid var(--cline);padding:9px 12px;text-align:left;vertical-align:top;white-space:nowrap}
.cmp thead th{position:sticky;top:0;z-index:3;background:var(--chead);font-weight:700}
.cmp tbody tr:nth-child(odd) td{background:var(--czA)}
.cmp tbody tr:nth-child(even) td{background:var(--czB)}
.cmp .cap{position:sticky;left:0;z-index:2;width:216px;min-width:216px;max-width:216px;white-space:normal;font-weight:600}
.cmp thead th.cap{z-index:5}
.cmp .cer{position:sticky;left:216px;z-index:2;width:190px;min-width:190px;max-width:190px;white-space:normal;background:var(--ccer)!important}
.cmp thead th.cer{z-index:5;background:var(--ccerhd)!important}
.cmp tbody tr.u td{background:rgba(255,176,32,.07)}
.cmp tbody tr.u .cap{box-shadow:inset 4px 0 0 var(--cstar)}
.cmp .star{color:var(--cstar);font-weight:800;margin-left:4px}
.cmp small{opacity:.8}
</style>
<div class="cmp-wrap" markdown="0">
<table class="cmp">
<thead><tr>
<th class="cap">Yetenek</th><th class="cer">concealer</th><th>secretctl</th><th>1Password</th><th>Bitwarden<br>(+ Secrets&nbsp;Mgr)</th><th>Keeper</th><th>LastPass</th><th>HashiCorp Vault</th><th>Doppler</th><th>Infisical</th><th>AWS Secrets Mgr</th><th>SOPS+age (ham)</th><th>pass / gopass</th><th>KeePassXC</th>
</tr></thead>
<tbody>
<tr><td class="cap">Dağıtım</td><td class="cer">Yerel, tek dosya</td><td>Yerel, tek ikili dosya</td><td>SaaS</td><td>SaaS veya kendi sunucunda</td><td>SaaS</td><td>SaaS</td><td>Kendi sunucunda / HCP</td><td>SaaS</td><td>SaaS veya kendi sunucunda</td><td>Yalnızca bulut</td><td>Yerel</td><td>Yerel</td><td>Yerel</td></tr>
<tr><td class="cap">Sunucu / daemon gerektirir</td><td class="cer">❌ yok</td><td>❌ yok</td><td>bulut</td><td>⚠️ kendi sunucunda bir sunucu çalıştırır</td><td>bulut</td><td>bulut</td><td>✅ sunucu</td><td>✅</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
<tr><td class="cap">Açık kaynak</td><td class="cer">✅</td><td>✅ Apache‑2.0</td><td>❌</td><td>✅</td><td>❌</td><td>❌</td><td>⚠️ BUSL</td><td>❌</td><td>✅</td><td>❌</td><td>✅</td><td>✅</td><td>✅</td></tr>
<tr><td class="cap">Maliyet</td><td class="cer">Ücretsiz</td><td>Ücretsiz</td><td>~$3/ay+</td><td>Ücretsiz katman; SM $6–12/k/ay</td><td>~$3.75/k/ay+</td><td>~$3/ay+</td><td>Ücretsiz OSS / $$$ kurumsal</td><td>ücretli katmanlar</td><td>Ücretsiz OSS / ücretli bulut</td><td>kullanıma dayalı</td><td>Ücretsiz</td><td>Ücretsiz</td><td>Ücretsiz</td></tr>
<tr><td class="cap">Şifreleme arka ucu</td><td class="cer">SOPS üzerinden age (X25519)</td><td>AES‑256‑GCM (Argon2id)</td><td>tescilli</td><td>tescilli</td><td>tescilli</td><td>tescilli</td><td>kendi / transit</td><td>yönetilen</td><td>yönetilen</td><td>KMS</td><td>age / PGP / KMS</td><td>GPG (veya age)</td><td>AES / ChaCha</td></tr>
<tr><td class="cap">Depolama biçimi</td><td class="cer">Şifreli YAML/JSON, git dostu</td><td>Şifreli SQLite (0600)</td><td>tescilli bulut</td><td>tescilli</td><td>tescilli</td><td>tescilli</td><td>arka uç deposu</td><td>bulut</td><td>bulut / DB</td><td>bulut</td><td>şifreli dosya</td><td>GPG dosyaları + git</td><td>tek <code>.kdbx</code></td></tr>
<tr><td class="cap">Git ile sürümlenebilir kasa</td><td class="cer">✅ <small>değerler şifreli, anahtarlar görünür</small></td><td>❌ SQLite blob</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>⚠️</td><td>❌</td><td>⚠️</td><td>❌</td><td>✅</td><td>✅</td><td>⚠️ yalnızca blob</td></tr>
<tr class="u"><td class="cap">Tiplenmiş secret'lar <small>(db/api/ssh/…)</small><span class="star">★</span></td><td class="cer">✅ şablonlar</td><td>—</td><td>⚠️ öğe tipleri</td><td>⚠️ öğe tipleri</td><td>⚠️</td><td>⚠️</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>⚠️</td></tr>
<tr><td class="cap">Kapsamlama</td><td class="cer">✅ birinci sınıf <small>(tenant/project/env/repo)</small></td><td>⚠️ joker karakterler <small>(aws/*)</small></td><td>⚠️ kasalar/etiketler</td><td>⚠️ koleksiyonlar</td><td>⚠️ klasörler</td><td>⚠️</td><td>✅ yollar/politikalar</td><td>✅ yapılandırmalar/ortamlar</td><td>✅ ortamlar/klasörler</td><td>✅ ARNs</td><td>❌</td><td>⚠️ dizinler</td><td>⚠️ gruplar</td></tr>
<tr><td class="cap">Alan farkında maskeleme</td><td class="cer">✅ alan başına + sezgisel</td><td>—</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>yok</td><td>yok</td><td>⚠️</td><td>yok</td><td>❌</td><td>❌</td><td>✅</td></tr>
<tr><td class="cap">Web arayüzü</td><td class="cer">✅ yerleşik SPA</td><td>❌ <small>(masaüstü uygulaması)</small></td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td><td>❌ <small>(masaüstü uygulaması)</small></td></tr>
<tr><td class="cap">TUI / CLI</td><td class="cer">✅ ikisi de</td><td>✅ CLI</td><td>✅ CLI</td><td>✅ CLI</td><td>⚠️</td><td>⚠️</td><td>✅ CLI</td><td>✅ CLI</td><td>✅ CLI</td><td>✅ CLI</td><td>✅ CLI</td><td>✅ CLI</td><td>⚠️</td></tr>
<tr><td class="cap">Kurcalamaya karşı denetim günlüğü</td><td class="cer">✅ HMAC zincirli + baş çapa</td><td>✅ HMAC zincirli</td><td>⚠️ bulut günlükleri</td><td>⚠️</td><td>✅</td><td>⚠️</td><td>✅</td><td>✅</td><td>✅</td><td>✅ CloudTrail</td><td>❌</td><td>⚠️ git log</td><td>❌</td></tr>
<tr><td class="cap">AI ajanı / MCP yerlisi</td><td class="cer">✅ MCP sunucusu, ajan geçidi, hız sınırı</td><td>✅ MCP, düz metin yok</td><td>⚠️ 3. taraf</td><td>❌</td><td>❌</td><td>❌</td><td>⚠️ SDK</td><td>⚠️ SDK</td><td>⚠️ SDK</td><td>⚠️ SDK</td><td>❌</td><td>❌</td><td>❌</td></tr>
<tr class="u"><td class="cap">Ajanlar için toplu sızdırma karşıtı önlem<span class="star">★</span></td><td class="cer">✅ ajan başına kotalar</td><td>—</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>⚠️ politika</td><td>❌</td><td>❌</td><td>⚠️ IAM</td><td>❌</td><td>❌</td><td>❌</td></tr>
<tr><td class="cap">Dinamik / kiralanan secret'lar</td><td class="cer">❌</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>✅</td><td>⚠️</td><td>✅</td><td>⚠️ rotasyon</td><td>❌</td><td>❌</td><td>❌</td></tr>
<tr><td class="cap">Otomatik rotasyon</td><td class="cer">❌ manuel</td><td>—</td><td>⚠️</td><td>⚠️</td><td>✅</td><td>⚠️</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
<tr><td class="cap">Çoklu kullanıcı / RBAC / SSO</td><td class="cer">❌ tek sahipli</td><td>❌ tek sahipli</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅ IAM</td><td>⚠️ alıcılar</td><td>⚠️ anahtarlar</td><td>❌</td></tr>
<tr><td class="cap">Mobil uygulama / tarayıcı otomatik doldurma</td><td class="cer">❌</td><td>❌</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>⚠️</td><td>⚠️</td></tr>
<tr><td class="cap">Tamamen çevrimdışı çalışır</td><td class="cer">✅</td><td>✅</td><td>⚠️ önbellek</td><td>⚠️</td><td>⚠️</td><td>⚠️</td><td>⚠️</td><td>❌</td><td>❌</td><td>❌</td><td>✅</td><td>✅</td><td>✅</td></tr>
<tr><td class="cap">Kurtarma kodları / 2. faktör anahtar rotasyonu</td><td class="cer">✅ tek kullanımlık kodlar, kod korumalı <code>passwd</code></td><td>—</td><td>✅ kurtarma kiti</td><td>⚠️</td><td>✅</td><td>⚠️</td><td>⚠️ mühür açma anahtarları</td><td>⚠️</td><td>⚠️</td><td>✅</td><td>❌</td><td>❌</td><td>⚠️ anahtar dosyası</td></tr>
<tr><td class="cap">Harici bağımlılıklar</td><td class="cer"><code>sops</code>, <code>age</code>, <code>expect</code></td><td>yok <small>(tek ikili dosya)</small></td><td>—</td><td>—</td><td>—</td><td>—</td><td>çok sayıda</td><td>—</td><td>—</td><td>—</td><td><code>sops</code>, <code>age</code></td><td><code>gpg</code> / <code>git</code></td><td>Qt uygulaması</td></tr>
</tbody>
</table>
</div>

*Fiyat rakamları 2026 gösterge liste fiyatlarıdır ve sık sık değişir — bunları teklif olarak değil, büyüklük mertebesi olarak değerlendirin. secretctl rakamları herkese açık README'sinden alınmıştır (Apache‑2.0, Go, SQLite, AES‑256‑GCM + Argon2id, MCP). "—" işareti, dokümantasyonunun belirtmediği bir yeteneği gösterir.*

---

## concealer'ın kazandığı yerler

- **Sıfır altyapı.** Sunucu yok, konteyner yok, bulut tenant'ı yok, daemon yok. `init` deyin, kasanız hazır. Vault/Doppler/Infisical hepsi çalışan bir servis varsayar; concealer bir betiktir.
- **Git yerlisi.** Kasa şifreli bir YAML/JSON dosyasıdır — anahtarlar görünür, değerler şifreli — böylece kodunuzla aynı repoda diff'lenir ve sürümlenir. Ham SOPS bunu da verir, ama üzerine tipleme/kapsamlama/arayüz/denetim olmadan.
- **Ajan öncelikli.** Tablodaki tek araç, **AI ajan tehdit modelleri etrafında tasarlanmış yerleşik bir MCP sunucusuna** sahiptir: yalnızca kayıtlı ajan geçidi, ajan başına toplu sızdırma kotaları ve ajana asla ulaşmayan değerler (`run_with_secrets` bunları bir alt sürecin env'ine enjekte eder ve çıktıyı maskeler). Herkes ajanları, sızdırma tavanı olmayan genel bir SDK üzerinden tutturur.
- **Tasarım gereği kurcalamaya karşı korumalı.** Baş çapalı bir HMAC zincirli denetim günlüğü kuyruk kesme saldırılarını yakalar — düz bir dosya veya `git log`'dan daha güçlü, üstelik bir bulut denetim hattına ihtiyaç duymadan.
- **Bağımlılık yok, telemetri yok, okunacak tek dosya.** Aracın tamamı denetlenebilir tek bir Python betiğidir. Tescilli bir bulut kasasına güvenmekle (bkz: 2022 LastPass ihlali) veya Vault'u ayağa kaldırmakla karşılaştırın.

## concealer'ın kaybettiği yerler (başka bir şey kullanın)

- **Ekipler.** SSO yok, RBAC yok, kullanıcı başına paylaşım yok. Tek sahipli bir kasadır. → 1Password / Bitwarden / Vault.
- **Dinamik secret'lar ve kiralar.** Talep üzerine üretilen kısa ömürlü DB kimlik bilgileri yok. → HashiCorp Vault.
- **Otomatik rotasyon ve CI/CD senkronizasyon dokusu.** Yalnızca manuel rotasyon. → Doppler / Infisical / Vault Secrets Sync.
- **Tüketici deneyimi.** Mobil uygulama yok, tarayıcı otomatik doldurma yok, passkey yok. → 1Password / Bitwarden / Keeper.
- **Ölçekte uyumluluk duruşu.** FedRAMP/SOC2 belgelendirmeleri yok. Denetim günlüğünün tavanı belgelenmiştir (`audit.key`'e sahip bir FS‑root saldırganı yeniden sahtecilik yapabilir). → Keeper / Vault / bulut KMS.

---

## En yakın komşular, keskinleştirilmiş

- **ham SOPS + age'e karşı** — aynı kripto ve aynı git dostu dosya, ama concealer tiplenmiş kayıtlar, kapsamlama, maskeleme, bir web arayüzü + TUI, bir denetim zinciri, açma token'ları, kurtarma kodları ve MCP sunucusu ekler. SOPS motordur; concealer arabadır.
- **`pass` / `gopass`'a karşı** — bunlar git ile dosya üzerinde GPG'dir. concealer kırılgan GnuPG/`gpg-agent`'i age ile değiştirir, dosya başına tek secret yerine yapılandırılmış/tiplenmiş secret'lar ve kapsamlama ekler ve bir arayüz ile ajan API'si sunar.
- **KeePassXC'ye karşı** — KeePassXC otomatik doldurmalı mükemmel bir *kişisel* tek dosyalı kasadır, ama bir GUI masaüstü uygulamasıdır, git dostu değildir (opak `.kdbx` blob) ve CLI öncelikli kapsamlaması, denetim zinciri veya ajan arayüzü yoktur.
- **Infisical'a (kendi sunucunda) karşı** — Infisical, açık kaynaklı kendi sunucunda barındırma seçeneğiyle en yakın "geliştirici secret'ları" rakibidir, ama tam bir istemci-sunucu platformudur (DB, web servisi, RBAC). concealer, bunu bile çalıştırmak fazla geldiğinde verilen yanıttır.
- **secretctl'e karşı** — en yakın felsefi komşu: o da yerel öncelikli, açık kaynaklı, tek ikili dosyalı, HMAC zincirli bir denetim günlüğü ve düz metni ajanlardan uzak tutan bir MCP entegrasyonu ile. Farklar depolama ve ergonomide — secretctl şifreli bir **SQLite** dosyası saklar (AES‑256‑GCM + Argon2id, git ile diff'lenemez) ve bir masaüstü uygulaması sunar; concealer, birinci sınıf tiplenmiş secret'lar, dört boyutlu kapsamlama, yerleşik bir web SPA + TUI ve ajan başına toplu sızdırma karşıtı kotalarla **git dostu bir SOPS/age YAML** kasası saklar. Kendi kendine yeten bir ikili dosya + yerel GUI için secretctl'i seçin; tarayıcıdan da sürebileceğiniz git ile sürümlenebilir, tiplenmiş, kapsamlanmış bir kasa için concealer'ı seçin.

---

## Doğru aracı seçmek

| İhtiyacınız varsa…                                                 | Şuna yönelin                                       |
| ------------------------------------------------------------- | ----------------------------------------------- |
| Sunucusuz, git'te sürümlenmiş kişisel/tek geliştiricili bir kasa | **concealer**                             |
| Yerel AI ajanları / MCP istemcileri için güvenli secret erişimi          | **concealer**                             |
| Ekip paylaşımı, SSO, mobil otomatik doldurma                            | 1Password / Bitwarden                           |
| Dinamik DB kimlik bilgileri, kiralar, hizmet olarak şifreleme          | HashiCorp Vault                                 |
| CI/CD'ye senkronize edilen yönetilen çoklu ortam secret'ları                  | Doppler / Infisical                             |
| Bir repodaki bir yapılandırma dosyasını sadece şifrelemek                          | **concealer**                             |
| Tek bir sağlayıcıda bulut yerlisi uygulama secret'ları                     | AWS/Azure/GCP Secret Manager                    |

---

## Kaynaklar

- [Infisical — Best Secrets Management Tools 2026](https://infisical.com/blog/best-secret-management-tools)
- [Bytebase — Best Secrets Manager for Database Credentials 2026: Vault vs Infisical vs Doppler](https://www.bytebase.com/blog/best-secrets-manager-for-database-credentials/)
- [guptadeepak.com — Top Secrets Management Tools Compared](https://guptadeepak.com/top-5-secrets-management-tools-hashicorp-vault-aws-doppler-infisical-and-azure-key-vault-compared/)
- [Bitwarden — Pricing 2026 vs 1Password &amp; LastPass](https://checkthat.ai/brands/bitwarden/pricing)
- [ProPicked — Best Password Managers 2026](https://propicked.com/blog/best-password-manager-2026-1password-bitwarden-dashlane-keeper-nordpass)
- [LibHunt — age vs gopass](https://www.libhunt.com/compare-age-vs-gopass)
- [Secret Management with SOPS and age (gist)](https://gist.github.com/patlegu/4494c8af543444289e50c4a9d5f6eae7)
