"""VALENCE Google Workspace (Gmail) email signatures.

Usage: python3 -I build_signatures.py

Writes:
  05_EXPORTS/images/*.png           signature images (@3x), to be hosted at BASE_URL
  05_EXPORTS/gmail_html/<person>/   one file per option, absolute image URLs, ready to copy into Gmail
  05_EXPORTS/preview_html/          same signatures with local images, for review
  05_EXPORTS/boards/*.png           review boards

Gmail rules this file follows: tables and inline styles only (Gmail strips <style> and web fonts),
system font stacks, images hosted on a public https URL with explicit width/height, under 10,000 characters.
"""
import asyncio
import os
import re

from PIL import Image
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
COVERS = os.path.normpath(os.path.join(ROOT, "..", "VALENCE_Company_Covers"))
LOGOS = os.path.join(COVERS, "02_BRAND", "logos", "svg")
FONTS = os.path.join(COVERS, "02_BRAND", "fonts")
OUT = os.path.join(ROOT, "05_EXPORTS")
WORK = os.path.join(ROOT, "04_WORKING", "layouts")
CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"

# Where the PNGs in 05_EXPORTS/images must be uploaded. Change here and rebuild if hosted elsewhere.
BASE_URL = "https://www.vlnc.in/email/"

PEOPLE = [
    dict(key="stella", name="Stella John", aside="(Nirmala)", role=["Founder"],
         email="stella@vlnc.in", phone="+91 99204 79569", tel="+919920479569"),
    dict(key="pallavi", name="Pallavi Shinde", aside="", role=["Founder&rsquo;s Office Associate", "Outreach, Operations &amp; Publishing"],
         email="pallavi@vlnc.in", phone="+91 84540 87136", tel="+918454087136"),
    dict(key="ronaldo", name="Ronaldo Gomes", aside="", role=["Finance &amp; Investor Relations"],
         email="ronaldo@vlnc.in", phone="+91 74058 38162", tel="+917405838162"),
]
WEB = ("vlnc.in", "https://www.vlnc.in")
IG = ("@itsavalencething", "https://www.instagram.com/itsavalencething/")

SANS = "'Helvetica Neue',Helvetica,Arial,sans-serif"
SERIF = "Georgia,'Times New Roman',Times,serif"
INK, MUTE, FAINT, VERVE, RULE = "#0A0A0A", "#6E6B66", "#A6A39E", "#E35A2A", "#DEDBD5"

# image name -> (display w, display h)
IMAGES = {"vlnc-tile.png": (60, 60), "vlnc-plate.png": (84, 26), "valence-band.png": (340, 52)}


# ---------------------------------------------------------------- helpers
def a(text, href, color=INK, extra=""):
    return f'<a href="{href}" style="color:{color};text-decoration:none;{extra}">{text}</a>'


def slash():
    return f'<span style="color:{VERVE};">&nbsp;/&nbsp;</span>'


def img(name, src, alt="VALENCE", href=WEB[1]):
    w, h = IMAGES[name]
    tag = (f'<img src="{src(name)}" width="{w}" height="{h}" alt="{alt}" '
           f'style="display:block;width:{w}px;height:{h}px;border:0;outline:none;">')
    return f'<a href="{href}" style="text-decoration:none;">{tag}</a>'


def table(inner, extra=""):
    return (f'<table cellpadding="0" cellspacing="0" border="0" role="presentation" '
            f'style="border-collapse:collapse;font-family:{SANS};color:{INK};{extra}">{inner}</table>')


def spacer(h):
    return f'<tr><td style="height:{h}px;line-height:{h}px;font-size:0;">&nbsp;</td></tr>'


