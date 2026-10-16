"""VALENCE email signatures v03: banner-format signature cards (after the client's reference set).

Usage:
    python3 -I build_signatures_v03.py            # all variants, all people
    python3 -I build_signatures_v03.py stella     # one person

Card 600 x 200 CSS px (3:1, the reference format), rendered @3x, sliced so every contact detail is its
own link. Headshots: drop <key>.jpg into 00_BRIEF/headshots/ and rebuild; until then the photo slot
holds the VLNC mark.
"""
import asyncio
import importlib.util
import math
import os
import random
import re
import sys

from PIL import Image
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("v1", os.path.join(HERE, "build_signatures.py"))
v1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v1)

ROOT, OUT, LOGOS, CHROMIUM = v1.ROOT, v1.OUT, v1.LOGOS, v1.CHROMIUM
COVERS_FONTS = os.path.join(v1.COVERS, "02_BRAND", "fonts")
FONTS = os.path.join(ROOT, "02_BRAND", "fonts")
ICONS = os.path.join(ROOT, "03_ASSETS", "icons", "tabler")
HEADSHOTS = os.path.join(ROOT, "00_BRIEF", "headshots")
CARDS = os.path.join(ROOT, "04_WORKING", "layouts", "v03")
SLICES = os.path.join(OUT, "images", "v03")
MASTERS = os.path.join(OUT, "images", "v03_cards")
W, H, X3 = 600, 200, 3

ONYX, BONE, STONE, VERVE, GOLD = "#0A0A0A", "#F3F2EF", "#A6A39E", "#E35A2A", "#C8A24C"
FOREST, SEA = "#223D2E", "#0B5962"
TAGLINE = "We shape how brands are<br>felt, read and remembered."


