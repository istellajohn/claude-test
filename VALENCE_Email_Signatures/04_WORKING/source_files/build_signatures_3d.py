"""VALENCE email signatures v02: rendered 3D cards with a signed-letter type system, sliced for Gmail.

Usage:
    python3 -I build_signatures_3d.py            # all themes, all people
    python3 -I build_signatures_3d.py stella     # one person (fast iteration)

Card = real 3D scene from the brand vectors (three.js) + type rendered in the brand's licensed fonts:
    autograph   Herr Von Muellerhoff      the name, written
    typed name  General Sans Medium       tracked capitals, like the typed line under a signature
    role        Cormorant Garamond Italic the editorial voice
    contacts    General Sans Regular      with Verve-orange slashes
Gmail cannot load web fonts, so the card is an image. It is sliced so phone, email, web and Instagram
are separate linked images (alt text = the plain detail, shown if images are blocked).
"""
import asyncio
import functools
import http.server
import importlib.util
import json
import math
import os
import sys
import threading

from PIL import Image
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("v1", os.path.join(HERE, "build_signatures.py"))
v1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v1)

ROOT, OUT, LOGOS, CHROMIUM = v1.ROOT, v1.OUT, v1.LOGOS, v1.CHROMIUM
SERVE_ROOT = os.path.dirname(ROOT)
CARDS = os.path.join(ROOT, "04_WORKING", "layouts", "cards")
SLICES = os.path.join(OUT, "images", "v02")
W, H, TX, X3 = 400, 200, 164, 3  # card CSS px, text column x, export scale

SVGS = {k: open(os.path.join(LOGOS, f"{f}.svg")).read() for k, f in
        {"stacked": "VLNC_stacked", "signature": "Valence_signature"}.items()}

# --------------------------------------------------------------------------- themes
THEMES = {
    "obsidian": dict(
        title="Obsidian", finish="Gloss",
        desc="The stacked mark as polished black stone, edged by a Verve-orange rim. Signed in bone.",
        ink=dict(script="#F3F2EF", typed="#8C8984", role="#CFCBC4", contact="#E8E5DF", line="rgba(243,242,239,.14)"),
        vignette=0.55, grain=0.45,
        scene=dict(
            bg="#0A0A0A", exposure=1.15,
            studio=[dict(pos=[3.0, 0.6, 3.2], size=[3.2, 4.5], color="#ffffff", intensity=1.6, gradient=True),
                    dict(pos=[1.5, 5, 2], size=[3, 1.2], color="#ffffff", intensity=1.6),
                    dict(pos=[-3.6, 0.8, -0.5], size=[0.8, 4], color="#E35A2A", intensity=5.0)],
            objects=[dict(kind="svg", svg="stacked", scale=1 / 1000, depth=0.3, bt=0.03, bs=0.02,
                          mat=dict(color="#0A0A0A", roughness=0.08, clearcoat=1, clearcoatRoughness=0.01, env=2.4),
                          pos=[0, 0.58, 0], rot=[0, 0.58, 0])],
            ground=dict(shadowOnly=True, opacity=0.75),
            lights=[dict(type="dir", color="#ffffff", intensity=0.9, pos=[2.2, 3.2, 3.0], shadow=True, softness=10),
                    dict(type="dir", color="#E35A2A", intensity=7.0, pos=[-3.4, 0.9, -1.2])],
            camera=dict(fov=28, pos=[0.96, 0.88, 3.7], look=[0.96, 0.58, 0]),
        ),
    ),
    "plaster": dict(
        title="Plaster", finish="Matte",
        desc="Tone-on-tone relief: the mark rises out of bone plaster under raking light. Signed in onyx.",
        ink=dict(script="#0A0A0A", typed="#7A766F", role="#3A3835", contact="#1C1B1A", line="rgba(10,10,10,.13)"),
        vignette=0.16, grain=0.4,
        scene=dict(
            bg="#E4E0D9", exposure=1.0,
            objects=[dict(kind="svg", svg="stacked", scale=1 / 1000, depth=0.1, bt=0.02, bs=0.014,
                          mat=dict(color="#EFECE6", roughness=0.92, env=0.3),
                          pos=[0, 0.06, 0], rot=[-1.5708, 0, -0.06])],
            ground=dict(shadowOnly=True, opacity=0.32, shadowColor="#5a5248"),
            lights=[dict(type="dir", color="#fff4e6", intensity=2.4, pos=[-3.2, 2.6, 1.4], shadow=True, softness=2),
                    dict(type="hemi", color="#ffffff", ground="#cbc5bc", intensity=0.85)],
            camera=dict(fov=24, pos=[1.04, 3.95, 1.4], look=[1.04, 0, -0.06]),
        ),
    ),
    "gold": dict(
        title="Gold Leaf", finish="Metal",
        desc="The stacked mark cast in polished gold leaf on onyx. Signed in gold to match.",
        ink=dict(script="#D9B565", typed="#8C8984", role="#CFCBC4", contact="#E8E5DF", line="rgba(200,162,76,.22)"),
        vignette=0.55, grain=0.45,
        scene=dict(
            bg="#0A0A0A", exposure=1.1,
            objects=[dict(kind="svg", svg="stacked", scale=1 / 1000, depth=0.24, bt=0.028, bs=0.018,
                          mat=dict(color="#D6B060", roughness=0.2, metalness=1, env=1.8),
                          pos=[0, 0.58, 0], rot=[0, 0.55, 0])],
            ground=dict(shadowOnly=True, opacity=0.7),
            lights=[dict(type="dir", color="#ffe6c2", intensity=1.8, pos=[-2, 3, 2.5], shadow=True, softness=6),
                    dict(type="dir", color="#ffffff", intensity=2.2, pos=[2.2, 1.6, -3.0])],
            camera=dict(fov=28, pos=[0.96, 0.88, 3.7], look=[0.96, 0.58, 0]),
        ),
    ),
}

