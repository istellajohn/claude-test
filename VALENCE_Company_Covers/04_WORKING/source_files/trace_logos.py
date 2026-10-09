"""Trace the supplied transparent PNG logos to clean SVG vectors.

Usage: python3 -I trace_logos.py
Reads  ../../02_BRAND/logos/*.png  (alpha channel is the shape)
Writes ../../02_BRAND/logos/svg/*.svg  (single-colour, tight viewBox, fill=currentColor)
"""
import os
import numpy as np
from PIL import Image
import potrace

HERE = os.path.dirname(os.path.abspath(__file__))
LOGOS = os.path.normpath(os.path.join(HERE, "..", "..", "02_BRAND", "logos"))
OUT = os.path.join(LOGOS, "svg")
os.makedirs(OUT, exist_ok=True)

# source PNG -> output name. Black files carry the cleanest alpha.
JOBS = {
    "VLNC_stacked_black.png": ("VLNC_stacked", dict(alphamax=0.55, opttol=0.25)),
    "VLNC_wide_black.png": ("VLNC_wide", dict(alphamax=0.55, opttol=0.25)),
    "Valence_signature_black.png": ("Valence_signature", dict(alphamax=1.1, opttol=0.4)),
}
SS = 2  # supersample before tracing for smoother edges


def trace(png, alphamax, opttol):
    im = Image.open(png).convert("RGBA")
    alpha = im.split()[3]
    bbox = alpha.point(lambda v: 255 if v > 128 else 0).getbbox()
    pad = 4
    bbox = (bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad)
    a = alpha.crop(bbox).resize(((bbox[2] - bbox[0]) * SS, (bbox[3] - bbox[1]) * SS), Image.LANCZOS)
    arr = np.array(a) <= 127  # potracer treats True as background here; invert so the logo is the filled shape
    bm = potrace.Bitmap(arr)
    plist = bm.trace(
        turdsize=8,
        turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
        alphamax=alphamax,
        opticurve=True,
        opttolerance=opttol,
    )
    d = []
    for curve in plist:
        s = curve.start_point
        d.append(f"M{s.x / SS:.2f},{s.y / SS:.2f}")
        for seg in curve.segments:
            if seg.is_corner:
                d.append(f"L{seg.c.x / SS:.2f},{seg.c.y / SS:.2f}L{seg.end_point.x / SS:.2f},{seg.end_point.y / SS:.2f}")
            else:
                d.append(
                    f"C{seg.c1.x / SS:.2f},{seg.c1.y / SS:.2f} {seg.c2.x / SS:.2f},{seg.c2.y / SS:.2f} "
                    f"{seg.end_point.x / SS:.2f},{seg.end_point.y / SS:.2f}"
                )
        d.append("Z")
    w, h = (bbox[2] - bbox[0]), (bbox[3] - bbox[1])
    return w, h, "".join(d)


for src, (name, kw) in JOBS.items():
    w, h, d = trace(os.path.join(LOGOS, src), kw["alphamax"], kw["opttol"])
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
        f'<path fill="currentColor" fill-rule="evenodd" d="{d}"/></svg>'
    )
    with open(os.path.join(OUT, f"{name}.svg"), "w") as f:
        f.write(svg)
    print(name, w, h, len(d), "bytes of path")
