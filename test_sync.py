#!/usr/bin/env python3
"""End-to-end check for `concealer pair` / `concealer sync` between two throwaway vaults.
ssh is replaced by a local stand-in (CONCEALER_SSH) that behaves like a non-interactive ssh session:
it joins the remote words into one shell string, and runs it with a clean env (HOME + PATH=/usr/bin:/bin,
no CONCEALER_*), so the remote vault is found at $HOME/.concealer and the tools via the PATH prefix.
Dummy values only. Run: python3 test_sync.py   (needs the encryption tools; ~3 min)"""
import os, re, sys, json, time, glob, shlex, fcntl, shutil, subprocess, tempfile, importlib.util
from importlib.machinery import SourceFileLoader

CER_SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "concealer")
T = tempfile.mkdtemp(prefix="cer-sync-")
RHOME = os.path.join(T, "remote-home")                       # the "remote user's" $HOME
# Run a copy outside the checkout: next to a repo checkout that holds a dev vault (keys/), the script would
# default to THAT vault and the "remote" side would touch a real vault instead of $HOME/.concealer.
CER = os.path.join(tempfile.mkdtemp(prefix="cer-bin-"), "concealer"); shutil.copy2(CER_SRC, CER)
A, B = os.path.join(T, "a"), os.path.join(RHOME, ".concealer")
ARGLOG = os.path.join(T, "ssh-argv.log")
FAKE_SSH = os.path.join(T, "fake-ssh.py")
open(FAKE_SSH, "w").write(f"""import os, sys, subprocess
open({ARGLOG!r}, "a").write(repr(sys.argv) + "\\n")
a = sys.argv[1:]; i = a.index("--")                    # options end here; then host, then remote words
cmd = " ".join(a[i + 2:])                              # real ssh joins the words into one shell string
env = {{"HOME": {RHOME!r}, "PATH": "/usr/bin:/bin"}}  # non-interactive ssh: no CONCEALER_*, narrow PATH
sys.exit(subprocess.run(["/bin/sh", "-c", cmd], env=env).returncode)
""")
REMOTE_CMD = f"{sys.executable} {CER}"                 # the remote end runs this branch's script
SSH = f"{sys.executable} {FAKE_SSH}"
PWA, PWB = "pw-A-dummy", "pw-B-dummy"
S = {}                                                 # shared state between the ordered tests

def run(home, args, inp="", tok=None, ok=True, extra=None):
    env = {k: v for k, v in os.environ.items() if not k.startswith("CONCEALER_")}
    env.update(CONCEALER_HOME=home, CONCEALER_SSH=SSH); env.update(extra or {})
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

def setv(home, tok, name, val):
    run(home, ["set", "--name", name, "--project", "p", "--env", "prod", val], tok=tok)

def audit(home):
    return [json.loads(l) for l in open(os.path.join(home, "keys", "audit.log")) if l.strip()]

def vault(home, tok):
    """The decrypted vault dict (test-only peek, via the module with a CLI token)."""
    code = "import runpy,json;g=runpy.run_path(%r,run_name='c');print(json.dumps(g['load']()))" % CER
    env = {k: v for k, v in os.environ.items() if not k.startswith("CONCEALER_")}; env.update(CONCEALER_HOME=home, CONCEALER_TOKEN=tok)
    return json.loads(subprocess.run([sys.executable, "-c", code], env=env, capture_output=True, text=True).stdout)

def sync_tokens(home):
    return [t for t in json.load(open(os.path.join(home, "keys", "agents.json")))["tokens"] if t["source"] == "sync"]

def serve(frame):
    """Talk to B's sync-serve directly (an attacker holding the sync token), through the same fake ssh."""
    r = subprocess.run([sys.executable, FAKE_SSH, "-T", "--", "hostB", f'PATH="$PATH:/opt/homebrew/bin:/usr/local/bin" {REMOTE_CMD} sync-serve'],
                       input=json.dumps(frame), capture_output=True, text=True)
    return json.loads(r.stdout.strip().splitlines()[-1])

def enc_to_b(records):
    pub = open(os.path.join(B, "keys", "pubkey.txt")).read().strip()
    import base64
    return base64.b64encode(subprocess.run(["age", "-r", pub], input=json.dumps({"secrets": records}).encode(),
                                           capture_output=True, check=True).stdout).decode()

