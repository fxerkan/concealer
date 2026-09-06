---
title: 🏠 Ana Sayfa
layout: default
lang: tr
nav_exclude: true
permalink: /tr/
description: "AI-kodlama çağı için yerel, tek dosyalık secret yöneticisi. SOPS + age ile şifreli. Bulut yok, telemetri yok, hesap yok. CLI · Web Arayüzü · TUI · MCP."
---

# concealer
{: .no_toc }

**AI-kodlama çağı için yerel, tek dosyalık secret yöneticisi.** SOPS + age ile şifreli — bulut yok, telemetri yok, hesap yok.
{: .fs-5 .fw-300 }

concealer; API anahtarlarını, token'ları ve veritabanı şifrelerini makinenden hiç çıkmadan yönetir. Şifreli kasa ve anahtar malzemesi daima yerelde kalır. AI ajanları secret'ları **değerlerini hiç görmeden** kullanabilir.

## Ne sunar

- **CLI** — `set`, `get`, `run`, `list`; `cer`, `concealer` için kısa takma addır.
- **Web Arayüzü** — aranabilir, kapsam-bazlı secret yönetimi.
- **TUI** — terminalde secret tarayıcı.
- **MCP (AI Ajanları için)** — ajan secret adlarını listeler ve komutu enjekte edilmiş secret ile çalıştırır; değer bağlamdan gizli (redacted) kalır.
- **Chrome Eklentisi** — secret'ları araç çubuğundan kopyala.

## Nasıl çalışır

Her arayüz tek bir Python script'ine akar; o da SOPS + age'e devreder. Şifreli kasa diskte kalır, değerler asla loglanmaz ya da açığa çıkmaz.

## Başla

- [Başlarken](/tr/getting-started.html)
- [Kurulum](/tr/installation.html)
- [CLI Referansı](/tr/cli-reference.html)
- [AI Ajanları için MCP](/tr/mcp.html)
- [Güvenlik Modeli](/tr/security.html)

> İngilizce tam sürüm: [concealer.fxerkan.com](https://concealer.fxerkan.com/) · Kaynak kod: [GitHub](https://github.com/fxerkan/concealer)
