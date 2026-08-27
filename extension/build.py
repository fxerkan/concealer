#!/usr/bin/env python3
"""Package the extension for the Chrome Web Store: a zip of the runtime files with the
self-signed `key` stripped (the store assigns the extension ID). Output: dist/concealer-extension-<v>.zip"""
import json, zipfile, os
HERE = os.path.dirname(os.path.abspath(__file__))
man = json.load(open(os.path.join(HERE, "manifest.json")))
ver = man.get("version", "0.0.0")
man.pop("key", None)   # CWS assigns the ID; a self-signed key would conflict with the store item
files = ["popup.html", "popup.css", "popup.js", "icons/icon16.png", "icons/icon48.png", "icons/icon128.png"]
out_dir = os.path.join(os.path.dirname(HERE), "dist"); os.makedirs(out_dir, exist_ok=True)
out = os.path.join(out_dir, f"concealer-extension-{ver}.zip")
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("manifest.json", json.dumps(man, indent=2))
    for f in files: z.write(os.path.join(HERE, f), f)
print("built", out)
print("upload at https://chrome.google.com/webstore/devconsole")
