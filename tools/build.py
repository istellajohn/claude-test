#!/usr/bin/env python3
"""Assemble the VALENCE Journal pages.

Each file in src/pages/ holds one page's content, preceded by a JSON comment:
  <!--{"title": "...", "description": "...", "nav": "interviews", "side": "day",
       "scripts": ["three", "hero"], "reading": true}-->
This script wraps it in the shared head, sky, ephemeris, masthead and footer and writes
the finished page to the repository root. Run from anywhere:

    python3 tools/build.py
    python3 tools/build.py --artifact OUT_DIR   # also writes a fragment copy of index.html

No dependencies beyond the standard library.
"""
import html
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "pages"

FONTS = (
    "https://fonts.googleapis.com/css2?"
    "family=Anybody:ital,wdth,wght@0,50..150,100..900;1,50..150,100..900"
    "&family=Ballet:opsz@16..72"
    "&family=Host+Grotesk:ital,wght@0,300..800;1,300..800"
    "&family=La+Belle+Aurore"
    "&family=Martian+Mono:wdth,wght@75..112.5,100..800"
    "&display=swap"
)

NAV = [
    ("interviews", "interviews.html", "Interviews"),
    ("essays", "essays.html", "Essays"),
    ("catalogue", "catalogue.html", "Catalogue"),
    ("about", "about.html", "About"),
]

# V Λ L E N C E, drawn as single strokes
WORDMARK = (
    '<svg viewBox="-2 -2 624 64" aria-hidden="true"><path d="'
    "M0 0L30 60L60 0"
    "M100 60L130 0L160 60"
    "M200 0V60H250"
    "M290 0V60M290 0H340M290 30H334M290 60H340"
    "M380 60V0L440 60V0"
    "M529.3 7A30 30 0 1 0 529.3 53"
    "M570 0V60M570 0H620M570 30H614M570 60H620"
    '"/></svg>'
)

JSONLD = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "VALENCE",
    "alternateName": ["VLNC", "Copious Space"],
    "description": "Perception architecture practice for brands, founders and ideas whose substance has outgrown its expression. Publisher of the VALENCE Journal.",
    "email": "buzz@vlnc.in",
    "founder": {"@type": "Person", "name": "Stella John"},
    "address": {"@type": "PostalAddress", "addressLocality": "Mumbai", "addressCountry": "IN"},
    "sameAs": ["https://www.instagram.com/itsavalencething/"],
}


def head(meta):
    side = meta.get("side", "night")
    title = html.escape(meta["title"])
    desc = html.escape(meta["description"])
    return f"""<!doctype html>
<html lang="en" data-side="{side}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#050507">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="assets/css/site.css">
<script type="application/ld+json">{json.dumps(JSONLD)}</script>
</head>
<body>
"""


def chrome_top(meta):
    current = meta.get("nav")
    here = ' aria-current="page"'
    links = "\n    ".join(
        f'<a href="{href}"{here if key == current else ""}>{label}</a>' for key, href, label in NAV
    )
    menu_links = "\n  ".join(
        f'<a href="{href}">{label}<span>0{i + 1}</span></a>' for i, (key, href, label) in enumerate(NAV)
    )
    return f"""<a class="skip" href="#main">Skip to content</a>
<div class="sky" aria-hidden="true"><canvas id="sky-base"></canvas><canvas id="sky-live"></canvas></div>
<div class="grain" aria-hidden="true"></div>
<div class="axis" aria-hidden="true"></div>
<div class="page">
<div class="ephemeris" role="note" aria-label="Tonight's sky">
  <div class="ephemeris__group">
    <span><span data-moon-glyph="12"></span><span data-eph="moon">Tonight's sky</span></span>
    <span data-eph="jd"></span>
  </div>
  <div class="ephemeris__group ephemeris__group--secondary">
    <span>Mumbai · <span data-eph="mumbai"></span></span>
    <span>Next letter · new moon · <span data-eph="next-new-short"></span></span>
    <span class="ephemeris__specimen">Specimen edition</span>
  </div>
</div>
<header class="masthead">
  <a class="wordmark" href="index.html" aria-label="VALENCE Journal, home">{WORDMARK}<span class="wordmark__sub">Journal</span></a>
  <nav class="nav" aria-label="Main">
    {links}
  </nav>
  <a class="btn" href="index.html#letter">The letter</a>
  <button class="btn menu-btn" type="button" aria-expanded="false" aria-controls="menu">Menu</button>
</header>
<nav id="menu" class="menu" aria-label="Menu" hidden>
  <a href="index.html">Home<span>00</span></a>
  {menu_links}
</nav>
<main id="main">
"""