# ---------------- tests (ordered; each one names the finding it guards) ----------------
def test_pair_rejects_bad_input():                       # #8 option injection, #10 no "Enter = same", throttle
    ta = S["ta"]
    r = run(A, ["pair", "-oProxyCommand=touch /tmp/x"], ok=False); assert "bad ssh host" in r.stderr, r.stderr
    r = run(A, ["pair", "hostB", "--remote-cmd", "concealer;touch /tmp/x"], ok=False); assert "bad --remote-cmd" in r.stderr
    r = run(A, ["pair", "hostB", "--remote-cmd", REMOTE_CMD], f"{PWA}\n\n", ok=False)
    assert "remote master password is required" in r.stderr, r.stderr
    r = run(A, ["pair", "hostB", "--remote-cmd", REMOTE_CMD], f"{PWA}\nwrong\n", ok=False)
    assert "wrong master password" in r.stderr, r.stderr
    assert json.load(open(os.path.join(B, "keys", "pairfail.json")))["n"] == 1   # next attempt is delayed
    assert "not paired" in run(A, ["sync", "hostB"], tok=ta, ok=False).stderr

def test_pair_and_token_label_uses_peer_id():            # #7
    run(A, ["pair", "hostB", "--remote-cmd", REMOTE_CMD], f"{PWA}\n{PWB}\n")
    aid = json.load(open(os.path.join(A, "keys", "serverinfo.json")))["id"]
    assert [t["label"] for t in sync_tokens(B)] == [f"sync:{aid}"]
    assert json.load(open(os.path.join(B, "keys", "pairfail.json")))["n"] == 0
    assert "hostB" in run(A, ["pair", "--list"], tok=S["ta"]).stdout
    assert "serves sync" in run(B, ["pair", "--list"], tok=S["tb"]).stdout
    S["aid"] = aid; S["stok"] = next(iter(vault(A, S["ta"])["sync_peers"].values()))["token"]

def test_dry_run_changes_nothing():
    out = run(A, ["sync", "hostB", "--dry"], tok=S["ta"]).stdout
    assert "sent 1, received 2; updated here 1, there 1" in out, out
    assert get(A, S["ta"], "ONLY_B", ok=False) is None and get(B, S["tb"], "ONLY_A", ok=False) is None

def test_converge_with_snapshot():                       # #1 restore point before every merge
    run(A, ["sync", "hostB"], tok=S["ta"])
    assert get(A, S["ta"], "ONLY_B") == "sk-DUMMY-b1" and get(B, S["tb"], "ONLY_A") == "sk-DUMMY-a1"
    for h in (A, B): assert glob.glob(os.path.join(h, "keys", "snapshots", "pre-sync-*.enc.yaml")), h

def test_lww_newer_edit_wins():
    time.sleep(1.1)   # timestamps have 1 s resolution
    setv(B, S["tb"], "ONLY_A", "sk-DUMMY-a2")
    run(A, ["sync", "hostB"], tok=S["ta"])
    assert get(A, S["ta"], "ONLY_A") == "sk-DUMMY-a2"

def test_single_delete_small_vault_passes():             # D3: one deletion in a tiny vault needs no flag
    setv(A, S["ta"], "SOLO", "sk-DUMMY-solo"); run(A, ["sync", "hostB"], tok=S["ta"])
    run(A, ["rm", "--name", "SOLO", "--project", "p", "--env", "prod"], tok=S["ta"])
    run(A, ["sync", "hostB"], tok=S["ta"]); assert get(B, S["tb"], "SOLO", ok=False) is None

def _module(home):
    os.environ["CONCEALER_HOME"] = home
    try:
        spec = importlib.util.spec_from_loader("cer", SourceFileLoader("cer", CER))
        cer = importlib.util.module_from_spec(spec); spec.loader.exec_module(cer); return cer
    finally: os.environ.pop("CONCEALER_HOME", None)

def test_equal_timestamp_tiebreak():                     # #11
    cer = _module(A)
    ts = "2026-01-01T00:00:00+00:00"
    x = {"id": "r1", "name": "K", "fields": {"value": "one"}, "updated": ts, "created": ts}
    y = {"id": "r1", "name": "K", "fields": {"value": "two"}, "updated": ts, "created": ts}
    d1 = {"secrets": [cer.norm(dict(x))]}; d2 = {"secrets": [cer.norm(dict(y))]}
    cer.sync_merge(d1, [y]); cer.sync_merge(d2, [x])
    assert d1["secrets"][0]["fields"] == d2["secrets"][0]["fields"], "both sides must pick the same version"