# ---------------------------------------------------------------- option 1: Ledger
def ledger(p, src):
    aside = f' <span style="font-weight:normal;color:{FAINT};">{p["aside"]}</span>' if p["aside"] else ""
    rows = f'<tr><td style="font-size:15px;line-height:20px;font-weight:bold;color:{INK};">{p["name"]}{aside}</td></tr>'
    for i, line in enumerate(p["role"]):
        rows += f'<tr><td style="font-size:12px;line-height:17px;color:{MUTE};padding-top:{2 if i == 0 else 0}px;">{line}</td></tr>'
    rule = table(f'<tr><td width="24" height="2" bgcolor="{VERVE}" style="width:24px;height:2px;background-color:{VERVE};font-size:0;line-height:0;">&nbsp;</td></tr>')
    rows += f'<tr><td style="padding:12px 0 11px 0;">{rule}</td></tr>'
    items = [("Mobile", a(p["phone"], f'tel:{p["tel"]}')), ("Email", a(p["email"], f'mailto:{p["email"]}')),
             ("Web", a(WEB[0], WEB[1])), ("Instagram", a(IG[0], IG[1]))]
    ledger_rows = "".join(
        f'<tr><td width="74" style="width:74px;font-size:9px;line-height:19px;letter-spacing:1.6px;text-transform:uppercase;color:{FAINT};vertical-align:top;">{k}</td>'
        f'<td style="font-size:12px;line-height:19px;color:{INK};vertical-align:top;">{v}</td></tr>'
        for k, v in items)
    rows += f'<tr><td>{table(ledger_rows)}</td></tr>'
    rows += f'<tr><td style="padding-top:16px;">{img("vlnc-plate.png", src)}</td></tr>'
    return table(rows)


# ---------------------------------------------------------------- option 2: Lockup
def lockup(p, src):
    aside = f' <span style="font-weight:normal;color:{FAINT};">{p["aside"]}</span>' if p["aside"] else ""
    right = f'<tr><td style="font-size:15px;line-height:20px;font-weight:bold;color:{INK};">{p["name"]}{aside}</td></tr>'
    for i, line in enumerate(p["role"]):
        right += f'<tr><td style="font-size:12px;line-height:17px;color:{MUTE};padding-top:{2 if i == 0 else 0}px;">{line}</td></tr>'
    right += spacer(9)
    right += (f'<tr><td style="font-size:12px;line-height:19px;color:{INK};white-space:nowrap;">'
              f'{a(p["phone"], "tel:" + p["tel"])}{slash()}{a(p["email"], "mailto:" + p["email"])}</td></tr>')
    right += (f'<tr><td style="font-size:12px;line-height:19px;color:{INK};white-space:nowrap;">'
              f'{a(WEB[0], WEB[1])}{slash()}{a(IG[0], IG[1])}</td></tr>')
    row = (f'<tr><td valign="top" style="padding:2px 16px 0 0;vertical-align:top;">{img("vlnc-tile.png", src)}</td>'
           f'<td valign="top" style="vertical-align:top;border-left:1px solid {RULE};padding:0 0 0 16px;">{table(right)}</td></tr>')
    return table(row)


# ---------------------------------------------------------------- option 3: Editorial
def editorial(p, src):
    aside = (f' <span style="font-style:italic;color:{FAINT};">{p["aside"]}</span>') if p["aside"] else ""
    rows = (f'<tr><td style="font-family:{SERIF};font-size:20px;line-height:24px;color:{INK};letter-spacing:-0.2px;">'
            f'{p["name"]}{aside}</td></tr>')
    for i, line in enumerate(p["role"]):
        rows += (f'<tr><td style="font-size:9.5px;line-height:15px;letter-spacing:1.5px;text-transform:uppercase;color:{MUTE};'
                 f'padding-top:{6 if i == 0 else 0}px;">{line}</td></tr>')
    rows += spacer(12)
    rows += f'<tr><td style="font-size:12px;line-height:19px;color:{INK};">{a(p["phone"], "tel:" + p["tel"])}</td></tr>'
    rows += f'<tr><td style="font-size:12px;line-height:19px;color:{INK};">{a(p["email"], "mailto:" + p["email"])}</td></tr>'
    rows += (f'<tr><td style="font-size:12px;line-height:19px;color:{MUTE};white-space:nowrap;">'
             f'{a(WEB[0], WEB[1], MUTE)}{slash()}{a(IG[0], IG[1], MUTE)}</td></tr>')
    rows += f'<tr><td style="padding-top:16px;">{img("valence-band.png", src, alt="Valence")}</td></tr>'
    return table(rows)


