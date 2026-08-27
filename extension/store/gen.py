#!/usr/bin/env python3
"""Generate Chrome Web Store listing images for concealer as SVG, rendered to PNG by rsvg-convert
(+ magick to flatten alpha). Faithful to the app: brand = logo tile + `conceal` + `er` in a red
redaction box (ink text on accent), exact palette/dimensions. No browser capture needed."""
import subprocess, os, html
OUT = os.path.dirname(os.path.abspath(__file__))

TH = {
  "dark":   dict(bg="#0a0b0d", panel="#101216", panel2="#161a20", line="#1c1f26", line2="#2a2f38",
                 txt="#e8e8e6", mut="#8a909b", acc="#ff4d4d", acc2="#ff7a7a", ink="#0a0b0d", glow="#ff4d4d",
                 tile="#0e1014", dim="#3a414c"),
  "matrix": dict(bg="#000600", panel="#02120a", panel2="#041c0f", line="#0a3a1e", line2="#0f5c2e",
                 txt="#39ff6a", mut="#1f9c4d", acc="#39ff14", acc2="#9dff5a", ink="#000600", glow="#39ff14",
                 tile="#04120b", dim="#12633a"),
}
MONO = "Menlo, 'DejaVu Sans Mono', monospace"
SANS = "Helvetica, Arial, 'DejaVu Sans', sans-serif"
ADV = 0.60   # monospace advance per char, in ems
def esc(s): return html.escape(str(s))

def copy_icon(x, y, c):
    return (f'<rect x="{x}" y="{y}" width="13" height="15" rx="2" fill="none" stroke="{c}" stroke-width="1.4"/>'
            f'<rect x="{x+3.5}" y="{y-2}" width="6" height="3.5" rx="1.2" fill="{c}"/>')
def eye_icon(x, y, c):
    return (f'<path d="M{x} {y+5} Q{x+7} {y-2} {x+14} {y+5} Q{x+7} {y+12} {x} {y+5} Z" fill="none" stroke="{c}" stroke-width="1.4"/>'
            f'<circle cx="{x+7}" cy="{y+5}" r="2.4" fill="{c}"/>')
def lock_icon(x, y, c):
    return (f'<rect x="{x}" y="{y+5}" width="14" height="10" rx="2" fill="{c}"/>'
            f'<path d="M{x+3} {y+5} v-3 a4 4 0 0 1 8 0 v3" fill="none" stroke="{c}" stroke-width="1.6"/>')

def logo_tile(x, y, s, t):
    """The app icon: dark rounded tile with two dim redaction bars + one accent bar (from logo.svg)."""
    k = s/512.0
    def R(rx, ry, rw, rh, rr, fill): return f'<rect x="{x+rx*k:.1f}" y="{y+ry*k:.1f}" width="{rw*k:.1f}" height="{rh*k:.1f}" rx="{rr*k:.1f}" fill="{fill}"/>'
    return "".join([
        f'<rect x="{x:.1f}" y="{y:.1f}" width="{s:.1f}" height="{s:.1f}" rx="{116*k:.1f}" fill="{t["tile"]}" stroke="{t["line2"]}" stroke-width="{max(1,2*k):.1f}"/>',
        R(128,176,176,38,19, t["dim"]),
        R(128,232,256,52,26, t["acc"]),
        R(128,302,136,38,19, t["dim"]),
    ])

def brand(x, y, size, t, logo=True):
    """Render logo + `conceal` + boxed `er`. Baseline at y. Returns (svg, total_width)."""
    cw = size*ADV
    parts = []; bx = x
    if logo:
        ls = size*1.28
        parts.append(logo_tile(x, y-ls*0.82, ls, t))
        bx = x + ls + size*0.34
    parts.append(f'<text x="{bx:.1f}" y="{y}" font-family="{MONO}" font-size="{size}" font-weight="700" fill="{t["txt"]}">conceal</text>')
    ex = bx + 7*cw
    pad = size*0.13
    boxw = 2*cw + 2*pad
    parts.append(f'<rect x="{ex:.1f}" y="{y-size*0.80:.1f}" width="{boxw:.1f}" height="{size*1.02:.1f}" rx="{size*0.16:.1f}" fill="{t["acc"]}"/>')
    parts.append(f'<text x="{ex+pad:.1f}" y="{y}" font-family="{MONO}" font-size="{size}" font-weight="700" fill="{t["ink"]}">er</text>')
    return "".join(parts), (ex + boxw - x)

