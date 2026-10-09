"""Build the VALENCE company cover layouts and render them.

Usage:
    python3 -I build_covers.py            # write HTML + render previews at 1x
    python3 -I build_covers.py final      # render production sizes (4K / 2K)

Logos are read from 02_BRAND/logos/svg (traced from the supplied PNGs) and inlined into
each HTML file, so replacing an SVG there and re-running this script updates every cover.
"""
import asyncio
import os
import re
import sys

from PIL import Image
from playwright.async_api import async_playwright

Image.MAX_IMAGE_PIXELS = None
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
LOGOS = os.path.join(ROOT, "02_BRAND", "logos", "svg")
PHOTO = os.path.join(ROOT, "03_ASSETS", "photography")
CROPS = os.path.join(PHOTO, "graded", "crops")
LAYOUTS = os.path.join(ROOT, "04_WORKING", "layouts")
EXPORT = os.path.join(ROOT, "05_EXPORTS", "social")
CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
os.makedirs(CROPS, exist_ok=True)

# ---------------------------------------------------------------------------------------
# Platform specs (CSS px canvas, device scale for production export)
#   LinkedIn Page cover : official 1512x256 (5.906:1). 1920x325 @2x = 3840x650.
#   Facebook Page cover : 16:9 desktop, 2.4:1 mobile, 2.7:1 legacy desktop. 1920x1080 @2x = 3840x2160.
#   YouTube channel art : 2560x1440 recommended, safe area 1546x423 (scaled from official 1235x338 @2048x1152).
#                         1280x720 @2 = 2560x1440 (2K), @3 = 3840x2160 (4K).
# ---------------------------------------------------------------------------------------
PLATFORMS = {
    "linkedin": dict(w=1920, h=325, dsf=2),
    "facebook": dict(w=1920, h=1080, dsf=2),
    "youtube": dict(w=1280, h=720, dsf=3, dsf_2k=2),
}
YT_SAFE = (773, 211.5)  # 1546x423 at 2560 -> CSS px at 1280 base


