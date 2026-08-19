---
title: TUI
layout: default
nav_order: 7.5
---

# Terminal UI (TUI)
{: .no_toc }

An interactive terminal interface over the same encrypted vault — browse, search, add, delete, and reveal secrets without leaving your shell.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

## Launch

```bash
concealer tui        # or: cer tui
```

Unlock the same way as the CLI — a `CONCEALER_TOKEN` in your environment (from `unlock` / `init`), or a master-password prompt on the TTY.

![concealer TUI splash screen]({{ site.baseurl }}/assets/tui-splash-screen.png)

---

## Browsing & searching

Arrow keys move the selection; typing filters the list instantly across name, scope, and tags. Secret fields stay **masked** in the list — the same record-aware masking rules as everywhere else (see [Secret Types]({{ site.baseurl }}/secret-types)).

![concealer TUI — searchable secret list]({{ site.baseurl }}/assets/tui-secrets.png)

| Action | Keys |
|---|---|
| Move selection | ↑ / ↓ |
| Search / filter | just start typing |
| Reveal a value | select → reveal (audited) |
| Add a secret | add key |
| Delete a secret | delete key |
| Quit | quit key |

*(On-screen hints show the exact keybindings for your build.)*

---

## Adding & editing

Add and edit use the same **type-aware** model as the web UI and CLI: pick a type, fill only the fields that make sense for it, and secret fields are stored masked.

![concealer TUI — type-aware edit form]({{ site.baseurl }}/assets/tui-edit.png)

Every reveal, create, update, and delete is written to the [tamper-evident audit log]({{ site.baseurl }}/concepts#audit-chain) with `source` recorded — the TUI is a first-class interface, not a bypass.

---

## When to use which interface

| You want… | Use |
|---|---|
| Scripting, CI, piping into `run`/`deploy` | [CLI]({{ site.baseurl }}/cli-reference) |
| Rich forms, filters, deploy renderers, audit viewer | [Web UI]({{ site.baseurl }}/web-ui) |
| Fast keyboard browsing inside the terminal | **TUI** (this page) |
| Agents using secrets without seeing them | [MCP]({{ site.baseurl }}/mcp) |
