"""Build the four VALENCE profile picture variations, exports and a review board.

Usage: python3 -I build_avatars.py

Canvas 1024 CSS px @2x = 2048 x 2048 master. Content is kept inside the inscribed circle
(circle crop on Facebook, YouTube, Instagram) and also reads as a square (LinkedIn logo).
Platform sizes (official): LinkedIn logo 400 x 400 (min 268), Facebook 320 x 320 (shows 176 / 196),
YouTube renders at 98 x 98 (square crop in Studio, 15 MB max).
"""
import asyncio
import importlib.util
import os

from PIL import Image, ImageDraw, ImageFont
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("build_covers", os.path.join(HERE, "build_covers.py"))
bc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bc)  # exposes logo(), page(), crop(), paths; main block is guarded

ROOT, LAYOUTS, EXPORT, CHROMIUM = bc.ROOT, bc.LAYOUTS, bc.EXPORT, bc.CHROMIUM
OUT = os.path.join(EXPORT, "profile")
os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.join(LAYOUTS, "avatars"), exist_ok=True)
S = 1024


def v1_monolith():
    mark_w = 468
    mark_h = mark_w * 1102 / 1146
    group = mark_h + 60 + 14
    top = (S - group) / 2
    giant = bc.logo("VLNC_stacked", "#151514", h=1500, x=300, y=-300)
    body = f"""
<div class="abs" style="inset:0;background:radial-gradient(60% 60% at 62% 38%, rgba(255,255,255,.06), transparent 70%)"></div>
{giant}
{bc.logo("VLNC_stacked", "var(--bone)", w=mark_w, x=(S - mark_w) / 2, y=top)}
<div class="abs" style="left:{(S - 150) / 2}px;top:{top + mark_h + 60}px;width:150px;height:14px;background:var(--verve)"></div>
<div class="grain"></div>"""
    return bc.page("V1", S, S, "var(--onyx)", body, "VALENCE profile V1 Monolith")


def v2_signature():
    w = 770
    h = w * 755 / 1049
    body = f"""
<div class="abs" style="inset:0;background:radial-gradient(52% 52% at 50% 50%, rgba(200,162,76,.10), transparent 72%)"></div>
{bc.logo("Valence_signature", "var(--gold)", w=w, x=(S - w) / 2, y=(S - h) / 2 - 6)}
<div class="grain"></div>"""
    return bc.page("V2", S, S, "var(--onyx)", body, "VALENCE profile V2 Signature")


def v3_orbit():
    cx = cy = S / 2
    r = 380
    d = r * 0.7071
    nodes = [(-d, -d, "var(--onyx)"), (d, -d, "var(--forest)"), (-d, d, "var(--sea)"), (d, d, "var(--verve)")]
    dots = "".join(
        f'<div class="abs" style="left:{cx + dx - 30}px;top:{cy + dy - 30}px;width:60px;height:60px;border-radius:50%;background:{c}"></div>'
        for dx, dy, c in nodes
    )
    mark_w = 380
    mark_h = mark_w * 1102 / 1146
    body = f"""
<svg class="abs" style="left:0;top:0;width:100%;height:100%" xmlns="http://www.w3.org/2000/svg"><circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="rgba(10,10,10,.38)" stroke-width="5"/></svg>
{dots}
{bc.logo("VLNC_stacked", "var(--onyx)", w=mark_w, x=(S - mark_w) / 2, y=(S - mark_h) / 2)}
<div class="grain multiply"></div>"""
    return bc.page("V3", S, S, "var(--bone)", body, "VALENCE profile V3 Orbit")


def v4_field(img):
    mark_w = 470
    mark_h = mark_w * 1102 / 1146
    m = "radial-gradient(circle 360px at 50% 50%, #000 0%, #000 45%, transparent 100%)"
    body = f"""
<div class="abs" style="inset:0;background:#031316 url('{img}') center/cover"></div>
<div class="abs" style="inset:0;background:radial-gradient(circle at 50% 50%, rgba(3,16,18,.55), rgba(3,16,18,.12) 75%)"></div>
<div class="abs" style="inset:0;backdrop-filter:blur(14px) brightness(.72);-webkit-backdrop-filter:blur(14px) brightness(.72);-webkit-mask-image:{m};mask-image:{m}"></div>
{bc.logo("VLNC_stacked", "var(--bone)", w=mark_w, x=(S - mark_w) / 2, y=(S - mark_h) / 2)}
<div class="grain"></div>"""
    return bc.page("V4", S, S, "#031316", body, "VALENCE profile V4 Field")


NAMES = {
    "V1": ("Monolith", "Stacked VLNC on Onyx, one orange signal.", "Pairs with cover A"),
    "V2": ("Signature", "The gold Valence signature, the human mark.", "Pairs with cover B"),
    "V3": ("Orbit", "The mark held by the four charges.", "Pairs with cover C"),
    "V4": ("Field", "The mark over Landsat ocean currents.", "Pairs with cover B"),
}


