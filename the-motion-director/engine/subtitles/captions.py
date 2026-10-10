"""Captions: four typeset treatments rendered through libass (burned in) plus SRT export.

Text is measured with the real font files (Pillow) so wrapping and the safe-area check are honest.
Captions never alter the words; `emph` only changes how a word is set.
"""
from __future__ import annotations

from pathlib import Path

from engine.utilities.common import DESIGN, FONTS_DIR, Project, TMDError, read_json

FONT_FILES = {
    ("Instrument Serif", False): "InstrumentSerif-Regular.ttf",
    ("Instrument Serif", True): "InstrumentSerif-Italic.ttf",
    ("Hanken Grotesk", False): "HankenGrotesk-Variable.ttf",
    ("Hanken Grotesk", True): "HankenGrotesk-Variable.ttf",
    ("DM Mono", False): "DMMono-Regular.ttf",
    ("DM Mono", True): "DMMono-Regular.ttf",
}


def safe_area(w: int, h: int) -> dict:
    """Instagram Reels UI covers the top ~13%, the bottom ~18% (caption, handle, audio) and a right-hand
    column of buttons. 9:16 uses those; other aspect ratios use a plain 5-6% title-safe margin."""
    if abs(w / h - 9 / 16) < 0.02:
        return {"left": round(w * 0.06), "right": round(w * 0.12), "top": round(h * 0.13), "bottom": round(h * 0.20)}
    return {"left": round(w * 0.05), "right": round(w * 0.05), "top": round(h * 0.06), "bottom": round(h * 0.07)}


def _pil_font(family: str, italic: bool, size: float, bold: bool = False):
    from PIL import ImageFont
    fn = FONT_FILES.get((family, italic)) or FONT_FILES.get((family, False))
    if not fn:
        raise TMDError(f"Unknown font family in caption style: {family}")
    f = ImageFont.truetype(str(FONTS_DIR / fn), int(round(size)))
    if family == "Hanken Grotesk":
        try:
            f.set_variation_by_axes([800 if bold else 500])
        except Exception:
            pass
    return f


def styles() -> dict:
    s = read_json(DESIGN / "components" / "caption-styles.json") or {}
    return {k: v for k, v in s.items() if not k.startswith("_")}


def _hex_to_ass(hexcol: str, alpha: int = 0) -> str:
    h = hexcol.lstrip("#")
    r, g, b = h[0:2], h[2:4], h[4:6]
    return f"&H{alpha:02X}{b}{g}{r}".upper()


def _ts(t: float) -> str:
    cs = int(round(t * 100))
    return f"{cs // 360000}:{(cs // 6000) % 60:02d}:{(cs // 100) % 60:02d}.{cs % 100:02d}"


def _wrap(words: list[str], font, max_w: float, case: str) -> list[list[int]]:
    """Greedy wrap, then tighten the measure so lines are balanced (no one-word orphans)."""
    first = _wrap_greedy(words, font, max_w, case)
    n = len(first)
    if n < 2:
        return first
    best, lo, hi = first, 0.0, max_w
    for _ in range(14):
        mid = (lo + hi) / 2
        trial = _wrap_greedy(words, font, mid, case)
        if len(trial) <= n:
            best, hi = trial, mid
        else:
            lo = mid
    return best


def _wrap_greedy(words: list[str], font, max_w: float, case: str) -> list[list[int]]:
    lines, cur = [], []
    for i, w in enumerate(words):
        t = " ".join(words[j].upper() if case == "upper" else words[j] for j in cur + [i])
        if cur and font.getlength(t) > max_w:
            lines.append(cur)
            cur = [i]
        else:
            cur.append(i)
    if cur:
        lines.append(cur)
    return lines


def _esc(t: str) -> str:
    return t.replace("\\", "").replace("{", "(").replace("}", ")")


