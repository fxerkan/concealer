# Packaging & publishing `concealer`

How to ship `concealer` to users via Homebrew (and notes for other channels).
The tool is a single stdlib-only Python 3 script + `webui.html`; the only runtime
dependencies are **sops**, **age**, and **expect** — Homebrew installs all three
automatically, so users never install them by hand.

---

## 1. Homebrew (primary channel)

`concealer` ships through a **custom tap** — realistic and fully under your
control (homebrew-core has a high notability bar and is not required).
End result for users:

```bash
brew install fxerkan/tap/concealer   # pulls in sops + age + expect too
concealer help
```

### One-time: create the tap repo

Homebrew taps must live in a repo named `homebrew-<tap>`:

```bash
# GitHub'da yeni repo:  fxerkan/homebrew-tap  (public)
gh repo create fxerkan/homebrew-tap --public --description "Homebrew tap for concealer"
git clone https://github.com/fxerkan/homebrew-tap && cd homebrew-tap
mkdir -p Formula
```

### Per release: fully automated

`.github/workflows/release.yml` does all of the below automatically. When a push
to `main` changes the `VERSION` line in `concealer`, it cuts the `vX.Y.Z` tag +
GitHub release (notes pulled from that version's `CHANGELOG.md` section) and bumps
`Formula/concealer.rb` in `fxerkan/homebrew-tap` (url + sha256). It's idempotent —
re-runs skip if the tag already exists — and can be triggered manually via
**Actions → release → Run workflow** to catch up the current `VERSION`.

**One-time setup:** add a repo secret `HOMEBREW_TAP_TOKEN` — a PAT (classic `repo`,
or fine-grained with **contents:write** on `fxerkan/homebrew-tap`). Without it the
release still cuts but the tap bump step fails.

<details><summary>Manual fallback (if you ever need it)</summary>

1. **Bump & tag** in the `concealer` repo (VERSION + CHANGELOG already updated):

   ```bash
   git tag v0.3.0
   git push origin v0.3.0
   ```

2. **Compute the tarball sha256** (GitHub auto-generates the archive from the tag):

   ```bash
   URL="https://github.com/fxerkan/concealer/archive/refs/tags/v0.3.0.tar.gz"
   curl -sL "$URL" | shasum -a 256      # ya da: brew fetch --formula ./Formula/concealer.rb
   ```

3. **Copy the formula** from this repo's `Formula/concealer.rb` into the tap repo,
   replacing `url` (tag), `version`, and `sha256` with the real values. Then:

   ```bash
   cp /path/to/concealer/Formula/concealer.rb Formula/concealer.rb
   # url/version/sha256'yi guncelle
   git add Formula/concealer.rb && git commit -m "concealer 0.3.0" && git push
   ```

4. **Verify locally before announcing:**

   ```bash
   brew install --build-from-source ./Formula/concealer.rb
   brew test concealer
   brew audit --strict --formula ./Formula/concealer.rb   # policy uyum kontrolu
   concealer help
   ```

Upgrades for users are then just `brew upgrade concealer`.

</details>

### Homebrew policy compliance checklist

- ✅ **License present** — `LICENSE` (MIT) in the repo; `license "MIT"` in the formula.
- ✅ **Stable versioned URL** — points at a git **tag** tarball, not a branch.
- ✅ **Pinned `sha256`** — never `:no_check`.
- ✅ **Declared deps** — `sops`, `age`, `expect`, `python@3.13` via `depends_on`.
- ✅ **`test do` block** — runs `concealer version` / `help` and checks deps on PATH.
- ✅ **No secrets vendored** — the tarball ships the *tool only* (vault data is git-ignored).
- ✅ **`brew audit --strict` clean** — run it before every release.
- ℹ️ A **tap** does not need homebrew-core review; if you later want core inclusion
  the extra bars are notability (~30-day-old, popular repo) and no `version` override.

---

## 2. Universal fallback (no package manager)

For users without Homebrew (or on Linux without the tap), the script runs directly
— they only need `python3`, `sops`, `age`, `expect` on PATH:

```bash
git clone https://github.com/fxerkan/concealer && cd concealer
./concealer help          # ya da PATH'e sembolik link: ln -s "$PWD/concealer" /usr/local/bin/
```

`concealer` prints a clear "missing dependency" error with install hints if any of
sops/age/expect are absent, so this path fails loudly, not silently.

---

## 3. Other channels (scope notes)

These are **more work than Homebrew** and optional — add on demand:

- **pipx / PyPI (all platforms)** — `pyproject.toml` (hatchling) packages the flat
  script as the `concealer` package with `webui.html` bundled; `pywinpty` +
  `windows-curses` are Windows-only deps. `sops`/`age` stay external (not pip
  packages). Build + publish:

  ```bash
  python3 -m build            # → dist/concealer-<ver>-py3-none-any.whl + .tar.gz
  python3 -m twine upload dist/*
  # users:  pipx install concealer
  ```

  Version is read dynamically from the `VERSION` line in `concealer`, so it never
  drifts from the tag/CHANGELOG.
- **Linux (apt/dnf)** — no native package yet. Simplest today: the git-clone method
  above, or `pipx install concealer`. A `.deb`/`.rpm` would just drop `concealer` +
  `webui.html` into `/usr/lib/concealer` and symlink `/usr/bin` — same shape as the
  brew formula, plus `Depends: age, sops, expect, python3`.
- **Scoop / winget (Windows)** — **now supported.** Native Windows drops the `expect`
  dependency and drives age through a ConPTY via `pywinpty` (see `docs/WINDOWS.md`).
  Draft **Scoop** manifest: `packaging/scoop/concealer.json` (works via pip). **winget**
  needs a bundled `.exe` (PyInstaller on a Windows CI runner) — see
  `packaging/winget/README.md`; until then, `pipx install concealer` or Scoop are the
  Windows paths.
- **Nix** — a flake would be a thin derivation over the same three deps.

Recommendation: ship Homebrew + pipx now; add Scoop/winget as users ask.