FOOTER = """</main>
<footer class="footer">
  <div class="wrap">
    <div class="footer__grid">
      <div>
        <img class="footer__sig" src="assets/img/signature-gold.png" alt="Valence" width="1041" height="749" loading="lazy">
        <p class="footer__note">A journal kept by VALENCE, a perception architecture practice in Mumbai, working globally. One letter, every new moon.</p>
      </div>
      <div>
        <h3 class="mono">Read</h3>
        <ul><li><a href="interviews.html">Interviews</a></li><li><a href="essays.html">Essays</a></li><li><a href="catalogue.html">Catalogue</a></li><li><a href="index.html#letter">The letter</a></li></ul>
      </div>
      <div>
        <h3 class="mono">Practice</h3>
        <ul><li><a href="about.html">About VALENCE</a></li><li><a href="about.html#contact">buzz@vlnc.in</a></li><li><a href="https://www.instagram.com/itsavalencething/" target="_blank" rel="noopener">Instagram</a></li></ul>
      </div>
      <div>
        <h3 class="mono">Coordinates</h3>
        <ul><li class="coord">19.0760° N · 72.8777° E</li><li class="coord">Mumbai · working globally</li><li class="coord">Previously Copious Space</li></ul>
      </div>
    </div>
    <div class="footer__line">
      <span class="mono muted">© 2026 VALENCE</span>
      <span class="mono muted">Specimen edition · subjects, texts and dates are placeholders for layout</span>
    </div>
  </div>
</footer>
</div>
"""

READING_ORBIT = """<button class="reading-orbit" type="button" aria-label="Reading progress. Back to top">
  <svg viewBox="0 0 56 56" aria-hidden="true"><circle class="reading-orbit__track" cx="28" cy="28" r="22"/><circle class="reading-orbit__arc" cx="28" cy="28" r="22"/><circle class="reading-orbit__dot" cx="28" cy="6" r="3"/></svg>
  <span class="reading-orbit__pct">0%</span>
</button>
"""

SCRIPTS = {
    "three": '<script src="assets/vendor/three.min.js"></script>',
    "hero": '<script src="assets/js/hero.js"></script>',
}


def build_page(src):
    text = src.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--(\{.*?\})-->\s*", text, re.S)
    if not m:
        raise SystemExit(f"{src.name}: missing JSON header comment")
    meta = json.loads(m.group(1))
    body = text[m.end():]
    tail = [READING_ORBIT] if meta.get("reading") else []
    tail.append('<script src="assets/js/data.js"></script>')
    tail.append('<script src="assets/js/sky.js"></script>')
    tail += [SCRIPTS[s] for s in meta.get("scripts", [])]
    page = head(meta) + chrome_top(meta) + body + FOOTER + "\n".join(tail) + "\n</body>\n</html>\n"
    return meta, page


def artifact_fragment(page):
    """The artifact host supplies its own document skeleton for the main page."""
    head_inner = page.split("<head>", 1)[1].split("</head>", 1)[0]
    head_inner = re.sub(r'\s*<meta charset="utf-8">\s*<meta name="viewport"[^>]*>', "", head_inner)
    body_inner = page.split("<body>", 1)[1].split("</body>", 1)[0]
    side = re.search(r'data-side="(\w+)"', page).group(1)
    boot = f'<script>document.documentElement.dataset.side="{side}";</script>'
    return head_inner.strip() + "\n" + boot + "\n" + body_inner


def main():
    pages = sorted(SRC.glob("*.html"))
    out = {}
    for src in pages:
        meta, page = build_page(src)
        (ROOT / src.name).write_text(page, encoding="utf-8")
        out[src.name] = page
        print(f"built {src.name:18} {meta['title']}")
    if "--artifact" in sys.argv:
        dest = pathlib.Path(sys.argv[sys.argv.index("--artifact") + 1])
        dest.mkdir(parents=True, exist_ok=True)
        (dest / "index.html").write_text(artifact_fragment(out["index.html"]), encoding="utf-8")
        print(f"artifact fragment -> {dest / 'index.html'}")


if __name__ == "__main__":
    main()
