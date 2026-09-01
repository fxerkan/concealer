#!/usr/bin/env python3
"""Package the extension for the Chrome Web Store: a zip of the runtime files with the
self-signed `key` stripped (the store assigns the extension ID). Output: dist/concealer-extension-<v>.zip"""
import json, zipfile, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
# Single source of truth: VERSION in the concealer script. Sync manifest.json to it on every
# build (CI runs this on every publish), so the store version can never drift from the release.
ver = re.search(r'^VERSION\s*=\s*"([^"]+)"', open(os.path.join(ROOT, "concealer")).read(), re.M).group(1)
man_path = os.path.join(HERE, "manifest.json")
man = json.load(open(man_path))
if man.get("version") != ver:
    man["version"] = ver
    with open(man_path, "w") as f: json.dump(man, f, indent=2); f.write("\n")
    print("synced manifest.json version →", ver)
man.pop("key", None)   # CWS assigns the ID; a self-signed key would conflict with the store item
files = ["popup.html", "popup.css", "popup.js", "icons/icon16.png", "icons/icon48.png", "icons/icon128.png"]
out_dir = os.path.join(os.path.dirname(HERE), "dist"); os.makedirs(out_dir, exist_ok=True)
out = os.path.join(out_dir, f"concealer-extension-{ver}.zip")
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("manifest.json", json.dumps(man, indent=2))
    for f in files: z.write(os.path.join(HERE, f), f)
print("built", out)
print("upload at https://chrome.google.com/webstore/devconsole")
