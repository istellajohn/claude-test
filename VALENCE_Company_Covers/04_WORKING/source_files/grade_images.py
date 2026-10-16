"""Grade the NASA/USGS Landsat source images into the VALENCE palette.

Usage: python3 -I grade_images.py
Writes graded full-resolution masters to ../../03_ASSETS/photography/graded/
"""
import os
import numpy as np
from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = None
HERE = os.path.dirname(os.path.abspath(__file__))
PH = os.path.normpath(os.path.join(HERE, "..", "..", "03_ASSETS", "photography"))
OUT = os.path.join(PH, "graded")
os.makedirs(OUT, exist_ok=True)


def hex2rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def ramp(lum, stops):
    """lum 0..1 -> RGB through [(pos, '#hex'), ...]."""
    pos = np.array([s[0] for s in stops], dtype=np.float32)
    cols = np.stack([hex2rgb(s[1]) for s in stops])
    out = np.empty(lum.shape + (3,), dtype=np.float32)
    for c in range(3):
        out[..., c] = np.interp(lum, pos, cols[:, c])
    return out


def rgb2hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(-1); mn = a.min(-1); d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rc = (mx == r) & m; gc = (mx == g) & m & ~rc; bc = m & ~rc & ~gc
    h[rc] = ((g - b)[rc] / d[rc]) % 6
    h[gc] = (b - r)[gc] / d[gc] + 2
    h[bc] = (r - g)[bc] / d[bc] + 4
    h = h * 60.0
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    return h, s, mx


def grain(shape, amt, seed):
    rng = np.random.default_rng(seed)
    g = rng.normal(0, 1, shape[:2]).astype(np.float32)
    g = np.array(Image.fromarray(((g * 40) + 128).clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32)
    return ((g - 128) / 40.0 * amt)[..., None]


def grade_gotland():
    im = Image.open(os.path.join(PH, "NASA_Landsat7_Gotland_orig.jpg")).convert("RGB")
    a = np.asarray(im, dtype=np.float32) / 255.0
    lum = (0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2])
    # contrast curve: crush shadows toward onyx, keep filaments luminous
    l = np.clip((lum - 0.04) / 0.80, 0, 1) ** 1.35
    mapped = ramp(l, [(0.0, "#050707"), (0.18, "#0C2A27"), (0.42, "#0B5962"), (0.70, "#5E9CA0"), (1.0, "#E6ECE6")])
    # keep some of the natural green/lime of the blooms, pulled toward moss/forest
    h, s, v = rgb2hsv(a)
    green = np.clip(1 - np.abs(h - 85) / 45, 0, 1) * np.clip(s * 1.6, 0, 1) * np.clip(v * 1.4, 0, 1)
    moss = ramp(np.clip(v * 1.25, 0, 1), [(0.0, "#0A120D"), (0.5, "#4B5B3C"), (1.0, "#B9BE86")])
    out = mapped * (1 - 0.65 * green[..., None]) + moss * (0.65 * green[..., None])
    out = out + grain(out.shape, 5.0, 11)
    Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(os.path.join(OUT, "Gotland_graded_sea.jpg"), quality=93, subsampling=0)


def grade_erg():
    im = Image.open(os.path.join(PH, "NASA_Landsat5_ErgIguidi_orig.jpg")).convert("RGB")
    a = np.asarray(im, dtype=np.float32) / 255.0
    lum = (0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2])
    h, s, v = rgb2hsv(a)
    streak = np.clip(1 - np.abs(h - 62) / 28, 0, 1) * np.clip((s - 0.22) / 0.30, 0, 1)
    streak = np.array(Image.fromarray((streak * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), dtype=np.float32) / 255.0
    l = np.clip((lum - 0.03) / 0.85, 0, 1) ** 1.15
    stone = ramp(l, [(0.0, "#070707"), (0.30, "#2A2927"), (0.62, "#8F8C86"), (1.0, "#EDEBE6")])
    gold = ramp(np.clip(l * 1.15, 0, 1), [(0.0, "#2A1F0A"), (0.45, "#9A7A32"), (0.80, "#C8A24C"), (1.0, "#F0DDAA")])
    out = stone * (1 - streak[..., None]) + gold * streak[..., None]
    out = out + grain(out.shape, 4.5, 23)
    Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(os.path.join(OUT, "ErgIguidi_graded_stonegold.jpg"), quality=93, subsampling=0)


if __name__ == "__main__":
    grade_gotland(); print("gotland ok")
    grade_erg(); print("erg ok")