def build():
    img = bc.crop("Gotland_graded_sea.jpg", "V4_avatar.jpg", 5600, 5300, 2300, 2048, 2048, soften=0.4)
    files = {"V1": v1_monolith(), "V2": v2_signature(), "V3": v3_orbit(), "V4": v4_field(img)}
    paths = {}
    for k, html in files.items():
        p = os.path.join(LAYOUTS, "avatars", f"{k}.html")
        open(p, "w").write(html)
        paths[k] = p
    return paths


async def render(paths):
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path=CHROMIUM, args=["--no-sandbox"])
        for k, p in paths.items():
            ctx = await browser.new_context(viewport={"width": S, "height": S}, device_scale_factor=2)
            pg = await ctx.new_page()
            await pg.goto("file://" + p)
            await pg.evaluate("document.fonts.ready")
            await pg.wait_for_timeout(400)
            name = NAMES[k][0]
            fp = os.path.join(OUT, f"VALENCE_profile_{k}_{name}_2048.png")
            await pg.screenshot(path=fp, type="png")
            print("rendered", fp, Image.open(fp).size)
            await ctx.close()
        await browser.close()


def circle(im, d):
    big = im.resize((d * 4, d * 4), Image.LANCZOS).convert("RGBA")
    mask = Image.new("L", (d * 4, d * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, d * 4 - 1, d * 4 - 1), fill=255)
    big.putalpha(mask)
    return big.resize((d, d), Image.LANCZOS)


def exports():
    for k, (name, _, _p) in NAMES.items():
        im = Image.open(os.path.join(OUT, f"VALENCE_profile_{k}_{name}_2048.png")).convert("RGB")
        for s in (800, 400):
            im.resize((s, s), Image.LANCZOS).save(os.path.join(OUT, f"VALENCE_profile_{k}_{name}_{s}.png"))


def board():
    W, M, G = 2400, 100, 40
    col = (W - 2 * M - 3 * G) // 4
    mono = lambda s: ImageFont.truetype(os.path.join(ROOT, "02_BRAND", "fonts", "DMMono", "DMMono-Regular.ttf"), s)
    sw = lambda s: ImageFont.truetype(os.path.join(ROOT, "02_BRAND", "fonts", "Switzer", "Switzer_Complete", "Fonts", "WEB", "fonts", "Switzer-Medium.ttf"), s)
    covers = {"V1": "A", "V2": "B", "V3": "C", "V4": "B"}
    H = 1490
    b = Image.new("RGB", (W, H), "#121212")
    d = ImageDraw.Draw(b)
    d.text((M, M - 10), "VALENCE / PROFILE PICTURES", font=mono(22), fill="#A6A39E")
    d.text((M, M + 30), "Four variations", font=sw(54), fill="#F3F2EF")
    d.text((M, M + 112), "2048 x 2048 master  /  LinkedIn 400  /  Facebook 320  /  YouTube 98", font=mono(20), fill="#A6A39E")
    y0 = M + 190
    for i, (k, (name, line, pair)) in enumerate(NAMES.items()):
        x = M + i * (col + G)
        im = Image.open(os.path.join(OUT, f"VALENCE_profile_{k}_{name}_2048.png")).convert("RGB")
        b.paste(im.resize((col, col), Image.LANCZOS), (x, y0))
        d.text((x, y0 + col + 24), f"{k[1]}  {name}", font=sw(34), fill="#F3F2EF")
        d.text((x, y0 + col + 72), line, font=mono(15), fill="#A6A39E")
        d.text((x, y0 + col + 98), pair, font=mono(15), fill="#6E6B66")
        # circle crops and size ladder
        yy = y0 + col + 150
        d.text((x, yy), "CIRCLE CROP  /  200  140  98  56 PX", font=mono(14), fill="#6E6B66")
        yy += 30
        cx = x
        for s in (200, 140, 98, 56):
            c = circle(im, s)
            b.paste(c, (cx, yy + (200 - s)), c)
            cx += s + 9
        # in context: LinkedIn cover with approximate avatar overlap
        yy += 200 + 40
        d.text((x, yy), f"IN CONTEXT / LINKEDIN, COVER {covers[k]} (APPROX.)", font=mono(14), fill="#6E6B66")
        yy += 28
        cov = Image.open(os.path.join(EXPORT, "final", f"VALENCE_linkedin_cover_{covers[k]}.png")).convert("RGB")
        ch = round(col * cov.height / cov.width)
        b.paste(cov.resize((col, ch), Image.LANCZOS), (x, yy))
        av = 86
        c = circle(im, av)
        ring = Image.new("RGBA", (av + 8, av + 8), (255, 255, 255, 0))
        ImageDraw.Draw(ring).ellipse((0, 0, av + 7, av + 7), fill=(255, 255, 255, 255))
        b.paste(ring, (x + 20, yy + ch - 40), ring)
        b.paste(c, (x + 24, yy + ch - 36), c)
        b.paste(Image.new("RGB", (col, 60), "#FFFFFF"), (x, yy + ch)) if False else None
    p = os.path.join(EXPORT, "_presentation", "VALENCE_profile_pictures_board.jpg")
    b.save(p, quality=90)
    print("board", p, b.size)


if __name__ == "__main__":
    paths = build()
    asyncio.run(render(paths))
    exports()
    board()
