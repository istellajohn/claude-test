"""Presentation boards (review only) and platform upload-ready JPEGs.

Usage: python3 -I make_boards_and_uploads.py
"""
import io
import os
from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
FIN = os.path.join(ROOT, "05_EXPORTS", "social", "final")
PRES = os.path.join(ROOT, "05_EXPORTS", "social", "_presentation")
UP = os.path.join(ROOT, "05_EXPORTS", "social", "upload_ready")
os.makedirs(PRES, exist_ok=True)
os.makedirs(UP, exist_ok=True)
MONO = os.path.join(ROOT, "02_BRAND", "fonts", "DMMono", "DMMono-Regular.ttf")
SW = os.path.join(ROOT, "02_BRAND", "fonts", "Switzer", "Switzer_Complete", "Fonts", "WEB", "fonts", "Switzer-Medium.ttf")
NAMES = {"A": "Direction A  /  Cropped Authority", "B": "Direction B  /  The Invisible Layer", "C": "Direction C  /  Four Charges"}


def font(path, size):
    return ImageFont.truetype(path, size)


def board(d):
    W, M = 2400, 100
    li = Image.open(os.path.join(FIN, f"VALENCE_linkedin_cover_{d}.png")).convert("RGB")
    fb = Image.open(os.path.join(FIN, f"VALENCE_facebook_cover_{d}.png")).convert("RGB")
    yt = Image.open(os.path.join(FIN, f"VALENCE_youtube_cover_{d}_2K.png")).convert("RGB")
    inner = W - 2 * M
    li_s = li.resize((inner, round(li.height * inner / li.width)), Image.LANCZOS)
    half = (inner - 40) // 2
    fb_s = fb.resize((half, round(fb.height * half / fb.width)), Image.LANCZOS)
    yt_s = yt.resize((half, round(yt.height * half / yt.width)), Image.LANCZOS)
    H = M + 120 + 50 + li_s.height + 70 + 50 + fb_s.height + M
    b = Image.new("RGB", (W, H), "#121212")
    dr = ImageDraw.Draw(b)
    dr.text((M, M - 10), "VALENCE / COMPANY COVERS", font=font(MONO, 22), fill="#A6A39E")
    dr.text((M, M + 30), NAMES[d], font=font(SW, 54), fill="#F3F2EF")
    y = M + 120 + 50
    dr.text((M, y - 36), "LINKEDIN PAGE COVER  /  3840 x 650  /  official 1512 x 256", font=font(MONO, 20), fill="#A6A39E")
    b.paste(li_s, (M, y))
    y += li_s.height + 70
    dr.text((M, y - 36), "FACEBOOK PAGE COVER  /  3840 x 2160  /  16:9", font=font(MONO, 20), fill="#A6A39E")
    dr.text((M + half + 40, y - 36), "YOUTUBE CHANNEL ART  /  2560 x 1440 (2K)  /  also 3840 x 2160 (4K)", font=font(MONO, 20), fill="#A6A39E")
    b.paste(fb_s, (M, y))
    b.paste(yt_s, (M + half + 40, y))
    p = os.path.join(PRES, f"VALENCE_covers_board_{d}.jpg")
    b.save(p, quality=90)
    print("board", p, b.size)


def jpeg_under(im, path, limit_bytes):
    for q in range(95, 55, -3):
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=q, optimize=True, progressive=True, subsampling=0 if q >= 90 else 2)
        if buf.tell() <= limit_bytes:
            open(path, "wb").write(buf.getvalue())
            return q, buf.tell()
    raise SystemExit(f"cannot fit {path}")


LIMITS = {"linkedin": 3_000_000, "facebook": 8_000_000, "youtube": 6_000_000}


def uploads(d):
    jobs = [
        ("linkedin", f"VALENCE_linkedin_cover_{d}.png", f"VALENCE_linkedin_cover_{d}_3840x650.jpg"),
        ("facebook", f"VALENCE_facebook_cover_{d}.png", f"VALENCE_facebook_cover_{d}_3840x2160.jpg"),
        ("youtube", f"VALENCE_youtube_cover_{d}_2K.png", f"VALENCE_youtube_banner_{d}_2560x1440.jpg"),
    ]
    for plat, src, out in jobs:
        im = Image.open(os.path.join(FIN, src)).convert("RGB")
        q, n = jpeg_under(im, os.path.join(UP, out), LIMITS[plat])
        print("upload", out, im.size, f"q{q}", f"{n / 1e6:.2f} MB")


if __name__ == "__main__":
    for d in "ABC":
        board(d)
        uploads(d)
