"""Capture the four concealer interfaces on the Windows CI runner and render each
to a PNG under the output dir (default ./win-artifacts). For documentation.

Creates a throwaway vault (master password 'pw'), adds a few DUMMY secrets, then:
  * CLI  -> win-cli.png     (a `concealer version/list/get/dims` terminal session)
  * MCP  -> win-mcp.png     (initialize + tools/list + list_secrets JSON-RPC exchange)
  * TUI  -> win-tui.png     (curses frame captured via ConPTY, decoded by pyte)
  * web  -> win-web-lock.png + win-web-dashboard.png (real Chromium screenshots)

Everything here is dummy data; no real secret is ever used or shown.
Each capture is best-effort: one failing interface doesn't block the others.
"""
import getpass
import importlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
from contextlib import redirect_stderr, redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render  # noqa: E402

OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "win-artifacts")
os.makedirs(OUT, exist_ok=True)
HOME = os.path.join(os.environ.get("RUNNER_TEMP", os.getcwd()), "cer-capture")
PW = "pw"


def base_env(extra=None):
    e = dict(os.environ, CONCEALER_HOME=HOME, CONCEALER_NO_OPEN="1")
    if extra:
        e.update(extra)
    return e


def make_vault():
    shutil.rmtree(HOME, ignore_errors=True)
    os.makedirs(HOME, exist_ok=True)
    os.environ["CONCEALER_HOME"] = HOME          # must be set before importing concealer
    os.environ["CONCEALER_NO_OPEN"] = "1"
    r = iter([PW] * 12)
    getpass.getpass = lambda *a, **k: next(r)
    m = importlib.import_module("concealer.__main__")
    m.getpass.getpass = getpass.getpass

    def cap(argv):
        b = io.StringIO()
        try:
            with redirect_stdout(b), redirect_stderr(b):
                m.cli(argv)
        except SystemExit:
            pass
        return b.getvalue()

    o1 = cap(["init"])
    o2 = cap(["agent", "register", "ci-agent"])
    ct = re.search(r"CONCEALER_TOKEN=([A-Za-z0-9_-]+)", o1).group(1)
    at = re.search(r'CONCEALER_TOKEN"\s*:\s*"([^"]+)"', o2).group(1)
    return ct, at


def cli_run(args, tok):
    return subprocess.run(["concealer"] + args, env=base_env({"CONCEALER_TOKEN": tok}),
                          capture_output=True, text=True)


def seed_secrets(tok):
    cli_run(["set", "--name", "GITHUB_TOKEN", "ghp-DUMMY-0a1b2c3d4e5f6g7h",
             "--project", "demo", "--environment", "prod", "--repo", "web", "--tags", "ci,scm"], tok)
    cli_run(["set", "--name", "DB_MAIN", "--type", "database",
             "host=db.internal", "port=5432", "username=appuser",
             "password=s3cr3t-DUMMY-pw", "dbname=app",
             "--project", "demo", "--environment", "prod", "--repo", "web"], tok)
    cli_run(["set", "--name", "AWS_CONSOLE", "--type", "login",
             "web_url=https://console.aws.amazon.com", "username=ops@demo.io",
             "password=hunter2-DUMMY", "totp=JBSWY3DPEHPK3PXP",
             "--project", "demo", "--environment", "prod"], tok)


# ---------- CLI ----------
def cap_cli(tok):
    parts = []
    for args in (["version"], ["list"], ["get", "--name", "GITHUB_TOKEN"], ["dims"]):
        parts.append("PS C:\\> concealer " + " ".join(args))
        parts.append(cli_run(args, tok).stdout.rstrip("\n"))
    render.text_png("\n".join(parts), os.path.join(OUT, "win-cli.png"),
                    title="Windows PowerShell — concealer CLI")


