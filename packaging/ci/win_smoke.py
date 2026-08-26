"""End-to-end Windows smoke test for concealer (run on a real Windows host / CI).

Exercises all four interfaces on Windows, every one of which ends up driving
`age` through pywinpty's ConPTY (the Windows stand-in for Unix `expect`):

  * CLI   — init + agent register are driven through a ConPTY (getpass on Windows
            reads the console, NOT stdin, so they can't be piped); then set/get/list
            run non-interactively via CONCEALER_TOKEN.
  * web   — POST /api/unlock (master pw → age -d via pywinpty inside the server),
            then GET /api/secrets asserts the value is masked.
  * MCP   — registered-agent token → tools/list + list_secrets; asserts the secret
            name is present but the plaintext value never is.
  * TUI   — launched in a ConPTY (windows-curses), sent 'q', must start+exit clean.

Runs each block independently, prints a PASS/FAIL summary, exits non-zero if any
failed (so one failure doesn't mask the others). Uses only dummy secret values.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request

for _s in (sys.stdout, sys.stderr):   # utf-8 so our own logs never hit cp1252 issues
    try: _s.reconfigure(encoding="utf-8")
    except Exception: pass

DUMMY = "sk-DUMMY-WINCI-abc123"      # never a real secret
PW = "pw"
HOME = os.path.join(tempfile.gettempdir(), "concealer-winci")
PORT = 8799
results = {}


def log(msg):
    print(msg, flush=True)


def _watchdog(seconds):
    """Hard backstop: no matter what hangs, force-exit with a summary so the CI
    step always ends and its log becomes visible (a blocked ConPTY read has no
    timeout of its own)."""
    def bomb():
        t0 = time.time()
        while time.time() - t0 < seconds:
            time.sleep(1)
        log(f"\n!! WATCHDOG fired after {seconds}s — something hung. Partial results:")
        for k in ("age/pty", "CLI", "web", "MCP", "TUI"):
            log(f"  {k:8} {results.get(k, 'not reached')}")
        os._exit(3)
    threading.Thread(target=bomb, daemon=True).start()


def env(extra=None):
    e = dict(os.environ, CONCEALER_HOME=HOME, CONCEALER_NO_OPEN="1")
    if extra:
        e.update(extra)
    return e


# ---------- ConPTY driver (drives getpass/age via a real pseudo-console) ----------
def _kill(p):
    for m in ("terminate", "close"):
        try:
            getattr(p, m)(force=True) if m == "terminate" else getattr(p, m)()
        except Exception:
            pass


def pty_interact(argv, sends, timeout=60):
    """Spawn argv in a ConPTY; for each (needle, response) wait for `needle` in the
    output then type `response`. Bounded: always terminates the child, never blocks
    on wait(). Returns (exit_code_or_None, full_output)."""
    from winpty import PtyProcess
    log(f"    pty spawn: {' '.join(argv)}")
    p = PtyProcess.spawn(argv)
    buf = [""]
    done = threading.Event()

    def reader():
        while True:
            try:
                c = p.read(1024)
            except Exception:
                break
            if c:
                buf[0] += c
            elif not p.isalive():
                break
        done.set()

    threading.Thread(target=reader, daemon=True).start()
    deadline = time.time() + timeout
    try:
        for needle, resp in sends:
            seen = ""
            while needle.lower() not in buf[0].lower():
                if done.is_set():
                    raise RuntimeError(f"exited before prompt {needle!r}. tail: {buf[0][-400:]!r}")
                if time.time() > deadline:
                    raise TimeoutError(f"prompt {needle!r} never appeared in {timeout}s. tail: {buf[0][-400:]!r}")
                time.sleep(0.05)
            log(f"    saw {needle!r} -> sending response")
            full = buf[0]
            p.write(resp)
            buf[0] = ""
        # brief drain for trailing output (e.g. the token line), then STOP — never block
        drain_until = min(deadline, time.time() + 20)
        while not done.is_set() and time.time() < drain_until:
            time.sleep(0.05)
    finally:
        out = buf[0]
        rc = None
        # bounded wait: poll isalive, then force-kill. Do NOT call p.wait() (it blocks).
        w = time.time() + 8
        while p.isalive() and time.time() < w:
            time.sleep(0.1)
        try:
            rc = p.exitstatus if not p.isalive() else None
        except Exception:
            rc = None
        _kill(p)
    return rc, out


# ---------- core: pywinpty drives age at all (single-level ConPTY, no vault) ----------
def test_age_pty():
    """The heart of the port: encrypt+decrypt a temp file with `age -p`/`-d` driven
    by concealer_win.age_pw (pywinpty). Independent of init/getpass/nesting."""
    import concealer_win
    d = tempfile.mkdtemp()
    plain, enc, dec = (os.path.join(d, n) for n in ("p.txt", "p.age", "p.out"))
    with open(plain, "w") as f:
        f.write("hello-conpty")
    rc, out = concealer_win.age_pw(["-p", "-o", enc, plain], PW, confirm=True)
    if rc != 0 or not os.path.exists(enc):
        raise RuntimeError(f"age ENCRYPT via pywinpty failed rc={rc}: {out[-400:]!r}")
    rc, out = concealer_win.age_pw(["-d", "-o", dec, enc], PW)
    if rc != 0:
        raise RuntimeError(f"age DECRYPT via pywinpty failed rc={rc}: {out[-400:]!r}")
    if open(dec).read().strip() != "hello-conpty":
        raise RuntimeError("age round-trip via pywinpty produced wrong plaintext")
    log("  pywinpty drives age -p/-d round-trip OK (single-level ConPTY)")


# ---------- CLI ----------
def test_cli():
    # fresh vault
    import shutil
    shutil.rmtree(HOME, ignore_errors=True)
    os.makedirs(HOME, exist_ok=True)

    # init — ConPTY, feed master pw twice; this also runs age -p via pywinpty internally
    rc, out = pty_interact(["concealer", "init"], [("password", PW + "\r"), ("Repeat", PW + "\r")])
    m = re.search(r"CONCEALER_TOKEN=(\S+)", out)
    if not m:
        raise RuntimeError(f"init: no CLI token in output. tail: {out[-600:]!r}")
    cli_tok = m.group(1)
    if "RECOVERY CODES" not in out.upper():
        raise RuntimeError("init: recovery codes not printed")
    log(f"  init OK (rc={rc}, token {cli_tok[:6]}…, recovery codes shown)")

    ce = env({"CONCEALER_TOKEN": cli_tok})
    subprocess.run(["concealer", "set", "--name", "winci", "--value", DUMMY,
                    "--project", "ci", "--repo", "ci", "--environment", "test"],
                   env=ce, check=True, capture_output=True, text=True)
    got = subprocess.run(["concealer", "get", "--name", "winci"], env=ce,
                         check=True, capture_output=True, text=True).stdout.strip()
    if got != DUMMY:
        raise RuntimeError(f"get returned {got!r}, expected the dummy value")
    lst = subprocess.run(["concealer", "list"], env=ce, check=True, capture_output=True, text=True).stdout
    if "winci" not in lst:
        raise RuntimeError("list did not show the secret name")
    if DUMMY in lst:
        raise RuntimeError("SECURITY: list leaked the plaintext value (should be masked)")
    log("  set/get/list OK (get returns value to owner; list masks it)")

    # agent register — ConPTY, feed master pw; capture the agent token for MCP
    rc, out = pty_interact(["concealer", "agent", "register", "ci-agent"], [("password", PW + "\r")])
    m = re.search(r'CONCEALER_TOKEN"\s*:\s*"([^"]+)"', out)
    if not m:
        raise RuntimeError(f"agent register: no agent token. tail: {out[-600:]!r}")
    log("  agent register OK")
    return cli_tok, m.group(1)


# ---------- web ----------
def _req(method, path, data=None, cookie=None):
    url = f"http://127.0.0.1:{PORT}{path}"
    body = json.dumps(data).encode() if data is not None else None
    r = urllib.request.Request(url, data=body, method=method)
    if data is not None:
        r.add_header("Content-Type", "application/json")
    if cookie:
        r.add_header("Cookie", cookie)
    resp = urllib.request.urlopen(r, timeout=10)
    return resp, resp.read().decode()


def test_web():
    srv = subprocess.Popen(["concealer", "web", str(PORT)], env=env(),
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        # wait for the server (unauthenticated /api/session)
        for _ in range(60):
            try:
                _req("GET", "/api/session")
                break
            except Exception:
                if srv.poll() is not None:
                    raise RuntimeError("web server exited early:\n" + (srv.stdout.read() if srv.stdout else ""))
                time.sleep(0.5)
        else:
            raise RuntimeError("web server never came up")

        # unlock: master pw → age -d via pywinpty inside the server process
        resp, txt = _req("POST", "/api/unlock", {"pw": PW})
        if '"ok": true' not in txt.lower() and '"ok":true' not in txt.lower():
            raise RuntimeError(f"unlock failed: {txt!r}")
        setc = resp.headers.get("Set-Cookie", "")
        mck = re.search(r"(tok=[^;]+)", setc)
        if not mck:
            raise RuntimeError("unlock returned no session cookie")
        log("  /api/unlock OK (age decrypt via pywinpty inside the server)")

        _, secrets = _req("GET", "/api/secrets", cookie=mck.group(1))
        if "winci" not in secrets:
            raise RuntimeError("/api/secrets did not include the secret")
        if DUMMY in secrets:
            raise RuntimeError("SECURITY: /api/secrets leaked the plaintext value")
        log("  /api/secrets OK (masked)")
    finally:
        srv.terminate()
        try:
            srv.wait(timeout=10)
        except Exception:
            srv.kill()


# ---------- MCP ----------
def test_mcp(agent_tok):
    lines = [
        {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}},
        {"jsonrpc": "2.0", "method": "notifications/initialized"},
        {"jsonrpc": "2.0", "id": 2, "method": "tools/list"},
        {"jsonrpc": "2.0", "id": 3, "method": "tools/call",
         "params": {"name": "list_secrets", "arguments": {}}},
    ]
    stdin = "".join(json.dumps(x) + "\n" for x in lines)
    r = subprocess.run(["concealer", "mcp"], input=stdin, env=env({"CONCEALER_TOKEN": agent_tok}),
                       capture_output=True, text=True, timeout=120)
    out = r.stdout
    ids = {}
    for ln in out.splitlines():
        ln = ln.strip()
        if not ln:
            continue
        try:
            o = json.loads(ln)
        except Exception:
            continue
        if "id" in o:
            ids[o["id"]] = o
    if 2 not in ids or "result" not in ids[2] or len(ids[2]["result"].get("tools", [])) < 4:
        raise RuntimeError(f"tools/list missing/short: {out[-600:]!r}")
    if 3 not in ids:
        raise RuntimeError(f"tools/call had no response: {out[-600:]!r}")
    call_text = json.dumps(ids[3])
    if "winci" not in call_text:
        raise RuntimeError("list_secrets did not include the secret name")
    if DUMMY in call_text:
        raise RuntimeError("SECURITY: MCP list_secrets leaked the plaintext value")
    log("  MCP initialize + tools/list + list_secrets OK (name shown, value never)")


# ---------- TUI ----------
def test_tui():
    # Launch curses TUI in a ConPTY, let it draw, send 'q' to quit. Must exit cleanly.
    from winpty import PtyProcess
    p = PtyProcess.spawn(["concealer", "tui"], dimensions=(30, 100), env=env())
    time.sleep(3.0)
    if not p.isalive():
        raise RuntimeError("TUI exited before we could interact (curses init failed?)")
    # Try the documented quit keys in turn (curses input via winpty can be finicky).
    quit_ok = False
    for key in ("q", "\x11", "q\r", "\x1b"):   # q, Ctrl-Q, q+Enter, Esc
        try:
            p.write(key)
        except Exception:
            break
        t = time.time() + 4
        while p.isalive() and time.time() < t:
            time.sleep(0.2)     # poll only — do NOT p.read() (it can block)
        if not p.isalive():
            quit_ok = True
            break
    _kill(p)
    if not quit_ok:
        raise RuntimeError("TUI started but did not quit on q/Ctrl-Q/Esc")
    log("  TUI started (windows-curses) and quit")


def run(name, fn, *a):
    try:
        out = fn(*a)
        results[name] = "PASS"
        return out
    except Exception as e:
        results[name] = f"FAIL: {e}"
        log(f"  !! {name} FAILED: {e}")
        return None


def main():
    _watchdog(240)          # hard backstop so the CI step can never hang forever
    log("== concealer Windows smoke ==")
    log("[age/pty]")
    run("age/pty", test_age_pty)
    log("[CLI]")
    toks = run("CLI", test_cli)
    if toks:
        cli_tok, agent_tok = toks
        log("[web]")
        run("web", test_web)
        log("[MCP]")
        run("MCP", test_mcp, agent_tok)
    else:
        results.setdefault("web", "SKIP (CLI/init failed)")
        results.setdefault("MCP", "SKIP (CLI/init failed)")
    log("[TUI]")
    run("TUI", test_tui)

    log("\n== summary ==")
    for k in ("age/pty", "CLI", "web", "MCP", "TUI"):
        log(f"  {k:8} {results.get(k, 'SKIP')}")
    if any(str(v).startswith("FAIL") for v in results.values()):
        sys.exit(1)
    log("ALL PASS")


if __name__ == "__main__":
    main()
