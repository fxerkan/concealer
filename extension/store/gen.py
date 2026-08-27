#!/usr/bin/env python3
"""Generate Chrome Web Store listing images for concealer as SVG, rendered to PNG by rsvg-convert.
Faithful recreation of the popup UI (exact palette/dimensions) so no browser capture is needed."""
import subprocess, os, html
OUT = os.path.dirname(os.path.abspath(__file__))

TH = {
  "dark":   dict(bg="#0a0b0d", panel="#101216", panel2="#161a20", line="#1c1f26", line2="#2a2f38",
                 txt="#e8e8e6", mut="#8a909b", acc="#ff4d4d", acc2="#ff7a7a", ink="#0a0b0d", glow="#ff4d4d"),
  "matrix": dict(bg="#000600", panel="#02120a", panel2="#041c0f", line="#0a3a1e", line2="#0f5c2e",
                 txt="#39ff6a", mut="#1f9c4d", acc="#39ff14", acc2="#9dff5a", ink="#000600", glow="#39ff14"),
}
MONO = "Menlo, 'DejaVu Sans Mono', monospace"
SANS = "Helvetica, Arial, 'DejaVu Sans', sans-serif"
def esc(s): return html.escape(str(s))

def copy_icon(x, y, c):   # small clipboard-ish glyph
    return (f'<rect x="{x}" y="{y}" width="13" height="15" rx="2" fill="none" stroke="{c}" stroke-width="1.4"/>'
            f'<rect x="{x+3.5}" y="{y-2}" width="6" height="3.5" rx="1.2" fill="{c}"/>')
def eye_icon(x, y, c):
    return (f'<path d="M{x} {y+5} Q{x+7} {y-2} {x+14} {y+5} Q{x+7} {y+12} {x} {y+5} Z" fill="none" stroke="{c}" stroke-width="1.4"/>'
            f'<circle cx="{x+7}" cy="{y+5}" r="2.4" fill="{c}"/>')
def lock_icon(x, y, c):
    return (f'<rect x="{x}" y="{y+5}" width="14" height="10" rx="2" fill="{c}"/>'
            f'<path d="M{x+3} {y+5} v-3 a4 4 0 0 1 8 0 v3" fill="none" stroke="{c}" stroke-width="1.6"/>')

def popup(theme, px, py, rows, expanded=None, width=452):
    t = TH[theme]
    """Return an SVG group for the popup panel. rows: list of (name, scope, multi). expanded: (name, scope, fields)."""
    g = [f'<g transform="translate({px},{py})">']
    # panel card
    g.append(f'<rect x="0" y="0" width="{width}" height="560" rx="16" fill="{t["bg"]}" stroke="{t["line2"]}" stroke-width="1.5"/>')
    # header
    g.append(f'<text x="20" y="42" font-family="{MONO}" font-size="26" font-weight="700" fill="{t["txt"]}">conceal</text>')
    g.append(f'<rect x="126" y="22" width="46" height="30" rx="5" fill="{t["acc"]}"/>')
    g.append(f'<text x="149" y="43" font-family="{MONO}" font-size="26" font-weight="700" fill="{t["ink"]}" text-anchor="middle">er</text>')
    g.append(lock_icon(width-200, 22, t["mut"]))
    g.append(f'<text x="{width-180}" y="42" font-family="{SANS}" font-size="13" fill="{t["mut"]}">auto-lock 04:55</text>')
    for i, cx in enumerate((width-60, width-40, width-20)):   # icon dots
        g.append(f'<circle cx="{cx}" cy="36" r="8" fill="{t["panel2"]}"/>')
    g.append(f'<line x1="0" y1="62" x2="{width}" y2="62" stroke="{t["line"]}"/>')
    # search
    g.append(f'<rect x="14" y="78" width="{width-28}" height="40" rx="9" fill="{t["panel"]}" stroke="{t["line2"]}"/>')
    g.append(f'<text x="28" y="103" font-family="{SANS}" font-size="14" fill="{t["mut"]}">Search… (name / tag / project)</text>')
    y = 132
    for (name, scope, multi) in rows:
        g.append(f'<rect x="14" y="{y}" width="{width-28}" height="46" rx="9" fill="{t["panel"]}" stroke="{t["line"]}"/>')
        g.append(f'<text x="28" y="{y+29}" font-family="{SANS}" font-size="15" font-weight="700" fill="{t["txt"]}">{esc(name)}</text>')
        g.append(f'<text x="{width-52}" y="{y+29}" font-family="{SANS}" font-size="12" fill="{t["mut"]}" text-anchor="end">{esc(scope)}</text>')
        if multi: g.append(f'<text x="{width-26}" y="{y+30}" font-family="{SANS}" font-size="15" fill="{t["mut"]}" text-anchor="middle">▸</text>')
        else: g.append(copy_icon(width-34, y+15, t["mut"]))
        y += 51
        if expanded and name == expanded[0]:
            # draw child field rows inside an accent-bordered panel
            fields = expanded[2]; fh = 40*len(fields)
            g.append(f'<rect x="28" y="{y-46}" width="{width-42}" height="{46+fh}" rx="9" fill="none" stroke="{t["acc"]}" stroke-width="1.5"/>')
            g[-2] = g[-2]  # noop
            fy = y
            for j,(fn, val, sec) in enumerate(fields):
                if j % 2 == 0: g.append(f'<rect x="29" y="{fy}" width="{width-44}" height="40" fill="{t["acc2"]}" fill-opacity="0.06"/>')
                g.append(f'<text x="44" y="{fy+25}" font-family="{MONO}" font-size="12" font-weight="700" fill="{t["acc2"]}">{esc(fn)}</text>')
                g.append(f'<text x="{width-96}" y="{fy+25}" font-family="{MONO}" font-size="12" fill="{t["txt"]}" text-anchor="end">{esc(val)}</text>')
                if sec: g.append(eye_icon(width-78, fy+14, t["mut"]))
                g.append(copy_icon(width-34, fy+13, t["mut"]))
                fy += 40
            y = fy + 6
    g.append('</g>')
    return "\n".join(g)