# ---------- MCP ----------
def cap_mcp(agent_tok):
    reqs = [
        {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}},
        {"jsonrpc": "2.0", "method": "notifications/initialized"},
        {"jsonrpc": "2.0", "id": 2, "method": "tools/list"},
        {"jsonrpc": "2.0", "id": 3, "method": "tools/call",
         "params": {"name": "list_secrets", "arguments": {"project": "demo"}}},
    ]
    stdin = "".join(json.dumps(x) + "\n" for x in reqs)
    r = subprocess.run(["concealer", "mcp"], input=stdin,
                       env=base_env({"CONCEALER_TOKEN": agent_tok}),
                       capture_output=True, text=True, timeout=90)
    lines = ["PS C:\\> concealer mcp   (agent token; stdio JSON-RPC)", ""]
    for x in reqs:
        if x.get("id"):
            lines.append("--> " + json.dumps(x))
    lines.append("")
    for ln in r.stdout.splitlines():
        if ln.strip():
            lines.append("<-- " + ln)
    render.text_png("\n".join(lines), os.path.join(OUT, "win-mcp.png"),
                    title="Windows PowerShell — concealer mcp (stdio)")


# ---------- TUI ----------
def cap_tui(tok):
    from winpty import PtyProcess
    marks = ("filter", "secret", "detail")

    def once():
        p = PtyProcess.spawn(["concealer", "tui"], dimensions=(35, 120),
                             env=base_env({"CONCEALER_TOKEN": tok}))
        buf = [""]

        def rd():
            while True:
                try:
                    c = p.read(2048)
                except Exception:
                    if not p.isalive():
                        break
                    time.sleep(0.05); continue
                if c:
                    buf[0] += c
                elif not p.isalive():
                    break
        threading.Thread(target=rd, daemon=True).start()
        t = time.time() + 15
        vis = lambda s: re.sub(r"\x1b\[[0-9;?]*[A-Za-z]", "", s).lower()
        while time.time() < t and not all(k in vis(buf[0]) for k in marks):
            time.sleep(0.2)
        time.sleep(1.0)                       # let the final frame settle
        raw = buf[0]
        for k in ("q", "\x11"):
            try: p.write(k)
            except Exception: break
        time.sleep(0.5)
        try: p.terminate(force=True)
        except Exception: pass
        return raw

    raw = once()
    if not all(k in re.sub(r"\x1b\[[0-9;?]*[A-Za-z]", "", raw).lower() for k in marks):
        raw = once()                          # one retry (CI capture can be flaky)
    render.ansi_png(raw, os.path.join(OUT, "win-tui.png"), cols=120, rows=35)


# ---------- web (real Chromium) ----------
def cap_web():
    from playwright.sync_api import sync_playwright
    port = 8791
    srv = subprocess.Popen(["concealer", "web", str(port)], env=base_env(),
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        base = f"http://127.0.0.1:{port}"
        for _ in range(60):
            try:
                urllib.request.urlopen(base + "/api/session", timeout=5); break
            except Exception:
                time.sleep(0.5)
        req = urllib.request.Request(base + "/api/unlock", data=json.dumps({"pw": PW}).encode(),
                                     headers={"Content-Type": "application/json"})
        cookie = urllib.request.urlopen(req, timeout=10).headers.get("Set-Cookie", "").split(";")[0]
        cname, cval = cookie.split("=", 1)
        with sync_playwright() as pw:
            b = pw.chromium.launch()
            ctx = b.new_context(viewport={"width": 1280, "height": 900}, device_scale_factor=2)
            page = ctx.new_page()
            page.goto(base + "/"); page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(OUT, "win-web-lock.png"))
            ctx.add_cookies([{"name": cname, "value": cval, "url": base}])
            page.goto(base + "/"); page.wait_for_timeout(2500)
            page.screenshot(path=os.path.join(OUT, "win-web-dashboard.png"), full_page=True)
            b.close()
    finally:
        srv.terminate()


def main():
    print("creating throwaway vault…", flush=True)
    ct, at = make_vault()
    seed_secrets(ct)
    for name, fn, a in (("CLI", cap_cli, (ct,)), ("MCP", cap_mcp, (at,)),
                        ("TUI", cap_tui, (ct,)), ("web", cap_web, ())):
        try:
            fn(*a); print(f"captured {name}", flush=True)
        except Exception as e:
            print(f"!! {name} capture failed: {e}", flush=True)
    print("artifacts in", OUT)
    for f in sorted(os.listdir(OUT)):
        print("  ", f, os.path.getsize(os.path.join(OUT, f)))


if __name__ == "__main__":
    main()
