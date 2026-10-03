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
    ("work", "work.html", "Work"),
    ("disciplines", "disciplines.html", "Disciplines"),
    ("how", "how-we-work.html", "How we work"),
    ("journal", "journal.html", "Journal"),
    ("about", "about.html", "About"),
]

JOURNAL_NAV = [
    ("front", "journal.html", "Latest letter"),
    ("interviews", "interviews.html", "Conversations"),
    ("essays", "essays.html", "Essays"),
    ("catalogue", "catalogue.html", "Catalogue"),
    ("letter", "letter.html", "The Letter"),
]

MENU = [
    ("index.html", "Home"),
    ("work.html", "Work"),
    ("disciplines.html", "Disciplines"),
    ("how-we-work.html", "How we work"),
    ("journal.html", "Journal"),
    ("about.html", "About"),
    ("contact.html", "Contact"),
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
    "description": "An independent creative practice founded by Stella John in Mumbai, working globally across creative direction, film, photography, writing, branding and digital strategy. Publisher of the VALENCE Journal.",
    "email": "buzz@vlnc.in",
    "founder": {"@type": "Person", "name": "Stella John"},
    "address": {"@type": "PostalAddress", "addressLocality": "Mumbai", "addressCountry": "IN"},
    "sameAs": ["https://www.instagram.com/itsavalencething/"],
}


# applies the reader's saved display preferences before first paint
PREFS_BOOT = '<script>try{var r=document.documentElement,s=localStorage.getItem("vlnc-side");if(s==="day"||s==="night")r.dataset.side=s;if(localStorage.getItem("vlnc-reading")==="on")r.dataset.reading="on"}catch(e){}</script>'


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
{PREFS_BOOT}
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
        f'<a href="{href}">{label}<span>{i:02d}</span></a>' for i, (href, label) in enumerate(MENU)
    )
    journal = meta.get("section") == "journal"
    sub_here = meta.get("sub")
    subnav = ""
    if journal:
        sublinks = "\n    ".join(
            f'<a href="{href}"{here if key == sub_here else ""}>{label}</a>' for key, href, label in JOURNAL_NAV
        )
        subnav = f"""<nav class="subnav" aria-label="Journal">
  <a class="subnav__label" href="journal.html">The <span class="script">Journal</span></a>
  <div class="subnav__links">
    {sublinks}
  </div>
</nav>
"""
    tag = "Journal" if journal else "Creative practice"
    cta = '<a class="btn" href="contact.html">Bring us into it</a>'
    # the live sky and its hairline axes belong to the Journal's celestial world;
    # practice pages sit on quiet surfaces, and no grain is laid over text or controls
    sky = ('<div class="sky" aria-hidden="true"><canvas id="sky-base"></canvas><canvas id="sky-live"></canvas></div>\n'
           '<div class="axis" aria-hidden="true"></div>\n') if journal else ""
    return f"""<a class="skip" href="#main">Skip to content</a>
{sky}<div class="page">
<div class="ephemeris" role="note" aria-label="Tonight's sky">
  <div class="ephemeris__group">
    <span><span data-moon-glyph="12"></span><span data-eph="moon">Tonight's sky</span></span>
    <span data-eph="jd"></span>
  </div>
  <div class="ephemeris__group ephemeris__group--secondary">
    <span>Mumbai · <span data-eph="mumbai"></span></span>
    <span>Next letter · New moon · <span data-eph="next-new-short"></span></span>
  </div>
</div>
<header class="masthead">
  <a class="wordmark" href="index.html" aria-label="VALENCE, home">{WORDMARK}<span class="wordmark__sub">{tag}</span></a>
  <nav class="nav" aria-label="Main">
    {links}
  </nav>
  <div class="prefs" role="group" aria-label="Display">
    <button class="pref" type="button" data-pref="side" aria-pressed="false"><span data-moon-glyph="12"></span><span class="pref__label">Night</span></button>
    <button class="pref" type="button" data-pref="reading" aria-pressed="false"><span class="pref__icon" aria-hidden="true">Aa</span><span class="pref__label">Reading mode</span></button>
  </div>
  {cta}
  <button class="btn menu-btn" type="button" aria-expanded="false" aria-controls="menu">Menu</button>
</header>
<nav id="menu" class="menu" aria-label="Menu" hidden>
  {menu_links}
</nav>
{subnav}<main id="main">
"""