GRAIN = ("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'>"
         "<feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' seed='4' stitchTiles='stitch'/>"
         "<feColorMatrix values='0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 1.2 -.15'/></filter>"
         "<rect width='100%' height='100%' filter='url(%23n)'/></svg>")


def plain(s):
    return s.replace("&rsquo;", "'").replace("&amp;", "&")


# --------------------------------------------------------------------------- card page
def card_page(theme, p):
    t = THEMES[theme]
    k = t["ink"]
    cfg = dict(t["scene"], w=W, h=H, svgs={o["svg"]: SVGS[o["svg"]] for o in t["scene"]["objects"] if o["kind"] == "svg"})
    f = "../../../02_BRAND/fonts"
    gs = f"{f}/general-sans/GeneralSans_Complete/Fonts/WEB/fonts"
    typed = p["name"].upper() + (f' <span style="opacity:.7">{p["aside"].upper()}</span>' if p["aside"] else "")
    roles = "<br>".join(p["role"])
    sl = '<span class="s">/</span>'
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>{t['title']} / {plain(p['name'])}</title>
<script type="importmap">{{"imports":{{"three":"../../../03_ASSETS/vendor/three-0.160.0/three.module.js",
"three/addons/":"../../../03_ASSETS/vendor/three-0.160.0/examples/jsm/"}}}}</script>
<style>
@font-face{{font-family:Autograph;src:url("{f}/herrvonmuellerhoff/HerrVonMuellerhoff-Regular.ttf")}}
@font-face{{font-family:Cormorant;font-style:italic;font-weight:300 700;src:url("{f}/cormorantgaramond/CormorantGaramond-Italic.ttf")}}
@font-face{{font-family:"General Sans";font-weight:400;src:url("{gs}/GeneralSans-Regular.woff2")}}
@font-face{{font-family:"General Sans";font-weight:500;src:url("{gs}/GeneralSans-Medium.woff2")}}
*{{margin:0;padding:0;box-sizing:border-box}} html,body{{width:{W}px;height:{H}px;overflow:hidden;background:{cfg['bg']}}}
.card{{position:relative;width:{W}px;height:{H}px;overflow:hidden}}
#scene{{position:absolute;inset:0;width:{W}px;height:{H}px}}
.fx{{position:absolute;inset:0;background:radial-gradient(120% 140% at 22% 50%, transparent 45%, rgba(0,0,0,{t['vignette']}))}}
.grain{{position:absolute;inset:0;opacity:{t['grain']};mix-blend-mode:overlay;background-size:300px 300px;background-image:url("{GRAIN}")}}
.txt{{position:absolute;left:{TX}px;right:14px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center}}
.auto{{font-family:Autograph;font-size:40px;line-height:38px;color:{k['script']};margin-left:-3px;white-space:nowrap}}
.typed{{font-family:"General Sans";font-weight:500;font-size:7.8px;letter-spacing:.24em;color:{k['typed']};margin-top:13px;white-space:nowrap}}
.role{{font-family:Cormorant;font-style:italic;font-weight:500;font-size:14.5px;line-height:17px;color:{k['role']};margin-top:5px;white-space:nowrap}}
.rule{{position:relative;height:1px;width:206px;background:{k['line']};margin:12px 0 9px}}
.rule::before{{content:"";position:absolute;left:0;top:0;width:18px;height:1px;background:#E35A2A}}
.ct{{font-family:"General Sans";font-weight:400;font-size:10.4px;line-height:17px;letter-spacing:.01em;color:{k['contact']};white-space:nowrap}}
.ct .s{{color:#E35A2A;margin:0 .55em}}
</style></head><body><div class="card"><canvas id="scene"></canvas><div class="fx"></div><div class="grain"></div>
<div class="txt"><div class="auto">{p['name']}</div><div class="typed">{typed}</div><div class="role">{roles}</div><div class="rule"></div>
<div class="ct"><span id="c-tel">{p['phone']}</span>{sl}<span id="c-mail">{p['email']}</span></div>
<div class="ct"><span id="c-web">{v1.WEB[0]}</span>{sl}<span id="c-ig">{v1.IG[0]}</span></div></div></div>
<script>window.CFG={json.dumps(cfg)};</script>
<script type="module" src="../shared/card3d.js"></script></body></html>"""


# --------------------------------------------------------------------------- slicing
def plan_slices(boxes):
    """Cut the card into horizontal bands; contact rows are split so each detail is its own linked cell."""
    def row(a, b):
        top = math.floor(min(boxes[a]["top"], boxes[b]["top"])) - 1
        bot = math.ceil(max(boxes[a]["bottom"], boxes[b]["bottom"])) + 1
        return top, bot
    r1, r2 = row("c-tel", "c-mail"), row("c-web", "c-ig")
    if r1[1] > r2[0]:
        mid = (r1[1] + r2[0]) // 2
        r1, r2 = (r1[0], mid), (mid, r2[1])
    bands = [("plain", 0, r1[0]), ("row", r1[0], r1[1], "c-tel", "c-mail")]
    if r2[0] > r1[1]:
        bands.append(("plain", r1[1], r2[0]))
    bands += [("row", r2[0], r2[1], "c-web", "c-ig"), ("plain", r2[1], H)]
    plan = []
    for b in bands:
        if b[0] == "plain":
            if b[2] > b[1]:
                plan.append(dict(y0=b[1], y1=b[2], cells=[dict(x0=0, x1=W, link=None)]))
            continue
        _, y0, y1, la, lb = b
        a0, a1 = math.floor(boxes[la]["left"]) - 1, math.ceil(boxes[la]["right"]) + 1
        b0, b1 = math.floor(boxes[lb]["left"]) - 1, math.ceil(boxes[lb]["right"]) + 1
        cells = [dict(x0=0, x1=a0, link=None), dict(x0=a0, x1=a1, link=la), dict(x0=a1, x1=b0, link=None),
                 dict(x0=b0, x1=b1, link=lb), dict(x0=b1, x1=W, link=None)]
        plan.append(dict(y0=y0, y1=y1, cells=[c for c in cells if c["x1"] > c["x0"]]))
    return plan


def links_for(p):
    return {"c-tel": (f"tel:{p['tel']}", p["phone"]), "c-mail": (f"mailto:{p['email']}", p["email"]),
            "c-web": (v1.WEB[1], v1.WEB[0]), "c-ig": (v1.IG[1], v1.IG[0])}


def cut(card_png, plan, prefix):
    im = Image.open(card_png).convert("RGB")
    for ri, r in enumerate(plan):
        for ci, c in enumerate(r["cells"]):
            name = f"{prefix}-{ri}{ci}.jpg"
            im.crop((c["x0"] * X3, r["y0"] * X3, c["x1"] * X3, r["y1"] * X3)).save(
                os.path.join(SLICES, name), quality=90, subsampling=0, optimize=True, progressive=True)
            c["file"] = name


def signature_html(p, plan, src):
    alt_card = plain(f"{p['name']}, {p['role'][0]}, VALENCE")
    links = links_for(p)
    rows = ""
    for ri, r in enumerate(plan):
        h = r["y1"] - r["y0"]
        tds = ""
        for c in r["cells"]:
            w = c["x1"] - c["x0"]
            href, alt = links[c["link"]] if c["link"] else (v1.WEB[1], alt_card if ri == 0 else "")
            img = (f'<img src="{src(c["file"])}" width="{w}" height="{h}" alt="{alt}" '
                   f'style="display:block;width:{w}px;height:{h}px;border:0;outline:none;color:#6E6B66;font-family:Arial,sans-serif;font-size:11px;">')
            tds += f'<td style="padding:0;line-height:0;font-size:0;"><a href="{href}" style="text-decoration:none;">{img}</a></td>'
        rows += (f'<tr><td style="padding:0;line-height:0;font-size:0;">'
                 f'<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;"><tr>{tds}</tr></table></td></tr>')
    return (f'<table cellpadding="0" cellspacing="0" border="0" role="presentation" '
            f'style="border-collapse:collapse;width:{W}px;">{rows}</table>')


# --------------------------------------------------------------------------- render
def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=SERVE_ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}/"


async def render_cards(jobs, base):
    results = {}
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROMIUM, args=[
            "--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        for key, html_path, png in jobs:
            ctx = await b.new_context(viewport={"width": W, "height": H}, device_scale_factor=X3)
            pg = await ctx.new_page()
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto(base + os.path.relpath(html_path, SERVE_ROOT))
            await pg.wait_for_function("window.READY === true", timeout=180000)
            boxes = await pg.evaluate("""Object.fromEntries(['c-tel','c-mail','c-web','c-ig'].map(id=>{
                const r=document.getElementById(id).getBoundingClientRect(); return [id,{left:r.left,right:r.right,top:r.top,bottom:r.bottom}] }))""")
            await pg.screenshot(path=png)
            results[key] = boxes
            print("card", os.path.basename(png), Image.open(png).size, errs or "")
            await ctx.close()
        await b.close()
    return results


async def render_boards(boards):
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROMIUM, args=["--no-sandbox"])
        for path, out in boards:
            ctx = await b.new_context(viewport={"width": 1676, "height": 400}, device_scale_factor=2)
            pg = await ctx.new_page()
            await pg.goto("file://" + path)
            await pg.evaluate("document.fonts.ready")
            await pg.wait_for_timeout(500)
            await pg.screenshot(path=out, full_page=True)
            print("board", os.path.basename(out), Image.open(out).size)
            await ctx.close()
        await b.close()


def main(only=None):
    os.makedirs(CARDS, exist_ok=True)
    os.makedirs(SLICES, exist_ok=True)
    people = [p for p in v1.PEOPLE if not only or p["key"] == only]
    jobs = []
    for theme in THEMES:
        for p in people:
            hp = os.path.join(CARDS, f"{theme}_{p['key']}.html")
            open(hp, "w").write(card_page(theme, p))
            jobs.append(((theme, p["key"]), hp, os.path.join(OUT, "images", f"card-{theme}-{p['key']}.png")))
    srv, base = serve()
    try:
        boxes = asyncio.run(render_cards(jobs, base))
    finally:
        srv.shutdown()

    boards = []
    for i, (theme, t) in enumerate(THEMES.items(), 1):
        cards = []
        for p in people:
            png = os.path.join(OUT, "images", f"card-{theme}-{p['key']}.png")
            plan = plan_slices(boxes[(theme, p["key"])])
            cut(png, plan, f"sig-{theme}-{p['key']}")
            live = signature_html(p, plan, lambda n: f"{v1.BASE_URL}v02/{n}")
            assert len(live) < 10000, len(live)
            d = os.path.join(OUT, "gmail_html", p["key"])
            os.makedirs(d, exist_ok=True)
            open(os.path.join(d, f"VALENCE_signature_{p['key']}_v02_{theme}.html"), "w").write(
                v1.gmail_page(f"{plain(p['name'])} / {t['title']}", live))
            cards.append((plain(p["name"]), signature_html(p, plan, lambda n: f"../images/v02/{n}")))
            print(f"  {theme:9s} {p['key']:8s} {len(live)} chars, {sum(len(r['cells']) for r in plan)} slices")
        bp = os.path.join(OUT, "preview_html", f"board_v02_{theme}.html")
        open(bp, "w").write(v1.board_page(f"{t['title']} / {t['finish']}", t["desc"], cards))
        boards.append((bp, os.path.join(OUT, "boards", f"VALENCE_signature_v02_{i}_{theme}.png")))
    asyncio.run(render_boards(boards))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
