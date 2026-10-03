/* VALENCE · "Entry One"
   An introduction film narrated by an observing intelligence that studies how humans judge,
   and cannot compute the one thing that matters. The human hand answers it.

   Every frame is a pure function of time: seek(t) paints every layer for time t. The renderer
   averages six sub-frames across a 180° shutter for true motion blur; the live player shows the
   same frames without it.

     0.00   Observation     the eye, the reticle, "YOU'VE ALREADY DECIDED."
     6.75   Verdicts        fourteen images, fourteen verdicts, accelerating
    12.25   Years           NOT FOR ME, repeated into a tunnel of years
    16.20   The pull        particles drawn into orbit around a dark body; VALENCE
    22.30   Compute         the model tries and fails; glitch; silence
    26.05   Human           "Some humans can." The signature writes itself; VLNC lands
    34.40   Out             to black; the loop returns to the eye                              */
(function () {
  "use strict";

  var DUR = 35, FPS = 30;

  var C = {
    void: "#050507", bone: "#f3f2ef", stone: "#a6a39e", dust: "#6f6b66", verve: "#e35a2a",
    gold: "#c8a24c", sea: "#0b5962", forest: "#223d2e", sky: "#8c9fb3", sahara: "#c49b5b"
  };
  var F = {
    display: '"Anybody", "Arial Black", sans-serif',
    text: '"Host Grotesk", "Helvetica Neue", Arial, sans-serif',
    mono: '"Martian Mono", ui-monospace, Menlo, monospace'
  };

  /* ---------- maths ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function outExpo(k) { return k >= 1 ? 1 : 1 - Math.pow(2, -10 * k); }
  function outCubic(k) { return 1 - Math.pow(1 - k, 3); }
  function inCubic(k) { return k * k * k; }
  function inOut(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function win(t, a, b, fi, fo) { return Math.min(seg(t, a, a + fi), 1 - seg(t, b - fo, b)); }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(n) { return rng((n * 2654435761) >>> 0)(); }
  function snap(t) { return (Math.round(t * FPS - 0.5) + 0.5) / FPS; } // cuts fall between shutter windows

  /* ---------- script ---------- */
  var VO = [
    { id: "vo1", t: 0.6, d: 2.176, text: "Observation log, entry one." },
    { id: "vo2", t: 3.1, d: 3.673, text: "You decided whether to keep watching this in less than a second." },
    { id: "vo3", t: 7.25, d: 4.681, text: "Your kind does it to faces, to names, to everything you will ever be asked to trust." },
    { id: "vo4", t: 12.55, d: 3.008, text: "Then you spend years proving that first second was right." },
    { id: "vo5", t: 16.3, d: 5.415, text: "Your psychologists have a word for the pull that arrives before the reason.", show: 4.0, spoken: 3.63 },
    { id: "vo6", t: 22.15, d: 1.631, text: "We cannot compute it." },
    { id: "vo7", t: 24.0, d: 1.204, text: "We have tried." },
    { id: "vo8", t: 26.05, d: 1.543, text: "Some humans can.", human: true }
  ];
  // the human act is authored on its own clock (HS seconds later than the film's)
  var HS = 1.05;
  var T = { blink: 6.3, montage: snap(6.75), years: snap(12.25), pull: 16.2, valence: 20.95, compute: 22.1, glitch: 25.2, cut: snap(25.55), human: 25.55, slam: 29.95 - HS, out: 34.4 - HS };

  var VERDICTS = [
    ["about-cinema", "SEEN IT"], ["contact-train", "TRUST"], ["home-rain", "LATER"], ["disc-screen", "EXPENSIVE"],
    ["study-eye", "WHO IS THIS?"], ["home-dapple", "TRYING TOO HARD"], ["how-dusk", "YES"], ["home-reflection", "SKIP"],
    ["journal-room", "INTERESTING"], ["letter-sill", "TOO SAFE"], ["catalogue-tide", "OVERDONE"], ["conv-table", "MAYBE"],
    ["work-field", "CHEAP"], ["essays-window", "NOT FOR ME"]
  ];
  // the montage accelerates
  var CUTS = (function () {
    var n = VERDICTS.length, w = [], sum = 0;
    for (var i = 0; i < n; i++) { var d = lerp(0.56, 0.27, Math.pow(i / (n - 1), 0.8)); w.push(d); sum += d; }
    var span = T.years - T.montage, c = [], acc = T.montage;
    for (var j = 0; j < n; j++) { c.push(j === 0 ? T.montage : snap(acc)); acc += w[j] / sum * span; }
    c.push(T.years);
    return c;
  })();

  var CUES = {
    vo: VO.map(function (v) { return [v.id, v.t]; }), lock: [0.85, 1.05], decided: [3.6], blink: [T.blink],
    cuts: CUTS.slice(0, -1), tags: CUTS.slice(0, -1).map(function (x) { return x + 0.05; }),
    riser: [[12.7, 16.1]], warp: [16.0], valence: [T.valence], compute: [[T.compute, T.cut]], glitch: [[T.glitch, T.cut]],
    silence: [[T.cut, 26.0]], breath: [[T.cut + 0.05, 26.05]], dawn: [28.4 - HS], slam: [T.slam], tagline: [30.9 - HS], out: [T.out], dur: DUR
  };

  /* ---------- layout ---------- */
  function layout(fmt) {
    var W = 1080, tall = fmt !== "4x5", H = tall ? 1920 : 1350;
    return {
      fmt: tall ? "9x16" : "4x5", W: W, H: H, G: 72, TW: W - 144, tall: tall,
      hudY: tall ? 196 : 52, eyeY: H * 0.4, bigY: tall ? H * 0.62 : H * 0.64, subY: tall ? H * 0.785 : H * 0.875,
      subSize: tall ? 29 : 25, bigMax: tall ? 210 : 170,
      bodyY: H * 0.4, bodyR: tall ? 230 : 180, dictY: tall ? H * 0.64 : H * 0.7,
      markY: tall ? H * 0.43 : H * 0.42, markW: tall ? 760 : 660
    };
  }

  /* ---------- styles ---------- */
  var CSS = [
    ".vm{position:relative;overflow:hidden;background:" + C.void + ";-webkit-user-select:none;user-select:none;text-transform:none;letter-spacing:normal;line-height:normal;font-weight:400}",
    ".vm *{box-sizing:border-box}",
    ".vm-stage{position:absolute;left:0;top:0;transform-origin:0 0;overflow:hidden;background:" + C.void + "}",
    ".vm-cam{position:absolute;inset:0}",
    ".vm canvas{position:absolute;left:0;top:0}",
    ".vm-t{position:absolute;left:0;top:0;white-space:nowrap;will-change:transform,filter,opacity;color:" + C.bone + ";margin:0}",
    ".vm-d{font-family:" + F.display + ";font-weight:900;text-transform:uppercase;line-height:1;letter-spacing:-0.02em}",
    ".vm-m{font-family:" + F.mono + ";font-stretch:112.5%;font-weight:400;letter-spacing:0.12em;font-size:18px;color:" + C.stone + "}",
    ".vm-u{text-transform:uppercase}",
    ".vm-g{font-family:" + F.text + ";font-weight:300;letter-spacing:-0.01em;color:" + C.bone + "}",
    ".vm-sub{white-space:normal;text-align:center;line-height:1.5;letter-spacing:0.02em;font-stretch:100%}",
    ".vm-t span{display:inline-block;margin:0 0.16em}",
    ".vm-img{position:absolute;left:0;top:0;display:block;will-change:transform,filter,opacity}",
    ".vm-sig{position:absolute;left:0;top:0;background:" + C.gold + ";-webkit-mask:var(--sig) center/contain no-repeat;mask:var(--sig) center/contain no-repeat}",
    ".vm-dot{display:inline-block;width:11px;height:11px;border-radius:50%;background:" + C.verve + ";box-shadow:0 0 14px " + C.verve + ";margin-right:16px!important;vertical-align:1px}",
    ".vm-ui{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;gap:12px;padding:10px 12px;font:500 11px/1 " + F.mono + ";letter-spacing:.12em;text-transform:uppercase;color:" + C.bone + ";background:linear-gradient(transparent,rgba(5,5,7,.85));opacity:0;transition:opacity .3s}",
    ".vm:hover .vm-ui,.vm.is-paused .vm-ui{opacity:1}",
    ".vm-ui button{all:unset;cursor:pointer;padding:6px 8px;border:1px solid rgba(243,242,239,.3)}",
    ".vm-ui button:focus-visible{outline:2px solid " + C.verve + ";outline-offset:2px}",
    ".vm-bar{flex:1;height:14px;position:relative;cursor:pointer}",
    ".vm-bar::before{content:'';position:absolute;left:0;right:0;top:6px;height:1px;background:rgba(243,242,239,.3)}",
    ".vm-bar i{position:absolute;left:0;top:5px;height:3px;background:" + C.verve + "}",
    ".vm-time{min-width:44px;text-align:right;font-variant-numeric:tabular-nums}"
  ].join("\n");
  var FONTS = "https://fonts.googleapis.com/css2?family=Anybody:wdth,wght@50..150,100..900&family=Host+Grotesk:wght@300..800&family=Martian+Mono:wdth,wght@75..112.5,100..800&display=block";

  function injectOnce(doc, fontBase) {
    if (doc.getElementById("vm-css")) return;
    var s = doc.createElement("style"); s.id = "vm-css";
    var face = "";
    if (fontBase) {
      face = [["Anybody", "Anybody.woff2", "100 900", "50% 150%"], ["Host Grotesk", "HostGrotesk.woff2", "300 800", "100%"], ["Martian Mono", "MartianMono.woff2", "100 800", "75% 112.5%"]]
        .map(function (f) { return "@font-face{font-family:'" + f[0] + "';src:url(" + fontBase + f[1] + ") format('woff2');font-weight:" + f[2] + ";font-stretch:" + f[3] + ";font-display:block}"; }).join("\n");
    } else {
      var l = doc.createElement("link"); l.rel = "stylesheet"; l.href = FONTS; doc.head.appendChild(l);
    }
    s.textContent = face + "\n" + CSS;
    doc.head.appendChild(s);
  }
  function fontsReady(doc) {
    var want = ["900 100px Anybody", "300 100px 'Host Grotesk'", "400 20px 'Martian Mono'"];
    return Promise.all(want.map(function (f) { return doc.fonts.load(f).catch(function () {}); })).then(function () { return doc.fonts.ready; });
  }
  function loadImg(src) {
    return new Promise(function (res) { if (!src) return res(null); var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; });
  }

  /* ================================================================== */
  function mountFilm(host, opts) {
    opts = opts || {};
    var doc = host.ownerDocument;
    injectOnce(doc, opts.fontBase);
    var L = layout(opts.format || "9x16");
    var W = L.W, H = L.H, cx = W / 2, cy = H / 2;
    var A = opts.assets || {};

    host.classList.add("vm");
    host.innerHTML = "";
    var stage = mk("div", "vm-stage", host);
    stage.style.width = W + "px"; stage.style.height = H + "px";
    var cam = mk("div", "vm-cam", stage);
    var bg = canvas(cam), ctx = bg.getContext("2d");
    var tl = mk("div", "vm-cam", cam);
    var top = canvas(stage), tctx = top.getContext("2d");

    function mk(tag, cls, parent, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; }
    function canvas(parent) { var c = mk("canvas", null, parent); c.width = W; c.height = H; c.style.width = W + "px"; c.style.height = H + "px"; return c; }
    function txt(cls, text) { return mk("div", "vm-t " + cls, tl, text); }

    /* ---- graded images, processed once ---- */
    var IM = {};
    function grade(img, sat, bright) {
      if (!img) return null;
      var c = doc.createElement("canvas"), sc = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
      c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
      var g = c.getContext("2d");
      g.filter = "saturate(" + sat + ") contrast(1.08) brightness(" + bright + ")";
      g.drawImage(img, 0, 0, c.width, c.height);
      return c;
    }
    function cover(im, fx, fy, sx, sy, zoom, alpha, dx, dy) {
      // cover the frame, mapping the image's focus point (fx, fy) to the screen point (sx, sy)
      if (!im || alpha <= 0) return;
      var s = Math.max(W / im.width, H / im.height) * zoom;
      var x = sx - fx * im.width * s + (dx || 0), y = sy - fy * im.height * s + (dy || 0);
      x = Math.min(0 + (dx || 0), Math.max(W - im.width * s + (dx || 0), x));
      y = Math.min(0 + (dy || 0), Math.max(H - im.height * s + (dy || 0), y));
      ctx.globalAlpha = alpha; ctx.drawImage(im, x, y, im.width * s, im.height * s); ctx.globalAlpha = 1;
    }

    function place(im, fx, fy, sx, sy, s, alpha) {
      // absolute scale (1 = image pixels), focus point to screen point, feathered top and bottom
      if (!im || alpha <= 0) return;
      var w = im.width * s, h = im.height * s, x = sx - fx * w, y = sy - fy * h;
      ctx.globalAlpha = alpha; ctx.drawImage(im, x, y, w, h); ctx.globalAlpha = 1;
      var f = Math.min(220, h * 0.28);
      if (y > -f) { var g1 = ctx.createLinearGradient(0, y, 0, y + f); g1.addColorStop(0, C.void); g1.addColorStop(1, "rgba(5,5,7,0)"); ctx.fillStyle = g1; ctx.fillRect(0, y - 1, W, f + 1); }
      if (y + h < H + f) { var g2 = ctx.createLinearGradient(0, y + h - f, 0, y + h); g2.addColorStop(0, "rgba(5,5,7,0)"); g2.addColorStop(1, C.void); ctx.fillStyle = g2; ctx.fillRect(0, y + h - f, W, f + 1); }
    }

    /* ---- seeded fields ---- */
    var R0 = rng(7), STARS = [];
    for (var i = 0; i < 1400; i++) {
      var m = Math.pow(R0(), 3);
      STARS.push({ x: (R0() * 2 - 1) * 1.2, y: (R0() * 2 - 1) * 1.2 * (H / W), z: R0(), m: m, c: R0() < 0.12 ? "255,196,160" : R0() < 0.2 ? "190,210,235" : "243,242,239", p: R0() * 6.28 });
    }
    var R1 = rng(77), PARTS = [];
    for (var p = 0; p < 640; p++) {
      PARTS.push({ r0: L.bodyR * (1.5 + Math.pow(R1(), 0.7) * 5.2), a0: R1() * 6.283, ts: T.pull + 0.1 + R1() * 4.2, k: 0.28 + R1() * 0.5, w: 0.5 + R1() * 0.9, s: 0.8 + R1() * 1.8, c: R1() < 0.2 ? C.gold : R1() < 0.35 ? C.sky : C.bone });
    }
    var GRAIN = [];
    for (var gk = 0; gk < 6; gk++) {
      var gc = doc.createElement("canvas"); gc.width = gc.height = 256;
      var gx = gc.getContext("2d"), id = gx.createImageData(256, 256), gr = rng(500 + gk);
      for (var px = 0; px < id.data.length; px += 4) { var v = gr(); id.data[px] = id.data[px + 1] = id.data[px + 2] = 255; id.data[px + 3] = v > 0.5 ? Math.round(Math.pow((v - 0.5) * 2, 2) * 255) : 0; }
      gx.putImageData(id, 0, 0); GRAIN.push(gc);
    }
    // where each verdict lands on its image
    var REG = VERDICTS.map(function (v, i) {
      var r = rng(900 + i), last = i === VERDICTS.length - 1;
      var w = last ? W * 0.56 : W * (0.36 + r() * 0.22), h = last ? H * 0.2 : H * (0.12 + r() * 0.1);
      var x = last ? cx : L.G + w / 2 + r() * (W - 2 * L.G - w), y = last ? H * 0.42 : H * (0.16 + r() * 0.38) + h / 2;
      return { x: x, y: y, w: w, h: h, ms: (0.12 + r() * 0.5).toFixed(2), dir: i % 2 ? -1 : 1, vert: i % 5 === 3 };
    });

    /* ---- DOM ---- */
    var hudL = txt("vm-m vm-u", "OBSERVATION LOG · 001"), hudR = txt("vm-m vm-u", "");
    var retL = txt("vm-m vm-u", "SUBJECT \u00b7 LOCKED"), retR = txt("vm-m vm-u", "DECISION < 1.0 S");
    var big = [txt("vm-d", "YOU’VE ALREADY"), txt("vm-d", "DECIDED.")];
    var subs = VO.map(function (v) {
      var e = txt(v.human ? "vm-g" : "vm-m vm-sub", "");
      if (!v.human) { e.style.width = (W - 2 * L.G - 40) + "px"; e.style.fontSize = L.subSize + "px"; e.style.color = C.bone; }
      var spoken = v.spoken || v.d, words = v.text.split(" "), total = v.text.length, acc = 0;
      var spans = words.map(function (w) { var s = mk("span", null, e, w); var st = acc / total; acc += w.length + 1; return { s: s, at: st * spoken }; });
      return { e: e, spans: spans, v: v };
    });
    var tag = [txt("vm-m vm-u", ""), txt("vm-m vm-u", "")];
    var bigV = txt("vm-d", "VALENCE");
    var dict = [txt("vm-m", "va·lence   /ˈveɪ.ləns/   noun"), txt("vm-g", "The pull toward, or push away from, something."), txt("vm-g", "Felt before a reason arrives.")];
    var confL = txt("vm-m vm-u", "MODEL CONFIDENCE"), confN = txt("vm-m", "0.97"), confA = txt("vm-m vm-u", "");
    var sig = mk("div", "vm-sig", tl); if (A.sig) sig.style.setProperty("--sig", "url(\"" + A.sig + "\")");
    var mark = mk("img", "vm-img", tl); mark.alt = ""; if (A.vlnc) mark.src = A.vlnc;
    var line = txt("vm-g", "For work that deserves a better first second.");
    var mail = txt("vm-m", ""); mail.innerHTML = "<span class=\"vm-dot\"></span>buzz@vlnc.in";
    var MARK_AR = 416 / 1723, SIG_AR = 765 / 1057;
    var allEls = [].slice.call(tl.children);

    function set(e, x, y, o, ex) {
      ex = ex || {};
      if (o <= 0.002) { e.style.visibility = "hidden"; e.style.opacity = "0"; return; }
      e.style.visibility = "visible"; e.style.opacity = String(Math.min(1, o));
      var ax = ex.ax == null ? -50 : ex.ax, ay = ex.ay == null ? -50 : ex.ay, s = ex.s || 1;
      e.style.transform = "translate(" + x.toFixed(2) + "px," + y.toFixed(2) + "px) translate(" + ax + "%," + ay + "%)" + (ex.rot ? " rotate(" + ex.rot + "deg)" : "") + " scale(" + (s * (ex.sx || 1)).toFixed(4) + "," + s.toFixed(4) + ")";
      e.style.filter = ex.blur > 0.05 ? "blur(" + ex.blur.toFixed(2) + "px)" : "none";
    }
    function hide(e) { e.style.visibility = "hidden"; e.style.opacity = "0"; }
    function fitSize(e, maxW, maxSize, stretch) {
      if (stretch != null) e.style.fontStretch = stretch + "%";
      e.style.fontSize = "100px";
      var w = e.offsetWidth || 1, s = Math.min(maxSize, 100 * maxW / w);
      e.style.fontSize = s.toFixed(2) + "px"; return s;
    }
    function words(sb, t, start, dur, blurMax) {
      sb.spans.forEach(function (w) {
        var wt = start + w.at, wk = seg(t, wt - 0.02, wt + dur);
        w.s.style.opacity = String(wk); w.s.style.filter = wk < 1 ? "blur(" + ((1 - wk) * blurMax).toFixed(1) + "px)" : "none";
      });
    }

    /* ---- drawing helpers ---- */
    function brackets(x, y, w, h, a, k, lw) {
      if (a <= 0) return;
      k = k || 30;
      ctx.save(); ctx.strokeStyle = "rgba(243,242,239," + a + ")"; ctx.lineWidth = lw || 2;
      var l = x - w / 2, r = x + w / 2, t = y - h / 2, b = y + h / 2;
      ctx.beginPath();
      ctx.moveTo(l, t + k); ctx.lineTo(l, t); ctx.lineTo(l + k, t);
      ctx.moveTo(r - k, t); ctx.lineTo(r, t); ctx.lineTo(r, t + k);
      ctx.moveTo(r, b - k); ctx.lineTo(r, b); ctx.lineTo(r - k, b);
      ctx.moveTo(l + k, b); ctx.lineTo(l, b); ctx.lineTo(l, b - k);
      ctx.stroke(); ctx.restore();
    }
    function stars(t, alpha, travel) {
      if (alpha <= 0) return;
      var f = W * 0.21, s = travel(t), s2 = travel(t - 0.03);
      ctx.save(); ctx.lineCap = "round";
      for (var i = 0; i < STARS.length; i++) {
        var st = STARS[i];
        var z = ((st.z - s) % 1 + 1) % 1 * 0.97 + 0.03, z2 = ((st.z - s2) % 1 + 1) % 1 * 0.97 + 0.03;
        var x = cx + st.x / z * f, y = cy + st.y / z * f;
        if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
        var near = 1 - z, a = alpha * (0.15 + st.m * 0.85) * Math.min(1, near * 1.6 + 0.2) * Math.min(1, z * 30) * (0.7 + 0.3 * Math.sin(t * 2 + st.p));
        var sz = (0.5 + st.m * 1.5) * (0.6 + near * 1.4);
        if (z2 > z && (z2 - z) < 0.5 && (z2 - z) > 0.004) {
          ctx.strokeStyle = "rgba(" + st.c + "," + a + ")"; ctx.lineWidth = sz * 1.2;
          ctx.beginPath(); ctx.moveTo(cx + st.x / z2 * f, cy + st.y / z2 * f); ctx.lineTo(x, y); ctx.stroke();
        } else { ctx.fillStyle = "rgba(" + st.c + "," + a + ")"; ctx.beginPath(); ctx.arc(x, y, sz, 0, 6.283); ctx.fill(); }
      }
      ctx.restore();
    }
    function body(x, y, R, glow) {
      if (glow <= 0) return;
      var g = ctx.createRadialGradient(x, y, R * 0.97, x, y, R * 2.6);
      g.addColorStop(0, "rgba(255,214,170," + Math.min(1, 0.8 * glow) + ")"); g.addColorStop(0.05, "rgba(227,90,42," + Math.min(1, 0.38 * glow) + ")");
      g.addColorStop(0.3, "rgba(200,162,76," + 0.07 * glow + ")"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R * 2.6, 0, 6.283); ctx.fill();
      ctx.fillStyle = "#030405"; ctx.beginPath(); ctx.arc(x, y, R, 0, 6.283); ctx.fill();
      ctx.save(); ctx.strokeStyle = "rgba(255,200,150," + Math.min(1, glow) + ")"; ctx.lineWidth = 2.6; ctx.shadowColor = "rgba(227,90,42," + Math.min(1, glow) + ")"; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.arc(x, y, R, 0, 6.283); ctx.stroke(); ctx.restore();
    }
    function partPos(P, t, bx, by, R, boost) {
      var dt = t - P.ts; if (dt < 0) return null;
      var r = R + (P.r0 - R) * Math.exp(-P.k * dt * (1 + dt * 0.25) - boost);
      if (r < R * 1.02) return null;
      var a = P.a0 + P.w * dt * Math.pow((L.bodyR * 3) / r, 1.25);
      return [bx + Math.cos(a) * r, by + Math.sin(a) * r * 0.86, r];
    }

    /* ---- layouts, computed once fonts are ready ---- */
    var bigLay = null, vS = 0;
    function computeBig() {
      big[0].style.fontWeight = "800";
      var s0 = fitSize(big[0], L.TW * 0.92, L.bigMax * 0.6, 112), s1 = fitSize(big[1], L.TW, L.bigMax, 112);
      bigLay = { s0: s0, s1: s1, y0: L.bigY - s1 * 0.55, y1: L.bigY + s0 * 0.25 };
      vS = fitSize(bigV, W * 0.84, 230, 125);
    }

    /* ================= seek ================= */
    var now = 0;
    function seek(t) {
      t = ((t % DUR) + DUR) % DUR;
      var fr = Math.round(t * FPS);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = C.void; ctx.fillRect(0, 0, W, H);
      allEls.forEach(hide);
      if (!bigLay) computeBig();
      var flash = 0, shake = 0, scrim = 0, chroma = 0;

      /* ----- 1 · the eye ----- */
      if (t < T.montage) {
        // the whole eye first, letterboxed in the dark; then the push to the pupil
        var e0 = IM.eye ? W / IM.eye.width * 1.12 : 1, e1 = IM.eye ? H / IM.eye.height * 1.25 : 1;
        var ez = inOut(seg(t, 0.2, 6.6)), es = e0 * Math.pow(e1 / e0, ez);
        var dark = 1 - 0.45 * seg(t, 3.2, 3.6);
        place(IM.eye, lerp(0.5, 0.537, Math.min(1, ez * 3)), lerp(0.5, 0.42, Math.min(1, ez * 3)), cx, L.eyeY, es, dark);
        var z = 1 + 0.5 * ez;
        var rk = outExpo(seg(t, 0.8, 1.15)), rs = lerp(1.8, 1, rk) * (1 + (z - 1) * 0.5);
        var ra = seg(t, 0.8, 0.9) * (1 - seg(t, 6.0, 6.25)) * (hash(fr) > 0.12 ? 1 : 0.6);
        brackets(cx, L.eyeY, 300 * rs, 240 * rs, ra * 0.9, 28, 1.6);
        if (t > 1.05 && t < 1.25) { ctx.fillStyle = "rgba(243,242,239,.9)"; ctx.fillRect(cx - 3, L.eyeY - 3, 6, 6); }
        var swap = seg(t, 3.5, 3.6);
        set(retL, cx - 150 * rs, L.eyeY + 120 * rs + 28, ra * 0.85 * (1 - swap), { ax: 0 });
        retR.style.color = C.bone;
        set(retR, cx - 150 * rs, L.eyeY + 120 * rs + 28, ra * 0.95 * swap, { ax: 0 });
        // YOU'VE ALREADY DECIDED.
        var k0 = seg(t, 3.35, 3.55), k1 = seg(t, 3.6, 3.78), out = seg(t, 6.0, 6.3);
        big[0].style.fontSize = bigLay.s0 + "px"; big[1].style.fontSize = bigLay.s1 + "px";
        set(big[0], cx, bigLay.y0, Math.min(1, k0 * 3) * (1 - out), { s: lerp(1.5, 1, outExpo(k0)), blur: out * 8 });
        set(big[1], cx, bigLay.y1, Math.min(1, k1 * 3) * (1 - out), { s: lerp(1.9, 1, outExpo(k1)), blur: out * 8 });
        if (t > 3.6 && t < 3.9) shake += 12 * (1 - seg(t, 3.6, 3.9));
        if (t > 3.6 && t < 3.7) flash = Math.max(flash, 0.12);
        scrim = 0.55;
      }

      /* ----- 2 · verdicts ----- */
      if (t >= T.montage && t < T.years + 0.6) {
        var ci = 0; while (ci < VERDICTS.length - 1 && t >= CUTS[ci + 1]) ci++;
        var c0 = CUTS[ci], c1 = CUTS[ci + 1], u = clamp((t - c0) / (c1 - c0), 0, 1), last = ci === VERDICTS.length - 1;
        var R = REG[ci], nx = REG[ci + 1], whip = 0.08;
        var inK = ci === 0 ? 1 : outCubic(seg(t, c0, c0 + whip)), outK = last ? 0 : inCubic(seg(t, c1 - whip, c1));
        var ox = 0, oy = 0;
        if (nx) { if (nx.vert) oy = -outK * H * 0.9 * nx.dir; else ox = -outK * W * 1.1 * nx.dir; }
        var ix = R.vert ? 0 : (1 - inK) * W * 1.1 * R.dir, iy = R.vert ? (1 - inK) * H * 0.9 * R.dir : 0;
        var fade = last ? 1 - seg(t, T.years, T.years + 0.45) : 1;
        cover(IM[VERDICTS[ci][0]], 0.5, 0.5, cx, cy, lerp(1.14, 1.0, outCubic(u)), fade * 0.85, ix + ox, iy + oy);
        if (nx && outK > 0) {
          var nX = nx.vert ? 0 : (1 - outK) * W * 1.1 * nx.dir, nY = nx.vert ? (1 - outK) * H * 0.9 * nx.dir : 0;
          cover(IM[VERDICTS[ci + 1][0]], 0.5, 0.5, cx, cy, 1.14, 0.85, nX, nY);
        }
        if (ci > 0 && t - c0 < 0.05) flash = Math.max(flash, 0.09 * (1 - (t - c0) / 0.05));
        chroma = Math.max(chroma, (1 - inK) * 7 + outK * 7);
        var dx = ix + ox, dy = iy + oy;
        var tk = outExpo(seg(t, c0 + 0.05, c0 + 0.15)), ta = seg(t, c0 + 0.05, c0 + 0.08) * (1 - outK) * (last ? 1 : 1);
        var bs = lerp(1.35, 1, tk);
        brackets(R.x + dx, R.y + dy, R.w * bs, R.h * bs, ta * 0.95, 26, 2);
        tag[0].textContent = VERDICTS[ci][1]; tag[1].textContent = "T+" + R.ms + " S";
        tag[0].style.fontSize = (L.tall ? 30 : 26) + "px"; tag[0].style.color = C.bone; tag[0].style.letterSpacing = "0.16em";
        tag[1].style.fontSize = "17px";
        var tagA = last ? ta * (1 - seg(t, T.years, T.years + 0.05)) : ta;
        set(tag[0], R.x + dx - R.w / 2, R.y + dy + R.h / 2 + 34, tagA, { ax: 0 });
        set(tag[1], R.x + dx + R.w / 2, R.y + dy + R.h / 2 + 34, tagA * 0.8, { ax: -100 });
        scrim = 0.6;
      }

      /* ----- 3 · years ----- */
      if (t >= T.years && t < T.pull + 0.1) {
        var camZ = 17.2 * Math.pow(seg(t, 12.75, 16.15), 2.3);
        var RL = REG[REG.length - 1];
        stars(t, seg(t, 13.4, 14.4), function (tt) { return 0.03 * tt + 2.4 * Math.pow(seg(tt, 13.2, 16.2), 2.2); });
        for (var n = 17; n >= 0; n--) {
          var zz = 1 + n - camZ;
          if (zz < 0.06) continue;
          var sc = 1 / zz, fog = clamp(1 - (zz - 1) / 9, 0, 1) * Math.min(1, (zz - 0.06) * 3);
          var offx = n > 0 ? Math.sin(n * 0.55) * 140 : 0, offy = n > 0 ? Math.cos(n * 0.43) * 200 : 0;
          var x = cx + (RL.x - cx + offx) * sc, y = cy + (RL.y - cy + offy) * sc;
          var a = fog * (n === 0 ? 1 : seg(t, 12.6 + n * 0.05, 12.9 + n * 0.05));
          if (a <= 0.01) continue;
          var bw = RL.w * sc, bh = RL.h * sc;
          ctx.save(); ctx.translate(x, y); ctx.rotate(n * 0.05 * Math.min(1, camZ)); ctx.translate(-x, -y);
          brackets(x, y, bw, bh, a * 0.9, 26 * sc, Math.max(1, 2 * sc));
          ctx.textBaseline = "middle"; ctx.textAlign = "left";
          ctx.fillStyle = "rgba(243,242,239," + a + ")"; ctx.font = "400 " + (30 * sc).toFixed(1) + "px 'Martian Mono'";
          ctx.fillText("NOT FOR ME", x - bw / 2, y + bh / 2 + 34 * sc);
          ctx.textAlign = "right"; ctx.fillStyle = "rgba(166,163,158," + a + ")"; ctx.font = "400 " + (17 * sc).toFixed(1) + "px 'Martian Mono'";
          ctx.fillText(String(2026 + n), x + bw / 2, y + bh / 2 + 34 * sc);
          ctx.restore();
        }
        if (t > 15.9) flash = Math.max(flash, 0.75 * win(t, 15.9, 16.5, 0.25, 0.3));
        shake += 4 * seg(t, 15.2, 16.1);
      }

      /* ----- 4 · the pull ----- */
      if (t >= T.pull && t < T.cut) {
        var cmp = seg(t, T.compute, T.compute + 0.6);
        var fz = t > T.compute ? T.compute + (t - T.compute) * 0.04 : t;
        stars(fz, (1 - cmp * 0.7) * seg(t, T.pull, T.pull + 0.4), function (tt) { return 0.02 * tt + 1.2 * outCubic(seg(tt, T.pull - 0.3, T.pull + 1.4)); });
        var bx = cx, by = L.bodyY, BR = L.bodyR;
        var glow = seg(t, T.pull + 0.2, T.pull + 2) * (1 - 0.6 * cmp) * (1 + 0.6 * win(t, T.valence, T.valence + 1.4, 0.05, 1.2));
        body(bx, by, BR, glow);
        var boost = 1.6 * seg(t, T.valence - 0.1, T.valence + 0.9);
        ctx.save(); ctx.lineCap = "round";
        for (var q = 0; q < PARTS.length; q++) {
          var P = PARTS[q];
          var p1 = partPos(P, fz, bx, by, BR, boost), p0 = partPos(P, fz - 0.045, bx, by, BR, boost);
          if (!p1) continue;
          var pa = Math.min(1, (fz - P.ts) * 2) * (1 - cmp * 0.6) * clamp((p1[2] - BR) / (BR * 0.3), 0, 1);
          ctx.strokeStyle = P.c; ctx.globalAlpha = pa * 0.85; ctx.lineWidth = P.s;
          ctx.beginPath(); if (p0) ctx.moveTo(p0[0], p0[1]); else ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p1[0] + 0.01, p1[1]); ctx.stroke();
        }
        ctx.restore(); ctx.globalAlpha = 1;
        if (t > T.valence && t < T.valence + 1.2) {
          var sk = seg(t, T.valence, T.valence + 1.1);
          ctx.strokeStyle = "rgba(255,214,170," + (1 - sk) * 0.55 + ")"; ctx.lineWidth = 2 + 6 * (1 - sk);
          ctx.beginPath(); ctx.arc(bx, by, BR * (1 + outExpo(sk) * 3), 0, 6.283); ctx.stroke();
          if (t < T.valence + 0.12) flash = Math.max(flash, 0.18);
          shake += 10 * (1 - seg(t, T.valence, T.valence + 0.5));
        }
        var vk = seg(t, T.valence, T.valence + 0.7), vOut = seg(t, 22.45, 22.75);
        bigV.style.fontSize = vS + "px";
        bigV.style.fontStretch = lerp(50, 125, outExpo(vk)).toFixed(1) + "%";
        bigV.style.letterSpacing = lerp(0.3, 0.02, outExpo(vk)).toFixed(3) + "em";
        set(bigV, cx, by, Math.min(1, vk * 3) * (1 - vOut), { blur: (1 - outExpo(vk)) * 18 + vOut * 14, s: 1 + vOut * 0.06 });
        dict[0].style.fontSize = "20px";
        dict[1].style.fontSize = dict[2].style.fontSize = (L.tall ? 36 : 32) + "px";
        dict[2].style.color = C.stone;
        set(dict[0], cx, L.dictY, win(t, 21.25, 22.75, 0.5, 0.3), { blur: (1 - seg(t, 21.25, 21.6)) * 6 });
        set(dict[1], cx, L.dictY + 66, win(t, 21.4, 22.75, 0.4, 0.3), { blur: (1 - seg(t, 21.4, 21.8)) * 6 });
        set(dict[2], cx, L.dictY + 116, win(t, 21.55, 22.75, 0.4, 0.3), { blur: (1 - seg(t, 21.6, 22)) * 6 });

        /* ----- 5 · compute ----- */
        if (t >= T.compute) {
          var gA = seg(t, T.compute, T.compute + 0.5);
          ctx.save();
          ctx.strokeStyle = "rgba(140,159,179," + 0.12 * gA + ")"; ctx.lineWidth = 1;
          for (var gxx = 0; gxx <= 12; gxx++) { var lx = gxx * W / 12; ctx.beginPath(); ctx.moveTo(lx + 0.5, 0); ctx.lineTo(lx + 0.5, H); ctx.stroke(); }
          for (var gyy = 0; gyy <= 20; gyy++) { var ly = gyy * H / 20; ctx.beginPath(); ctx.moveTo(0, ly + 0.5); ctx.lineTo(W, ly + 0.5); ctx.stroke(); }
          var sy = ((t - T.compute) % 1.1) / 1.1 * H;
          var sgd = ctx.createLinearGradient(0, sy - 120, 0, sy);
          sgd.addColorStop(0, "rgba(140,159,179,0)"); sgd.addColorStop(1, "rgba(190,210,235," + 0.18 * gA + ")");
          ctx.fillStyle = sgd; ctx.fillRect(0, sy - 120, W, 120);
          ctx.font = "400 17px 'Martian Mono'"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          var spd = 700 + 900 * seg(t, 22.8, 25.0), off = (t - T.compute) * spd;
          for (var col = 0; col < 8; col++) {
            var colx = (col + 0.5) * W / 8;
            for (var row = -1; row < H / 34 + 2; row++) {
              var yy = row * 34 - (off % 34), idx = row + Math.floor(off / 34), hv = hash(col * 7919 + idx * 31);
              if (Math.abs(colx - cx) < 230 && Math.abs(yy - cy) < 210) continue;
              ctx.fillStyle = "rgba(111,107,102," + (0.3 + 0.4 * hv) * gA + ")";
              ctx.fillText(hv.toFixed(4), colx, yy);
            }
          }
          ctx.restore();
          var cd = seg(t, 22.75, 24.95);
          var val = Math.max(0, 0.97 * (1 - Math.pow(cd, 0.7)) + (cd < 1 ? (hash(fr) - 0.5) * 0.04 : 0));
          confN.textContent = val.toFixed(2);
          confN.style.fontSize = (L.tall ? 230 : 190) + "px"; confN.style.color = C.bone; confN.style.letterSpacing = "-0.03em"; confN.style.fontStretch = "100%";
          confA.textContent = "ATTEMPTS  " + Math.floor(Math.pow(2, 20 * seg(t, 22.6, 25.2))).toLocaleString("en-US");
          confA.style.fontSize = "19px";
          var cA = seg(t, 22.6, 22.85), jit = t > T.glitch ? (hash(fr * 3) - 0.5) * 30 : 0;
          set(confL, cx + jit, cy - 170, cA * 0.9);
          set(confN, cx - jit, cy, cA);
          set(confA, cx + jit * 0.5, cy + 160, cA * seg(t, 22.8, 23.0) * 0.85);
          chroma = Math.max(chroma, 10 * seg(t, T.glitch, T.cut));
        }
      }

      /* ----- the machine's voice, word by word ----- */
      subs.forEach(function (sb) {
        var v = sb.v;
        if (v.human) return;
        var nextT = (VO[VO.indexOf(v) + 1] || { t: DUR }).t, endT = Math.min(v.t + (v.show || v.d) + 0.6, nextT - 0.02);
        var a = t > T.cut ? 0 : win(t, v.t - 0.05, endT, 0.1, Math.min(0.3, endT - v.t - 0.1));
        if (a <= 0) return;
        words(sb, t, v.t, 0.12, 6);
        set(sb.e, cx, L.subY, a);
      });

      /* ----- 6 · human ----- */
      if (t >= T.human) {
        var t0 = t; t = t + HS; // the act's own clock
        var endF = 1 - seg(t, (T.out + HS), (T.out + HS) + 1.0);
        var hv8 = subs[subs.length - 1];
        hv8.e.style.fontSize = (L.tall ? 60 : 52) + "px";
        words(hv8, t, 27.1, 0.4, 10);
        set(hv8.e, cx, cy - 30 - outCubic(seg(t, 28.2, 28.6)) * 70, win(t, 27.0, 28.6, 0.05, 0.4), { blur: seg(t, 28.2, 28.6) * 10 });
        var dawn = seg(t, 27.5, 30.5) * endF;
        if (dawn > 0) {
          cover(IM.dawn, 0.62, 0.62, cx, H * 0.8, 1.05 + 0.08 * seg(t, 27.5, 35), dawn * 0.55, 0, (1 - outCubic(seg(t, 27.5, 31))) * 160);
          var dg = ctx.createRadialGradient(cx, H * 0.55, 10, cx, H * 0.55, W * 0.9);
          dg.addColorStop(0, "rgba(255,190,120," + 0.16 * dawn + ")"); dg.addColorStop(1, "rgba(255,190,120,0)");
          ctx.fillStyle = dg; ctx.fillRect(0, 0, W, H);
        }
        if (t > 28) {
          var Rd = rng(31337);
          for (var di = 0; di < 90; di++) {
            var dx0 = Rd() * W, dy0 = Rd() * H, sp = 8 + Rd() * 24, ph = Rd() * 6.28, al = 0.25 + 0.5 * Rd(), rr = 0.8 + Rd() * 1.6;
            ctx.fillStyle = "rgba(232,200,130," + al * seg(t, 28, 29.5) * endF + ")";
            ctx.beginPath(); ctx.arc(dx0 + Math.sin(t * 0.6 + ph) * 14, dy0 - (t - 28) * sp, rr, 0, 6.283); ctx.fill();
          }
        }
        var mW = L.markW, mH = mW * MARK_AR;
        var move = inOut(seg(t, 29.6, 30.3));
        var sW = lerp(W * 0.8, mW * 0.62, move), sH = sW * SIG_AR;
        var sX = lerp(cx, cx + mW * 0.2, move), sY = lerp(L.markY + 20, L.markY + mH * 0.5 + sH * 0.2, move);
        sig.style.width = sW + "px"; sig.style.height = sH + "px";
        var wr = seg(t, 28.62, 29.88);
        sig.style.clipPath = "inset(-5% " + (100 - outCubic(wr) * 100).toFixed(2) + "% -5% -5%)";
        set(sig, sX, sY, seg(t, 28.6, 28.66) * endF);
        if (wr > 0 && wr < 1) {
          var nibX = sX - sW / 2 + sW * outCubic(wr);
          var ng = ctx.createRadialGradient(nibX, sY, 0, nibX, sY, 120);
          ng.addColorStop(0, "rgba(255,226,170,0.35)"); ng.addColorStop(1, "rgba(255,226,170,0)");
          ctx.fillStyle = ng; ctx.fillRect(nibX - 120, sY - 120, 240, 240);
        }
        var mk2 = seg(t, (T.slam + HS) - 0.25, (T.slam + HS));
        mark.style.width = mW + "px"; mark.style.height = mH + "px";
        set(mark, cx, L.markY, Math.min(1, mk2 * 4) * endF, { s: lerp(2.2, 1, outExpo(mk2)) });
        if (t > (T.slam + HS) && t < (T.slam + HS) + 0.9) {
          var ak = seg(t, (T.slam + HS), (T.slam + HS) + 0.9);
          var ag = ctx.createLinearGradient(0, 0, W, 0);
          ag.addColorStop(0, "rgba(255,220,170,0)"); ag.addColorStop(0.5, "rgba(255,236,210," + (1 - ak) * 0.9 + ")"); ag.addColorStop(1, "rgba(255,220,170,0)");
          ctx.fillStyle = ag; ctx.fillRect(0, L.markY - 2 - (1 - ak) * 3, W, 4 + (1 - ak) * 6);
          shake += 18 * Math.pow(1 - seg(t, (T.slam + HS), (T.slam + HS) + 0.5), 2);
          if (t < (T.slam + HS) + 0.08) flash = Math.max(flash, 0.22);
        }
        line.style.fontSize = (L.tall ? 40 : 34) + "px";
        var lk = seg(t, 30.9, 31.6);
        set(line, cx, L.markY + mH * 0.5 + (L.tall ? 330 : 250) + (1 - outCubic(lk)) * 16, lk * endF, { blur: (1 - lk) * 8 });
        mail.style.fontSize = "22px"; mail.style.color = C.stone;
        set(mail, cx, L.markY + mH * 0.5 + (L.tall ? 400 : 310), seg(t, 31.6, 32.2) * endF);
        t = t0;
      }

      /* ----- HUD: the machine's frame ----- */
      var hA = win(t, 0.7, T.cut, 0.5, 0.01);
      hudR.textContent = "T+" + t.toFixed(2);
      hudL.style.color = C.dust; hudR.style.color = C.dust;
      set(hudL, L.G, L.hudY, hA, { ax: 0 }); set(hudR, W - L.G, L.hudY, hA, { ax: -100 });

      cam.style.transform = shake > 0.2 ? "translate(" + (Math.sin(t * 97) * shake).toFixed(2) + "px," + (Math.cos(t * 83) * shake * 0.7).toFixed(2) + "px)" : "none";

      /* ----- glitch: slices of the frame displaced ----- */
      if (t > T.glitch && t < T.cut) {
        var gk2 = seg(t, T.glitch, T.cut);
        for (var b = 0; b < 9; b++) {
          if (hash(fr * 13 + b) > 0.25 + 0.6 * gk2) continue;
          var y0 = Math.floor(hash(fr * 7 + b * 3) * H), hh = 8 + Math.floor(hash(fr + b * 11) * 90), shv = (hash(fr * 5 + b) - 0.5) * 220 * gk2;
          ctx.drawImage(bg, 0, y0, W, hh, shv, y0, W, hh);
        }
        tl.style.transform = "translate(" + ((hash(fr * 9) - 0.5) * 40 * gk2).toFixed(1) + "px,0)";
      } else tl.style.transform = "none";
      if (t >= T.cut && t < T.human + 0.45) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); }

      /* ----- top layer: fringe, scrim, flash, blink, vignette, grain ----- */
      var tc = tctx;
      tc.setTransform(1, 0, 0, 1, 0, 0); tc.clearRect(0, 0, W, H);
      if (chroma > 0.5) {
        tc.globalCompositeOperation = "lighter"; tc.globalAlpha = 0.16;
        tc.drawImage(bg, chroma, 0); tc.globalAlpha = 0.1; tc.drawImage(bg, -chroma, 0);
        tc.globalCompositeOperation = "source-over"; tc.globalAlpha = 1;
      }
      if (scrim > 0) {
        var sgr = tc.createLinearGradient(0, H * 0.55, 0, H);
        sgr.addColorStop(0, "rgba(5,5,7,0)"); sgr.addColorStop(1, "rgba(5,5,7," + scrim + ")");
        tc.fillStyle = sgr; tc.fillRect(0, H * 0.55, W, H * 0.45);
      }
      if (flash > 0.002) { tc.fillStyle = "rgba(255,246,236," + flash + ")"; tc.fillRect(0, 0, W, H); }
      if (t > T.blink && t < T.montage) {
        var bk = seg(t, T.blink, T.blink + 0.25), lid = H * 0.52 * inCubic(bk);
        tc.fillStyle = "#000";
        tc.beginPath(); tc.ellipse(cx, -H * 0.3 + lid, W * 1.1, H * 0.3 + 40, 0, 0, 6.283); tc.fill();
        tc.beginPath(); tc.ellipse(cx, H * 1.3 - lid, W * 1.1, H * 0.3 + 40, 0, 0, 6.283); tc.fill();
        if (bk >= 1) tc.fillRect(0, 0, W, H);
      }
      var vg = tc.createRadialGradient(cx, cy, Math.min(W, H) * 0.32, cx, cy, Math.max(W, H) * 0.72);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.6)");
      tc.fillStyle = vg; tc.fillRect(0, 0, W, H);
      var gt = GRAIN[fr % GRAIN.length], gox = Math.floor(hash(fr) * 384), goy = Math.floor(hash(fr + 77) * 384);
      tc.globalAlpha = 0.09;
      for (var gx2 = -gox; gx2 < W; gx2 += 384) for (var gy2 = -goy; gy2 < H; gy2 += 384) tc.drawImage(gt, gx2, gy2, 384, 384);
      tc.globalAlpha = 1;
      var blackA = Math.max(1 - seg(t, 0, 0.35), seg(t, T.out + 0.9, T.out + 1.0));
      if (blackA > 0) { tc.fillStyle = "rgba(0,0,0," + blackA + ")"; tc.fillRect(0, 0, W, H); }
      now = t;
    }

    /* ---------- playback ---------- */
    var playing = false, last = 0, raf = 0;
    var rA = opts.range ? opts.range[0] : 0, rB = opts.range ? opts.range[1] : DUR;
    var audio = null;
    if (opts.audio && !opts.manual) { audio = new Audio(opts.audio); audio.preload = "auto"; }
    function frame(ts) {
      if (!playing) return;
      var dt = last ? (ts - last) / 1000 : 0; last = ts;
      var nxt = now + Math.min(dt, 0.1), wrapped = false;
      if (nxt >= rB || nxt < rA) { nxt = rA + ((nxt - rA) % (rB - rA) + (rB - rA)) % (rB - rA); wrapped = true; }
      if (audio && !audio.paused && !wrapped && Math.abs(audio.currentTime - nxt) < 0.25) nxt = audio.currentTime; // follow the sound
      if (audio && wrapped) audio.currentTime = nxt;
      seek(nxt); updateUI();
      raf = requestAnimationFrame(frame);
    }
    function play() { if (playing) return; playing = true; last = 0; host.classList.remove("is-paused"); if (audio) { audio.currentTime = now; audio.play().catch(function () {}); } raf = requestAnimationFrame(frame); updateUI(); }
    function pause() { playing = false; cancelAnimationFrame(raf); host.classList.add("is-paused"); if (audio) audio.pause(); updateUI(); }

    function fit() {
      var cw = host.clientWidth || W, ch = host.clientHeight || cw * H / W, s = Math.min(cw / W, ch / H);
      stage.style.transform = "translate(" + ((cw - W * s) / 2) + "px," + ((ch - H * s) / 2) + "px) scale(" + s + ")";
    }
    if (!opts.manual) {
      if (!host.style.aspectRatio && !host.style.height) host.style.aspectRatio = W + " / " + H;
      if (typeof ResizeObserver !== "undefined") new ResizeObserver(fit).observe(host);
      fit();
    }
    var ui = null;
    function updateUI() {
      if (!ui) return;
      ui.btn.textContent = playing ? "Pause" : (audio ? "Play with sound" : "Play");
      ui.bar.style.width = ((now - rA) / (rB - rA) * 100).toFixed(2) + "%";
      ui.time.textContent = now.toFixed(1) + "s";
    }
    if (opts.controls) {
      var bar = mk("div", "vm-ui", host);
      var btn = mk("button", null, bar, "Play"); btn.type = "button";
      var track = mk("div", "vm-bar", bar); var fill = mk("i", null, track);
      var time = mk("span", "vm-time", bar, "0.0s");
      ui = { btn: btn, bar: fill, time: time };
      btn.addEventListener("click", function () { playing ? pause() : play(); });
      track.addEventListener("click", function (e) { var r = track.getBoundingClientRect(); seek(rA + (rB - rA) * clamp((e.clientX - r.left) / r.width, 0, 0.9999)); if (audio) audio.currentTime = now; updateUI(); });
    }

    var loads = [fontsReady(doc),
      loadImg(A.eye).then(function (i) { IM.eye = grade(i, 0.95, 1.0); }),
      loadImg(A.dawn).then(function (i) { IM.dawn = grade(i, 0.95, 0.85); })];
    VERDICTS.forEach(function (v) { if (A.stills && A.stills[v[0]]) loads.push(loadImg(A.stills[v[0]]).then(function (i) { IM[v[0]] = grade(i, 0.82, 0.8); })); });
    if (A.vlnc) loads.push(new Promise(function (r) { if (mark.complete && mark.naturalWidth) r(); else mark.onload = mark.onerror = function () { r(); }; }));
    if (A.sig) loads.push(loadImg(A.sig));
    var readyP = Promise.all(loads).then(function () {
      bigLay = null; seek(opts.start != null ? opts.start : rA); updateUI();
      if (opts.autoplay) play(); else host.classList.add("is-paused");
    });

    return {
      duration: DUR, fps: FPS, width: W, height: H, format: L.fmt,
      ready: readyP, seek: function (t) { seek(t); updateUI(); }, play: play, pause: pause,
      get time() { return now; }, get playing() { return playing; }
    };
  }

  window.ValenceMotion = {
    version: "2.0.0", title: "Entry One",
    duration: DUR, fps: FPS, palette: C, fonts: F, script: VO, cues: CUES, verdicts: VERDICTS, cuts: CUTS, times: T,
    formats: { "9x16": [1080, 1920], "4x5": [1080, 1350] },
    mountFilm: mountFilm
  };
})();