# --------------------------------------------------------------------------- building blocks
def svg(name, color, h=None, w=None, extra=""):
    s = open(os.path.join(LOGOS, f"{name}.svg")).read()
    vw, vh = map(float, re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', s).groups())
    if h:
        w = h * vw / vh
    else:
        h = w * vh / vw
    s = re.sub(r' width="[^"]*" height="[^"]*"', "", s, count=1)
    return f'<span style="display:inline-block;width:{w:.1f}px;height:{h:.1f}px;color:{color};{extra}">{s.replace("<svg ", "<svg style=\"display:block;width:100%;height:100%\" ", 1)}</span>'


def icon(name, color, size=11):
    s = open(os.path.join(ICONS, f"{name}.svg")).read()
    s = re.sub(r'width="24"\s+height="24"', f'width="{size}" height="{size}"', s)
    s = s.replace('stroke-width="2"', 'stroke-width="1.8"')
    return f'<span class="ic" style="color:{color}">{s}</span>'


def contacts(p, icol, tcol, size=10.2, gap=5, cols=1, ic=11):
    items = [("tel", "phone", p["phone"]), ("mail", "mail", p["email"]),
             ("web", "world", v1.WEB[0]), ("ig", "brand-instagram", v1.IG[0])]
    cells = "".join(f'<span class="ci" data-link="{k}" style="gap:{gap + 2}px">{icon(i, icol, ic)}<span>{t}</span></span>'
                    for k, i, t in items)
    grid = f"grid-template-columns:{'auto ' * cols};column-gap:22px"
    return f'<div class="contacts" style="font-size:{size}px;color:{tcol};{grid}">{cells}</div>'


def photo(p, w, h, radius="0", ring=None):
    path = os.path.join(HEADSHOTS, f"{p['key']}.jpg")
    border = f"box-shadow:0 0 0 {ring[0]}px {ring[1]};" if ring else ""
    if os.path.exists(path):
        inner = f'<img src="{os.path.relpath(path, CARDS)}" style="width:100%;height:100%;object-fit:cover;display:block">'
        bg = "#222"
    else:  # placeholder until headshots arrive: the stacked mark
        inner = f'<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%">{svg("VLNC_stacked", BONE, w=w * 0.42)}</div>'
        bg = ONYX
    return f'<div style="width:{w}px;height:{h}px;border-radius:{radius};overflow:hidden;background:{bg};{border}flex:none">{inner}</div>'


def role_html(p, sep="<br>"):
    return sep.join(p["role"])


def first_last(p):
    parts = p["name"].split(" ")
    return parts[0], " ".join(parts[1:])


def pattern(w, h, cell, fg, bg, accent, seed=7):
    """VALENCE tile pattern built from the letter geometry of VLNC: the V wedge, the L corner,
    the N diagonal and the C quarter-round."""
    rnd = random.Random(seed)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><rect width="{w}" height="{h}" fill="{bg}"/>']
    for r in range(math.ceil(h / cell)):
        for c in range(math.ceil(w / cell)):
            x, y, s = c * cell, r * cell, cell
            k = rnd.choice(["q", "q", "wedge", "L", "half", "dot", "diag", "blank"])
            rot = rnd.choice([0, 90, 180, 270])
            col = accent if rnd.random() < 0.12 else fg
            g = f'<g transform="rotate({rot} {x + s / 2} {y + s / 2})" fill="{col}">'
            if k == "q":
                g += f'<path d="M{x},{y + s} L{x},{y} A{s},{s} 0 0 1 {x + s},{y + s} Z"/>'
            elif k == "wedge":
                g += f'<path d="M{x},{y} L{x + s * 0.45},{y} L{x + s},{y + s} L{x + s * 0.55},{y + s} Z"/>'
            elif k == "L":
                g += f'<path d="M{x},{y} h{s * 0.38} v{s * 0.62} h{s * 0.62} v{s * 0.38} h{-s} Z"/>'
            elif k == "half":
                g += f'<path d="M{x},{y + s} A{s / 2},{s / 2} 0 0 1 {x + s},{y + s} Z"/>'
            elif k == "dot":
                g += f'<circle cx="{x + s / 2}" cy="{y + s / 2}" r="{s * 0.2}"/>'
            elif k == "diag":
                g += f'<path d="M{x},{y} L{x + s},{y + s} L{x},{y + s} Z"/>'
            out.append(g + "</g>")
    return "".join(out) + "</svg>"


# --------------------------------------------------------------------------- variants
def v_signal(p):
    """1  Signal Pattern  (ref: Duskwood). Bone card, contacts left, autograph centre, logo right, pattern band."""
    fn, ln = first_last(p)
    aside = f' <span style="color:{STONE}">{p["aside"]}</span>' if p["aside"] else ""
    band = pattern(W, 50, 25, BONE, VERVE, ONYX)
    return f"""<div class="card" style="background:{BONE}">
<div class="abs" style="left:30px;top:30px;width:180px">
  <div class="lbl" style="color:{VERVE};margin-bottom:9px">Contact</div>{contacts(p, VERVE, ONYX)}</div>
<div class="abs" style="left:212px;top:28px;width:1px;height:96px;background:rgba(10,10,10,.12)"></div>
<div class="abs" style="left:236px;top:22px;width:200px">
  <div class="auto" style="font-size:34px;line-height:36px;color:{ONYX}">{p['name']}</div>
  <div class="lbl" style="color:{ONYX};margin-top:8px;letter-spacing:.2em">{p['name'].upper()}{aside.upper()}</div>
  <div style="font-size:10px;line-height:14px;color:#5E5B56;margin-top:5px">{role_html(p)}</div></div>
<div class="abs" style="right:30px;top:40px;text-align:right">{svg('VLNC_wide', ONYX, h=26)}
  <div class="lbl" style="color:#6E6B66;margin-top:8px">Branding &amp; Marketing</div>
  <div class="lbl" style="color:{VERVE};margin-top:3px">Strategy / Story / Growth</div></div>
<div class="abs" style="left:0;bottom:0;width:{W}px;height:50px">{band}</div></div>"""


def v_onyx(p):
    """2  Onyx Block  (ref: Ikhcan Chandra). Black card, Verve bar, big name, role pill, photo panel, handle pill."""
    fn, ln = first_last(p)
    pill = f'<span style="background:{VERVE};color:{ONYX};font-weight:600;font-size:8.6px;letter-spacing:.06em;padding:4px 8px 3px;border-radius:2px;white-space:nowrap">{p["role"][0]}</span>'
    extra = f'<div style="font-size:9.4px;color:{STONE};margin-top:5px">{p["role"][1]}</div>' if len(p["role"]) > 1 else ""
    aside = f' <span style="font-weight:400;color:#6E6B66;font-size:13px">{p["aside"]}</span>' if p["aside"] else ""
    return f"""<div class="card" style="background:radial-gradient(120% 140% at 85% 20%, #1c1c1b, {ONYX} 60%)">
<div class="abs" style="left:24px;top:24px;width:12px;height:152px;background:{VERVE}"></div>
<div class="abs" style="left:54px;top:22px;width:330px">
  <div style="font-weight:600;font-size:31px;line-height:32px;color:{BONE};letter-spacing:-.02em">{fn}</div>
  <div style="font-weight:600;font-size:31px;line-height:32px;color:{BONE};letter-spacing:-.02em;white-space:nowrap">{ln}{aside}</div>
  <div style="margin-top:10px">{pill}</div>{extra}</div>
<div class="abs" style="left:54px;bottom:24px">{contacts(p, VERVE, '#CFCBC4', size=9.6, cols=2, gap=4, ic=10)}</div>
<div class="abs" style="right:24px;top:20px;display:flex;align-items:center;gap:7px">{svg('VLNC_stacked', BONE, h=16)}<span class="lbl" style="color:{STONE}">Valence</span></div>
<div class="abs" style="right:24px;top:48px">{photo(p, 148, 106, '6px')}</div>
<div class="abs" data-link="ig" style="right:34px;top:138px;display:flex;align-items:center;gap:6px;background:rgba(243,242,239,.12);border:1px solid rgba(243,242,239,.18);border-radius:20px;padding:5px 11px 5px 8px;color:{BONE};font-size:9.4px;backdrop-filter:blur(6px)">{icon('brand-instagram', VERVE, 12)}<span>{v1.IG[0]}</span></div>
</div>"""


def v_horizon(p):
    """3  Horizon  (ref: Wildreams). Onyx-to-Verve header with tagline, bone body, first/last weight split, overlapping circles."""
    fn, ln = first_last(p)
    aside = f' <span style="font-weight:400;color:{STONE};font-size:12px">{p["aside"]}</span>' if p["aside"] else ""
    return f"""<div class="card" style="background:{BONE}">
<div class="abs" style="left:0;top:0;width:{W}px;height:86px;background:linear-gradient(100deg, {ONYX} 30%, #3a1a10 55%, {VERVE} 100%)"></div>
<div class="abs" style="left:26px;top:22px;display:flex;align-items:center;gap:9px">{svg('VLNC_wide', BONE, h=15)}</div>
<div class="abs" style="left:26px;top:56px;display:flex;gap:10px">
  <span data-link="web" style="display:flex">{icon('world', BONE, 12)}</span><span data-link="ig" style="display:flex">{icon('brand-instagram', BONE, 12)}</span></div>
<div class="abs" style="right:26px;top:20px;text-align:right;font-weight:600;font-size:15px;line-height:18px;color:{BONE};letter-spacing:-.01em">{TAGLINE}</div>
<div class="abs" style="left:26px;top:100px;width:400px">
  <div style="font-size:21px;line-height:24px;color:{ONYX};white-space:nowrap"><span style="font-weight:600">{fn}</span> <span style="font-weight:400;color:#8A8781">{ln}</span>{aside}<span style="display:inline-block;width:2px;height:20px;background:{VERVE};margin-left:5px;vertical-align:-3px"></span></div>
  <div style="font-size:9.6px;line-height:13px;color:#6E6B66;margin-top:3px">{role_html(p, ' / ')}</div></div>
<div class="abs" style="left:26px;bottom:14px">{contacts(p, VERVE, '#2A2927', size=9.4, cols=2, gap=4, ic=10)}</div>
<div class="abs" style="right:84px;top:58px">{photo(p, 84, 84, '50%', (4, BONE))}</div>
<div class="abs" style="right:26px;top:96px;width:64px;height:64px;border-radius:50%;background:{ONYX};box-shadow:0 0 0 4px {BONE};display:flex;align-items:center;justify-content:center">{svg('Valence_signature', GOLD, w=44)}</div>
</div>"""


def v_editorial(p, bg=FOREST, fg=BONE, muted="rgba(243,242,239,.55)"):
    """4  Editorial  (ref: Rosalina Josephine). Deep palette, condensed serif caps, (/) device, labelled columns."""
    fn, ln = first_last(p)
    lab = lambda t: f'<div class="lbl" style="color:{muted};margin-bottom:1px">{t}</div>'
    rows = [("Email", "mail", p["email"]), ("Phone", "tel", p["phone"]), ("Website", "web", v1.WEB[0]), ("Instagram", "ig", v1.IG[0])]
    col = "".join(f'<div data-link="{k}" style="margin-bottom:6px">{lab(t)}<div style="font-size:9.6px;color:{fg}">{v}</div></div>' for t, k, v in rows)
    aside = f'<div class="lbl" style="color:{muted};margin-top:6px">{p["aside"].upper()}</div>' if p["aside"] else ""
    return f"""<div class="card" style="background:{bg}">
<div class="abs lbl" style="left:28px;top:20px;color:{muted}">Valence</div>
<div class="abs lbl" style="left:110px;top:20px;color:{muted}">Branding agency</div>
<div class="abs" style="left:28px;top:56px;width:250px">
  <div style="font-family:'Instrument Serif';font-size:42px;line-height:36px;color:{fg};text-transform:uppercase;letter-spacing:-.01em">{fn}<br>{ln}</div>{aside}
  <div class="lbl" style="color:{muted};margin-top:9px;line-height:12px">{role_html(p)}</div></div>
<div class="abs" style="left:262px;top:46px;transform:rotate(-3deg)">{photo(p, 96, 112, '0', (5, fg))}</div>
<div class="abs" style="left:384px;top:84px;font-family:'Instrument Serif';font-size:20px;color:{fg}">(<span style="color:{VERVE}">/</span>)</div>
<div class="abs" style="left:440px;top:36px">{col}</div></div>"""


def v_monogram(p):
    """5  Monogram  (ref: Mona Monroe). Giant cropped Verve V, photo on top, bold caps name, vertical tab."""
    fn, ln = first_last(p)
    aside = f'<div class="lbl" style="color:#8A8781;margin-top:4px">{p["aside"].upper()}</div>' if p["aside"] else ""
    return f"""<div class="card" style="background:{BONE}">
<div class="abs" style="left:0;top:0;width:176px;height:{H}px;overflow:hidden"><div class="abs" style="left:-40px;top:-58px">{svg('VLNC_stacked', VERVE, h=330)}</div></div>
<div class="abs" style="left:36px;top:40px">{photo(p, 104, 120, '52px 52px 0 0', (4, BONE))}</div>
<div class="abs" style="left:200px;top:34px;width:300px">
  <div style="font-weight:700;font-size:26px;line-height:25px;color:{ONYX};letter-spacing:-.01em;text-transform:uppercase">{fn}<br>{ln}</div>{aside}
  <div style="font-size:9.8px;line-height:13px;color:#5E5B56;margin-top:6px">{role_html(p)}</div></div>
<div class="abs" style="left:200px;bottom:22px">{contacts(p, VERVE, ONYX, size=9.4, cols=2, gap=4, ic=10)}</div>
<div class="abs" data-link="web" style="right:0;top:0;width:44px;height:{H}px;background:{ONYX};display:flex;align-items:center;justify-content:center">
  <div style="transform:rotate(-90deg);white-space:nowrap;display:flex;align-items:center;gap:6px" class="lbl"><span style="color:{BONE}">vlnc.in</span>{icon('arrow-up-right', VERVE, 11)}</div></div>
<div class="abs" style="right:62px;top:28px">{svg('VLNC_wide', ONYX, h=13)}</div></div>"""


VARIANTS = {
    "1_signal": ("Signal Pattern", "Bone card, autograph name, VLNC tile pattern built from the letterforms.", v_signal, VERVE),
    "2_onyx": ("Onyx Block", "Black card, Verve bar, big name, role tag, photo panel and Instagram pill.", v_onyx, "#1b1b1b"),
    "3_horizon": ("Horizon", "Onyx-to-Verve header carrying the brand line; first name strong, surname quiet.", v_horizon, "#d9d5ce"),
    "4_editorial": ("Editorial", "Forest green, condensed serif capitals, the (/) device, labelled columns.", v_editorial, "#b9b6b0"),
    "5_monogram": ("Monogram", "A giant Verve VLNC, arched portrait, bold capitals and a vlnc.in tab.", v_monogram, "#d9d5ce"),
}


# --------------------------------------------------------------------------- page + slicing
def card_page(body, title):
    gs = os.path.relpath(os.path.join(FONTS, "general-sans", "GeneralSans_Complete", "Fonts", "WEB", "fonts"), CARDS)
    cf = os.path.relpath(COVERS_FONTS, CARDS)
    hv = os.path.relpath(os.path.join(FONTS, "herrvonmuellerhoff", "HerrVonMuellerhoff-Regular.ttf"), CARDS)
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>{title}</title><style>
@font-face{{font-family:GS;font-weight:400;src:url("{gs}/GeneralSans-Regular.woff2")}}
@font-face{{font-family:GS;font-weight:500;src:url("{gs}/GeneralSans-Medium.woff2")}}
@font-face{{font-family:GS;font-weight:600;src:url("{gs}/GeneralSans-Semibold.woff2")}}
@font-face{{font-family:GS;font-weight:700;src:url("{gs}/GeneralSans-Bold.woff2")}}
@font-face{{font-family:"DM Mono";src:url("{cf}/DMMono/DMMono-Regular.ttf")}}
@font-face{{font-family:"Instrument Serif";src:url("{cf}/InstrumentSerif/InstrumentSerif-Regular.ttf")}}
@font-face{{font-family:Autograph;src:url("{hv}")}}
*{{margin:0;padding:0;box-sizing:border-box}} html,body{{width:{W}px;height:{H}px;overflow:hidden}}
body{{font-family:GS,sans-serif;-webkit-font-smoothing:antialiased}}
.card{{position:relative;width:{W}px;height:{H}px;overflow:hidden}} .abs{{position:absolute}}
.lbl{{font-family:"DM Mono";font-size:7.4px;letter-spacing:.18em;text-transform:uppercase;white-space:nowrap}}
.auto{{font-family:Autograph;white-space:nowrap;margin-left:-3px}}
.contacts{{display:grid;row-gap:6px}} .ci{{display:inline-flex;align-items:center;white-space:nowrap;line-height:12px}}
.ic{{display:inline-flex}} .ic svg{{display:block}}
</style></head><body>{body}</body></html>"""


def plan_grid(rects):
    """Grid-slice the card so each link rectangle is exactly one cell; merge everything else."""
    ys = sorted({0, H, *[r[1] for r in rects], *[r[3] for r in rects]})
    bands = []
    for y0, y1 in zip(ys, ys[1:]):
        hit = [r for r in rects if r[1] <= y0 and r[3] >= y1]
        xs = sorted({0, W, *[r[0] for r in hit], *[r[2] for r in hit]})
        cells = []
        for x0, x1 in zip(xs, xs[1:]):
            link = next((r[4] for r in hit if r[0] <= x0 and r[2] >= x1), None)
            if cells and cells[-1]["link"] is None and link is None:
                cells[-1]["x1"] = x1
            else:
                cells.append(dict(x0=x0, x1=x1, link=link))
        if bands and not hit and all(c["link"] is None for c in bands[-1]["cells"]):
            bands[-1]["y1"] = y1
        else:
            bands.append(dict(y0=y0, y1=y1, cells=cells))
    return bands


def clean_rects(raw):
    rects = []
    for r in raw:
        x0, y0 = max(0, math.floor(r["l"]) - 2), max(0, math.floor(r["t"]) - 2)
        x1, y1 = min(W, math.ceil(r["r"]) + 2), min(H, math.ceil(r["b"]) + 2)
        for o in rects:  # shrink on overlap so cells never collide
            if x0 < o[2] and x1 > o[0] and y0 < o[3] and y1 > o[1]:
                if r["t"] >= o[3] - 4:
                    y0 = o[3]
                elif r["l"] >= o[2] - 6:
                    x0 = o[2]
        rects.append((x0, y0, x1, y1, r["k"]))
    return rects


def links_for(p):
    return {"tel": (f"tel:{p['tel']}", p["phone"]), "mail": (f"mailto:{p['email']}", p["email"]),
            "web": (v1.WEB[1], v1.WEB[0]), "ig": (v1.IG[1], v1.IG[0])}


def cut(png, plan, prefix):
    im = Image.open(png).convert("RGB")
    for ri, r in enumerate(plan):
        for ci, c in enumerate(r["cells"]):
            c["file"] = f"{prefix}-{ri:02d}{ci}.jpg"
            im.crop((c["x0"] * X3, r["y0"] * X3, c["x1"] * X3, r["y1"] * X3)).save(
                os.path.join(SLICES, c["file"]), quality=90, subsampling=0, optimize=True, progressive=True)


def signature_html(p, plan, src):
    links = links_for(p)
    alt_card = v1.re.sub(r"&[a-z]+;", "'", f"{p['name']}, {p['role'][0]}, VALENCE") if hasattr(v1, "re") else f"{p['name']}, VALENCE"
    rows = ""
    for ri, r in enumerate(plan):
        h = r["y1"] - r["y0"]
        tds = ""
        for c in r["cells"]:
            w = c["x1"] - c["x0"]
            href, alt = links[c["link"]] if c["link"] else (v1.WEB[1], alt_card if ri == 0 and len(r["cells"]) == 1 else "")
            tds += (f'<td style="padding:0;font-size:0"><a href="{href}">'
                    f'<img src="{src(c["file"])}" width="{w}" height="{h}" alt="{alt}" style="display:block;border:0;color:#6E6B66;font:11px Arial"></a></td>')
        rows += f'<tr><td style="padding:0;font-size:0"><table cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>{tds}</tr></table></td></tr>'
    return f'<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;width:{W}px;">{rows}</table>'


# --------------------------------------------------------------------------- mockup board
def board_html(key, title, desc, backdrop, hero, cards):
    gs = os.path.relpath(os.path.join(FONTS, "general-sans", "GeneralSans_Complete", "Fonts", "WEB", "fonts"), os.path.join(OUT, "preview_html"))
    dm = os.path.relpath(os.path.join(COVERS_FONTS, "DMMono", "DMMono-Regular.ttf"), os.path.join(OUT, "preview_html"))
    dark = backdrop in ("#1b1b1b",)
    blinds = ("repeating-linear-gradient(97deg, rgba(0,0,0,.0) 0 58px, rgba(0,0,0,.17) 58px 84px)" if not dark
              else "repeating-linear-gradient(97deg, rgba(255,255,255,.0) 0 34px, rgba(255,255,255,.05) 34px 62px)")
    row = "".join(f'<div class="sm"><div class="who">{n}</div><div class="sig">{c}</div></div>' for n, c in cards)
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:GS;font-weight:500;src:url("{gs}/GeneralSans-Medium.woff2")}}
@font-face{{font-family:"DM Mono";src:url("{dm}")}}
*{{box-sizing:border-box}} body{{margin:0;background:#121212;width:1676px;padding:56px}}
.k{{font-family:"DM Mono";font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#A6A39E}}
h1{{font-family:GS;font-weight:500;font-size:40px;color:#F3F2EF;margin:10px 0 6px}} .d{{font-family:"DM Mono";font-size:14px;color:#A6A39E;margin-bottom:30px}}
.hero{{position:relative;height:640px;border-radius:22px;overflow:hidden;background:{backdrop};display:flex;align-items:center;justify-content:center}}
.hero .shot{{position:relative;width:1080px;box-shadow:0 40px 80px rgba(0,0,0,.35),0 8px 20px rgba(0,0,0,.2)}}
.hero .shot img{{display:block;width:100%}}
.hero .bl{{position:absolute;inset:-80px;background:{blinds};filter:blur(13px);transform:skewY(-6deg);mix-blend-mode:multiply;pointer-events:none}}
.row{{display:flex;gap:32px;margin-top:32px}} .sm{{background:#fff;padding:26px;border-radius:6px;width:500px}}
.sm .sig{{width:600px;height:200px;transform:scale(.746);transform-origin:0 0;margin-bottom:-51px}}
.who{{font-family:"DM Mono";font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#A6A39E;margin-bottom:16px}}
</style></head><body><div class="k">VALENCE / Email signatures v03</div><h1>{title}</h1><div class="d">{desc}</div>
<div class="hero"><div class="shot"><img src="{hero}"></div><div class="bl"></div></div>
<div class="row">{row}</div></body></html>"""


async def render(jobs):
    out = {}
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROMIUM, args=["--no-sandbox"])
        for key, path, png in jobs:
            ctx = await b.new_context(viewport={"width": W, "height": H}, device_scale_factor=X3)
            pg = await ctx.new_page()
            await pg.goto("file://" + path)
            await pg.evaluate("document.fonts.ready")
            await pg.wait_for_timeout(300)
            out[key] = await pg.evaluate("""[...document.querySelectorAll('[data-link]')].map(e=>{const r=e.getBoundingClientRect();
                return {k:e.dataset.link,l:r.left,t:r.top,r:r.right,b:r.bottom}})""")
            await pg.screenshot(path=png)
            await ctx.close()
        await b.close()
    return out


