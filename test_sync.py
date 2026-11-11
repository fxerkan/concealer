#!/usr/bin/env python3
"""End-to-end check for `concealer pair` / `concealer sync` between two throwaway vaults.
ssh is replaced by a local stand-in (CONCEALER_SSH) that runs the remote command against the second
vault with NO CONCEALER_TOKEN in its env — the pair token sent on stdin must be enough.
Dummy values only. Run: python3 test_sync.py   (needs the encryption tools; ~1 min)"""
import os, re, sys, json, shlex, subprocess, tempfile

CER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "concealer")
T = tempfile.mkdtemp(prefix="cer-sync-")
A, B = os.path.join(T, "a"), os.path.join(T, "b")
ARGLOG = os.path.join(T, "ssh-argv.log")
FAKE_SSH = os.path.join(T, "fake-ssh.py")
open(FAKE_SSH, "w").write(f"""import os, sys, subprocess
open({ARGLOG!r}, "a").write(repr(sys.argv) + "\\n")
env = {{k: v for k, v in os.environ.items() if k != "CONCEALER_TOKEN"}}
env["CONCEALER_HOME"] = {B!r}
sys.exit(subprocess.run(["sh", "-c", sys.argv[-1]], env=env).returncode)
""")
REMOTE_CMD = f"{shlex.quote(sys.executable)} {shlex.quote(CER)}"

def run(home, args, inp="", tok=None, ok=True):
    env = {k: v for k, v in os.environ.items() if k != "CONCEALER_TOKEN"}
    env.update(CONCEALER_HOME=home, CONCEALER_SSH=f"{sys.executable} {FAKE_SSH}")
    if tok: env["CONCEALER_TOKEN"] = tok
    # new session = no controlling tty → password prompts read stdin
    r = subprocess.run([sys.executable, CER] + args, input=inp, env=env, capture_output=True, text=True, start_new_session=True)
    if ok: assert r.returncode == 0, f"{args}: rc={r.returncode}\n{r.stdout}\n{r.stderr}"
    return r

def init(home, pw):
    out = run(home, ["init"], f"{pw}\n{pw}\n").stdout
    return re.search(r"CONCEALER_TOKEN=([A-Za-z0-9_-]+)", out).group(1)

def get(home, tok, name, ok=True):
    r = run(home, ["get", "--name", name, "--project", "p", "--env", "prod"], tok=tok, ok=ok)
    return r.stdout.strip() if r.returncode == 0 else None

def audit(home):
    return [json.loads(l) for l in open(os.path.join(home, "keys", "audit.log")) if l.strip()]

def main():
    ta, tb = init(A, "pw-A-dummy"), init(B, "pw-B-dummy")
    run(A, ["set", "--name", "ONLY_A", "--project", "p", "--env", "prod", "sk-DUMMY-a1"], tok=ta)
    run(B, ["set", "--name", "ONLY_B", "--project", "p", "--env", "prod", "sk-DUMMY-b1"], tok=tb)

    # sync before pairing is refused
    assert "not paired" in run(A, ["sync", "hostB"], tok=ta, ok=False).stderr

    # wrong remote master password → no pairing, no token minted there
    r = run(A, ["pair", "hostB", "--remote-cmd", REMOTE_CMD], "pw-A-dummy\nwrong\n", ok=False)
    assert "wrong master password" in r.stderr, r.stderr
    run(A, ["pair", "hostB", "--remote-cmd", REMOTE_CMD], "pw-A-dummy\npw-B-dummy\n")
    assert "hostB" in run(A, ["pair", "--list"], tok=ta).stdout
    assert "serves sync" in run(B, ["pair", "--list"], tok=tb).stdout

    # dry run changes nothing on either side
    assert "sent 1, received 2; updated here 1, there 1" in run(A, ["sync", "hostB", "--dry"], tok=ta).stdout
    assert get(A, ta, "ONLY_B", ok=False) is None and get(B, tb, "ONLY_A", ok=False) is None

    # first sync: both directions converge
    run(A, ["sync", "hostB"], tok=ta)
    assert get(A, ta, "ONLY_B") == "sk-DUMMY-b1" and get(B, tb, "ONLY_A") == "sk-DUMMY-a1"

    # newer edit on B wins on A; deletion on A tombstones on B (LWW, run with token only — no password)
    import time; time.sleep(1.1)   # timestamps have 1 s resolution
    run(B, ["set", "--name", "ONLY_A", "--project", "p", "--env", "prod", "sk-DUMMY-a2"], tok=tb)
    run(A, ["rm", "--name", "ONLY_B", "--project", "p", "--env", "prod"], tok=ta)
    run(A, ["sync", "hostB"], tok=ta)
    assert get(A, ta, "ONLY_A") == "sk-DUMMY-a2"
    assert get(B, tb, "ONLY_B", ok=False) is None

    # audit: every sync recorded on both sides, counts only
    sa = [x for x in audit(A) if x["action"] == "sync"]; sb = [x for x in audit(B) if x["action"] == "sync"]
    assert len(sa) == 3 and len(sb) == 3 and "sent=" in sa[-1]["detail"] and "recv=" in sb[-1]["detail"]
    assert run(A, ["audit", "verify"], tok=ta).stdout and run(B, ["audit", "verify"], tok=tb).stdout

    # no plaintext value or password anywhere on disk / in the transport argv
    for root, _, files in os.walk(T):
        for f in files:
            if f == "fake-ssh.py": continue
            blob = open(os.path.join(root, f), "rb").read()
            for needle in (b"sk-DUMMY", b"pw-B-dummy", b"pw-A-dummy"):
                assert needle not in blob, f"{needle!r} leaked into {os.path.join(root, f)}"

    # the sync token is not an MCP agent
    tl = [t for t in json.load(open(os.path.join(B, "keys", "agents.json")))["tokens"] if t["source"] == "sync"]
    assert len(tl) == 1 and tl[0]["label"].startswith("sync:")

    # forged frame with a bogus token is refused
    env = dict(os.environ, CONCEALER_HOME=B); env.pop("CONCEALER_TOKEN", None)
    r = subprocess.run([sys.executable, CER, "sync-serve"], input=json.dumps({"op": "sync", "token": "x", "from": "y"}),
                       env=env, capture_output=True, text=True)
    assert "not paired" in json.loads(r.stdout)["error"]

    # revoke from A: B drops the peer and its token; further syncs fail
    run(A, ["pair", "--revoke", "hostB"], tok=ta)
    assert not [t for t in json.load(open(os.path.join(B, "keys", "agents.json")))["tokens"] if t["source"] == "sync"]
    assert "no pairings" in run(B, ["pair", "--list"], tok=tb).stdout
    assert "not paired" in run(A, ["sync", "hostB"], tok=ta, ok=False).stderr
    print("ok", T)

if __name__ == "__main__":
    main()