def build_ass(captions: dict, canvas: dict, vs: dict | None = None, style_override: str | None = None,
              start_offset: float = 0.0) -> tuple[str, list[dict]]:
    """Return (ass_text, layout). layout lists each caption's measured bounding box in canvas pixels."""
    vs = vs or {}
    W, H = canvas["width"], canvas["height"]
    sc = W / 1080 if W <= H else H / 1080  # sizes are authored for a 1080-wide portrait canvas
    sa = safe_area(W, H)
    name = style_override or captions.get("style") or vs.get("caption_style") or "minimal_editorial"
    st_all = styles()
    if name not in st_all:
        raise TMDError(f"Unknown caption style '{name}'. Available: {', '.join(st_all)}")
    st = st_all[name]
    pal = {"paper": vs.get("paper", "#F2EEE6"), "accent": vs.get("accent", "#E8431F"), "ink": vs.get("ink", "#0E0E0F"),
           "ash": vs.get("ash", "#8C8A84"), "signal": vs.get("signal", "#F5D547")}
    col = pal.get(st.get("colour", "paper"), "#FFFFFF")
    hl = pal.get(st.get("highlight", "accent"), pal["accent"])
    size = st["size"] * sc * float(vs.get("caption_scale", 1.0))
    # Fontsize in ASS is the line height, not the em size; convert using the font's own metrics
    font = _pil_font(st["font"], st.get("italic", False), size, st.get("bold", False))
    asc, desc = font.getmetrics()
    ass_size = round(asc + desc, 1)
    usable_left, usable_right = sa["left"], W - sa["right"]
    max_w = min(usable_right - usable_left, st["max_chars"] * size * 0.5 if st.get("max_chars") else 1e9)
    max_w = max(max_w, size * 4)
    cx = (usable_left + usable_right) / 2
    lines_out: list[str] = []
    layout: list[dict] = []
    for idx, it in enumerate(captions.get("items", [])):
        text = (it.get("text") or "").strip()
        if not text:
            continue
        a, b = float(it["start"]) + start_offset, float(it["end"]) + start_offset
        if b <= a:
            continue
        words = text.replace("\n", " ").split()
        emph = {int(e) if str(e).isdigit() else str(e).lower().strip(".,!?;:") for e in (it.get("emph") or [])}
        is_emph = lambda i, w: (i in emph) or (w.lower().strip(".,!?;:") in emph)
        wrapped = _wrap(words, font, max_w, st.get("case", "none"))
        lh = (asc + desc) + st.get("line_spacing", 0) * sc
        if st.get("word_by_word"):
            wrapped = [[i] for i in range(len(words))]
        n_lines = 1 if st.get("word_by_word") else len(wrapped)
        block_h = lh * n_lines
        widest = max(font.getlength(" ".join((words[j].upper() if st.get("case") == "upper" else words[j]) for j in ln)) for ln in wrapped)
        if st["anchor"] == "middle":
            y_top = H * 0.46 - block_h / 2
        else:
            y_top = H - sa["bottom"] - block_h
        y_top = max(sa["top"], y_top)
        align = st.get("align", "centre")
        if align == "left":
            x_left, an, px = usable_left, 1, usable_left
        else:
            x_left, an, px = cx - widest / 2, 2, cx
        # \an1/\an2 position = bottom of the block
        py = y_top + block_h
        fade = f"\\fad({st.get('fade_ms', 0)},{min(st.get('fade_ms', 0), 120)})" if st.get("fade_ms") else ""
        rule_y = None
        kicker = it.get("kicker")
        if st.get("rule") and kicker:
            rule_y = y_top - st["kicker_size"] * sc * 1.9
        box = {"x": round(x_left), "y": round(y_top), "w": round(widest), "h": round(block_h)}
        if kicker and st.get("kicker_font"):
            kf = _pil_font(st["kicker_font"], False, st["kicker_size"] * sc)
            kw = kf.getlength(kicker.upper())
            box = {"x": round(min(box["x"], x_left)), "y": round(rule_y - 6), "w": round(max(widest, kw)), "h": round(py - rule_y + 6)}
        layout.append({"index": idx, "start": a, "end": b, **box, "style": name})
        if st.get("word_by_word"):
            n = len(words)
            weights = [max(2, len(w)) for w in words]
            total = sum(weights)
            t = a
            for i, w in enumerate(words):
                d = (b - a) * weights[i] / total
                disp = _esc(w.upper() if st.get("case") == "upper" else w)
                wcol = _hex_to_ass(hl if is_emph(i, w) else col)
                lines_out.append(f"Dialogue: 1,{_ts(t)},{_ts(t + d)},{name},,0,0,0,,{{\\an5\\pos({cx:.0f},{H * 0.46:.0f})\\1c{wcol}}}{disp}")
                t += d
            continue
        parts = []
        for ln in wrapped:
            seg = []
            for j in ln:
                w = words[j].upper() if st.get("case") == "upper" else words[j]
                if is_emph(j, words[j]):
                    seg.append(f"{{\\i{0 if st.get('italic') else 1}\\1c{_hex_to_ass(hl if name != 'minimal_editorial' else col)}}}{_esc(w)}{{\\r}}")
                else:
                    seg.append(_esc(w))
            parts.append(" ".join(seg))
        body = "\\N".join(parts)
        lines_out.append(f"Dialogue: 1,{_ts(a)},{_ts(b)},{name},,0,0,0,,{{\\an{an}\\pos({px:.0f},{py:.0f}){fade}}}{body}")
        if kicker and st.get("kicker_font"):
            ky = rule_y + st["kicker_size"] * sc * 1.7
            lines_out.append(f"Dialogue: 2,{_ts(a)},{_ts(b)},Kicker,,0,0,0,,{{\\an1\\pos({x_left:.0f},{ky:.0f}){fade}}}{_esc(kicker.upper())}")
            if st.get("rule"):
                lines_out.append(f"Dialogue: 0,{_ts(a)},{_ts(b)},Rule,,0,0,0,,{{\\an7\\pos({x_left:.0f},{rule_y:.0f}){fade}\\p1\\1c{_hex_to_ass(hl)}}}m 0 0 l {96 * sc:.0f} 0 l {96 * sc:.0f} {max(2, 3 * sc):.0f} l 0 {max(2, 3 * sc):.0f}")
    bold = -1 if st.get("bold") else 0
    ital = -1 if st.get("italic") else 0
    outline = st.get("outline", 0) * sc
    shadow = st.get("shadow", 0) * sc
    border_style = 3 if st.get("box") else 1
    back = _hex_to_ass(pal["ink"], int((1 - st.get("box_opacity", 0.6)) * 255)) if st.get("box") else _hex_to_ass("#000000", 120)
    pad = 16 * sc if st.get("box") else outline
    kfont = st.get("kicker_font", "DM Mono")
    ksize = st.get("kicker_size", 28) * sc
    kf2 = _pil_font(kfont, False, ksize)
    ka, kd = kf2.getmetrics()
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: {name},{st['font']},{ass_size},{_hex_to_ass(col)},{_hex_to_ass(col)},{back},{back},{bold},{ital},0,0,100,100,0,0,{border_style},{pad:.1f},{shadow:.1f},2,0,0,0,1
Style: Kicker,{kfont},{round(ka + kd, 1)},{_hex_to_ass(pal['ash'] if False else col)},{_hex_to_ass(col)},{_hex_to_ass('#000000', 120)},{_hex_to_ass('#000000', 120)},0,0,0,0,100,100,3,0,1,0,{max(1, 2 * sc):.1f},2,0,0,0,1
Style: Rule,{kfont},20,{_hex_to_ass(hl)},{_hex_to_ass(hl)},{_hex_to_ass(hl)},{_hex_to_ass(hl)},0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    return header + "\n".join(lines_out) + "\n", layout