def test_mass_delete_needs_allow_deletes():              # #1 mass tombstone guard
    for i in range(4): setv(A, S["ta"], f"X{i}", f"sk-DUMMY-x{i}")
    run(A, ["sync", "hostB"], tok=S["ta"]); assert get(B, S["tb"], "X0") == "sk-DUMMY-x0"
    for i in range(4): run(A, ["rm", "--name", f"X{i}", "--project", "p", "--env", "prod"], tok=S["ta"])
    r = run(A, ["sync", "hostB"], tok=S["ta"], ok=False)
    assert "refusing to delete 4" in r.stderr, r.stderr
    assert get(B, S["tb"], "X0") == "sk-DUMMY-x0", "nothing may be deleted without --allow-deletes"
    r = run(A, ["sync", "hostB", "--allow-deletes"], tok=S["ta"], ok=False)   # D1: B hasn't opted in → peer can't waive it
    assert "refusing to delete 4" in r.stderr and get(B, S["tb"], "X0") == "sk-DUMMY-x0", r.stderr
    run(B, ["config", "sync_accept_remote_deletes", "1"])
    run(A, ["sync", "hostB", "--allow-deletes"], tok=S["ta"])
    assert get(B, S["tb"], "X0", ok=False) is None
    assert glob.glob(os.path.join(B, "keys", "snapshots", "pre-sync-*-del.enc.yaml")), "pre-deletion copy must be marked"
    assert oct(os.stat(os.path.join(B, "keys", "snapshots")).st_mode & 0o777) == "0o700"   # D2

def test_deletion_snapshot_survives_later_syncs():       # Y2: retention by age, deletion copies never pruned
    h = os.path.join(T, "snap"); os.makedirs(os.path.join(h, "keys")); open(os.path.join(h, "secrets.enc.yaml"), "w").write("x")
    cer = _module(h)
    old = cer._snapshot(False); os.utime(old, (time.time() - 15 * 86400,) * 2)   # an ordinary copy past 14 days
    olddel = cer._snapshot(True); os.utime(olddel, (time.time() - 90 * 86400,) * 2)
    for _ in range(11): cer._snapshot(False)
    left = os.listdir(cer.SNAPDIR)
    assert os.path.basename(olddel) in left, "the pre-deletion copy must survive"
    assert os.path.basename(old) not in left and len(left) == 12, left

def test_mobile_sync_bundle_validates():                 # D3: /api/sync path uses _rec_ok too
    cer = _module(A); box = {"d": {"secrets": []}}
    cer._decrypt_bundle = lambda pw, blob: {"secrets": [
        {"id": "m1", "name": "OK", "fields": {}, "updated": "2026-01-01T00:00:00+00:00"},
        {"id": "m2", "name": "FUT", "fields": {}, "updated": "9999-01-01T00:00:00+00:00", "deleted": "9999-01-01T00:00:00+00:00"},
        {"id": "m3", "name": "BAD", "fields": {}, "updated": "2026-01-01T00:00:00+00:00", "admin": 1}]}
    cer.load = lambda: box["d"]; cer.save = lambda d: box.update(d=d); cer._encrypt_bundle = lambda pw, s: b""
    applied, _ = cer.sync_bundle("pw", b"")
    assert applied == 1 and [e["name"] for e in box["d"]["secrets"]] == ["OK"]

def test_future_and_malformed_records_rejected():        # #1 future tombstone, #4 schema/type injection
    bs = vault(B, S["tb"])["secrets"]; ob = next(e for e in bs if e["name"] == "ONLY_B")
    far = "9999-12-31T00:00:00+00:00"
    evil = [{**{k: ob[k] for k in ("id", "name", "tenant", "project", "environment", "repo")}, "fields": {}, "deleted": far, "updated": far},
            {"id": "e2", "name": "INJ", "project": "p", "environment": "prod", "fields": {"value": "x"}, "admin": True,
             "updated": "2026-01-01T00:00:00+00:00"},
            {"id": "e3", "name": "INT", "fields": {}, "updated": 5},
            {"id": "e4", "name": "NEST", "fields": {"value": {"$x": 1}}, "updated": "2026-01-01T00:00:00+00:00"},
            {"id": "ok1", "name": "GOOD", "project": "p", "environment": "prod", "fields": {"value": "sk-DUMMY-good"},
             "created": "2026-01-01T00:00:00+00:00", "updated": "2026-01-01T00:00:00+00:00"}]
    resp = serve({"op": "sync", "from": S["aid"], "token": S["stok"], "b64": enc_to_b(evil)})
    assert resp.get("rejected") == 4 and resp.get("applied") == 1, resp
    assert get(B, S["tb"], "ONLY_B") == "sk-DUMMY-b1" and get(B, S["tb"], "GOOD") == "sk-DUMMY-good"