def logo(name, color, h=None, w=None, x=None, y=None, pos="abs", extra=""):
    svg = open(os.path.join(LOGOS, f"{name}.svg")).read()
    vw, vh = map(float, re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', svg).groups())
    if h:
        w = h * vw / vh
    else:
        h = w * vh / vw
    svg = re.sub(r' width="[^"]*" height="[^"]*"', "", svg, count=1)
    place = f"left:{x}px;top:{y}px;" if pos == "abs" else "position:relative;flex:none;"
    return f'<div class="logo" style="{place}width:{w:.2f}px;height:{h:.2f}px;color:{color};{extra}">{svg}</div>'


def crop(src, name, cx, cy, crop_w, out_w, out_h, soften=0.0):
    """Cut a region (centre cx,cy in source px, width crop_w) to out_w x out_h."""
    im = _SRC.get(src) or _SRC.setdefault(src, Image.open(os.path.join(PHOTO, "graded", src)).convert("RGB"))
    ch = crop_w * out_h / out_w
    x0 = int(min(max(cx - crop_w / 2, 0), im.width - crop_w))
    y0 = int(min(max(cy - ch / 2, 0), im.height - ch))
    out = im.crop((x0, y0, int(x0 + crop_w), int(y0 + ch))).resize((out_w, out_h), Image.LANCZOS)
    if soften:
        from PIL import ImageFilter
        out = out.filter(ImageFilter.GaussianBlur(soften))
    path = os.path.join(CROPS, name)
    out.save(path, quality=92, subsampling=0)
    print(f"  crop {name}: src {int(crop_w)}x{int(ch)} -> {out_w}x{out_h} (scale {out_w / crop_w:.2f}x)")
    return f"../../../03_ASSETS/photography/graded/crops/{name}"


_SRC = {}


def page(key, w, h, bg, body, title):
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width={w}">
<title>{title}</title>
<link rel="stylesheet" href="../shared/base.css">
<style>:root{{--w:{w}px;--h:{h}px;--bg:{bg}}}</style></head>
<body><div class="canvas">{body}</div></body></html>"""


TAG = 'Strategy<span class="s">/</span>Story<span class="s">/</span>Growth<span class="s">/</span>Culture'


def fill():
    return "position:absolute;inset:0;"


def center_flex(inner, extra=""):
    return f'<div class="abs" style="inset:0;display:flex;align-items:center;justify-content:center;{extra}">{inner}</div>'


# =======================================================================================
# DIRECTION A  "Cropped Authority": the mark as architecture, tonal on onyx, one orange signal
# =======================================================================================
def a_group(logo_h, head_px, tag_px, gap, bar=(48, 3)):
    mark = logo("VLNC_wide", "var(--bone)", h=logo_h, pos="rel")
    return f"""<div style="display:flex;align-items:center;gap:{gap}px">
  {mark}
  <div style="width:1px;height:{logo_h * 1.55:.0f}px;background:rgba(243,242,239,.2);flex:none"></div>
  <div style="display:flex;flex-direction:column;gap:{head_px * 0.52:.0f}px">
    <div style="width:{bar[0]}px;height:{bar[1]}px;background:var(--verve)"></div>
    <div class="head" style="font-size:{head_px}px;line-height:1.16;color:var(--bone)">Find the signal.<br>Remove the noise.</div>
    <div class="mono" style="font-size:{tag_px}px;color:var(--stone)">{TAG}</div>
  </div></div>"""


def a_linkedin():
    W, H = 1920, 325
    giant = logo("VLNC_wide", "#1A1A19", h=600, x=-190, y=-150)
    body = f"""
<div class="abs" style="inset:0;background:radial-gradient(70% 140% at 78% 30%, rgba(255,255,255,.05), transparent 60%)"></div>
<div class="abs" style="inset:0;-webkit-mask-image:linear-gradient(90deg,transparent 4%,#000 62%);mask-image:linear-gradient(90deg,transparent 4%,#000 62%)">{giant}</div>
<div class="rule-h" style="left:0;top:162px;width:520px;background:linear-gradient(90deg,transparent,rgba(243,242,239,.22))"></div>
<div class="rule-h" style="left:1400px;top:162px;width:520px;background:linear-gradient(90deg,rgba(243,242,239,.22),transparent)"></div>
<div class="plus" style="left:520px;top:162px;color:var(--stone)"></div>
<div class="plus" style="left:1400px;top:162px;color:var(--stone)"></div>
{center_flex(a_group(72, 32, 15, 52))}
<div class="grain"></div>"""
    return page("A", W, H, "var(--onyx)", body, "VALENCE LinkedIn cover, Direction A")


def a_facebook():
    W, H = 1920, 1080
    giant = logo("VLNC_stacked", "#171716", h=1560, x=1020, y=-250)
    body = f"""
<div class="abs" style="inset:0;background:radial-gradient(60% 90% at 78% 40%, rgba(255,255,255,.055), transparent 62%)"></div>
{giant}
<div class="rule-h" style="left:0;top:200px;width:{W}px;background:rgba(243,242,239,.10)"></div>
<div class="rule-h" style="left:0;top:880px;width:{W}px;background:rgba(243,242,239,.10)"></div>
<div class="mono" style="position:absolute;right:200px;top:222px;font-size:17px;color:var(--stone)">Branding &amp; Marketing Agency</div>
<div class="abs" style="left:240px;top:290px">
  <div style="width:96px;height:6px;background:var(--verve)"></div>
  {logo("VLNC_wide", "var(--bone)", h=118, x=0, y=60, pos="abs")}
  <div class="head" style="position:absolute;left:0;top:240px;font-size:60px;line-height:1.14;color:var(--bone);white-space:nowrap">Find the signal.<br>Remove the noise.</div>
</div>
<div class="plus" style="left:1700px;top:880px;color:var(--stone)"></div>
<div class="plus" style="left:1700px;top:200px;color:var(--stone)"></div>
<div class="grain"></div>"""
    return page("A", W, H, "var(--onyx)", body, "VALENCE Facebook cover, Direction A")


def a_youtube():
    W, H = 1280, 720
    giant = logo("VLNC_stacked", "#171716", h=1040, x=640, y=-160)
    sx, sy = (W - YT_SAFE[0]) / 2, (H - YT_SAFE[1]) / 2
    body = f"""
<div class="abs" style="inset:0;background:radial-gradient(60% 90% at 70% 50%, rgba(255,255,255,.055), transparent 62%)"></div>
{giant}
<div class="rule-h" style="left:0;top:360px;width:290px;background:linear-gradient(90deg,transparent,rgba(243,242,239,.22))"></div>
<div class="rule-h" style="left:990px;top:360px;width:290px;background:linear-gradient(90deg,rgba(243,242,239,.22),transparent)"></div>
<div class="plus" style="left:290px;top:360px;color:var(--stone)"></div>
<div class="plus" style="left:990px;top:360px;color:var(--stone)"></div>
{center_flex(a_group(48, 26, 11, 34, bar=(40, 3)))}
<div class="mono" style="position:absolute;left:56px;top:52px;font-size:12px;color:var(--stone)">Valence</div>
<div class="mono" style="position:absolute;right:56px;bottom:52px;font-size:12px;color:var(--stone)">{TAG}</div>
<div class="grain"></div>"""
    return page("A", W, H, "var(--onyx)", body, "VALENCE YouTube banner, Direction A")


# =======================================================================================
# DIRECTION B  "The Invisible Layer": cinematic, Landsat phytoplankton graded to Sea, gold signature
# =======================================================================================
def focus_zone(rx, ry, blur):
    """Shallow-focus pool behind the signature: blur + slight darkening, feathered by a radial mask."""
    m = f"radial-gradient(ellipse {rx}% {ry}% at 50% 50%, #000 0%, #000 38%, transparent 100%)"
    return (f'<div class="abs" style="inset:0;backdrop-filter:blur({blur}px) brightness(.7);-webkit-backdrop-filter:blur({blur}px) brightness(.7);'
            f'-webkit-mask-image:{m};mask-image:{m}"></div>')


def b_linkedin(img):
    W, H = 1920, 325
    sig = logo("Valence_signature", "var(--gold)", h=236, pos="rel")
    body = f"""
<div class="abs" style="{fill()}background:#031316 url('{img}') center/cover"></div>
<div class="abs" style="inset:0;background:radial-gradient(48% 100% at 50% 50%, rgba(3,16,18,.62), rgba(3,16,18,.0) 100%), linear-gradient(90deg, rgba(3,14,16,.72), rgba(3,14,16,.0) 38%, rgba(3,14,16,.0) 62%, rgba(3,14,16,.55))"></div>
{focus_zone(44, 100, 5)}
{center_flex(f'<div style="display:flex;align-items:center;gap:70px">'
            f'<div class="mono" style="font-size:15px;color:var(--bone);opacity:.82;text-align:right;line-height:2">Strategy<span class="s">/</span>Story</div>'
            f'{sig}'
            f'<div class="mono" style="font-size:15px;color:var(--bone);opacity:.82;line-height:2">Growth<span class="s">/</span>Culture</div></div>')}
<div class="grain"></div>"""
    return page("B", W, H, "#031316", body, "VALENCE LinkedIn cover, Direction B")


def b_facebook(img):
    W, H = 1920, 1080
    sig = logo("Valence_signature", "var(--gold)", h=470, x=760, y=300)
    body = f"""
<div class="abs" style="{fill()}background:#031316 url('{img}') center/cover"></div>
<div class="abs" style="inset:0;background:radial-gradient(46% 62% at 50% 50%, rgba(3,16,18,.66), rgba(3,16,18,0) 100%), linear-gradient(180deg, rgba(3,14,16,.55), rgba(3,14,16,0) 28%, rgba(3,14,16,0) 72%, rgba(3,14,16,.6))"></div>
{logo("VLNC_wide", "var(--bone)", h=44, x=240, y=232)}
<div class="mono" style="position:absolute;right:200px;top:240px;font-size:17px;color:var(--bone);opacity:.85">Branding &amp; Marketing Agency</div>
{focus_zone(30, 62, 14)}
{sig}
<div class="mono" style="position:absolute;right:200px;top:818px;font-size:17px;color:var(--bone);opacity:.88">{TAG}</div>
<div class="mono" style="position:absolute;right:200px;top:856px;font-size:13px;color:var(--bone);opacity:.72">Fig. 01 / Phytoplankton, Gotland / Landsat 7, 2005</div>
<div class="grain"></div>"""
    return page("B", W, H, "#031316", body, "VALENCE Facebook cover, Direction B")


def b_youtube(img):
    W, H = 1280, 720
    sig = logo("Valence_signature", "var(--gold)", h=176, pos="rel")
    body = f"""
<div class="abs" style="{fill()}background:#031316 url('{img}') center/cover"></div>
<div class="abs" style="inset:0;background:radial-gradient(40% 46% at 50% 50%, rgba(3,16,18,.6), rgba(3,16,18,0) 100%), linear-gradient(180deg, rgba(3,14,16,.5), rgba(3,14,16,0) 30%, rgba(3,14,16,0) 70%, rgba(3,14,16,.55))"></div>
{focus_zone(32, 70, 9)}
{center_flex(f'<div style="display:flex;align-items:center;gap:48px">'
            f'<div class="mono" style="font-size:12px;color:var(--bone);opacity:.82;text-align:right;line-height:2">Strategy<span class="s">/</span>Story</div>'
            f'{sig}'
            f'<div class="mono" style="font-size:12px;color:var(--bone);opacity:.82;line-height:2">Growth<span class="s">/</span>Culture</div></div>')}
{logo("VLNC_wide", "var(--bone)", h=26, x=56, y=52)}
<div class="mono" style="position:absolute;right:56px;bottom:52px;font-size:11px;color:var(--bone);opacity:.55">Fig. 01 / Gotland, Baltic Sea / Landsat 7</div>
<div class="grain"></div>"""
    return page("B", W, H, "#031316", body, "VALENCE YouTube banner, Direction B")


# =======================================================================================
# DIRECTION C  "Four Charges": bone editorial, brackets as orbit, gold gestural fragment
# =======================================================================================
def ring(cx, cy, r, color="rgba(10,10,10,.28)", sw=1.2):
    return (f'<svg class="abs" style="left:0;top:0;width:100%;height:100%;overflow:visible" xmlns="http://www.w3.org/2000/svg">'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{color}" stroke-width="{sw}"/></svg>')


def node(x, y, color, size, label, fs, lpos="right", gap=14):
    pos = {
        "right": f"left:{x + size / 2 + gap}px;top:{y}px;transform:translate(0,-50%);",
        "left": f"left:{x - size / 2 - gap}px;top:{y}px;transform:translate(-100%,-50%);",
        "above": f"left:{x}px;top:{y - size / 2 - gap}px;transform:translate(-50%,-100%);",
        "below": f"left:{x}px;top:{y + size / 2 + gap}px;transform:translate(-50%,0);",
    }[lpos]
    lbl = f'<div class="mono" style="position:absolute;{pos}font-size:{fs}px;color:var(--onyx)">{label}</div>' if label else ""
    return f'<div class="abs" style="left:{x - size / 2}px;top:{y - size / 2}px;width:{size}px;height:{size}px;border-radius:50%;background:{color}"></div>{lbl}'


def c_group(logo_h, head_px, tag_px, gap):
    mark = logo("VLNC_wide", "var(--onyx)", h=logo_h, pos="rel")
    return f"""<div style="display:flex;align-items:center;gap:{gap}px">
  {mark}
  <div style="width:1px;height:{logo_h * 1.55:.0f}px;background:rgba(10,10,10,.25);flex:none"></div>
  <div style="display:flex;flex-direction:column;gap:{head_px * 0.5:.0f}px">
    <div class="head" style="font-size:{head_px}px;line-height:1.16;color:var(--onyx)">We shape how brands are felt,<br>read and remembered.</div>
    <div class="mono" style="font-size:{tag_px}px;color:#6E6B66">{TAG}</div>
  </div></div>"""


def c_linkedin(imgL, imgR):
    W, H = 1920, 325
    cx, cy, r = 960, 162, 560
    body = f"""
<div class="abs" style="left:0;top:0;width:300px;height:{H}px;background:url('{imgL}') center/cover"></div>
<div class="abs" style="left:1620px;top:0;width:300px;height:{H}px;background:url('{imgR}') center/cover"></div>
{ring(cx, cy, r)}
{node(cx - r, cy, "var(--onyx)", 15, "Attraction", 13, "right", 12)}
{node(cx + r, cy, "var(--verve)", 15, "Conviction", 13, "left", 12)}
{center_flex(c_group(62, 28, 13, 40))}
<div class="grain multiply"></div>"""
    return page("C", W, H, "var(--bone)", body, "VALENCE LinkedIn cover, Direction C")


def c_facebook(img):
    W, H = 1920, 1080
    cx, cy, r_out, r_disc = 1380, 540, 335, 252
    body = f"""
<div class="abs" style="left:{cx - r_disc}px;top:{cy - r_disc}px;width:{2 * r_disc}px;height:{2 * r_disc}px;border-radius:50%;background:url('{img}') center/cover"></div>
{ring(cx, cy, r_out, "rgba(10,10,10,.34)", 1.6)}
{node(cx - r_out, cy, "var(--onyx)", 22, "Attraction", 17, "left", 20)}
{node(cx, cy - r_out, "var(--forest)", 22, "Trust", 17, "below", 16)}
{node(cx + r_out, cy, "var(--verve)", 22, "Conviction", 17, "right", 20)}
{node(cx, cy + r_out, "var(--sea)", 22, "Memory", 17, "above", 16)}
{logo("VLNC_wide", "var(--onyx)", h=96, x=240, y=262)}
<div class="head" style="position:absolute;left:240px;top:410px;font-size:52px;line-height:1.14;color:var(--onyx);white-space:nowrap">We shape how brands<br>are felt, read and<br>remembered.</div>
<div class="mono" style="position:absolute;left:240px;top:630px;font-size:17px;color:#6E6B66">{TAG}</div>
<div class="grain multiply"></div>"""
    return page("C", W, H, "var(--bone)", body, "VALENCE Facebook cover, Direction C")


def c_youtube(img):
    W, H = 1280, 720
    cx, cy, r = 640, 360, 330
    body = f"""
<div class="abs" style="left:0;top:0;width:210px;height:{H}px;background:url('{img}') 30% center/cover"></div>
<div class="abs" style="left:1070px;top:0;width:210px;height:{H}px;background:url('{img}') 75% center/cover"></div>
{ring(cx, cy, r)}
{node(cx - r, cy, "var(--onyx)", 12, "Attraction", 10, "above", 14)}
{node(cx + r, cy, "var(--verve)", 12, "Conviction", 10, "above", 14)}
{center_flex(c_group(44, 22, 10, 30))}
<div class="mono" style="position:absolute;left:260px;top:52px;font-size:11px;color:#6E6B66">Valence</div>
<div class="mono" style="position:absolute;right:260px;bottom:52px;font-size:11px;color:#6E6B66">Branding &amp; Marketing Agency</div>
<div class="grain multiply"></div>"""
    return page("C", W, H, "var(--bone)", body, "VALENCE YouTube banner, Direction C")


# ---------------------------------------------------------------------------------------
def build():
    print("crops")
    go = "Gotland_graded_sea.jpg"
    er = "ErgIguidi_graded_stonegold.jpg"
    b_li = crop(go, "B_linkedin.jpg", 5600, 3900, 3200, 3840, 650, soften=0.8)
    b_fb = crop(go, "B_facebook.jpg", 5232, 5800, 3840, 3840, 2160, soften=0.5)
    b_yt = crop(go, "B_youtube.jpg", 5700, 2500, 2900, 3840, 2160, soften=0.9)
    c_liL = crop(er, "C_linkedin_L.jpg", 2500, 2900, 1500, 600, 650)
    c_liR = crop(er, "C_linkedin_R.jpg", 5200, 2400, 1500, 600, 650)
    c_fb = crop(er, "C_facebook.jpg", 2900, 2700, 3600, 1200, 1200)
    c_yt = crop(er, "C_youtube.jpg", 3000, 2900, 4800, 3840, 2160)

    files = {
        ("A", "linkedin"): a_linkedin(), ("A", "facebook"): a_facebook(), ("A", "youtube"): a_youtube(),
        ("B", "linkedin"): b_linkedin(b_li), ("B", "facebook"): b_facebook(b_fb), ("B", "youtube"): b_youtube(b_yt),
        ("C", "linkedin"): c_linkedin(c_liL, c_liR), ("C", "facebook"): c_facebook(c_fb), ("C", "youtube"): c_youtube(c_yt),
    }
    out = []
    for (d, p), html in files.items():
        os.makedirs(os.path.join(LAYOUTS, d), exist_ok=True)
        path = os.path.join(LAYOUTS, d, f"{p}.html")
        open(path, "w").write(html)
        out.append((d, p, path))
    return out


async def render(items, final=False, only=None):
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path=CHROMIUM, args=["--no-sandbox"])
        for d, p, path in items:
            if only and (d, p) not in only:
                continue
            spec = PLATFORMS[p]
            scales = [(spec["dsf"], "")] if not final else [(spec["dsf"], "")]
            if final and p == "youtube":
                scales = [(spec["dsf"], "_4K"), (spec["dsf_2k"], "_2K")]
            if not final:
                scales = [(1, "")]
            for dsf, suffix in scales:
                ctx = await browser.new_context(viewport={"width": spec["w"], "height": spec["h"]}, device_scale_factor=dsf)
                pg = await ctx.new_page()
                await pg.goto("file://" + path)
                await pg.evaluate("document.fonts.ready")
                await pg.wait_for_timeout(400)
                sub = "final" if final else "_previews"
                od = os.path.join(EXPORT, sub)
                os.makedirs(od, exist_ok=True)
                fp = os.path.join(od, f"VALENCE_{p}_cover_{d}{suffix}.png")
                await pg.screenshot(path=fp, type="png")
                print("rendered", fp, Image.open(fp).size)
                await ctx.close()
        await browser.close()


if __name__ == "__main__":
    items = build()
    asyncio.run(render(items, final=(len(sys.argv) > 1 and sys.argv[1] == "final")))