def to_srt(captions: dict) -> str:
    def t(x):
        ms = int(round(x * 1000))
        return f"{ms // 3600000:02d}:{(ms // 60000) % 60:02d}:{(ms // 1000) % 60:02d},{ms % 1000:03d}"
    out = []
    for n, it in enumerate([i for i in captions.get("items", []) if (i.get("text") or "").strip()], 1):
        out.append(f"{n}\n{t(it['start'])} --> {t(it['end'])}\n{it['text'].strip()}\n")
    return "\n".join(out)


def check_layout(layout: list[dict], canvas: dict) -> list[str]:
    """Caption boxes that spill outside the platform safe area, or two captions overlapping in time."""
    W, H = canvas["width"], canvas["height"]
    sa = safe_area(W, H)
    issues = []
    for L in layout:
        if L["x"] < sa["left"] - 2 or L["x"] + L["w"] > W - sa["right"] + 2 or L["y"] < sa["top"] - 2 or L["y"] + L["h"] > H - sa["bottom"] + 2:
            issues.append(f"caption {L['index'] + 1} ({L['start']:.2f}s) extends outside the safe area")
    s = sorted(layout, key=lambda l: l["start"])
    for a, b in zip(s, s[1:]):
        if b["start"] < a["end"] - 1e-3 and a["style"] != "expressive_rhythmic":
            issues.append(f"captions {a['index'] + 1} and {b['index'] + 1} overlap in time")
    return issues
