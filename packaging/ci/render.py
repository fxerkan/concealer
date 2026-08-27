"""Render captured terminal output to PNG (platform-independent).

Used by win_capture.py: the CAPTURE happens on the Windows CI runner, but turning
that captured text / ANSI stream into a terminal-style screenshot is pure Pillow +
pyte and runs anywhere, so it's unit-testable locally (see demo() at the bottom).

Two renderers:
  * text_png()  — plain/ANSI-SGR text (CLI, MCP) laid out as a dark terminal window.
  * ansi_png()  — a full-screen curses frame (raw ANSI with cursor moves) decoded
                  by pyte into a character grid, then drawn (used for the TUI).
"""
import os
import re

from PIL import Image, ImageDraw, ImageFont

# dark terminal theme
BG = (13, 17, 23)          # GitHub-dark-ish
FG = (201, 209, 217)
DIM = (110, 118, 129)
PAD = 20
LINE = 22                  # line height px
COLW = 11                  # approx monospace advance px at size 18

_MONO_CANDIDATES = [
    r"C:\Windows\Fonts\consola.ttf",                 # Windows: Consolas
    "/System/Library/Fonts/Menlo.ttc",               # macOS
    "/System/Library/Fonts/SFNSMono.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",   # Linux
    "/Library/Fonts/Andale Mono.ttf",
]


def _font(size=18):
    for p in _MONO_CANDIDATES:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


_SGR = re.compile(r"\x1b\[[0-9;]*m")
_CSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")
_OTHER = re.compile(r"\x1b[()#][0-9A-Za-z]|\x1b[=>78]|[\x00-\x08\x0b\x0c\x0e-\x1f]")


def _clean(s):
    """Strip all escape/control noise, keep printable text + newlines/tabs."""
    s = _CSI.sub("", s)
    s = _OTHER.sub("", s)
    return s.replace("\t", "    ")


def text_png(text, path, title="Windows PowerShell", width_cols=98, max_lines=44):
    """Render plain text (SGR stripped) as a titled dark terminal window."""
    lines = _clean(text).split("\n")
    lines = [ln.rstrip() for ln in lines][:max_lines]
    cols = max(width_cols, *(len(ln) for ln in lines)) if lines else width_cols
    cols = min(cols, 140)
    W = PAD * 2 + cols * COLW
    H = PAD * 2 + LINE * (len(lines) + 2)
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    f = _font(18)
    fb = _font(18)
    # title bar
    d.rectangle([0, 0, W, LINE + 8], fill=(30, 36, 46))
    for i, c in enumerate((("#ff5f56"), ("#ffbd2e"), ("#27c93f"))):
        d.ellipse([PAD + i * 20, 10, PAD + i * 20 + 12, 22], fill=c)
    d.text((PAD + 78, 8), title, font=fb, fill=DIM)
    y = LINE + 16
    for ln in lines:
        d.text((PAD, y), ln[:cols], font=f, fill=FG)
        y += LINE
    img.save(path)
    return path


def ansi_png(raw, path, cols=120, rows=35, title="Windows Terminal — concealer tui"):
    """Decode a raw ANSI screen (cursor moves, colors) with pyte and render the grid."""
    import pyte
    screen = pyte.Screen(cols, rows)
    stream = pyte.ByteStream(screen) if isinstance(raw, (bytes, bytearray)) else pyte.Stream(screen)
    stream.feed(raw)
    display = screen.display                      # list[str], one per row, already laid out

    W = PAD * 2 + cols * COLW
    H = PAD * 2 + LINE * (rows + 2)
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    f = _font(16)
    fb = _font(16)
    d.rectangle([0, 0, W, LINE + 8], fill=(30, 36, 46))
    for i, c in enumerate((("#ff5f56"), ("#ffbd2e"), ("#27c93f"))):
        d.ellipse([PAD + i * 20, 10, PAD + i * 20 + 12, 22], fill=c)
    d.text((PAD + 78, 8), title, font=fb, fill=DIM)
    y = LINE + 16
    # per-cell foreground so panel accents/box-drawing stay legible
    _named = {"red": (255, 95, 86), "green": (39, 201, 63), "brown": (255, 189, 46),
              "yellow": (255, 189, 46), "blue": (88, 166, 255), "cyan": (57, 197, 245),
              "magenta": (219, 112, 219), "white": FG, "default": FG}
    for r in range(rows):
        row = screen.buffer[r]
        x = PAD
        for cx in range(cols):
            cell = row[cx]
            ch = cell.data or " "
            if ch != " ":
                col = _named.get(getattr(cell, "fg", "default"), FG)
                d.text((x, y), ch, font=f, fill=col)
            x += COLW
        y += LINE
    img.save(path)
    return path


def demo():
    """Local self-check: produce two PNGs from sample captures (no Windows needed)."""
    out = os.path.join(os.path.dirname(__file__), "_demo")
    os.makedirs(out, exist_ok=True)
    cli = ("PS C:\\> concealer list\n"
           "name                   type      project   env    repo   tags\n"
           "GITHUB_TOKEN           api_key   demo      prod   web    ci\n"
           "DB_DSN                 database  demo      prod   web\n"
           "PS C:\\> concealer get --name GITHUB_TOKEN\n"
           "ghp_…DUMMY…9f\n")
    p1 = text_png(cli, os.path.join(out, "cli.png"))
    # a tiny fake curses frame with cursor positioning
    raw = ("\x1b[2J\x1b[1;1H+-- 1-Filters --+\x1b[1;20H+-- 2-Secrets --+"
           "\x1b[2;1H| TYPE          |\x1b[2;20H| GITHUB_TOKEN  |"
           "\x1b[3;20H| DB_DSN        |")
    p2 = ansi_png(raw, os.path.join(out, "tui.png"), cols=60, rows=8)
    assert os.path.getsize(p1) > 800 and os.path.getsize(p2) > 800, "render produced empty PNGs"
    print("OK:", p1, p2)


if __name__ == "__main__":
    demo()