def canvas(theme, title, subtitle, popup_svg, w=1280, h=800):
    t = TH[theme]
    lines = title.split("\n")
    tspans = "".join(f'<tspan x="80" dy="{0 if i==0 else 58}">{esc(l)}</tspan>' for i, l in enumerate(lines))
    sub_y = 340 + len(lines)*58 + 18
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
  <defs><radialGradient id="glow" cx="72%" cy="30%" r="60%">
    <stop offset="0%" stop-color="{t['glow']}" stop-opacity="0.14"/><stop offset="100%" stop-color="{t['bg']}" stop-opacity="0"/>
  </radialGradient></defs>
  <rect width="{w}" height="{h}" fill="{t['bg']}"/>
  <rect width="{w}" height="{h}" fill="url(#glow)"/>
  <text x="80" y="268" font-family="{MONO}" font-size="32" font-weight="700" fill="{t['txt']}">conceal<tspan fill="{t['acc']}">er</tspan></text>
  <text x="80" y="340" font-family="{SANS}" font-size="44" font-weight="800" fill="{t['txt']}">{tspans}</text>
  <text x="80" y="{sub_y}" font-family="{SANS}" font-size="21" fill="{t['mut']}">{esc(subtitle)}</text>
  {popup_svg}
</svg>'''

LIST = [("AWS_PROD_KEY","menuman/prod",False),("DROPBOX_APP","Dropbox-Syncer/prod",True),
        ("POSTGRES","dgpays/prod",True),("GITHUB_PAT","ci/prod",False),
        ("STRIPE_KEY","shop/prod",False),("CLOUDFLARE_API_TOKEN","r2/prod",False)]
FIELDS_ROWS = [("AWS_PROD_KEY","menuman/prod",False),("DROPBOX_APP","Dropbox-Syncer/prod",True),
               ("STRIPE_KEY","shop/prod",False)]
DBX_FIELDS = [("DROPBOX_APP_NAME","rpifx-drpbx-uploader-app",False),("DROPBOX_APP_KEY","••••••••",True),
              ("DROPBOX_APP_SECRET","••••••••",True),("DROPBOX_ACCESS_TOKEN_JSON","••••••••",True)]

shots = [
  ("screenshot-1-list.png",   canvas("dark","Copy any secret\nfrom your toolbar","No more typing `cer web` — open, unlock, copy.",
          popup("dark", 700, 120, LIST))),
  ("screenshot-2-fields.png", canvas("dark","Pick the exact field","Per-field copy & reveal for multi-field secrets.",
          popup("dark", 700, 120, FIELDS_ROWS, expanded=("DROPBOX_APP","Dropbox-Syncer/prod",DBX_FIELDS)))),
  ("screenshot-3-matrix.png", canvas("matrix","Three built-in themes","Dark · White · Matrix — matched to the web UI.",
          popup("matrix", 700, 120, LIST))),
]
os.makedirs(OUT, exist_ok=True)
for name, svg in shots:
    sp = os.path.join(OUT, name.replace(".png",".svg")); open(sp,"w").write(svg)
    subprocess.run(["rsvg-convert","-w","1280","-h","800","-b","#0a0b0d" if "matrix" not in name else "#000600", sp,"-o",os.path.join(OUT,name)], check=True)
    print("built", name)
# small promo tile 440x280
promo = f'''<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280"><rect width="440" height="280" fill="#0a0b0d"/>
<rect width="440" height="280" fill="url(#g)"/><defs><radialGradient id="g" cx="50%" cy="35%" r="70%"><stop offset="0%" stop-color="#ff4d4d" stop-opacity="0.16"/><stop offset="100%" stop-color="#0a0b0d" stop-opacity="0"/></radialGradient></defs>
<text x="220" y="150" font-family="{MONO}" font-size="46" font-weight="700" fill="#e8e8e6" text-anchor="middle">conceal<tspan fill="#ff4d4d">er</tspan></text>
<text x="220" y="190" font-family="{SANS}" font-size="16" fill="#8a909b" text-anchor="middle">secrets, one click from your toolbar</text></svg>'''
open(os.path.join(OUT,"promo-440x280.svg"),"w").write(promo)
subprocess.run(["rsvg-convert","-w","440","-h","280","-b","#0a0b0d",os.path.join(OUT,"promo-440x280.svg"),"-o",os.path.join(OUT,"promo-440x280.png")],check=True)
print("built promo-440x280.png")

# flatten alpha → 24-bit (Chrome Web Store requires screenshots without an alpha channel)
for f in ["screenshot-1-list.png","screenshot-2-fields.png","screenshot-3-matrix.png","promo-440x280.png"]:
    p = os.path.join(OUT, f)
    subprocess.run(["magick", p, "-background", "#0a0b0d", "-alpha", "remove", "-alpha", "off", p], check=True)
print("flattened to 24-bit (no alpha)")
