#!/usr/bin/env python3
"""Install (or --uninstall) the concealer native messaging host for the Chrome extension.

One-time setup on macOS / Linux / Windows. Idempotent. After running, load the extension
folder as an unpacked extension (chrome://extensions → Developer mode → Load unpacked) and
restart Chrome. From then on the popup starts `concealer web` on demand — no `cer web`.

  python3 extension/install.py                 # auto-detect the concealer script
  python3 extension/install.py /path/concealer # point at a specific concealer script
  python3 extension/install.py --uninstall
"""
import sys, os, json, stat, shutil

HOST_NAME = "com.concealer.host"
EXT_ID = "bkogcelhpcfdfceaoickckmikhglgpae"   # deterministic ID from manifest.json "key"
HERE = os.path.dirname(os.path.abspath(__file__))
NHDIR = os.path.join(HERE, "nativehost")
HOSTPY = os.path.join(NHDIR, "concealer_host.py")

def find_concealer(argv):
    for a in argv:
        if not a.startswith("-"):
            p = os.path.abspath(os.path.expanduser(a))
            if os.path.exists(p): return p
            sys.exit(f"not found: {p}")
    # repo checkout: concealer sits one level up from extension/
    repo = os.path.abspath(os.path.join(HERE, "..", "concealer"))
    if os.path.exists(repo): return repo
    w = shutil.which("concealer")
    if w: return os.path.realpath(w)
    sys.exit("could not find the `concealer` script — pass its path: install.py /path/to/concealer")

def browser_dirs():
    home = os.path.expanduser("~")
    if sys.platform == "darwin":
        base = os.path.join(home, "Library", "Application Support")
        subs = ["Google/Chrome", "Google/Chrome Beta", "Google/Chrome Canary", "Chromium",
                "BraveSoftware/Brave-Browser", "Microsoft Edge"]
    else:  # linux / other posix
        base = os.path.join(home, ".config")
        subs = ["google-chrome", "google-chrome-beta", "chromium",
                "BraveSoftware/Brave-Browser", "microsoft-edge"]
    return base, subs

def launcher_path():
    return os.path.join(NHDIR, "run_host.bat" if os.name == "nt" else "run_host.sh")

def write_launcher(python):
    lp = launcher_path()
    if os.name == "nt":
        body = f'@echo off\r\n"{python}" "{HOSTPY}" %*\r\n'
    else:
        body = f'#!/bin/sh\nexec "{python}" "{HOSTPY}"\n'
    open(lp, "w", newline="").write(body)
    if os.name != "nt": os.chmod(lp, os.stat(lp).st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
    return lp

def manifest(launcher):
    return {"name": HOST_NAME, "description": "concealer native messaging host", "type": "stdio",
            "path": launcher, "allowed_origins": [f"chrome-extension://{EXT_ID}/"]}

def install(argv):
    concealer = find_concealer(argv)
    python = sys.executable or shutil.which("python3") or "python3"
    # config the host reads at runtime (Chrome gives native hosts a bare env → pin everything)
    cfg = {"cmd": [python, concealer], "path": os.environ.get("PATH", "")}
    # Chrome launches native hosts with a minimal PATH (no /opt/homebrew/bin), so the child
    # `concealer web` can't find sops/age and exits before binding. Bake the install-time PATH.
    #
    # Vault: run the (newer, feature-complete) repo script, but against the user's REAL vault.
    # Priority: explicit CONCEALER_HOME → the global default ~/.concealer if it's initialized
    # (that's the brew-installed `cer`'s vault) → otherwise the repo script's own default.
    home = os.environ.get("CONCEALER_HOME")
    if not home:
        cand = os.path.expanduser("~/.concealer")
        if os.path.exists(os.path.join(cand, "secrets.enc.yaml")) or os.path.isdir(os.path.join(cand, "keys")):
            home = cand
    if home: cfg["home"] = home
    json.dump(cfg, open(os.path.join(NHDIR, "config.json"), "w"), indent=2)
    launcher = write_launcher(python)
    man = manifest(launcher)
    print(f"concealer : {concealer}")
    print(f"python    : {python}")
    print(f"vault     : {cfg.get('home') or '(script default)'}")

    written = []
    if os.name == "nt":
        import winreg
        # manifest lives next to the host; registry points browsers at it
        mpath = os.path.join(NHDIR, HOST_NAME + ".json")
        json.dump(man, open(mpath, "w"), indent=2)
        for root in [r"Software\Google\Chrome\NativeMessagingHosts",
                     r"Software\Microsoft\Edge\NativeMessagingHosts",
                     r"Software\Chromium\NativeMessagingHosts"]:
            try:
                k = winreg.CreateKey(winreg.HKEY_CURRENT_USER, root + "\\" + HOST_NAME)
                winreg.SetValueEx(k, "", 0, winreg.REG_SZ, mpath); winreg.CloseKey(k); written.append(root)
            except OSError as e:
                print(f"  skip {root}: {e}")
    else:
        base, subs = browser_dirs()
        targets = [os.path.join(base, s) for s in subs if os.path.isdir(os.path.join(base, s))]
        if not targets:  # no browser profile dir yet → still set up the primary Chrome path
            targets = [os.path.join(base, subs[0])]
        for d in targets:
            nh = os.path.join(d, "NativeMessagingHosts"); os.makedirs(nh, exist_ok=True)
            json.dump(man, open(os.path.join(nh, HOST_NAME + ".json"), "w"), indent=2)
            written.append(nh)

    print("\ninstalled native host for:")
    for w in written: print("  " + w)
    print(f"\nNext:\n  1) chrome://extensions → Developer mode → Load unpacked → {HERE}")
    print(f"  2) confirm the extension ID is {EXT_ID}")
    print("  3) restart Chrome, then click the concealer toolbar icon.")

def uninstall():
    removed = []
    for p in [os.path.join(NHDIR, "config.json"), launcher_path(), os.path.join(NHDIR, HOST_NAME + ".json")]:
        if os.path.exists(p): os.remove(p); removed.append(p)
    if os.name == "nt":
        import winreg
        for root in [r"Software\Google\Chrome\NativeMessagingHosts",
                     r"Software\Microsoft\Edge\NativeMessagingHosts",
                     r"Software\Chromium\NativeMessagingHosts"]:
            try: winreg.DeleteKey(winreg.HKEY_CURRENT_USER, root + "\\" + HOST_NAME); removed.append(root)
            except OSError: pass
    else:
        base, subs = browser_dirs()
        for s in subs:
            p = os.path.join(base, s, "NativeMessagingHosts", HOST_NAME + ".json")
            if os.path.exists(p): os.remove(p); removed.append(p)
    print("removed:" if removed else "nothing to remove")
    for r in removed: print("  " + r)

if __name__ == "__main__":
    if "--uninstall" in sys.argv: uninstall()
    else: install(sys.argv[1:])
