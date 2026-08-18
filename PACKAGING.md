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

### Per release: cut a tag, then update the formula

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

- **Linux (apt/dnf)** — no native package yet. Simplest today: the git-clone method
  above, or `pipx`-style install is N/A (no pip deps). A `.deb`/`.rpm` would just drop
  `concealer` + `webui.html` into `/usr/lib/concealer` and symlink `/usr/bin` — same
  shape as the brew formula, plus `Depends: age, sops, expect, python3`.
- **Scoop / winget (Windows)** — blocked until the `expect` dependency is handled;
  age reads `/dev/tty` and the current flow drives it via `expect`, which is a Unix
  assumption. Windows support is a separate task, not a packaging tweak.
- **Nix** — a flake would be a thin derivation over the same three deps.

Recommendation: ship Homebrew now; add the others only when users ask.
