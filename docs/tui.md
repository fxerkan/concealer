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

The screen has three panels — **1 · Filters**, **2 · Secrets**, **3 · Details**. Move focus between them, browse, reveal, copy, and edit entirely from the keyboard. Secret fields stay **masked** until you reveal them — the same record-aware masking rules as everywhere else (see [Secret Types]({{ site.baseurl }}/secret-types)).

![concealer TUI — searchable secret list]({{ site.baseurl }}/assets/tui-secrets.png)

---

## Keyboard shortcuts
{: .no_toc }

Press <kbd>?</kbd> anytime to see this table in-app. It is bilingual (press <kbd>L</kbd> to toggle TR/EN).

### Panels & focus

| Keys | Action |
|---|---|
| <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> | Cycle focus through the visible panels |
| <kbd>←</kbd> <kbd>→</kbd> / <kbd>h</kbd> <kbd>l</kbd> | Move focus between panels |
| <kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd> | Jump straight to Filters / Secrets / Details |

### Navigation

| Keys | Action |
|---|---|
| <kbd>↑</kbd> <kbd>↓</kbd> / <kbd>j</kbd> <kbd>k</kbd> | Move the selection up / down |
| <kbd>g</kbd> / <kbd>G</kbd> | Jump to top / bottom |
| <kbd>PgUp</kbd> / <kbd>PgDn</kbd>, <kbd>Ctrl</kbd>+<kbd>U</kbd> / <kbd>Ctrl</kbd>+<kbd>D</kbd> | Page up / down |

### Search & filters

| Keys | Action |
|---|---|
| <kbd>s</kbd> or <kbd>/</kbd> | Live search — filters as you type |
| <kbd>Esc</kbd> | Clear the search / exit search mode |
| <kbd>Space</kbd> / <kbd>Enter</kbd> | In the Filters panel: toggle a facet (type, project, env, tenant, repo, tag) |
| <kbd>x</kbd> | Clear all active filters |

### Reveal & copy

| Keys | Action |
|---|---|
| <kbd>m</kbd> | In the Secrets panel: reveal / hide **all** fields of the selected record |
| <kbd>↑</kbd> <kbd>↓</kbd> / <kbd>j</kbd> <kbd>k</kbd> then <kbd>Enter</kbd> / <kbd>m</kbd> | In the Details panel: pick a field and reveal just that one |
| <kbd>c</kbd> | Copy the **value** to the clipboard |
| <kbd>u</kbd> | Copy the **username** |
| <kbd>w</kbd> | Copy the **url** |

The clipboard is **auto-cleared after 45 seconds** (uses `pbcopy` / `xclip` / `wl-copy`). There is no *paste* — the TUI reads secrets out; to put a value **in**, use add/edit below.

### Edit the vault

| Keys | Action |
|---|---|
| <kbd>a</kbd> | Add a new secret (type-aware form) |
| <kbd>e</kbd> | Edit the selected secret |
| <kbd>d</kbd> | Delete the selected secret (with confirm) |
| <kbd>r</kbd> | Rotate its value to a random one |

### App

| Keys | Action |
|---|---|
| <kbd>R</kbd> | Reload the vault from disk |
| <kbd>Ctrl</kbd>+<kbd>L</kbd> | Force a redraw |
| <kbd>L</kbd> | Toggle language (TR / EN) |
| <kbd>?</kbd> | Show the in-app help |
| <kbd>q</kbd> / <kbd>Ctrl</kbd>+<kbd>Q</kbd> | Quit |

{: .note }
> **Terminal rendering:** concealer draws box characters (`┌│─`) in UTF-8 terminals and falls back to ASCII (`+-\|`) where needed (e.g. VS Code's integrated terminal). Force it with `CONCEALER_TUI_ASCII=1` (ASCII) or `=0` (UTF-8).

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