def test_sync_token_cannot_unlock():                     # #3
    r = run(B, ["get", "--name", "ONLY_B", "--project", "p", "--env", "prod"], tok=S["stok"], ok=False)
    assert r.returncode and "machine-sync token" in r.stderr and "sk-DUMMY" not in r.stdout

def test_agent_token_refused_and_mcp_child_has_no_token():   # #2
    out = run(A, ["agent", "register", "claude-code"], f"{PWA}\n").stdout
    atok = re.search(r'"CONCEALER_TOKEN": "([^"]+)"', out).group(1)
    assert "agent tokens are not allowed" in run(A, ["sync", "hostB"], tok=atok, ok=False).stderr
    assert "agent tokens are not allowed" in run(A, ["pair", "--revoke", "hostB"], tok=atok, ok=False).stderr
    msgs = [{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {},
             "clientInfo": {"name": "t", "version": "1"}}},
            {"jsonrpc": "2.0", "method": "notifications/initialized"},
            {"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "run_with_secrets", "arguments": {
             "command": "echo tok=$(env | grep -c '^CONCEALER_TOKEN=') home=$(env | grep -c '^CONCEALER_HOME='); " + shlex.quote(sys.executable) + " " + shlex.quote(CER) + " sync hostB",
             "project": "zz-none", "names": []}}}]
    env = {k: v for k, v in os.environ.items() if not k.startswith("CONCEALER_")}
    env.update(CONCEALER_HOME=A, CONCEALER_TOKEN=atok, CONCEALER_SSH=SSH)
    r = subprocess.run([sys.executable, CER, "mcp"], input="\n".join(json.dumps(m) for m in msgs) + "\n",
                       env=env, capture_output=True, text=True, timeout=180)
    reply = next(l for l in r.stdout.splitlines() if '"id": 2' in l or '"id":2' in l)
    assert "tok=0 home=0" in reply and "locked: no CONCEALER_TOKEN" in reply, reply
    assert not [x for x in audit(A)[-3:] if x["action"] == "sync"], "an MCP-triggered child must not sync"
    S["atok"] = atok

def test_mcp_set_waits_for_lock_and_sync_not_clobbered():   # Y1
    setv(B, S["tb"], "FROM_B", "sk-DUMMY-fb")
    msgs = [{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {},
             "clientInfo": {"name": "t", "version": "1"}}},
            {"jsonrpc": "2.0", "method": "notifications/initialized"},
            {"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "set_secret", "arguments": {
             "name": "FROM_MCP", "project": "p", "environment": "prod", "value": "sk-DUMMY-mcp"}}}]
    env = {k: v for k, v in os.environ.items() if not k.startswith("CONCEALER_")}
    env.update(CONCEALER_HOME=A, CONCEALER_SSH=SSH)
    with open(os.path.join(A, "keys", "vault.lock"), "a") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        mcp = subprocess.Popen([sys.executable, CER, "mcp"], env=dict(env, CONCEALER_TOKEN=S["atok"]), stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, start_new_session=True)
        mcp.stdin.write("\n".join(json.dumps(m) for m in msgs) + "\n"); mcp.stdin.flush()
        syn = subprocess.Popen([sys.executable, CER, "sync", "hostB"], env=dict(env, CONCEALER_TOKEN=S["ta"]),
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, start_new_session=True)
        time.sleep(6)
        assert get(A, S["ta"], "FROM_MCP", ok=False) is None, "set_secret must wait for the vault lock"
        assert syn.poll() is None, "sync's merge must wait for the vault lock"
        fcntl.flock(f, fcntl.LOCK_UN)
    out, _ = mcp.communicate(timeout=120); assert "create: FROM_MCP" in out, out
    assert syn.wait(120) == 0, syn.stderr.read()
    assert get(A, S["ta"], "FROM_MCP") == "sk-DUMMY-mcp" and get(A, S["ta"], "FROM_B") == "sk-DUMMY-fb", "neither write may be lost"

def test_sync_only_token():                              # #2 design: cron token
    out = run(A, ["agent", "register", "sync-cron", "--sync-only", "--write-token-file"], f"{PWA}\n").stdout
    tf = os.path.join(A, "keys", "sync-cron.token"); ctok = open(tf).read()
    assert ctok not in out and oct(os.stat(tf).st_mode & 0o777) == "0o600" and oct(os.stat(os.path.dirname(tf)).st_mode & 0o777) == "0o700"
    assert "sent" in run(A, ["sync", "hostB"], tok=ctok).stdout
    r = run(A, ["get", "--name", "ONLY_A", "--project", "p", "--env", "prod"], tok=ctok, ok=False)
    assert r.returncode and "sync-only" in r.stderr
    assert [x for x in audit(A) if x["action"] == "sync"][-1].get("actor") == "sync-cron"   # #6 actor