# ---------------------------------------------------------------- reply / forward (no images)
def reply(p, src):
    line1 = (f'<b style="color:{INK};">{p["name"]}</b>{slash()}'
             f'<span style="color:{MUTE};">{p["role"][0]}, VALENCE</span>')
    line2 = f'{a(p["phone"], "tel:" + p["tel"])}{slash()}{a(WEB[0], WEB[1])}'
    return table(f'<tr><td style="font-size:12px;line-height:18px;color:{INK};">{line1}<br>{line2}</td></tr>')


OPTIONS = {
    "1_Ledger": ("Ledger", "Text-led, labelled like an editorial index. One orange rule, a small VLNC plate to close.", ledger),
    "2_Lockup": ("Lockup", "The stacked VLNC tile beside the name. The most recognisable, compact on mobile.", lockup),
    "3_Editorial": ("Editorial", "Georgia name, tracked caps role, and the gold Valence signature as a closing band.", editorial),
    "4_Reply": ("Reply", "Two lines, no images, for replies and forwards so threads stay light.", reply),
}


# ---------------------------------------------------------------- images
def svg_inline(name, color):
    s = open(os.path.join(LOGOS, f"{name}.svg")).read()
    s = re.sub(r' width="[^"]*" height="[^"]*"', "", s, count=1)
    return s.replace("<svg ", f'<svg style="display:block;width:100%;height:100%;color:{color}" ', 1)


def image_pages():
    rel = os.path.relpath(FONTS, os.path.join(WORK, "images"))
    css = f"""<style>
@font-face{{font-family:"DM Mono";src:url("{rel}/DMMono/DMMono-Regular.ttf")}}
*{{margin:0;padding:0;box-sizing:border-box}} html,body{{background:#0A0A0A}}
.c{{position:relative;overflow:hidden;background:#0A0A0A}}
</style>"""
    tile = f"""<div class="c" style="width:60px;height:60px;display:flex;align-items:center;justify-content:center">
<div style="width:31px;height:{31 * 1102 / 1146:.2f}px">{svg_inline("VLNC_stacked", "#F3F2EF")}</div></div>"""
    plate = f"""<div class="c" style="width:84px;height:26px;display:flex;align-items:center;justify-content:center">
<div style="width:{11 * 1713 / 407:.2f}px;height:11px">{svg_inline("VLNC_wide", "#F3F2EF")}</div></div>"""
    band = f"""<div class="c" style="width:340px;height:52px">
<div style="position:absolute;left:16px;top:7px;width:{38 * 1049 / 755:.2f}px;height:38px">{svg_inline("Valence_signature", "#C8A24C")}</div>
<div style="position:absolute;right:16px;top:0;height:52px;display:flex;align-items:center;font-family:'DM Mono';font-size:7.5px;letter-spacing:.16em;color:rgba(243,242,239,.78);text-transform:uppercase;white-space:nowrap">
Strategy<span style="color:#E35A2A;margin:0 .6em">/</span>Story<span style="color:#E35A2A;margin:0 .6em">/</span>Growth<span style="color:#E35A2A;margin:0 .6em">/</span>Culture</div></div>"""
    os.makedirs(os.path.join(WORK, "images"), exist_ok=True)
    pages = {}
    for name, body in {"vlnc-tile.png": tile, "vlnc-plate.png": plate, "valence-band.png": band}.items():
        path = os.path.join(WORK, "images", name.replace(".png", ".html"))
        open(path, "w").write(f'<!doctype html><html><head><meta charset="utf-8">{css}</head><body>{body}</body></html>')
        pages[name] = path
    return pages


# ---------------------------------------------------------------- pages
def gmail_page(title, sig):
    return (f'<!doctype html><html><head><meta charset="utf-8"><title>{title}</title></head>'
            f'<body style="margin:32px;background:#ffffff;">{sig}</body></html>')


