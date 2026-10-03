/* VALENCE · Introduction film
   One deterministic timeline: seek(t) paints every layer for time t, so the live player,
   the frame-by-frame MP4 render and the design-system preview are the same film.

   Spine (from the identity system): find the signal, remove the noise, build recognisable
   emotional weight.
     I    Signal       0.0 –  1.5   one verve pulse in the void
     II   Noise        1.5 –  4.6   the market's vocabulary floods in, is struck through, blurs away
     III  The line     4.6 –  8.6   "You have been living with it longer than anyone knows."
     IV   Worlds       8.6 – 14.1   eight rooms, eight grahas, on the beat
     V    Recognition 14.1 – 19.6   scattered stars find each other and become the name
     VI   Weight      19.6 – 28.4   horizon, eclipse, disciplines, the VLNC lockup
     ·    Return      28.4 – 30.0   back to the single pulse: the film loops without a seam   */
(function () {
  "use strict";

  var DUR = 30;
  var FPS = 30;

  /* ---------- palette (identity system + site tokens) ---------- */
  var C = {
    void: "#050507", onyx: "#0a0a0a", bone: "#f3f2ef", stone: "#a6a39e", dust: "#6f6b66",
    verve: "#e35a2a", gold: "#c8a24c", forest: "#223d2e", moss: "#7a7e56", sea: "#0b5962",
    sahara: "#c49b5b", sky: "#8c9fb3", hand: "#e98a5e"
  };
  var F = {
    display: '"Anybody", "Arial Black", sans-serif',
    text: '"Host Grotesk", "Helvetica Neue", Arial, sans-serif',
    script: '"Ballet", "Snell Roundhand", cursive',
    mono: '"Martian Mono", ui-monospace, Menlo, monospace',
    hand: '"La Belle Aurore", "Bradley Hand", cursive'
  };

  /* ---------- maths ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function outExpo(k) { return k >= 1 ? 1 : 1 - Math.pow(2, -10 * k); }
  function outCubic(k) { return 1 - Math.pow(1 - k, 3); }
  function inCubic(k) { return k * k * k; }
  function inOut(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function outBack(k) { var c = 1.4; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }
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
  function hash(n) { var r = rng(n * 2654435761); return r(); }
  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }
  function tanh(x) { var e = Math.exp(2 * x); return (e - 1) / (e + 1); }

  /* ---------- content (site copy, October 2026) ---------- */
  var NOISE = [
    "POST DAILY", "GO VIRAL", "MORE CONTENT", "REACH", "IMPRESSIONS", "TRENDING AUDIO",
    "ENGAGEMENT RATE", "BEST TIME TO POST", "10X YOUR BRAND", "THOUGHT LEADERSHIP", "ELEVATE",
    "SEAMLESS", "GAME-CHANGING", "DISRUPT", "HOOK IN 3 SECONDS", "#GROWTH", "SYNERGY",
    "LUXURY AESTHETIC", "ALGORITHM UPDATE", "CONTENT CALENDAR", "LOOK PREMIUM", "STORYTELLING",
    "UNLOCK", "SCALE", "PERSONAL BRAND HACKS", "GOING LIVE"
  ];
  var WORLDS = [
    { g: "mars", word: "FOUNDERS", name: "MANGAL · MARS", k: "COURAGE, INITIATIVE, ENTERPRISE", work: "BRAND IDENTITY · FOUNDER WRITING · CREATIVE DIRECTION", tint: C.verve },
    { g: "rahu", word: "CINEMA", name: "RAHU", k: "ILLUSION, THE SCREEN, MASS MEDIA", work: "FILM CAMPAIGNS · PUBLICITY · VISUAL STORYTELLING", tint: C.verve },
    { g: "venus", word: "MUSIC", name: "SHUKRA · VENUS", k: "ART, MUSIC, BEAUTY", work: "ARTIST IDENTITY · PHOTOGRAPHY · RELEASE CAMPAIGNS", tint: C.gold },
    { g: "moon", word: "PUBLIC FIGURES", name: "CHANDRA · MOON", k: "THE PUBLIC MIND, POPULARITY", work: "PERSONAL BRANDING · PUBLIC COMMUNICATION · PARTNERSHIPS", tint: C.sky },
    { g: "mercury", word: "BRANDS", name: "BUDH · MERCURY", k: "TRADE, COMMERCE, SPEECH", work: "BRANDING · PRODUCT STORYTELLING · LAUNCH CAMPAIGNS", tint: C.sahara },
    { g: "saturn", word: "ARCHITECTURE", name: "SHANI · SATURN", k: "STRUCTURE, STONE, DISCIPLINE", work: "PRACTICE IDENTITY · PHOTOGRAPHY · PROJECT STORIES", tint: C.gold },
    { g: "jupiter", word: "CAPITAL", name: "GURU · JUPITER", k: "WEALTH, WISDOM, COUNSEL", work: "FOUNDER WRITING · FIRM IDENTITY · EDITORIAL COMMUNICATION", tint: C.sahara },
    { g: "sun", word: "INSTITUTIONS", name: "SURYA · SUN", k: "AUTHORITY, THE STATE", work: "PUBLIC CAMPAIGNS · PROGRAMME IDENTITY · DIGITAL STRATEGY", tint: C.verve }
  ];
  var DISCIPLINES = ["CREATIVE DIRECTION", "FILM", "PHOTOGRAPHY", "WRITING", "BRANDING", "DIGITAL"];
  var ACTS = [[0, "I · SIGNAL"], [1.5, "II · NOISE"], [4.6, "III · THE LINE"], [8.6, "IV · WORLDS"], [14.1, "V · RECOGNITION"], [19.6, "VI · WEIGHT"], [28.4, "I · SIGNAL"]];

  var T = { worlds: 8.6, beat: 0.625, cons: 14.1, lines: 16.4, horizon: 19.6, slam: 24.15, end: 28.4 };

  /* Sound cues the score is built from (seconds). */
  var CUES = (function () {
    var c = { pulse: [], tick: [], swell: [[1.5, 3.7], [19.6, 24.1]], hit: [], whoosh: [3.95, 7.9, 13.55, 19.2, 23.55], beat: [], chime: [], ping: [18.35], boom: [24.15], shimmer: [[5.2, 5.9], [24.4, 25.6]], disc: [] };
    for (var p = 0; p < DUR; p += 1.5) c.pulse.push(p);
    c.hit.push(3.7, 4.55, 4.8, 5.75, 6.05);
    for (var i = 0; i < 8; i++) c.beat.push(T.worlds + i * T.beat);
    for (var k = 0; k < 25; k++) c.chime.push(T.lines + k * 0.076);
    for (var d = 0; d < 6; d++) c.disc.push(20.4 + d * 0.5);
    for (var y = 0; y < 26; y++) c.tick.push(0.25 + y * 0.045);
    return c;
  })();

  /* VALENCE master-name wordmark, single strokes (the site header's lockup), as a constellation. */
  var WM = (function () {
    var P = {}, S = [];
    function p(n, x, y) { P[n] = [x, y]; }
    p("a", 0, 0); p("b", 30, 60); p("c", 60, 0);
    p("d", 100, 60); p("e", 130, 0); p("f", 160, 60);
    p("g", 200, 0); p("h", 200, 60); p("i", 250, 60);
    p("j", 290, 0); p("k", 290, 30); p("l", 290, 60); p("m", 340, 0); p("n", 334, 30); p("o", 340, 60);
    p("q", 380, 0); p("pp", 380, 60); p("r", 440, 60); p("s", 440, 0);
    var cx = 510.04, cy = 30, a0 = Math.atan2(-23, 19.26), a1 = a0 - (2 * Math.PI - 2 * Math.abs(a0));
    var arc = [];
    for (var i = 0; i <= 6; i++) { var a = lerp(a0, a1, i / 6); p("c" + i, cx + Math.cos(a) * 30, cy + Math.sin(a) * 30); arc.push("c" + i); }
    p("J", 570, 0); p("K", 570, 30); p("L", 570, 60); p("M", 620, 0); p("N", 614, 30); p("O", 620, 60);
    S.push(["a", "b"], ["b", "c"], ["d", "e"], ["e", "f"], ["g", "h"], ["h", "i"],
      ["j", "k"], ["k", "l"], ["j", "m"], ["k", "n"], ["l", "o"],
      ["pp", "q"], ["q", "r"], ["r", "s"]);
    for (var j = 0; j < 6; j++) S.push([arc[j], arc[j + 1]]);
    S.push(["J", "K"], ["K", "L"], ["J", "M"], ["K", "N"], ["L", "O"]);
    return { P: P, S: S, names: Object.keys(P), labels: [["a", "α  ATTENTION", -1], ["h", "β  FEELING", 1], ["s", "γ  MEANING", -1], ["c3", "δ  MEMORY", 1]] };
  })();

  /* ---------- layout per format ---------- */
  function layout(fmt) {
    var W = 1080, tall = fmt !== "4x5", H = tall ? 1920 : 1350;
    return {
      fmt: tall ? "9x16" : "4x5", W: W, H: H, G: 72, TW: W - 144,
      hudTop: tall ? 200 : 54, hudBot: tall ? H - 300 : H - 66,
      headA: tall ? H * 0.47 : H * 0.5, headMax: tall ? 236 : 196,
      planetY: tall ? H * 0.4 : H * 0.37, planetR: tall ? 285 : 220, wordY: tall ? H * 0.655 : H * 0.69,
      consY: tall ? H * 0.6 : H * 0.66, headB: tall ? H * 0.2 : H * 0.12,
      horizon: tall ? H * 0.63 : H * 0.64, eclR: tall ? 318 : 240,
      markW: tall ? 820 : 700, kickY: tall ? H * 0.19 : H * 0.075
    };
  }

  /* ---------- the Navagraha, ported from the site's drawGraha ---------- */
  function graha(ctx, name, cx, cy, R, edge) {
    var r = rng(name.length * 7919 + name.charCodeAt(0));
    function glow(c, rad, a) {
      rad = Math.min(rad, edge);
      var g = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, rad);
      g.addColorStop(0, hexA(c, a)); g.addColorStop(1, hexA(c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 6.283); ctx.fill();
    }
    function sphere(stops, lx, ly) {
      var g = ctx.createRadialGradient(cx + R * (lx == null ? -0.35 : lx), cy + R * (ly == null ? -0.35 : ly), R * 0.05, cx, cy, R * 1.02);
      stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();
    }
    function inside(fn) { ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.clip(); fn(); ctx.restore(); }
    function shade() {
      inside(function () {
        var g = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
        g.addColorStop(0.45, "rgba(3,4,6,0)"); g.addColorStop(1, "rgba(3,4,6,0.85)");
        ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      });
    }
    function spots(n, col, size) {
      inside(function () {
        for (var i = 0; i < n; i++) {
          var a = r() * 6.283, d = Math.sqrt(r()) * R * 0.85, s = R * size * (0.4 + r());
          ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s, 0, 6.283); ctx.fill();
        }
      });
    }
    function bands(cols) {
      inside(function () {
        cols.forEach(function (c, i) {
          var y = cy - R + (i / cols.length) * R * 2;
          ctx.fillStyle = c; ctx.fillRect(cx - R, y + (r() - 0.5) * 2, R * 2, (R * 2) / cols.length + 1);
        });
      });
    }
    switch (name) {
      case "mars":
        glow("#E35A2A", R * 1.7, 0.3);
        sphere([[0, "#f6a27a"], [0.45, "#c9481f"], [1, "#4a160a"]]);
        spots(7, "rgba(70,20,10,0.35)", 0.16);
        inside(function () { ctx.fillStyle = "rgba(255,240,230,0.75)"; ctx.beginPath(); ctx.ellipse(cx - R * 0.1, cy - R * 0.92, R * 0.32, R * 0.12, 0, 0, 6.283); ctx.fill(); });
        shade(); break;
      case "rahu":
        var cor = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, edge);
        cor.addColorStop(0, "rgba(255,226,190,0.95)"); cor.addColorStop(0.1, "rgba(227,90,42,0.7)"); cor.addColorStop(0.45, "rgba(227,90,42,0.1)"); cor.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(cx, cy, edge, 0, 6.283); ctx.fill();
        ctx.fillStyle = "#050506"; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();
        break;
      case "moon":
        glow("#dfe6ee", R * 1.6, 0.18);
        sphere([[0, "#f4f4f2"], [0.55, "#a9adb3"], [1, "#3c3f44"]]);
        spots(12, "rgba(60,64,70,0.28)", 0.12);
        inside(function () { ctx.fillStyle = "rgba(3,4,6,0.9)"; ctx.beginPath(); ctx.arc(cx + R * 0.75, cy + R * 0.1, R * 1.05, 0, 6.283); ctx.fill(); });
        break;
      case "venus":
        glow("#f3e3b0", R * 1.9, 0.35);
        sphere([[0, "#fffbe9"], [0.5, "#e9cf95"], [1, "#6d5326"]]);
        bands(["rgba(255,255,255,0.05)", "rgba(200,162,76,0.12)", "rgba(255,255,255,0.06)", "rgba(200,162,76,0.1)", "rgba(255,255,255,0.04)"]);
        shade(); break;
      case "mercury":
        glow("#c49b5b", R * 1.4, 0.16);
        var s0 = R; R = R * 0.78;
        sphere([[0, "#d9cbb8"], [0.55, "#8d7e6c"], [1, "#2c2620"]]);
        spots(14, "rgba(40,34,28,0.35)", 0.1);
        shade(); R = s0; break;
      case "jupiter":
        glow("#C49B5B", R * 1.6, 0.18);
        R = R * 1.12;
        sphere([[0, "#f1dfc0"], [0.6, "#c49b5b"], [1, "#4a3420"]]);
        bands(["rgba(120,70,40,0.25)", "rgba(255,240,215,0.15)", "rgba(160,90,50,0.35)", "rgba(255,240,215,0.2)", "rgba(140,80,45,0.3)", "rgba(255,240,215,0.12)", "rgba(110,65,40,0.3)"]);
        inside(function () { ctx.fillStyle = "rgba(190,80,50,0.75)"; ctx.beginPath(); ctx.ellipse(cx + R * 0.25, cy + R * 0.32, R * 0.2, R * 0.11, 0, 0, 6.283); ctx.fill(); });
        shade(); break;
      case "saturn":
        glow("#C8A24C", R * 1.6, 0.16);
        var ring = function (front) {
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.38);
          [[1.95, "rgba(200,162,76,0.35)"], [1.7, "rgba(243,226,180,0.65)"], [1.45, "rgba(200,162,76,0.5)"]].forEach(function (k) {
            ctx.strokeStyle = k[1]; ctx.lineWidth = R * 0.14;
            ctx.beginPath(); ctx.ellipse(0, 0, R * k[0], R * k[0] * 0.26, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); ctx.stroke();
          });
          ctx.restore();
        };
        ring(false);
        sphere([[0, "#f4e2b5"], [0.55, "#c8a24c"], [1, "#4b3a17"]]);
        bands(["rgba(120,90,40,0.18)", "rgba(255,240,200,0.1)", "rgba(120,90,40,0.22)", "rgba(255,240,200,0.08)"]);
        shade(); ring(true); break;
      case "sun":
        var c2 = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, edge);
        c2.addColorStop(0, "rgba(255,214,140,0.8)"); c2.addColorStop(0.35, "rgba(227,90,42,0.25)"); c2.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(cx, cy, edge, 0, 6.283); ctx.fill();
        sphere([[0, "#fffdf2"], [0.45, "#ffd27a"], [1, "#e35a2a"]], 0, 0);
        spots(30, "rgba(255,255,255,0.12)", 0.05);
        break;
    }
  }

  /* ---------- styles injected once ---------- */
  var CSS = [
    ".vm{position:relative;overflow:hidden;background:" + C.void + ";-webkit-user-select:none;user-select:none}",
    ".vm *{box-sizing:border-box}",
    ".vm-stage{position:absolute;left:0;top:0;transform-origin:0 0;overflow:hidden;background:" + C.void + "}",
    ".vm-cam{position:absolute;inset:0}",
    ".vm canvas{position:absolute;left:0;top:0}",
    ".vm-t{position:absolute;left:0;top:0;white-space:nowrap;will-change:transform,filter,opacity;color:" + C.bone + ";margin:0}",
    ".vm-d{font-family:" + F.display + ";font-weight:900;text-transform:uppercase;line-height:1;letter-spacing:-0.02em}",
    ".vm-m{font-family:" + F.mono + ";font-stretch:112.5%;font-weight:400;text-transform:uppercase;letter-spacing:0.14em;font-size:21px;color:" + C.stone + "}",
    ".vm-s{font-family:" + F.script + ";font-variation-settings:'opsz' 72;color:" + C.gold + ";line-height:1;text-transform:none}",
    ".vm-h{font-family:" + F.hand + ";color:" + C.hand + ";line-height:1.2}",
    ".vm-img{position:absolute;left:0;top:0;display:block;will-change:transform,filter,opacity}",
    ".vm-sig{position:absolute;left:0;top:0;background:" + C.gold + ";-webkit-mask:var(--sig) center/contain no-repeat;mask:var(--sig) center/contain no-repeat}",
    ".vm-strike{position:absolute;left:-4%;top:52%;height:3px;background:" + C.bone + ";transform-origin:0 50%}",
    ".vm-btn{border:1.5px solid rgba(243,242,239,.32);padding:22px 30px;color:" + C.bone + "}",
    ".vm-dot{display:inline-block;width:12px;height:12px;border-radius:50%;background:" + C.verve + ";box-shadow:0 0 14px " + C.verve + ";margin-right:18px;vertical-align:2px}",
    ".vm-ui{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;gap:12px;padding:10px 12px;font:500 11px/1 " + F.mono + ";letter-spacing:.12em;text-transform:uppercase;color:" + C.bone + ";background:linear-gradient(transparent,rgba(5,5,7,.85));opacity:0;transition:opacity .3s}",
    ".vm:hover .vm-ui,.vm.is-paused .vm-ui{opacity:1}",
    ".vm-ui button{all:unset;cursor:pointer;padding:6px 8px;border:1px solid rgba(243,242,239,.3)}",
    ".vm-ui button:focus-visible{outline:2px solid " + C.verve + ";outline-offset:2px}",
    ".vm-bar{flex:1;height:14px;position:relative;cursor:pointer}",
    ".vm-bar::before{content:'';position:absolute;left:0;right:0;top:6px;height:1px;background:rgba(243,242,239,.3)}",
    ".vm-bar i{position:absolute;left:0;top:5px;height:3px;background:" + C.verve + "}",
    ".vm-time{min-width:44px;text-align:right;font-variant-numeric:tabular-nums}"
  ].join("\n");
  var FONTS = "https://fonts.googleapis.com/css2?family=Anybody:wdth,wght@50..150,100..900&family=Ballet:opsz@16..72&family=Host+Grotesk:wght@300..800&family=La+Belle+Aurore&family=Martian+Mono:wdth,wght@75..112.5,100..800&display=block";

  function injectOnce(doc, fontBase) {
    if (doc.getElementById("vm-css")) return;
    var s = doc.createElement("style"); s.id = "vm-css";
    var face = "";
    if (fontBase) {
      face = [
        ["Anybody", "Anybody.woff2", "100 900", "50% 150%"], ["Ballet", "Ballet.woff2", "400", "100%"],
        ["Host Grotesk", "HostGrotesk.woff2", "300 800", "100%"], ["La Belle Aurore", "LaBelleAurore.woff2", "400", "100%"],
        ["Martian Mono", "MartianMono.woff2", "100 800", "75% 112.5%"]
      ].map(function (f) { return "@font-face{font-family:'" + f[0] + "';src:url(" + fontBase + f[1] + ") format('woff2');font-weight:" + f[2] + ";font-stretch:" + f[3] + ";font-display:block}"; }).join("\n");
    } else {
      var l = doc.createElement("link"); l.rel = "stylesheet"; l.href = FONTS; doc.head.appendChild(l);
    }
    s.textContent = face + "\n" + CSS;
    doc.head.appendChild(s);
  }

  function fontsReady(doc) {
    var want = ["900 100px Anybody", "300 100px Anybody", "100px Ballet", "400 20px 'Martian Mono'", "30px 'La Belle Aurore'", "400 20px 'Host Grotesk'"];
    return Promise.all(want.map(function (f) { return doc.fonts.load(f).catch(function () {}); })).then(function () { return doc.fonts.ready; });
  }
  function imgReady(img) {
    if (img.complete && img.naturalWidth) return Promise.resolve();
    return new Promise(function (res) { img.onload = img.onerror = function () { res(); }; });
  }

  /* ================================================================== */
  function mountFilm(host, opts) {
    opts = opts || {};
    var doc = host.ownerDocument;
    injectOnce(doc, opts.fontBase);
    var L = layout(opts.format || "9x16");
    var W = L.W, H = L.H, cxs = W / 2, cys = H / 2;
    var assets = opts.assets || {};

    host.classList.add("vm");
    host.innerHTML = "";
    var stage = mk("div", "vm-stage", host);
    stage.style.width = W + "px"; stage.style.height = H + "px";
    var cam = mk("div", "vm-cam", stage);
    var bg = canvas(cam), bctx = bg.getContext("2d");
    var tl = mk("div", "vm-cam", cam);
    var top = canvas(stage), tctx = top.getContext("2d");

    function mk(tag, cls, parent, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; }
    function canvas(parent) { var c = mk("canvas", null, parent); c.width = W; c.height = H; c.style.width = W + "px"; c.style.height = H + "px"; return c; }
    function txt(cls, text) { return mk("div", "vm-t " + cls, tl, text); }

    /* ---- seeded fields ---- */
    var R0 = rng(7);
    var STARS = [];
    for (var i = 0; i < 1500; i++) {
      var m = Math.pow(R0(), 3), warm = R0() < 0.12, cool = R0() < 0.18;
      STARS.push({ x: (R0() * 2 - 1) * 1.15, y: (R0() * 2 - 1) * 1.15 * (H / W), z: R0(), m: m, c: warm ? "255,196,160" : cool ? "190,210,235" : "243,242,239", p: R0() * 6.28, v: 0.6 + R0() * 1.4 });
    }
    var R1 = rng(31);
    var FIX = [];
    for (var f = 0; f < 520; f++) { var mm = Math.pow(R1(), 3); FIX.push({ x: R1() * W, y: R1() * H, s: 0.5 + mm * 1.9, a: 0.18 + mm * 0.65, c: R1() < 0.12 ? "255,196,160" : R1() < 0.2 ? "190,210,235" : "243,242,239", p: R1() * 6.28, v: 0.5 + R1() * 1.5 }); }
    var NEB = [];
    var R2 = rng(99);
    [["227,90,42", 0.82, 0.2, 0.36], ["11,89,98", 0.15, 0.62, 0.45], ["200,162,76", 0.3, 0.12, 0.25], ["140,159,179", 0.7, 0.8, 0.35]].forEach(function (n) {
      for (var k = 0; k < 5; k++) NEB.push({ c: n[0], x: W * (n[1] + (R2() - 0.5) * 0.25), y: H * (n[2] + (R2() - 0.5) * 0.2), r: Math.max(W, H) * n[3] * (0.4 + R2() * 0.6) });
    });
    // grain tiles
    var GRAIN = [];
    for (var gk = 0; gk < 6; gk++) {
      var gc = doc.createElement("canvas"); gc.width = gc.height = 256;
      var gx = gc.getContext("2d"), id = gx.createImageData(256, 256), gr = rng(500 + gk);
      for (var px = 0; px < id.data.length; px += 4) { var v = gr(); id.data[px] = id.data[px + 1] = id.data[px + 2] = 255; id.data[px + 3] = v > 0.5 ? Math.round(Math.pow((v - 0.5) * 2, 2) * 255) : 0; }
      gx.putImageData(id, 0, 0); GRAIN.push(gc);
    }

    /* ---- text & image elements ---- */
    var hud = {
      tl: txt("vm-m", "19.0760° N · 72.8777° E"), tr: txt("vm-m", ""), bl: txt("vm-m", ""), br: txt("vm-m", "")
    };
    var lead = [txt("vm-m", ""), txt("vm-m", "")];
    lead.forEach(function (e) { e.style.color = C.bone; e.style.fontSize = "30px"; });
    var noise = NOISE.map(function (w, i) {
      var r = rng(1000 + i), big = r() < 0.38;
      var e = txt(big ? "vm-d" : "vm-m", w);
      var s = mk("i", "vm-strike", e);
      return { e: e, s: s, big: big, x: L.G + r() * (W - 2 * L.G), y: H * (0.12 + r() * 0.76), size: big ? 46 + r() * 70 : 20 + r() * 16, wd: 50 + r() * 100, on: 1.55 + r() * 1.9, seed: i, drift: (r() - 0.5) * 60 };
    });
    var headA = [["YOU HAVE", 0], ["BEEN LIVING", 1], ["WITH IT", 0], ["longer", 2], ["THAN ANYONE", 1], ["KNOWS.", 0]].map(function (l) {
      var e = txt(l[1] === 2 ? "vm-s" : "vm-d", l[0]); return { e: e, script: l[1] === 2, txt: l[0] };
    });
    var worldEls = WORLDS.map(function (w) {
      return { word: txt("vm-d", w.word), name: txt("vm-m", w.name), k: txt("vm-m", w.k), work: txt("vm-m", w.work), n: txt("vm-m", "") };
    });
    var worldHead = txt("vm-m", "THE PEOPLE AND WORLDS WE WORK WITH");
    var headB = [txt("vm-d", "YOU CAN"), txt("vm-d", "RECOGNISE IT"), txt("vm-d", "BEFORE YOU CAN"), txt("vm-s", "explain"), txt("vm-d", "IT.")];
    var consLabels = WM.labels.map(function (l) { return txt("vm-m", l[1]); });
    var discHead = txt("vm-m", "THE IDEA DECIDES WHAT WE BRING TO IT");
    var discEls = DISCIPLINES.map(function (d) { return txt("vm-d", d); });
    var kick = [txt("vm-m", ""), txt("vm-m", "")];
    kick[0].innerHTML = "";
    var mark = mk("img", "vm-img", tl); mark.alt = ""; if (assets.vlnc) mark.src = assets.vlnc;
    var ghosts = [0, 1, 2].map(function () { var g = mk("img", "vm-img", tl); g.alt = ""; if (assets.vlnc) g.src = assets.vlnc; return g; });
    tl.insertBefore(ghosts[0], mark); tl.insertBefore(ghosts[1], mark); tl.insertBefore(ghosts[2], mark);
    var sig = mk("div", "vm-sig", tl); if (assets.sig) sig.style.setProperty("--sig", "url(\"" + assets.sig + "\")");
    var note = txt("vm-h", "Tell us the part you keep trying to explain.");
    var cta = txt("vm-m vm-btn", "BRING US INTO IT  →");
    var mail = txt("vm-m", "buzz@vlnc.in");
    var MARK_AR = 416 / 1723, SIG_AR = 765 / 1057;
    var allText = [].slice.call(tl.querySelectorAll(".vm-t"));

    /* ---- helpers for DOM layers ---- */
    function set(e, x, y, o, extra) {
      // x,y = anchor centre; extra: {s, sx, blur, rot, ax, ay}
      extra = extra || {};
      if (o <= 0.001) { e.style.opacity = "0"; e.style.visibility = "hidden"; return; }
      e.style.visibility = "visible";
      e.style.opacity = String(Math.min(1, o));
      var ax = extra.ax == null ? -50 : extra.ax, ay = extra.ay == null ? -50 : extra.ay;
      e.style.transform = "translate(" + x.toFixed(2) + "px," + y.toFixed(2) + "px) translate(" + ax + "%," + ay + "%)" +
        (extra.rot ? " rotate(" + extra.rot + "deg)" : "") + " scale(" + ((extra.s || 1) * (extra.sx || 1)).toFixed(4) + "," + (extra.s || 1).toFixed(4) + ")";
      e.style.filter = extra.blur > 0.05 ? "blur(" + extra.blur.toFixed(2) + "px)" : "none";
    }
    function hide(e) { e.style.opacity = "0"; e.style.visibility = "hidden"; }
    function fitSize(e, maxW, maxSize, stretch) {
      if (stretch != null) e.style.fontStretch = stretch + "%";
      e.style.fontSize = "100px";
      var w = e.offsetWidth || 1;
      var s = Math.min(maxSize, 100 * maxW / w);
      e.style.fontSize = s.toFixed(2) + "px";
      return s;
    }
    function typed(s, k) { var n = Math.round(s.length * clamp(k, 0, 1)); return s.slice(0, n); }

    /* layout of headline A, computed once fonts are in */
    var headLayout = null;
    function computeHeadA() {
      var sizes = [];
      headA.forEach(function (h) {
        h.e.style.letterSpacing = "-0.02em";
        if (h.script) { h.e.style.fontSize = (L.headMax * 1.05) + "px"; sizes.push(0); return; }
        h.e.style.fontWeight = "900";
        sizes.push(fitSize(h.e, L.TW, L.headMax, 118));
      });
      var lh = 0.88, y = 0, ys = [];
      sizes.forEach(function (s, i) {
        if (headA[i].script) { ys.push(y + L.headMax * 0.2); y += L.headMax * 0.42; return; }
        ys.push(y + s * lh / 2); y += s * lh + 8;
      });
      var off = L.headA - y / 2;
      headLayout = { sizes: sizes, ys: ys.map(function (v) { return v + off; }) };
    }
    var headBLayout = null;
    function computeHeadB() {
      var cap = L.fmt === "9x16" ? 150 : 104, sizes = [], ys = [], y = L.headB;
      [0, 1, 2].forEach(function (i) { headB[i].style.fontWeight = "800"; headB[i].style.letterSpacing = "-0.01em"; sizes.push(fitSize(headB[i], L.TW, cap, 112)); });
      sizes.forEach(function (s) { ys.push(y + s * 0.45); y += s * 0.9 + 6; });
      var s3 = Math.min(cap, sizes[2] * 1.15);
      headB[4].style.fontWeight = "800"; headB[4].style.fontSize = s3 + "px"; headB[4].style.fontStretch = "112%"; headB[4].style.letterSpacing = "-0.01em";
      headB[3].style.fontSize = (s3 * 1.75) + "px";
      var w2 = headB[3].offsetWidth * 0.9, w3 = headB[4].offsetWidth, gap = s3 * 0.25, x0 = cxs - (w2 + gap + w3) / 2;
      headBLayout = { sizes: sizes, ys: ys, x2: x0 + w2 / 2, x3: x0 + w2 + gap + w3 / 2, y3: y + s3 * 0.5, s3: s3 };
    }

    /* ---- camera helpers ---- */
    function travel(t) {
      // camera travel through the starfield: slow drift plus three warp surges
      return 0.012 * t + 2.6 * 0.5 * (1 + tanh((t - 2.75) / 0.42)) + 1.1 * 0.5 * (1 + tanh((t - 8.45) / 0.18)) + 0.9 * 0.5 * (1 + tanh((t - 14.05) / 0.22));
    }
    function shakeAt(t) {
      var a = 0, k;
      for (var b = 0; b < 8; b++) { k = t - (T.worlds + b * T.beat); if (k >= 0 && k < 0.35) a += 16 * Math.pow(1 - k / 0.35, 3); }
      k = t - T.slam; if (k >= 0 && k < 0.6) a += 26 * Math.pow(1 - k / 0.6, 3);
      k = t - 3.7; if (k >= 0 && k < 0.25) a += 8 * (1 - k / 0.25);
      return a;
    }

    /* ---- background canvas ---- */
    function drawStars3D(ctx, t, alpha, clipY) {
      if (alpha <= 0) return;
      var s = travel(t), s2 = travel(t - 1 / 30), f = W * 0.42;
      var vel = (s - s2) * 30;
      ctx.save();
      if (clipY != null) { ctx.beginPath(); ctx.rect(0, 0, W, clipY); ctx.clip(); }
      ctx.lineCap = "round";
      for (var i = 0; i < STARS.length; i++) {
        var st = STARS[i];
        var z = ((st.z - s) % 1 + 1) % 1 * 0.97 + 0.03;
        var z2 = ((st.z - s2) % 1 + 1) % 1 * 0.97 + 0.03;
        var x = cxs + st.x / z * f * 0.5, y = cys + st.y / z * f * 0.5;
        if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
        var near = 1 - z, tw = 0.65 + 0.35 * Math.sin(t * st.v + st.p);
        var a = alpha * (0.15 + st.m * 0.85) * Math.min(1, near * 1.6 + 0.25) * tw * Math.min(1, (1 - z) * 12) * Math.min(1, z * 30);
        var size = (0.5 + st.m * 1.6) * (0.55 + near * 1.5);
        if (vel > 0.25 && z2 > z) {
          var x2 = cxs + st.x / z2 * f * 0.5, y2 = cys + st.y / z2 * f * 0.5;
          ctx.strokeStyle = "rgba(" + st.c + "," + a + ")"; ctx.lineWidth = size * 1.3;
          ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x, y); ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(" + st.c + "," + a + ")";
          ctx.beginPath(); ctx.arc(x, y, size, 0, 6.283); ctx.fill();
        }
      }
      ctx.restore();
    }
    function drawFixed(ctx, t, alpha, clipY) {
      if (alpha <= 0) return;
      ctx.save();
      if (clipY != null) { ctx.beginPath(); ctx.rect(0, 0, W, clipY); ctx.clip(); }
      NEB.forEach(function (n) {
        var g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        g.addColorStop(0, "rgba(" + n.c + "," + 0.06 * alpha + ")"); g.addColorStop(1, "rgba(" + n.c + ",0)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      });
      FIX.forEach(function (s) {
        var a = s.a * alpha * (0.55 + 0.45 * Math.sin(t * s.v + s.p));
        ctx.fillStyle = "rgba(" + s.c + "," + a + ")";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, 6.283); ctx.fill();
        if (s.s > 1.9) {
          ctx.strokeStyle = "rgba(" + s.c + "," + a * 0.4 + ")"; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(s.x - s.s * 5, s.y); ctx.lineTo(s.x + s.s * 5, s.y); ctx.moveTo(s.x, s.y - s.s * 5); ctx.lineTo(s.x, s.y + s.s * 5); ctx.stroke();
        }
      });
      ctx.restore();
    }
    function axis(ctx, a) {
      if (a <= 0) return;
      ctx.save(); ctx.strokeStyle = "rgba(243,242,239," + 0.11 * a + ")"; ctx.lineWidth = 1;
      var g = L.G / 2;
      [g, W - g].forEach(function (x) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); });
      ctx.strokeStyle = "rgba(243,242,239," + 0.05 * a + ")";
      [g + (W - 2 * g) / 3, g + 2 * (W - 2 * g) / 3].forEach(function (x) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); });
      ctx.restore();
    }
    function pulse(ctx, x, y, t, a, scale) {
      if (a <= 0) return;
      scale = scale || 1;
      var ph = (t % 1.5) / 1.5;
      ctx.save();
      // expanding ring: the "signal bar" pulse
      ctx.strokeStyle = hexA(C.verve, a * 0.55 * (1 - ph)); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, (10 + ph * 70) * scale, 0, 6.283); ctx.stroke();
      var g = ctx.createRadialGradient(x, y, 0, x, y, 44 * scale);
      g.addColorStop(0, hexA(C.verve, 0.55 * a)); g.addColorStop(1, hexA(C.verve, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 44 * scale, 0, 6.283); ctx.fill();
      ctx.fillStyle = hexA("#ffb08a", a); ctx.beginPath(); ctx.arc(x, y, (6.5 + 1.5 * Math.cos(ph * 6.283)) * scale, 0, 6.283); ctx.fill();
      ctx.restore();
    }
    function brackets(ctx, x, y, w, h, a) {
      if (a <= 0) return;
      ctx.save(); ctx.strokeStyle = "rgba(243,242,239," + 0.7 * a + ")"; ctx.lineWidth = 1.5;
      var k = 34;
      ctx.beginPath();
      ctx.moveTo(x, y + k); ctx.lineTo(x, y); ctx.lineTo(x + k, y);
      ctx.moveTo(x + w - k, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - k);
      ctx.stroke(); ctx.restore();
    }

    function wmPoint(n, k, ox, oy) { var p = WM.P[n]; return [ox + p[0] * k, oy + p[1] * k]; }

    /* ---- the eclipse over water (the home hero, animated) ---- */
    function eclipse(ctx, t, hy, cy, R, glowA, ringA) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, hy); ctx.clip();
      var cx = cxs;
      // corona
      var g = ctx.createRadialGradient(cx, cy, R * 0.97, cx, cy, R * 2.3);
      g.addColorStop(0, "rgba(255,214,170," + 0.85 * glowA + ")");
      g.addColorStop(0.05, "rgba(227,90,42," + 0.42 * glowA + ")");
      g.addColorStop(0.3, "rgba(200,162,76," + 0.08 * glowA + ")");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 2.3, 0, 6.283); ctx.fill();
      // orbit rings
      if (ringA > 0) {
        for (var i = 0; i < 9; i++) {
          var rr = R * (1.16 + i * 0.075 + (i % 3) * 0.012);
          var draw = clamp(ringA * 1.6 - i * 0.07, 0, 1);
          if (draw <= 0) continue;
          var a0 = Math.PI * 1.5 - Math.PI * draw * 1.02, a1 = Math.PI * 1.5 + Math.PI * draw * 1.02;
          ctx.strokeStyle = "rgba(140,159,179," + (0.16 + 0.12 * Math.sin(i * 1.7 + t * 0.6)) * Math.min(1, ringA * 2) + ")";
          ctx.lineWidth = i % 4 === 0 ? 1.6 : 1;
          ctx.beginPath(); ctx.arc(cx, cy, rr, a0 + Math.sin(t * 0.2 + i) * 0.02, a1); ctx.stroke();
        }
      }
      // body
      ctx.fillStyle = "#040506"; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();
      // limb
      var lg = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
      lg.addColorStop(0, "rgba(255,200,150," + glowA + ")"); lg.addColorStop(0.55, "rgba(227,110,52," + 0.85 * glowA + ")"); lg.addColorStop(1, "rgba(227,90,42," + 0.5 * glowA + ")");
      ctx.strokeStyle = lg; ctx.lineWidth = 3.2; ctx.shadowColor = "rgba(227,90,42," + glowA + ")"; ctx.shadowBlur = 34;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
    function ocean(ctx, t, hy, a, ecX, glowA, R) {
      if (a <= 0) return;
      ctx.save();
      var g = ctx.createLinearGradient(0, hy, 0, H);
      g.addColorStop(0, "rgba(7,12,16," + a + ")"); g.addColorStop(1, "rgba(3,4,5," + a + ")");
      ctx.fillStyle = g; ctx.fillRect(0, hy, W, H - hy);
      // reflection streaks: perspective rows, amber column under the eclipse
      for (var i = 0; i < 70; i++) {
        var k = i / 70, y = hy + Math.pow(k, 1.55) * (H - hy) + 2;
        var spread = R * (0.55 + k * 0.9);
        var n = 3 + (i % 3);
        for (var j = 0; j < n; j++) {
          var h1 = hash(i * 13 + j * 7 + 1), h2 = hash(i * 31 + j * 3 + 5);
          var x = ecX + (h1 - 0.5) * 2 * spread + Math.sin(t * (0.8 + h2) + i * 0.7 + j) * 18;
          var len = (20 + h2 * 90) * (0.6 + k);
          var al = glowA * a * (0.12 + 0.5 * (1 - Math.abs(x - ecX) / (spread + 1))) * (1 - k * 0.65) * (0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.3 + j * 2.1));
          if (al <= 0.01) continue;
          ctx.fillStyle = "rgba(240,150,80," + al + ")";
          ctx.fillRect(x - len / 2, y, len, 1.4 + k * 2.4);
        }
        // faint cool glints across the whole water
        var hx = hash(i * 97 + 3) * W, al2 = 0.05 * a * (0.5 + 0.5 * Math.sin(t * 1.3 + i));
        ctx.fillStyle = "rgba(140,159,179," + al2 + ")"; ctx.fillRect(hx, y, 40 + 60 * hash(i), 1);
      }
      ctx.restore();
    }

    /* ================= seek ================= */
    var ready = false;
    function seek(t) {
      t = ((t % DUR) + DUR) % DUR;
      var ctx = bctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = C.void; ctx.fillRect(0, 0, W, H);
      allText.forEach(hide);
      [mark, sig].concat(ghosts).forEach(hide);

      var sh = shakeAt(t);
      cam.style.transform = sh > 0.1 ? "translate(" + (Math.sin(t * 91) * sh).toFixed(2) + "px," + (Math.cos(t * 77) * sh * 0.7).toFixed(2) + "px)" : "none";

      var endFade = 1 - seg(t, T.end, T.end + 0.9);
      var flash = 0;

      /* ---------- I · Signal / end pulse ---------- */
      var pulseA = Math.max(1 - seg(t, 1.5, 2.3), seg(t, 29.0, 29.6));
      var pulseScale = 1 + outExpo(seg(t, 1.45, 1.75)) * 0.8 - seg(t, 1.75, 2.3) * 1.2;

      /* ---------- starfields ---------- */
      var s3dA = Math.min(seg(t, 1.45, 2.0), 1 - seg(t, 4.2, 4.9)) * 1 + win(t, 4.6, 8.7, 0.4, 0.2) * 0.45 + win(t, 8.3, 14.3, 0.1, 0.3) * 0.35;
      var fixA = win(t, 4.3, 30, 0.6, 0.01) * (1 - win(t, 8.5, 14.2, 0.1, 0.1) * 0.6) * endFade;
      var hy = L.horizon;
      var inHorizon = t >= T.horizon - 0.1;
      drawFixed(ctx, t, fixA * (inHorizon ? 0.9 : 1), inHorizon ? hy : null);
      drawStars3D(ctx, t, s3dA, null);
      axis(ctx, win(t, 0.6, 30, 0.8, 0.01) * endFade);

      /* ---------- HUD ---------- */
      var hudA = win(t, 0.5, 29.2, 0.6, 0.6);
      var tc = Math.floor(t), fr = Math.floor((t - tc) * FPS);
      hud.tl.textContent = "19.0760° N · 72.8777° E";
      var act = ACTS[0][1]; ACTS.forEach(function (a) { if (t >= a[0]) act = a[1]; });
      hud.bl.textContent = act;
      hud.br.textContent = "00:" + (tc < 10 ? "0" : "") + tc + ":" + (fr < 10 ? "0" : "") + fr;
      // signal meter: lost in the noise, rises as the name is found
      var lvl = t < 1.5 ? 0.2 : t < 4.6 ? 0.2 * (1 - seg(t, 1.5, 2.2)) + (hash(Math.floor(t * 12)) * 0.12) : t < 14.1 ? 0.2 + 0.4 * seg(t, 4.6, 14.1) : t < 18.4 ? 0.6 + 0.2 * seg(t, 14.1, 18.4) : t < 24.1 ? 0.8 + 0.1 * seg(t, 18.4, 24.1) : t < T.end ? 1 : 0.2;
      var bars = Math.round(lvl * 5);
      hud.tr.innerHTML = "SIGNAL&nbsp;&nbsp;" + [0, 1, 2, 3, 4].map(function (b) { return "<span style=\"color:" + (b < bars ? (b === 4 ? C.verve : C.bone) : "rgba(243,242,239,.22)") + "\">▮</span>"; }).join("");
      set(hud.tl, L.G, L.hudTop, hudA * 0.9, { ax: 0 });
      set(hud.tr, W - L.G, L.hudTop, hudA * 0.9, { ax: -100 });
      set(hud.bl, L.G, L.hudBot, hudA * 0.8, { ax: 0 });
      set(hud.br, W - L.G, L.hudBot, hudA * 0.6, { ax: -100 });

      /* ---------- I · lead line under the pulse ---------- */
      var leadTxt = ["THE LIGHT YOU ARE SEEING", "LEFT ITS STAR YEARS AGO."];
      var la = 1 - seg(t, 1.35, 1.6);
      lead[0].textContent = typed(leadTxt[0], seg(t, 0.25, 0.85));
      lead[1].textContent = typed(leadTxt[1], seg(t, 0.75, 1.3));
      if (t < 1.6) { set(lead[0], cxs, cys + 120, la); set(lead[1], cxs, cys + 172, la); }

      /* ---------- II · Noise ---------- */
      if (t > 1.5 && t < 4.7) {
        var strikeK = seg(t, 3.62, 3.9), blurK = seg(t, 3.95, 4.55);
        noise.forEach(function (n, i) {
          var on = seg(t, n.on, n.on + 0.12);
          if (on <= 0) return;
          var fq = Math.floor(t * 15);
          var flick = blurK > 0 ? 1 : hash(fq * 31 + i * 7) > 0.18 ? 1 : 0.25;
          if (n.big) { n.e.style.fontSize = n.size + "px"; n.e.style.fontStretch = n.wd + "%"; n.e.style.fontWeight = "700"; n.e.style.color = C.bone; }
          else { n.e.style.fontSize = n.size + "px"; n.e.style.color = C.stone; }
          n.s.style.width = "108%";
          n.s.style.transform = "scaleX(" + outCubic(clamp(strikeK * 1.4 - (i % 7) * 0.05, 0, 1)).toFixed(3) + ")";
          var x = n.x + n.drift * seg(t, n.on, 4.6) + blurK * (i % 2 ? 1 : -1) * 260 * inCubic(blurK);
          set(n.e, x, n.y, on * flick * (1 - blurK) * (n.big ? 0.92 : 0.8), { blur: blurK * 26, sx: 1 + blurK * 2.2, ax: -50 });
        });
      }

      /* ---------- III · The line ---------- */
      if (t > 4.4 && t < 8.7) {
        if (!headLayout) computeHeadA();
        var starts = [4.55, 4.75, 4.95, 5.35, 5.8, 6.05];
        var out = seg(t, 7.85, 8.45);
        headA.forEach(function (h, i) {
          var k = seg(t, starts[i], starts[i] + 1.0), e = outExpo(k);
          if (k <= 0) return;
          if (h.script) {
            h.e.style.clipPath = "inset(-20% " + (100 - outCubic(seg(t, starts[i], starts[i] + 0.7)) * 100).toFixed(2) + "% -20% -5%)";
            set(h.e, cxs + W * 0.14, headLayout.ys[i], (1 - out), { rot: -7, blur: out * 14, s: 1 + out * 0.3 });
            return;
          }
          h.e.style.fontStretch = lerp(50, 118, e).toFixed(1) + "%" ;
          if (out > 0) h.e.style.fontStretch = lerp(118, 150, out).toFixed(1) + "%";
          h.e.style.letterSpacing = lerp(0.22, -0.02, e).toFixed(3) + "em";
          h.e.style.fontSize = headLayout.sizes[i] + "px";
          h.e.style.color = C.bone;
          var dir = i % 2 ? 1 : -1;
          set(h.e, cxs + dir * inCubic(out) * W * 1.3, headLayout.ys[i], Math.min(1, k * 2.4), { blur: (1 - e) * 18 + out * 10 });
        });
      }

      /* ---------- IV · Worlds ---------- */
      if (t > T.worlds - 0.05 && t < T.cons + 0.3) {
        var bi = clamp(Math.floor((t - T.worlds) / T.beat), 0, 7);
        var u = clamp((t - T.worlds - bi * T.beat) / T.beat, 0, 1);
        var w = WORLDS[bi], we = worldEls[bi];
        var isSun = bi === 7;
        var grow = isSun ? inCubic(seg(t, 13.55, 14.1)) : 0;
        var dir = bi % 2 ? -1 : 1;
        var ent = outExpo(clamp(u * 1.6, 0, 1));
        var pr = L.planetR * (1.22 - 0.22 * ent) * (1 + grow * 5);
        var px = cxs + dir * (1 - ent) * 140 - dir * u * 26;
        var py = L.planetY + grow * (cys - L.planetY);
        // tint wash
        var wg = ctx.createRadialGradient(px, py, 0, px, py, W * 1.1);
        wg.addColorStop(0, hexA(w.tint, 0.16 * (1 - grow))); wg.addColorStop(1, hexA(w.tint, 0));
        ctx.fillStyle = wg; ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.globalAlpha = 1;
        graha(ctx, w.g, px, py, pr, pr * 2.6);
        ctx.restore();
        brackets(ctx, cxs - L.planetR * 1.55, L.planetY - L.planetR * 1.25, L.planetR * 3.1, L.planetR * 2.5, (1 - grow) * ent * 0.8);
        flash = Math.max(flash, 0.28 * Math.pow(1 - clamp(u * 5, 0, 1), 2));
        var wo = 1 - grow;
        // the word, fitted to the frame while its width axis swings
        var swing = bi % 2 ? lerp(56, 146, inOut(u)) : lerp(150, 62, inOut(u));
        we.word.style.fontWeight = "900"; we.word.style.letterSpacing = "-0.01em";
        var sz = fitSize(we.word, L.TW, 400, swing);
        set(we.word, cxs, L.wordY, wo * Math.min(1, u * 8), { blur: (1 - ent) * 8 });
        we.n.textContent = "0" + (bi + 1) + " / 08";
        set(we.n, L.G, L.wordY - sz * 0.5 - 70, wo * ent, { ax: 0 });
        set(we.name, W - L.G, L.wordY - sz * 0.5 - 70, wo * ent, { ax: -100 });
        we.name.style.color = C.bone;
        set(we.k, W - L.G, L.wordY - sz * 0.5 - 38, wo * ent * 0.8, { ax: -100 });
        we.k.style.fontSize = "17px";
        we.work.style.fontSize = "17px";
        set(we.work, cxs, L.wordY + sz * 0.5 + 46, wo * ent * 0.85);
        set(worldHead, cxs, L.planetY - L.planetR * 1.25 - 46, win(t, T.worlds, 13.6, 0.2, 0.2) * 0.85);
        if (isSun) flash = Math.max(flash, seg(t, 13.75, 14.1) * 0.95);
      }
      if (t >= 14.1 && t < 14.6) flash = Math.max(flash, 0.95 * (1 - seg(t, 14.1, 14.6)));

      /* ---------- V · Recognition ---------- */
      if (t > T.cons - 0.1 && t < 20.2) {
        var k = L.TW / 620, ox = cxs - 310 * k, oy = L.consY - 30 * k;
        var exit = seg(t, 19.15, 19.85);
        var lift = inOut(exit);
        var cA = (1 - exit);
        ctx.save();
        ctx.translate(0, -lift * (L.consY - L.headB) * 0.5);
        // stars travel from scattered to their places
        var pos = {};
        WM.names.forEach(function (n, i) {
          var r = rng(4000 + i);
          var sx = L.G + r() * (W - 2 * L.G), sy = H * (0.3 + r() * 0.55);
          var fp = wmPoint(n, k, ox, oy);
          var mv = inOut(seg(t, 14.9 + (i % 9) * 0.08, 16.5 + (i % 9) * 0.08));
          var x = lerp(sx, fp[0], mv), y = lerp(sy, fp[1], mv);
          pos[n] = [x, y];
          var tw = 0.75 + 0.25 * Math.sin(t * 3 + i);
          var isSig = n === "O";
          var a = cA * seg(t, 14.15, 14.6) * tw;
          var sz = 2.2 + mv * 1.3;
          if (isSig && t > 18.2) { return; }
          ctx.fillStyle = "rgba(243,242,239," + a + ")";
          ctx.beginPath(); ctx.arc(x, y, sz, 0, 6.283); ctx.fill();
          ctx.strokeStyle = "rgba(243,242,239," + a * 0.35 + ")"; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(x - sz * 4, y); ctx.lineTo(x + sz * 4, y); ctx.moveTo(x, y - sz * 4); ctx.lineTo(x, y + sz * 4); ctx.stroke();
        });
        // lines connect, left to right
        var flare = win(t, 18.35, 19.4, 0.08, 0.6);
        ctx.lineCap = "round";
        WM.S.forEach(function (sgm, i) {
          var p = outCubic(seg(t, T.lines + i * 0.076, T.lines + i * 0.076 + 0.24));
          if (p <= 0) return;
          var a = pos[sgm[0]], b = pos[sgm[1]];
          ctx.strokeStyle = "rgba(243,242,239," + (0.78 + flare * 0.22) * cA + ")";
          ctx.lineWidth = 2 + flare * 1.6;
          ctx.shadowColor = flare > 0 ? "rgba(227,90,42," + flare + ")" : "rgba(243,242,239,.6)"; ctx.shadowBlur = 10 + flare * 26;
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(lerp(a[0], b[0], p), lerp(a[1], b[1], p)); ctx.stroke();
        });
        ctx.shadowBlur = 0;
        // the last star is the signal
        var sp = pos.O;
        if (t > 15) pulse(ctx, sp[0], sp[1], t - 18.35 + 1.5 * 10, cA * (t > 18.2 ? 1 : seg(t, 17.6, 18.2) * 0.5), 0.8 + 0.6 * flare);
        if (t > 18.35 && t < 19.4) {
          var rk = seg(t, 18.35, 19.3);
          ctx.strokeStyle = hexA(C.verve, (1 - rk) * 0.7); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(sp[0], sp[1], 20 + outExpo(rk) * W * 0.9, 0, 6.283); ctx.stroke();
        }
        // atlas labels with leader lines
        WM.labels.forEach(function (lb, i) {
          var la2 = seg(t, 16.9 + i * 0.22, 17.3 + i * 0.22) * cA;
          if (la2 <= 0) return;
          var p0 = pos[lb[0]], dy = lb[2] * 104;
          ctx.strokeStyle = "rgba(243,242,239," + 0.35 * la2 + ")"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(p0[0], p0[1] + lb[2] * 12); ctx.lineTo(p0[0], p0[1] + dy * outCubic(la2)); ctx.stroke();
          set(consLabels[i], p0[0] + 10, p0[1] + dy + lb[2] * 18 - lift * (L.consY - L.headB) * 0.5, la2, { ax: i === 0 ? 0 : i === 3 ? -50 : -50 });
          consLabels[i].style.fontSize = "18px"; consLabels[i].style.color = C.bone;
        });
        ctx.restore();
        // headline
        if (!headBLayout) computeHeadB();
        var hb = headBLayout, hk = [seg(t, 14.35, 15.25), seg(t, 14.55, 15.45), seg(t, 14.8, 15.7), seg(t, 15.35, 16.05), seg(t, 15.75, 16.5)];
        var hOut = exit, yl = -lift * 60;
        [0, 1, 2, 4].forEach(function (i) {
          var e = outExpo(hk[i]);
          if (i < 3) headB[i].style.fontSize = hb.sizes[i] + "px";
          headB[i].style.fontStretch = lerp(60, 112, e).toFixed(1) + "%";
          headB[i].style.letterSpacing = lerp(0.2, -0.01, e).toFixed(3) + "em";
          headB[i].style.color = C.bone;
          var x = i < 3 ? cxs : hb.x3, y = i < 3 ? hb.ys[i] : hb.y3;
          set(headB[i], x, y + yl, Math.min(1, hk[i] * 2) * (1 - hOut), { blur: (1 - e) * 14 + hOut * 10 });
        });
        headB[3].style.clipPath = "inset(-30% " + (100 - outCubic(hk[3]) * 100).toFixed(2) + "% -30% -5%)";
        set(headB[3], hb.x2, hb.y3 + yl + hb.s3 * 0.06, (hk[3] > 0 ? 1 : 0) * (1 - hOut), { rot: -4, blur: hOut * 10 });
      }

      /* ---------- VI · Weight: horizon, eclipse, disciplines, lockup ---------- */
      if (t >= T.horizon - 0.1) {
        var lineK = outCubic(seg(t, 19.65, 20.4));
        var rise = outCubic(seg(t, 19.9, 24.0));
        var R = L.eclR;
        var ecY = lerp(hy + R * 1.1, hy - R * 0.62, rise);
        var glowA = (0.25 + 0.75 * rise) * endFade;
        var ringA = seg(t, 20.6, 23.4) * endFade;
        eclipse(ctx, t, hy, ecY, R, glowA, ringA);
        // shock ring at the slam
        if (t > 23.6 && t < 25) {
          var sk = seg(t, 23.65, 24.9);
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hy); ctx.clip();
          ctx.strokeStyle = "rgba(255,200,150," + (1 - sk) * 0.6 + ")"; ctx.lineWidth = 2 + (1 - sk) * 6;
          ctx.beginPath(); ctx.arc(cxs, ecY, R * (1 + outExpo(sk) * 2.2), 0, 6.283); ctx.stroke(); ctx.restore();
        }
        ocean(ctx, t, hy, seg(t, 19.6, 20.3) * endFade, cxs, glowA * seg(t, 21, 23.5), R);
        ctx.save();
        ctx.strokeStyle = "rgba(243,242,239," + 0.45 * endFade + ")"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cxs - lineK * cxs, hy + 0.5); ctx.lineTo(cxs + lineK * cxs, hy + 0.5); ctx.stroke();
        ctx.restore();

        // disciplines, on the water
        var dA = win(t, 20.3, 23.6, 0.15, 0.2);
        if (dA > 0) {
          set(discHead, cxs, hy + 70, dA * 0.85);
          var di = clamp(Math.floor((t - 20.4) / 0.5), 0, 5), du = clamp((t - 20.4 - di * 0.5) / 0.5, 0, 1);
          var de = discEls[di];
          de.style.fontWeight = "800";
          var dsz = fitSize(de, L.TW * (di === 0 ? 1 : 0.86), 210, di % 2 ? lerp(60, 140, outCubic(du)) : lerp(150, 90, outCubic(du)));
          set(de, cxs, hy + 120 + Math.min(dsz, 170) * 0.62 + 30, dA * Math.min(1, du * 6) * (1 - seg(du, 0.85, 1) * 0.6), { blur: (1 - outExpo(du)) * 6 });
          if (t > 20.4) flash = Math.max(flash, 0.08 * Math.pow(1 - clamp(du * 6, 0, 1), 2));
        }

        // lockup
        var mW = L.markW, mH = mW * MARK_AR;
        var my = ecY - R * 0.12;
        if (t > 23.6) {
          var mk2 = seg(t, 23.7, T.slam);
          var sc = function (tt) { return lerp(2.6, 1, outExpo(seg(tt, 23.7, T.slam))); };
          mark.style.width = mW + "px"; mark.style.height = mH + "px";
          var mo = Math.min(1, mk2 * 3) * endFade;
          set(mark, cxs, my, mo, { s: sc(t), blur: (1 - outExpo(mk2)) * 22 });
          ghosts.forEach(function (g, gi) {
            g.style.width = mW + "px"; g.style.height = mH + "px";
            var gs = sc(t - (gi + 1) * 0.035);
            set(g, cxs, my, mo * (0.28 - gi * 0.08) * (1 - seg(t, T.slam, T.slam + 0.25)), { s: gs, blur: 6 + gi * 6 });
          });
          // the signature, written in gold
          var sW = mW * 0.56, sH = sW * SIG_AR;
          sig.style.width = sW + "px"; sig.style.height = sH + "px";
          sig.style.clipPath = "inset(-5% " + (100 - outCubic(seg(t, 24.35, 25.55)) * 100).toFixed(2) + "% -5% -5%)";
          set(sig, cxs + mW * 0.2, my + mH * 0.5 + sH * 0.18, seg(t, 24.3, 24.4) * endFade);
          // kicker
          var kt = ["AN INDEPENDENT CREATIVE PRACTICE", "MUMBAI · WORKING GLOBALLY"];
          kick[0].innerHTML = "<span class=\"vm-dot\"></span>" + typed(kt[0], seg(t, 24.7, 25.5));
          kick[1].textContent = typed(kt[1], seg(t, 25.3, 25.9));
          kick[0].style.color = C.bone; kick[0].style.fontSize = "22px"; kick[1].style.fontSize = "22px";
          var ky = L.kickY;
          set(kick[0], cxs, ky, endFade); set(kick[1], cxs, ky + 42, endFade * 0.9);
          // the human line, in the pencil hand
          fitSize(note, L.TW * 0.92, L.fmt === "9x16" ? 50 : 42);
          note.style.clipPath = "inset(-20% " + (100 - seg(t, 25.75, 27.0) * 100).toFixed(2) + "% -20% -5%)";
          var ny = hy + (L.fmt === "9x16" ? 165 : 120);
          set(note, cxs, ny, seg(t, 25.7, 25.8) * endFade, { rot: -2 });
          var ce = outCubic(seg(t, 26.8, 27.4));
          cta.style.fontSize = "22px"; cta.style.color = C.bone;
          set(cta, cxs, ny + 108 + (1 - ce) * 20, ce * endFade);
          mail.style.fontSize = "22px"; mail.style.color = C.stone;
          set(mail, cxs, ny + 172 + (1 - ce) * 20, ce * endFade * 0.9);
        }
        if (t > 23.62 && t < 23.9) flash = Math.max(flash, 0.5 * (1 - seg(t, 23.62, 23.9)));
      }

      // the signal
      pulse(ctx, cxs, cys, t, pulseA * (t < 2.3 ? 1 : 1), Math.max(0.2, pulseScale));

      /* ---------- top layer: flash, vignette, grain ---------- */
      var tc2 = tctx;
      tc2.setTransform(1, 0, 0, 1, 0, 0);
      tc2.clearRect(0, 0, W, H);
      if (flash > 0.002) { tc2.fillStyle = "rgba(255,244,232," + flash + ")"; tc2.fillRect(0, 0, W, H); }
      var vg = tc2.createRadialGradient(cxs, cys, Math.min(W, H) * 0.35, cxs, cys, Math.max(W, H) * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.55)");
      tc2.fillStyle = vg; tc2.fillRect(0, 0, W, H);
      var fi = Math.floor(t * 24);
      var gt = GRAIN[fi % GRAIN.length], ox2 = Math.floor(hash(fi) * 256), oy2 = Math.floor(hash(fi + 77) * 256);
      tc2.globalAlpha = 0.085;
      for (var gx2 = -ox2 * 1.5; gx2 < W; gx2 += 384) for (var gy2 = -oy2 * 1.5; gy2 < H; gy2 += 384) tc2.drawImage(gt, gx2, gy2, 384, 384);
      tc2.globalAlpha = 1;
      now = t;
    }

    /* ---------- playback ---------- */
    var now = 0, playing = false, last = 0, raf = 0;
    var rA = opts.range ? opts.range[0] : 0, rB = opts.range ? opts.range[1] : DUR;
    function frame(ts) {
      if (!playing) return;
      var dt = last ? (ts - last) / 1000 : 0; last = ts;
      var nx = now + Math.min(dt, 0.1);
      if (nx >= rB || nx < rA) nx = rA + ((nx - rA) % (rB - rA) + (rB - rA)) % (rB - rA);
      seek(nx);
      updateUI();
      raf = requestAnimationFrame(frame);
    }
    function play() { if (playing) return; playing = true; last = 0; host.classList.remove("is-paused"); raf = requestAnimationFrame(frame); updateUI(); }
    function pause() { playing = false; cancelAnimationFrame(raf); host.classList.add("is-paused"); updateUI(); }

    /* fit the stage into the host */
    function fit() {
      var cw = host.clientWidth || W, ch = host.clientHeight || cw * H / W;
      var s = Math.min(cw / W, ch / H);
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
      ui.btn.textContent = playing ? "Pause" : "Play";
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
      track.addEventListener("click", function (e) { var r = track.getBoundingClientRect(); seek(rA + (rB - rA) * clamp((e.clientX - r.left) / r.width, 0, 0.9999)); updateUI(); });
      host.addEventListener("keydown", function (e) { if (e.key === " ") { e.preventDefault(); playing ? pause() : play(); } });
    }

    var readyP = Promise.all([fontsReady(doc), imgReady(mark), new Promise(function (r) { if (!assets.sig) return r(); var i = new Image(); i.onload = i.onerror = r; i.src = assets.sig; })]).then(function () {
      ready = true; headLayout = null; headBLayout = null;
      seek(opts.start != null ? opts.start : rA); updateUI();
      if (opts.autoplay) play(); else host.classList.add("is-paused");
    });

    return {
      duration: DUR, fps: FPS, width: W, height: H, format: L.fmt,
      ready: readyP, seek: function (t) { seek(t); updateUI(); }, play: play, pause: pause,
      get time() { return now; }, get playing() { return playing; }
    };
  }

  window.ValenceMotion = {
    version: "1.0.0",
    duration: DUR, fps: FPS, palette: C, fonts: F, cues: CUES, worlds: WORLDS, disciplines: DISCIPLINES,
    formats: { "9x16": [1080, 1920], "4x5": [1080, 1350] },
    mountFilm: mountFilm
  };
})();