def test_via_option_injection_rejected():                # #8
    mark = os.path.join(T, "PWNED")
    r = run(A, ["sync", "hostB", "--via", f"-oProxyCommand=touch {mark}"], tok=S["ta"], ok=False)
    assert "bad --via" in r.stderr and not os.path.exists(mark)

def test_audit_counts_and_deleted_ids():                 # #6
    sb = [x for x in audit(B) if x["action"] == "sync"]
    assert any("deleted=" in x["detail"] and len(x["detail"].split("deleted=")[1].split(",")) == 4 for x in sb), sb
    assert all(x.get("actor", "").startswith("sync:") for x in sb)
    sa = [x for x in audit(A) if x["action"] == "sync"]
    assert sa and all("recv=" in x["detail"] for x in sa)
    assert [x for x in audit(A) if x["action"] == "sync_fail" and "refusing" in x["detail"]]

def test_lock_serializes_writers():                      # #5
    with open(os.path.join(B, "keys", "vault.lock"), "a") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        env = {k: v for k, v in os.environ.items() if not k.startswith("CONCEALER_")}
        env.update(CONCEALER_HOME=B, CONCEALER_TOKEN=S["tb"])
        p = subprocess.Popen([sys.executable, CER, "set", "--name", "LOCKED", "--project", "p", "--env", "prod", "sk-DUMMY-l"],
                             env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True)
        time.sleep(2); assert p.poll() is None, "set must wait for the vault lock"
        fcntl.flock(f, fcntl.LOCK_UN)
    assert p.wait(60) == 0 and get(B, S["tb"], "LOCKED") == "sk-DUMMY-l"

def test_no_plaintext_on_disk_or_argv():
    for root, _, files in os.walk(T):
        for f in files:
            if f == "fake-ssh.py": continue
            blob = open(os.path.join(root, f), "rb").read()
            for needle in (b"sk-DUMMY", PWA.encode(), PWB.encode(), S["stok"].encode()):
                assert needle not in blob, f"{needle!r} leaked into {os.path.join(root, f)}"

def test_revoke_pending_then_completed():                # #9
    r = run(A, ["pair", "--revoke", "hostB"], tok=S["ta"], extra={"CONCEALER_SSH": "/usr/bin/false"})
    assert "revoke will retry" in r.stdout, r.stdout
    assert "revoke pending" in run(A, ["pair", "--list"], tok=S["ta"]).stdout
    assert sync_tokens(B), "remote token still there until the peer is reached"
    assert "pairing removed" in run(A, ["sync", "hostB"], tok=S["ta"]).stdout
    assert not sync_tokens(B) and "no pairings" in run(B, ["pair", "--list"], tok=S["tb"]).stdout
    assert "not paired" in run(A, ["sync", "hostB"], tok=S["ta"], ok=False).stderr
    assert "not paired" in serve({"op": "sync", "token": S["stok"], "from": S["aid"]})["error"]   # old token is dead

def main():
    S["ta"], S["tb"] = init(A, PWA), init(B, PWB)
    setv(A, S["ta"], "ONLY_A", "sk-DUMMY-a1"); setv(B, S["tb"], "ONLY_B", "sk-DUMMY-b1")
    for t in [test_pair_rejects_bad_input, test_pair_and_token_label_uses_peer_id, test_dry_run_changes_nothing,
              test_converge_with_snapshot, test_lww_newer_edit_wins, test_single_delete_small_vault_passes,
              test_equal_timestamp_tiebreak, test_mass_delete_needs_allow_deletes, test_deletion_snapshot_survives_later_syncs,
              test_mobile_sync_bundle_validates, test_future_and_malformed_records_rejected,
              test_sync_token_cannot_unlock, test_agent_token_refused_and_mcp_child_has_no_token,
              test_mcp_set_waits_for_lock_and_sync_not_clobbered, test_sync_only_token,
              test_via_option_injection_rejected, test_audit_counts_and_deleted_ids, test_lock_serializes_writers,
              test_no_plaintext_on_disk_or_argv, test_revoke_pending_then_completed]:
        t0 = time.time(); t(); print(f"ok  {t.__name__}  ({time.time() - t0:.1f}s)")
    print("all ok", T)

if __name__ == "__main__":
    main()
