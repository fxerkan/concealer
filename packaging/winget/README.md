# winget packaging (deferred — needs a standalone .exe)

Unlike Scoop, **winget installs from real installers** (`.exe`/`.msi`) or portable
binaries — it does not run `pip`. concealer is a pure-Python app, so a clean winget
package needs a **self-contained Windows executable** that bundles Python +
concealer + `webui.html` + `pywinpty` + `windows-curses`. That is a CI build step
(PyInstaller/Nuitka on a Windows runner), not a manifest tweak.

**Until that exe exists, use `pipx install concealer` or Scoop** (see
[`../scoop/concealer.json`](../scoop/concealer.json) and
[`../../docs/WINDOWS.md`](../../docs/WINDOWS.md)) — both work today.

## Plan to finish winget

1. Add a GitHub Actions job on a `windows-latest` runner:
   `pyinstaller --onefile --add-data "webui.html;." --name concealer <entry>`
   producing `concealer-<ver>-win64.exe`, attached to the `vX.Y.Z` GitHub release.
   (Bundle `sops.exe`/`age.exe` too, or keep declaring them as winget dependencies.)
2. Fill in `installer.yaml` below (`InstallerUrl` + `InstallerSha256`) and the
   locale/version manifests, then submit a PR to
   [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs) under
   `manifests/f/fxerkan/concealer/<version>/`.

## Skeleton — `fxerkan.concealer.installer.yaml`

```yaml
PackageIdentifier: fxerkan.concealer
PackageVersion: 0.9.12
InstallerType: portable
Commands:
  - concealer
Installers:
  - Architecture: x64
    InstallerUrl: https://github.com/fxerkan/concealer/releases/download/v0.9.12/concealer-0.9.12-win64.exe
    InstallerSha256: TODO-sha256-of-the-exe
ManifestType: installer
ManifestVersion: 1.6.0
```

`sops` and `age` are still required on PATH. Either bundle them into the exe or
tell users to `winget install getsops.sops FiloSottile.age` first (winget has no
hard "depends" for portable packages, so document it).