def board_page(title, desc, cards):
    gel = os.path.relpath(os.path.join(ROOT, "03_ASSETS", "preview_fonts", "Gelasio-wght.ttf"), os.path.join(OUT, "preview_html"))
    dm = os.path.relpath(os.path.join(FONTS, "DMMono", "DMMono-Regular.ttf"), os.path.join(OUT, "preview_html"))
    sw = os.path.relpath(os.path.join(FONTS, "Switzer", "Switzer_Complete", "Fonts", "WEB", "fonts", "Switzer-Medium.woff2"), os.path.join(OUT, "preview_html"))
    card_html = ""
    for who, sig in cards:
        card_html += f"""<div class="card"><div class="who">{who}</div>
<div class="body"><i style="width:92%"></i><i style="width:78%"></i><i style="width:85%"></i><i style="width:40%"></i></div>
<div class="sig">{sig}</div></div>"""
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>{title}</title><style>
/* preview only: Gelasio stands in for Georgia (metric-compatible); Gmail uses the recipient's own Georgia */
@font-face{{font-family:Georgia;src:url("{gel}")}}
@font-face{{font-family:"DM Mono";src:url("{dm}")}}
@font-face{{font-family:"Switzer";font-weight:500;src:url("{sw}")}}
*{{box-sizing:border-box}} body{{margin:0;background:#121212;padding:56px;width:1676px}}
.k{{font-family:"DM Mono";font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#A6A39E}}
h1{{font-family:Switzer;font-weight:500;font-size:40px;color:#F3F2EF;margin:10px 0 6px;letter-spacing:-.01em}}
.d{{font-family:"DM Mono";font-size:14px;color:#A6A39E;margin-bottom:34px}}
.row{{display:flex;gap:32px}} .card{{background:#fff;width:500px;padding:34px 36px 40px;border-radius:4px}}
.who{{font-family:"DM Mono";font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#A6A39E;margin-bottom:22px}}
.body i{{display:block;height:9px;background:#EEEDEA;border-radius:2px;margin-bottom:10px}} .body{{margin-bottom:30px}}
</style></head><body><div class="k">VALENCE / Google Workspace signatures</div><h1>{title}</h1><div class="d">{desc}</div>
<div class="row">{card_html}</div></body></html>"""


async def render(img_pages, boards):
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROMIUM, args=["--no-sandbox"])
        for name, path in img_pages.items():
            w, h = IMAGES[name]
            ctx = await b.new_context(viewport={"width": w, "height": h}, device_scale_factor=3)
            pg = await ctx.new_page()
            await pg.goto("file://" + path)
            await pg.evaluate("document.fonts.ready")
            await pg.wait_for_timeout(300)
            fp = os.path.join(OUT, "images", name)
            await pg.screenshot(path=fp, clip={"x": 0, "y": 0, "width": w, "height": h})
            print("image", name, Image.open(fp).size)
            await ctx.close()
        for path, out in boards:
            ctx = await b.new_context(viewport={"width": 1676, "height": 400}, device_scale_factor=2)
            pg = await ctx.new_page()
            await pg.goto("file://" + path)
            await pg.evaluate("document.fonts.ready")
            await pg.wait_for_timeout(400)
            await pg.screenshot(path=out, full_page=True)
            print("board", os.path.basename(out), Image.open(out).size)
            await ctx.close()
        await b.close()


def build():
    os.makedirs(os.path.join(OUT, "images"), exist_ok=True)
    os.makedirs(os.path.join(OUT, "preview_html"), exist_ok=True)
    os.makedirs(os.path.join(OUT, "boards"), exist_ok=True)
    live = lambda n: BASE_URL + n
    local = lambda n: "../images/" + n
    boards = []
    for key, (title, desc, fn) in OPTIONS.items():
        cards = []
        for p in PEOPLE:
            sig = fn(p, live)
            assert len(sig) < 10000, (key, p["key"], len(sig))
            d = os.path.join(OUT, "gmail_html", p["key"])
            os.makedirs(d, exist_ok=True)
            open(os.path.join(d, f"VALENCE_signature_{p['key']}_{key}.html"), "w").write(gmail_page(f"{p['name']} / {title}", sig))
            print(f"  {key:12s} {p['key']:8s} {len(sig):5d} chars")
            cards.append((re.sub(r"&[a-z]+;", "'", p["name"]), fn(p, local)))
        bp = os.path.join(OUT, "preview_html", f"board_{key}.html")
        open(bp, "w").write(board_page(f"Option {key[0]} / {title}", desc, cards))
        boards.append((bp, os.path.join(OUT, "boards", f"VALENCE_signature_option_{key}.png")))
    return boards


if __name__ == "__main__":
    boards = build()
    asyncio.run(render(image_pages(), boards))