def popup(theme, px, py, rows, expanded=None, width=452):
    t = TH[theme]
    g = [f'<g transform="translate({px},{py})">']
    g.append(f'<rect x="0" y="0" width="{width}" height="560" rx="16" fill="{t["bg"]}" stroke="{t["line2"]}" stroke-width="1.5"/>')
    # header: brand (no logo — matches the real popup) on the left
    bsvg, _ = brand(20, 42, 24, t, logo=False)
    g.append(bsvg)
    g.append(lock_icon(width-200, 22, t["mut"]))
    g.append(f'<text x="{width-180}" y="42" font-family="{SANS}" font-size="13" fill="{t["mut"]}">auto-lock 04:55</text>')
    for cx in (width-60, width-40, width-20):
        g.append(f'<circle cx="{cx}" cy="36" r="8" fill="{t["panel2"]}"/>')
    g.append(f'<line x1="0" y1="62" x2="{width}" y2="62" stroke="{t["line"]}"/>')
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
            fields = expanded[2]; fh = 40*len(fields)
            g.append(f'<rect x="28" y="{y-46}" width="{width-42}" height="{46+fh}" rx="9" fill="none" stroke="{t["acc"]}" stroke-width="1.5"/>')
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
    bsvg, _ = brand(80, 262, 34, t, logo=True)
    lines = title.split("\n")
    tspans = "".join(f'<tspan x="80" dy="{0 if i==0 else 58}">{esc(l)}</tspan>' for i, l in enumerate(lines))
    sub_y = 340 + len(lines)*58 + 18
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
  <defs><radialGradient id="glow" cx="72%" cy="30%" r="60%">
    <stop offset="0%" stop-color="{t['glow']}" stop-opacity="0.14"/><stop offset="100%" stop-color="{t['bg']}" stop-opacity="0"/>
  </radialGradient></defs>
  <rect width="{w}" height="{h}" fill="{t['bg']}"/>
  <rect width="{w}" height="{h}" fill="url(#glow)"/>
  {bsvg}
  <text x="80" y="340" font-family="{SANS}" font-size="44" font-weight="800" fill="{t['txt']}">{tspans}</text>
  <text x="80" y="{sub_y}" font-family="{SANS}" font-size="21" fill="{t['mut']}">{esc(subtitle)}</text>
  {popup_svg}
</svg>'''

def promo(theme="dark", w=440, h=280):
    t = TH[theme]
    bsvg, bw = brand(0, 0, 30, t, logo=True)
    gx = (w - bw)/2
    title = ["one click toolbar extension for", "The local-only secret manager", "for the AI-coding era"]
    tl = "".join(f'<tspan x="{w/2}" dy="{0 if i==0 else 26}">{esc(l)}</tspan>' for i, l in enumerate(title))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}">
  <defs><radialGradient id="g" cx="50%" cy="30%" r="75%"><stop offset="0%" stop-color="{t['glow']}" stop-opacity="0.16"/><stop offset="100%" stop-color="{t['bg']}" stop-opacity="0"/></radialGradient></defs>
  <rect width="{w}" height="{h}" fill="{t['bg']}"/><rect width="{w}" height="{h}" fill="url(#g)"/>
  <g transform="translate({gx:.1f},96)">{bsvg}</g>
  <text x="{w/2}" y="158" text-anchor="middle" font-family="{SANS}" font-size="16" fill="{t['mut']}">{tl}</text>
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
  ("promo-440x280.png", promo("dark")),
]
for name, svg in shots:
    sp = os.path.join(OUT, name.replace(".png",".svg")); open(sp,"w").write(svg)
    bg = "#000600" if "matrix" in name else "#0a0b0d"
    w, h = (440,280) if "promo" in name else (1280,800)
    subprocess.run(["rsvg-convert","-w",str(w),"-h",str(h),"-b",bg, sp,"-o",os.path.join(OUT,name)], check=True)
    os.remove(sp); print("built", name)
# flatten alpha → 24-bit (store requires screenshots without an alpha channel)
for name,_ in shots:
    p = os.path.join(OUT, name)
    subprocess.run(["magick", p, "-background", "#0a0b0d", "-alpha", "remove", "-alpha", "off", p], check=True)
print("flattened to 24-bit (no alpha)")