async def shoot(boards):
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROMIUM, args=["--no-sandbox"])
        for path, png in boards:
            ctx = await b.new_context(viewport={"width": 1676, "height": 600}, device_scale_factor=2)
            pg = await ctx.new_page()
            await pg.goto("file://" + path)
            await pg.evaluate("document.fonts.ready")
            await pg.wait_for_timeout(500)
            await pg.screenshot(path=png, full_page=True)
            print("board", os.path.basename(png), Image.open(png).size)
            await ctx.close()
        await b.close()


def main(only=None):
    for d in (CARDS, SLICES, MASTERS):
        os.makedirs(d, exist_ok=True)
    people = [p for p in v1.PEOPLE if not only or p["key"] == only]
    jobs = []
    for vk, (title, desc, fn, bd) in VARIANTS.items():
        for p in people:
            path = os.path.join(CARDS, f"{vk}_{p['key']}.html")
            open(path, "w").write(card_page(fn(p), f"{title} / {p['key']}"))
            jobs.append(((vk, p["key"]), path, os.path.join(MASTERS, f"card-{vk}-{p['key']}.png")))
    rects = asyncio.run(render(jobs))
    boards = []
    for vk, (title, desc, fn, bd) in VARIANTS.items():
        cards = []
        for p in people:
            plan = plan_grid(clean_rects(rects[(vk, p["key"])]))
            cut(os.path.join(MASTERS, f"card-{vk}-{p['key']}.png"), plan, f"sig3-{vk}-{p['key']}")
            live = signature_html(p, plan, lambda n: f"{v1.BASE_URL}v03/{n}")
            assert len(live) < 10000, (vk, p["key"], len(live))
            d = os.path.join(OUT, "gmail_html", p["key"])
            os.makedirs(d, exist_ok=True)
            open(os.path.join(d, f"VALENCE_signature_{p['key']}_v03_{vk}.html"), "w").write(v1.gmail_page(f"{title}", live))
            n = sum(len(r["cells"]) for r in plan)
            kb = sum(os.path.getsize(os.path.join(SLICES, c["file"])) for r in plan for c in r["cells"]) / 1000
            print(f"  {vk:12s} {p['key']:8s} {len(live):5d} chars {n:3d} slices {kb:4.0f} KB  links={sorted({c['link'] for r in plan for c in r['cells'] if c['link']})}")
            cards.append((v1.re.sub(r"&[a-z]+;", "'", p["name"]) if hasattr(v1, "re") else p["name"],
                           signature_html(p, plan, lambda n: f"../images/v03/{n}")))
        hero = os.path.relpath(os.path.join(MASTERS, f"card-{vk}-{people[0]['key']}.png"), os.path.join(OUT, "preview_html"))
        bp = os.path.join(OUT, "preview_html", f"board_v03_{vk}.html")
        open(bp, "w").write(board_html(vk, f"{vk[0]} / {title}", desc, bd, hero, cards))
        boards.append((bp, os.path.join(OUT, "boards", f"VALENCE_signature_v03_{vk}.png")))
    asyncio.run(shoot(boards))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
