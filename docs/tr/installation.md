---
title: Kurulum
layout: default
nav_exclude: true
---

# Kurulum
{: .no_toc }

1. TOC
{:toc}

---

## Gereksinimler

| Bağımlılık | Neden | Notlar |
|---|---|---|
| **Python 3** | concealer yalnızca stdlib kullanan tek bir betiktir | `pip install` gerekmez |
| **[sops](https://github.com/getsops/sops)** | kasayı şifreler/çözer | |
| **[age](https://github.com/FiloSottile/age)** | şifreleme arka ucu + `age-keygen` | |
| **expect** | age'in parola istemini yönetir (age `/dev/tty`'yi okur, stdin'i değil) | macOS ve çoğu Linux ile birlikte gelir |

concealer her komutta bir **preflight kontrolü** çalıştırır ve `sops`, `age`, `age-keygen` veya `expect`'ten herhangi biri eksikse bir kurulum ipucuyla çıkış yapar.

---

## Homebrew (önerilen)

```bash
brew install fxerkan/tap/concealer
```

Bu, `sops`, `age` ve `expect`'i otomatik olarak getirir.

---

## Manuel (tek betik)

```bash
# prerequisites
brew install sops age            # macOS (or your OS package manager); expect ships with macOS

# get concealer
git clone https://github.com/fxerkan/concealer.git
cd concealer

# optional: put it on PATH with the short `cer` alias
ln -sf "$PWD/concealer" ~/bin/concealer
ln -sf "$PWD/concealer" ~/bin/cer
```

Betik bağımlılıksız Python'dur — virtualenv yok, paket yok. `cer`, `concealer`'a bir symlink'tir; her komut iki isim altında da çalışır.

---

## İlk kurulum

```bash
concealer init          # generate keys + set master password
```

`init`, **8 adet tek kullanımlık kurtarma kodu** ve bir başlangıç `export CONCEALER_TOKEN=…` satırı yazdırır, ardından düz metin age anahtarını diskten kaldırır. Kurtarma kodlarını başka bir yerde saklayın. Tam akış için [Başlarken]({{ site.baseurl }}/tr/getting-started) sayfasına bakın.

Mevcut bir kasanın üzerine yeniden başlatmak için `concealer init --force` kullanın (yıkıcıdır — yalnızca tek kullanımlık/test kasasında).

---

## Ortam değişkenleri

| Değişken | Amaç | Varsayılan |
|---|---|---|
| `CONCEALER_HOME` | kasa dizini | `~/.concealer`; bir repo checkout'unda, betiğin yanındaki klasör |
| `CONCEALER_TOKEN` | CLI/MCP unlock token'ı (`init` / `unlock` / `agent register` tarafından üretilir) | — |
| `CONCEALER_IDLE` | web oturumu boşta otomatik kilitleme zaman aşımı, saniye cinsinden | `300` |
| `CONCEALER_ACTOR` | denetim günlüğüne kaydedilen yedek actor etiketi | — |

### İzole test kasası

Asla gerçek kasanıza karşı test yapmayın. `CONCEALER_HOME`'u tek kullanımlık bir dizine yönlendirin:

```bash
CONCEALER_HOME=/tmp/testvault concealer init
CONCEALER_HOME=/tmp/testvault concealer web 8799
```

---

## Kasa dosyaları (`CONCEALER_HOME` içinde ne bulunur)

```
secrets.enc.yaml        # the vault — SOPS+age encrypted JSON (stored as YAML)
.sops.yaml              # SOPS config (recipient / rules)
keys/
  age-key.txt.age       # age private key, master-password wrapped — the ONLY key at rest
  master.json           # scrypt verifier for the master password (UI)
  recovery.json         # recovery-code hashes + code-wrapped key
  agents.json           # unlock-token hashes + token-wrapped key
  audit.log             # HMAC-chained audit log (+ monotonic seq)
  audit.head            # tail anchor (catches truncation)
  ratestate.json        # per-agent anti-exfiltration rate state (names+timestamps only)
  backup.json           # auto-backup settings (age-wrapped backup password)
```

{: .warning }
> `keys/`, `secrets.enc.yaml` veya `.sops.yaml` içindeki **hiçbir şey** asla herkese açık bir repo'ya commit'lenmemelidir. Projenin `.gitignore` dosyası bunları korur. Bu repo *aracı* dağıtır, asla bir kasayı değil.
