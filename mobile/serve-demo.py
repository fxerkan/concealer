#!/usr/bin/env python3
"""Run the concealer mobile UI in a plain desktop browser against a disposable DEMO vault.

    python3 mobile/serve-demo.py            # then open http://localhost:8088

It serves mobile/www AND proxies /api/* to a throwaway concealer web backend on the SAME origin,
so the web app (which normally uses Capacitor's native HTTP on a phone) works with browser fetch —
no CORS, no real vault touched. Dummy secrets only. Ctrl+C to stop; the demo vault is deleted on exit.
"""
import os, sys, subprocess, http.server, urllib.request, urllib.error, socketserver, time, shutil, socket

ROOT     = os.path.dirname(os.path.abspath(__file__))
WWW      = os.path.join(ROOT, "www")
CER      = os.path.join(os.path.dirname(ROOT), "concealer")   # the repo's concealer script
DEMOHOME = "/tmp/concealer-demo-vault"
PORT     = int(sys.argv[1]) if len(sys.argv) > 1 else 8088
BACKEND  = PORT + 1
PW       = "demo1234"                                          # DEMO password — dummy vault only

def _free(p):
    s = socket.socket()
    try: s.connect(("127.0.0.1", p)); return False
    except OSError: return True
    finally: s.close()

def seed_vault():
    """Create the demo vault (fixed password) + a few dummy secrets if it doesn't exist yet."""
    env = dict(os.environ, CONCEALER_HOME=DEMOHOME)
    if not os.path.exists(os.path.join(DEMOHOME, "keys", "master.json")):
        os.makedirs(DEMOHOME, exist_ok=True)
        out = subprocess.run([CER, "init"], input=f"{PW}\n{PW}\n", capture_output=True, text=True, env=env).stdout
        tok = next((l.split("=", 1)[1].strip() for l in out.splitlines() if "CONCEALER_TOKEN=" in l), "")
        env2 = dict(env, CONCEALER_TOKEN=tok)
        for args in (["set", "--name", "github-token", "--project", "demo", "--env", "prod", "sk-DUMMY-github-abc"],
                     ["set", "--name", "openai-key", "--project", "demo", "--env", "prod", "sk-DUMMY-openai-xyz"],
                     ["set", "--name", "db-password", "--type", "database", "--project", "demo",
                      "host=db.local", "username=app", "password=sk-DUMMY-dbpw"]):
            subprocess.run([CER] + args, capture_output=True, env=env2)
    return subprocess.Popen([CER, "web", str(BACKEND)], env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=WWW, **k)
    def log_message(self, *a): pass
    def _proxy(self):
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n) if n else None
        # strip Origin so the backend's loopback guard accepts the proxied request (same trick as `concealer lan`)
        hdrs = {k: v for k, v in self.headers.items() if k.lower() not in ("host", "origin", "content-length")}
        hdrs["Host"] = f"127.0.0.1:{BACKEND}"
        req = urllib.request.Request(f"http://127.0.0.1:{BACKEND}{self.path}", data=body, headers=hdrs, method=self.command)
        try:
            with urllib.request.urlopen(req, timeout=30) as r: payload, code, rh = r.read(), r.status, r.headers
        except urllib.error.HTTPError as e: payload, code, rh = e.read(), e.code, e.headers
        except Exception: self.send_response(502); self.send_header("Content-Length", "0"); self.end_headers(); return
        self.send_response(code)
        self.send_header("Content-Type", rh.get("Content-Type", "application/json"))
        self.send_header("Content-Length", str(len(payload))); self.end_headers()
        self.wfile.write(payload)
    def do_POST(self):
        if self.path.startswith("/api/"): return self._proxy()
        self.send_response(404); self.end_headers()
    def do_GET(self):
        if self.path.startswith("/api/"): return self._proxy()
        return super().do_GET()

def main():
    if not _free(BACKEND) or not _free(PORT): sys.exit(f"ports {PORT}/{BACKEND} busy — pass a free port: serve-demo.py 9000")
    web = seed_vault()
    for _ in range(40):
        if not _free(BACKEND): break
        time.sleep(0.15)
    print("\n  concealer mobile UI — browser demo")
    print(f"  ▶  open:  http://localhost:{PORT}")
    print(f"     host address (paste in the app):  http://localhost:{PORT}")
    print(f"     master password:  {PW}")
    print("     (disposable demo vault with dummy secrets — deleted on exit)\n")
    try:
        with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), Handler) as httpd: httpd.serve_forever()
    except KeyboardInterrupt: pass
    finally:
        web.terminate()
        shutil.rmtree(DEMOHOME, ignore_errors=True)
        print("\n  demo stopped, demo vault deleted.")

if __name__ == "__main__": main()
