#!/usr/bin/env python3
"""Native messaging host for the concealer Chrome extension.

Chrome speaks to this over stdio (4-byte length prefix + JSON). It handles ONE request
per launch: {"cmd":"ensure","port":8787}. If nothing is listening on that port it starts
`concealer web <port>` detached (browser auto-open suppressed, idle self-exit armed so it
never lingers), waits for it to come up, then replies {"ok":true,"running":true,"port":..}.

The concealer command + optional CONCEALER_HOME are read from config.json next to this file,
written by install.py — Chrome launches native hosts with a minimal environment, so we can't
rely on PATH or the user's shell CONCEALER_HOME.
"""
import sys, json, struct, socket, subprocess, os, time, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
IDLE_EXIT = "900"   # server shuts itself down after 15 min idle

def read_msg():
    raw = sys.stdin.buffer.read(4)
    if len(raw) < 4: return None
    n = struct.unpack("@I", raw)[0]
    return json.loads(sys.stdin.buffer.read(n).decode("utf-8"))

def send_msg(obj):
    b = json.dumps(obj).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("@I", len(b))); sys.stdout.buffer.write(b); sys.stdout.buffer.flush()

def port_open(port):
    with socket.socket() as s:
        s.settimeout(0.3)
        try: s.connect(("127.0.0.1", port)); return True
        except OSError: return False

def concealer_cmd():
    try:
        cfg = json.load(open(os.path.join(HERE, "config.json")))
    except Exception:
        cfg = {}
    cmd = cfg.get("cmd")
    if not cmd:
        found = shutil.which("concealer")
        cmd = [found] if found else None
    return cmd, cfg.get("home")

def start(port):
    cmd, home = concealer_cmd()
    if not cmd:
        return {"ok": False, "err": "concealer command not found; re-run install.py"}
    env = dict(os.environ)
    env["CONCEALER_NO_OPEN"] = "1"          # don't pop a browser tab when the extension starts it
    env["CONCEALER_WEB_IDLE_EXIT"] = IDLE_EXIT
    if home: env["CONCEALER_HOME"] = home
    # Chrome gives native hosts a minimal PATH; restore the install-time PATH so concealer
    # can find sops/age/expect (else `web` exits with "missing dependency" before binding).
    try: cfg = json.load(open(os.path.join(HERE, "config.json")))
    except Exception: cfg = {}
    if cfg.get("path"): env["PATH"] = cfg["path"] + os.pathsep + env.get("PATH", "")
    kw = {"stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL, "stdin": subprocess.DEVNULL, "env": env}
    if os.name == "nt":
        kw["creationflags"] = 0x00000008 | 0x00000200  # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
    else:
        kw["start_new_session"] = True
    try:
        subprocess.Popen(list(cmd) + ["web", str(port)], **kw)
    except Exception as e:
        return {"ok": False, "err": f"launch failed: {e}"}
    for _ in range(40):   # wait up to ~6s for it to bind
        if port_open(port): return {"ok": True, "running": True, "port": port, "started": True}
        time.sleep(0.15)
    return {"ok": False, "err": "server did not come up in time"}

def main():
    msg = read_msg()
    if not msg: return
    if msg.get("cmd") == "ensure":
        port = int(msg.get("port") or 8787)
        send_msg({"ok": True, "running": True, "port": port} if port_open(port) else start(port))
    else:
        send_msg({"ok": False, "err": "unknown cmd"})

if __name__ == "__main__":
    main()
