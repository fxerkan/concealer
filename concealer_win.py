"""Windows-only support for concealer.

This module is imported ONLY on win32 (see `_age_pw` in the `concealer` script).
It never runs on macOS/Linux, so importing `winpty` at call time (not module top)
keeps the module harmless to import anywhere.

Why it exists: `age -p` reads the passphrase from the controlling terminal
(/dev/tty on Unix, the console on Windows), NOT from stdin. On Unix concealer
drives that with `expect`. Windows has no `expect` and no `/dev/tty`, so we give
age a real pseudo-console via **pywinpty** and type the passphrase into it — the
exact same interaction `expect` performs, just through the Windows ConPTY API.

See docs/WINDOWS.md for the security caveats (chmod/ACL, no expect).
"""
import os
import subprocess
import threading

TIMEOUT = 30  # seconds — mirror the `set timeout 30` in the Unix expect path


def age_pw(args, passphrase, confirm=False):
    """Drop-in replacement for concealer._age_pw on Windows.

    Runs `age <args>` inside a pseudo-console, waits for the "passphrase" prompt,
    types the passphrase (twice when `confirm`, i.e. an encrypt op), then drains
    to EOF. Returns (returncode, combined_output) — same contract as _age_pw.
    """
    try:
        from winpty import PtyProcess
    except ImportError:
        return 127, ("pywinpty not installed. On Windows concealer needs it to drive age.\n"
                     "Install with:  pip install pywinpty   (or reinstall: pipx install concealer)")

    argv = ["age"] + list(args)
    out = []           # everything age printed to the console (for error surfacing)
    result = {}        # filled by the worker thread: rc / error

    def run():
        proc = None
        try:
            proc = PtyProcess.spawn(argv)
            sent = 0                       # how many passphrase prompts we've answered
            need = 2 if confirm else 1     # encrypt prompts twice (enter + confirm)
            pending = ""                   # text seen since the last prompt we answered
            while True:
                try:
                    chunk = proc.read(1024)
                except EOFError:
                    break
                if not chunk:
                    if not proc.isalive():
                        break
                    continue
                out.append(chunk)
                pending += chunk
                # age's prompts both contain the substring "passphrase"
                # ("Enter passphrase (leave empty ...): " and "Confirm passphrase:").
                # Match the substring exactly like the Unix expect pattern.
                while sent < need and "passphrase" in pending.lower():
                    proc.write(passphrase + "\r")
                    sent += 1
                    pending = ""           # only look for the *next* prompt in new output
            result["rc"] = proc.wait()
        except Exception as e:             # pragma: no cover - needs a Windows host
            result["error"] = str(e)
            try:
                if proc is not None:
                    proc.terminate(force=True)
            except Exception:
                pass

    t = threading.Thread(target=run, daemon=True)
    t.start()
    t.join(TIMEOUT)
    text = "".join(out)
    if t.is_alive():
        # Hung (never got the prompt, or age is waiting on something). Fail like a timeout.
        return 1, text + "\n[concealer] age timed out after %ds (pty)" % TIMEOUT
    if "error" in result:
        return 1, text + "\n[concealer] pty error: " + result["error"]
    return int(result.get("rc", 1)), text


def secure_dir(path):
    """Lock a directory (e.g. keys/) to the current user via icacls, with inheritance
    so every file created inside it afterwards is user-only too. Best-effort; see
    secure_file() for the caveats (Administrators/SYSTEM, non-NTFS volumes)."""
    user = os.environ.get("USERNAME")
    if not user or not os.path.isdir(path):
        return
    try:
        subprocess.run(
            ["icacls", path, "/inheritance:r", "/grant:r", f"{user}:(OI)(CI)F"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False,
        )
    except Exception:
        pass


def secure_file(path):
    """Best-effort Windows equivalent of chmod 0600 on a keys/ file.

    os.chmod(path, 0o600) on Windows only flips the read-only bit — it does NOT
    stop other users (or Administrators) from reading the file. Here we use
    `icacls` to strip inherited ACLs and grant Full control to the current user
    only. Best-effort: failures are swallowed (the file still works, just with
    the OS-default, more permissive ACL). See docs/WINDOWS.md.
    """
    user = os.environ.get("USERNAME")
    if not user:
        return
    try:
        subprocess.run(
            ["icacls", path, "/inheritance:r", "/grant:r", f"{user}:F"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False,
        )
    except Exception:
        pass