FOOTER = """</main>
<footer class="footer">
  <div class="wrap">
    <div class="footer__grid">
      <div>
        <img class="footer__sig" src="assets/img/signature-gold.png" alt="Valence" width="1041" height="749" loading="lazy">
        <p class="footer__note">VALENCE is an independent creative practice founded by Stella John in Mumbai, working globally across creative direction, film, photography, writing, branding and digital strategy. The VALENCE Journal publishes written conversations and essays, gathered into a letter each new moon.</p>
      </div>
      <div>
        <h3 class="mono">The practice</h3>
        <ul><li><a href="work.html">Work</a></li><li><a href="disciplines.html">Disciplines</a></li><li><a href="how-we-work.html">How we work</a></li><li><a href="about.html">About</a></li><li><a href="contact.html">Contact</a></li></ul>
      </div>
      <div>
        <h3 class="mono">The Journal</h3>
        <ul><li><a href="journal.html">Latest letter</a></li><li><a href="interviews.html">Conversations</a></li><li><a href="essays.html">Essays</a></li><li><a href="catalogue.html">Catalogue</a></li><li><a href="letter.html">The Letter</a></li></ul>
      </div>
      <div>
        <h3 class="mono">Write to us</h3>
        <ul><li><a href="mailto:buzz@vlnc.in">buzz@vlnc.in</a></li><li class="coord">Mumbai · Working globally</li><li><a href="https://www.instagram.com/itsavalencething/" target="_blank" rel="noopener">Instagram</a></li></ul>
      </div>
    </div>
    <div class="footer__line">
      <span class="mono muted">© VALENCE</span>
      <span class="mono muted">Journal stories shown here are specimens for layout</span>
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


STILLS = json.loads((ROOT / "tools" / "stills.json").read_text(encoding="utf-8"))


def still(key):
    st = STILLS[key]
    esc = html.escape
    style = (f'--ratio:{st["ratio"]};--ratio-m:{st["ratio_m"]};'
             f'--focus:{st["focus"]};--focus-m:{st["focus_m"]}')
    stills = ROOT / "assets" / "img" / "stills"
    name = st.get("file", key)
    if (stills / f"{name}.jpg").exists():
        img = (f'<img src="assets/img/stills/{name}.jpg" alt="{esc(st["alt"])}" '
               f'width="{st["w"]}" height="{st["h"]}" loading="lazy" decoding="async">')
        if (stills / f"{name}-m.jpg").exists():
            # a separate phone crop, art-directed rather than cut from the wide frame
            img = (f'<picture><source media="(max-width: 560px)" srcset="assets/img/stills/{name}-m.jpg">'
                   f'{img}</picture>')
        inner = img
        cls = "still"
        cap = f'<figcaption class="still__cap mono">{esc(st["caption"])}</figcaption>' if st.get("caption") else ""
    else:
        rows = "".join(f'<dt class="mono">{label}</dt><dd>{esc(st[field])}</dd>'
                       for label, field in (("Subject", "subject"), ("Composition", "composition"),
                                            ("Light", "light"), ("Why here", "purpose")))
        spec = f'{st["kind"]} · {st["ratio"].replace(" ", "")} desktop · {st["ratio_m"].replace(" ", "")} phone · {st["temp"]}'
        inner = (f'<canvas data-plate="{st["seed"]}" data-kind="{st["plate"]}" aria-hidden="true"></canvas>'
                 f'<div class="still__ph" role="group" aria-label="Image placement {st["code"]}: {esc(st["title"])}">'
                 f'<p class="still__code mono">Image placement · {st["code"]}</p>'
                 f'<p class="still__title">{esc(st["title"])}</p>'
                 f'<dl class="still__brief">{rows}</dl>'
                 f'<p class="still__spec mono">{esc(spec)}</p></div>')
        cls = "still still--placeholder"
        cap = ""
    w, h = (float(x) for x in st["ratio"].split("/"))
    if w / h > 2:
        cls += " still--wide"
    return (f'<figure class="{cls}" data-still="{key}" data-temp="{st["temp"]}" style="{style}">'
            f'<div class="still__frame">{inner}</div>{cap}</figure>')


def build_page(src):
    text = src.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--(\{.*?\})-->\s*", text, re.S)
    if not m:
        raise SystemExit(f"{src.name}: missing JSON header comment")
    meta = json.loads(m.group(1))
    body = text[m.end():]
    # photographs: <!--STILL:id--> becomes the image, or a labelled placement until it exists
    body = re.sub(r"<!--STILL:([a-z0-9-]+)-->", lambda m: still(m.group(1)), body)
    # shared blocks: <!--NAME--> is replaced by src/partials/name.html
    for part in (ROOT / "src" / "partials").glob("*.html"):
        body = body.replace("<!--%s-->" % part.stem.upper(), part.read_text(encoding="utf-8"))
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
    return boot + "\n" + head_inner.strip() + "\n" + body_inner


def main():
    pages = sorted(SRC.glob("*.html"))
    out = {}
    for src in pages:
        meta, page = build_page(src)
        (ROOT / src.name).write_text(page, encoding="utf-8")
        out[src.name] = page
        print(f"built {src.name:18} {meta['title']}")
    if "--artifact" in sys.argv:
        # Preview build: the viewer does not follow links between pages, so every page gets the
        # in-place loader, "index.html" becomes "home.html" (the published root is a fragment),
        # and the root fragment is written from the home page.
        dest = pathlib.Path(sys.argv[sys.argv.index("--artifact") + 1])
        dest.mkdir(parents=True, exist_ok=True)
        router = '<script src="assets/js/router.js"></script>\n</body>'
        for name, page in out.items():
            page = re.sub(r'href="index\.html', 'href="home.html', page).replace("</body>", router, 1)
            target = "home.html" if name == "index.html" else name
            (dest / target).write_text(page, encoding="utf-8")
        frag = artifact_fragment((dest / "home.html").read_text(encoding="utf-8"))
        frag = frag.replace("<title>VALENCE</title>", "<title>VALENCE Website</title>", 1)
        (dest / "index.html").write_text(frag, encoding="utf-8")
        print(f"artifact pages -> {dest}")


if __name__ == "__main__":
    main()
