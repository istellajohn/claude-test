"""Colour: conservative technical correction first, optional stylistic look second.

Everything here is Rec.709 / SDR. Corrections are proposed from measured footage statistics and are
deliberately gentle; documentary realism and skin tones come before fashion.
"""
from __future__ import annotations

LOOKS = {
    "neutral": {},
    "documentary_clean": {"contrast": 1.06, "saturation": 0.96},
    "warm_dusk": {"temperature": 5600, "contrast": 1.08, "saturation": 0.94, "shadows_tint": [0.0, 0.0, 0.03]},
    "cool_concrete": {"temperature": 7400, "contrast": 1.10, "saturation": 0.82},
}


def auto_correct(shot: dict) -> dict:
    """Proposal from measured stats: nudge exposure toward mid-grey, remove strong colour cast. Never extreme."""
    m = shot.get("metrics", {})
    g: dict = {}
    luma = m.get("luma")
    if luma:
        # eq brightness is additive (-1..1): 118/255 is a sensible documentary key
        g["brightness"] = round(max(-0.12, min(0.12, (118 - luma) / 255 * 0.5)), 3)
    cast = m.get("colour_cast")
    if cast and not shot.get("synthetic"):
        rb = cast.get("r_over_b", 1.0)
        if rb > 1.25 or rb < 0.8:
            g["temperature"] = int(max(5200, min(8000, 6500 / max(0.6, min(1.6, rb)) ** 0.5)))
    return g


def filters(g: dict | None) -> list[str]:
    """Return ffmpeg filter fragments for a grade dict."""
    if not g:
        return []
    f: list[str] = []
    if g.get("temperature"):
        f.append(f"colortemperature=temperature={int(g['temperature'])}:pl=0.3")
    eq = []
    for key, name in (("brightness", "brightness"), ("contrast", "contrast"), ("saturation", "saturation"), ("gamma", "gamma")):
        if key in g and g[key] is not None:
            eq.append(f"{name}={float(g[key])}")
    if eq:
        f.append("eq=" + ":".join(eq))
    if g.get("shadows_tint") or g.get("highlights_tint") or g.get("midtones_tint"):
        s, m, h = (g.get("shadows_tint") or [0, 0, 0]), (g.get("midtones_tint") or [0, 0, 0]), (g.get("highlights_tint") or [0, 0, 0])
        f.append("colorbalance=" + ":".join([f"rs={s[0]}:gs={s[1]}:bs={s[2]}", f"rm={m[0]}:gm={m[1]}:bm={m[2]}", f"rh={h[0]}:gh={h[1]}:bh={h[2]}"]))
    if g.get("vignette"):
        f.append(f"vignette=angle={float(g['vignette'])}")
    if g.get("grain"):
        f.append(f"noise=alls={int(g['grain'])}:allf=t")
    return f


def merge(*grades: dict | None) -> dict:
    out: dict = {}
    for g in grades:
        for k, v in (g or {}).items():
            if isinstance(v, (int, float)) and k in out and k in ("brightness",):
                out[k] = round(out[k] + v, 3)
            elif isinstance(v, (int, float)) and k in out and k in ("contrast", "saturation", "gamma"):
                out[k] = round(out[k] * v, 3)
            else:
                out[k] = v
    return out


def resolve(clip_grade, global_grade) -> dict:
    """A clip grade may name a look: {"look": "warm_dusk", ...overrides}."""
    def expand(g):
        if not g:
            return {}
        base = dict(LOOKS.get(g.get("look", "neutral"), {}))
        base.update({k: v for k, v in g.items() if k != "look"})
        return base
    return merge(expand(global_grade), expand(clip_grade))
