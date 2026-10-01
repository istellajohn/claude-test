/* VALENCE Journal · shared behaviour
   1. Astronomy: Julian Day, true new moons (Meeus, ch. 49), moon phase
   2. Ephemeris strip and moon glyphs
   3. Starfield with the occasional meteor
   4. Generative plates: one seeded celestial body per catalogued piece
   5. Listings rendered from data.js
   6. Page furniture: menu, filters, reading orbit, day/night side, questions, letter form, catalogue chart */

(function () {
  "use strict";

  var D = window.VALENCE || { entries: [], letters: [], questions: [], images: {} };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ------------------------------------------------------------------ */
  /* 1. Astronomy                                                        */
  /* ------------------------------------------------------------------ */

  function jdFromDate(d) { return d.getTime() / 86400000 + 2440587.5; }
  function dateFromJD(jd) { return new Date((jd - 2440587.5) * 86400000); }

  function newMoonJD(k) {
    var T = k / 1236.85, r = Math.PI / 180, s = Math.sin;
    var J = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T - 0.00000015 * T * T * T + 0.00000000073 * T * T * T * T;
    var E = 1 - 0.002516 * T - 0.0000074 * T * T;
    var M = (2.5534 + 29.1053567 * k - 0.0000014 * T * T - 0.00000011 * T * T * T) * r;
    var Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T * T + 0.00001238 * T * T * T - 0.000000058 * T * T * T * T) * r;
    var F = (160.7108 + 390.67050284 * k - 0.0016118 * T * T - 0.00000227 * T * T * T + 0.000000011 * T * T * T * T) * r;
    var O = (124.7746 - 1.56375588 * k + 0.0020672 * T * T + 0.00000215 * T * T * T) * r;
    J += -0.4072 * s(Mp) + 0.17241 * E * s(M) + 0.01608 * s(2 * Mp) + 0.01039 * s(2 * F) + 0.00739 * E * s(Mp - M) -
      0.00514 * E * s(Mp + M) + 0.00208 * E * E * s(2 * M) - 0.00111 * s(Mp - 2 * F) - 0.00057 * s(Mp + 2 * F) +
      0.00056 * E * s(2 * Mp + M) - 0.00042 * s(3 * Mp) + 0.00042 * E * s(M + 2 * F) + 0.00038 * E * s(M - 2 * F) -
      0.00024 * E * s(2 * Mp - M) - 0.00017 * s(O) - 0.00007 * s(Mp + 2 * M) + 0.00004 * s(2 * Mp - 2 * F) +
      0.00004 * s(3 * M) + 0.00003 * s(Mp + M - 2 * F) + 0.00003 * s(2 * Mp + 2 * F) - 0.00003 * s(Mp + M + 2 * F) +
      0.00003 * s(Mp - M + 2 * F) - 0.00002 * s(Mp - M - 2 * F) - 0.00002 * s(3 * Mp + M) + 0.00002 * s(4 * Mp);
    return J - 69 / 86400; // TT to UT, near enough
  }

  function moonState(date) {
    var jd = jdFromDate(date);
    var k = Math.floor((jd - 2451550.09766) / 29.530588861);
    var prev = newMoonJD(k), next = newMoonJD(k + 1);
    while (prev > jd) { k--; next = prev; prev = newMoonJD(k); }
    while (next <= jd) { k++; prev = next; next = newMoonJD(k + 1); }
    var age = jd - prev, len = next - prev, f = age / len;
    var names = [
      [0.0339, "New moon"], [0.216, "Waxing crescent"], [0.284, "First quarter"], [0.466, "Waxing gibbous"],
      [0.534, "Full moon"], [0.716, "Waning gibbous"], [0.784, "Last quarter"], [0.966, "Waning crescent"], [1.01, "New moon"]
    ];
    var name = names.filter(function (n) { return f < n[0]; })[0][1];
    return {
      jd: jd, fraction: f, age: age, name: name,
      illumination: (1 - Math.cos(2 * Math.PI * f)) / 2,
      nextNew: dateFromJD(next), prevNew: dateFromJD(prev)
    };
  }

  // SVG path for the lit part of a moon of radius r centred at (r, r)
  function moonPath(f, r) {
    var c = r, rx = Math.abs(Math.cos(2 * Math.PI * f)) * r;
    if (f < 0.5) {
      var sweep = f < 0.25 ? 0 : 1;
      return "M" + c + " 0 A" + r + " " + r + " 0 0 1 " + c + " " + 2 * r + " A" + rx + " " + r + " 0 0 " + sweep + " " + c + " 0Z";
    }
    var sweep2 = f > 0.75 ? 1 : 0;
    return "M" + c + " 0 A" + r + " " + r + " 0 0 0 " + c + " " + 2 * r + " A" + rx + " " + r + " 0 0 " + sweep2 + " " + c + " 0Z";
  }

  function moonGlyph(f, size) {
    var r = size / 2;
    return '<svg class="moon-glyph" viewBox="0 0 ' + size + " " + size + '" width="' + size + '" height="' + size + '" aria-hidden="true">' +
      '<circle cx="' + r + '" cy="' + r + '" r="' + (r - 0.5) + '" fill="none" stroke="currentColor" stroke-opacity=".35"/>' +
      '<path d="' + moonPath(f, r) + '" fill="currentColor"/></svg>';
  }

  var fmtDate = function (d, opts) {
    return d.toLocaleDateString("en-GB", Object.assign({ day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }, opts || {}));
  };
  function isoToDate(iso) { return new Date(iso + "T00:00:00Z"); }
  function jdLabel(iso) { return "JD " + jdFromDate(isoToDate(iso)).toFixed(1); }
  function pad(n, w) { n = String(n); while (n.length < w) n = "0" + n; return n; }
  function vln(id) { return "VLN " + pad(id, 3); }

  /* ------------------------------------------------------------------ */
  /* 2. Ephemeris                                                        */
  /* ------------------------------------------------------------------ */

  function initEphemeris() {
    var nodes = $$("[data-eph]");
    var glyphs = $$("[data-moon-glyph]");
    if (!nodes.length && !glyphs.length) return;

    function tick() {
      var now = new Date();
      var m = moonState(now);
      var days = (m.nextNew - now) / 86400000;
      var values = {
        jd: "JD " + m.jd.toFixed(3),
        moon: m.name + " · " + Math.round(m.illumination * 100) + "% lit",
        "moon-name": m.name,
        "moon-lit": Math.round(m.illumination * 100) + "%",
        "next-new": fmtDate(m.nextNew),
        "next-new-short": fmtDate(m.nextNew, { month: "short" }),
        countdown: days < 1 ? "in " + Math.max(1, Math.round(days * 24)) + " hours" : "in " + Math.floor(days) + " days, " + Math.floor((days % 1) * 24) + " hours",
        mumbai: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST",
        "next-letter": pad(D.letters.length + 1, 2)
      };
      nodes.forEach(function (n) { var v = values[n.dataset.eph]; if (v != null) n.textContent = v; });
      glyphs.forEach(function (g) { g.innerHTML = moonGlyph(m.fraction, +(g.dataset.moonGlyph || 14)); });
    }
    tick();
    setInterval(tick, 20000);
  }

  /* ------------------------------------------------------------------ */
  /* 3. Starfield                                                        */
  /* ------------------------------------------------------------------ */

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function initStarfield() {
    var base = $("#sky-base"), live = $("#sky-live");
    if (!base || !live) return;
    var bctx = base.getContext("2d"), lctx = live.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W, H, twinklers = [], meteor = null, nextMeteor = performance.now() + 6000;

    function draw() {
      W = window.innerWidth; H = window.innerHeight;
      [base, live].forEach(function (c) { c.width = W * dpr; c.height = H * dpr; c.style.width = W + "px"; c.style.height = H + "px"; });
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.clearRect(0, 0, W, H);
      var r = rng(7), n = Math.round((W * H) / 2600);
      twinklers = [];
      for (var i = 0; i < n; i++) {
        var x = r() * W, y = r() * H, m = Math.pow(r(), 3);
        var size = 0.35 + m * 1.3, a = 0.18 + m * 0.6;
        var warm = r() < 0.12, cool = r() < 0.18;
        var col = warm ? "255,196,160" : cool ? "190,210,235" : "243,242,239";
        if (m > 0.55 && twinklers.length < 40) { twinklers.push({ x: x, y: y, s: size + 0.3, a: a, c: col, p: r() * 6.28, v: 0.6 + r() * 1.4 }); continue; }
        bctx.fillStyle = "rgba(" + col + "," + a + ")";
        bctx.beginPath(); bctx.arc(x, y, size, 0, 6.283); bctx.fill();
      }
      // a faint band, like the plane of a galaxy seen edge-on
      var g = bctx.createLinearGradient(0, H * 0.15, W, H * 0.85);
      g.addColorStop(0, "rgba(140,159,179,0)"); g.addColorStop(0.5, "rgba(140,159,179,0.035)"); g.addColorStop(1, "rgba(140,159,179,0)");
      bctx.fillStyle = g; bctx.fillRect(0, 0, W, H);
    }

    function frame(now) {
      lctx.clearRect(0, 0, W, H);
      var t = now / 1000;
      twinklers.forEach(function (s) {
        var a = s.a * (0.55 + 0.45 * Math.sin(t * s.v + s.p));
        lctx.fillStyle = "rgba(" + s.c + "," + a + ")";
        lctx.beginPath(); lctx.arc(s.x, s.y, s.s, 0, 6.283); lctx.fill();
        if (s.s > 1.4) {
          lctx.strokeStyle = "rgba(" + s.c + "," + a * 0.35 + ")";
          lctx.lineWidth = 0.6;
          lctx.beginPath(); lctx.moveTo(s.x - s.s * 4, s.y); lctx.lineTo(s.x + s.s * 4, s.y); lctx.moveTo(s.x, s.y - s.s * 4); lctx.lineTo(s.x, s.y + s.s * 4); lctx.stroke();
        }
      });
      if (!meteor && now > nextMeteor) {
        meteor = { x: Math.random() * W * 0.7 + W * 0.2, y: Math.random() * H * 0.35, vx: -(6 + Math.random() * 5), vy: 2.4 + Math.random() * 2, life: 0 };
      }
      if (meteor) {
        meteor.life++;
        var tail = 18;
        var grad = lctx.createLinearGradient(meteor.x, meteor.y, meteor.x - meteor.vx * tail, meteor.y - meteor.vy * tail);
        var fade = Math.max(0, 1 - meteor.life / 60);
        grad.addColorStop(0, "rgba(255,226,200," + 0.85 * fade + ")");
        grad.addColorStop(1, "rgba(227,90,42,0)");
        lctx.strokeStyle = grad; lctx.lineWidth = 1.2;
        lctx.beginPath(); lctx.moveTo(meteor.x, meteor.y); lctx.lineTo(meteor.x - meteor.vx * tail, meteor.y - meteor.vy * tail); lctx.stroke();
        meteor.x += meteor.vx; meteor.y += meteor.vy;
        if (meteor.life > 60) { meteor = null; nextMeteor = now + 9000 + Math.random() * 14000; }
      }
      if (!document.hidden) requestAnimationFrame(frame);
    }

    draw();
    window.addEventListener("resize", function () { clearTimeout(draw.t); draw.t = setTimeout(draw, 150); });
    if (reduceMotion) {
      twinklers.forEach(function (s) { lctx.fillStyle = "rgba(" + s.c + "," + s.a + ")"; lctx.beginPath(); lctx.arc(s.x, s.y, s.s, 0, 6.283); lctx.fill(); });
      return;
    }
    requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) requestAnimationFrame(frame); });
  }

  /* ------------------------------------------------------------------ */
  /* 4. Generative plates                                                */
  /* ------------------------------------------------------------------ */

  var PALETTES = [
    ["#E35A2A", "#0B5962", "#F6C7A6"], // verve over sea
    ["#C8A24C", "#223D2E", "#F3E3B0"], // gold over forest
    ["#8C9FB3", "#E35A2A", "#E8EEF4"], // sky with an ember limb
    ["#C49B5B", "#0B5962", "#F2DDBA"], // sahara over sea
    ["#E35A2A", "#1B1C22", "#FFD2B0"], // verve over night
    ["#8C9FB3", "#223D2E", "#DCE6EE"]  // sky over forest
  ];
  var KINDS = ["body", "horizon", "eclipse", "binary"];

  var noiseTile = null;
  function getNoise() {
    if (noiseTile) return noiseTile;
    var c = document.createElement("canvas"); c.width = c.height = 160;
    var x = c.getContext("2d"), img = x.createImageData(160, 160);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    noiseTile = c;
    return c;
  }

  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  function plateSpec(seed, kindOverride) {
    var r = rng(seed * 9301 + 49297);
    var kind = kindOverride || KINDS[seed % KINDS.length];
    var pal = PALETTES[(seed * 7 + 3) % PALETTES.length];
    var orbits = [];
    var count = 1 + Math.floor(r() * 3);
    for (var i = 0; i < count; i++) {
      orbits.push({ rx: 0.34 + r() * 0.2 + i * 0.07, ry: 0.07 + r() * 0.12, rot: (r() - 0.5) * 0.9, t: r() * 6.283, speed: (0.05 + r() * 0.08) * (r() < 0.5 ? -1 : 1), signal: i === count - 1 });
    }
    return { r: r, kind: kind, pal: pal, orbits: orbits, phase: 0.18 + r() * 0.64, lightAngle: -0.9 + r() * 1.6, seed: seed };
  }

  // static layer: sky, stars, body
  function drawPlateBase(ctx, W, H, spec) {
    var r = rng(spec.seed * 31 + 7), pal = spec.pal, A = pal[0], B = pal[1], HI = pal[2];
    ctx.fillStyle = "#07080a"; ctx.fillRect(0, 0, W, H);
    var neb = ctx.createRadialGradient(W * (0.2 + r() * 0.6), H * (0.2 + r() * 0.5), 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.9);
    neb.addColorStop(0, hexA(B, 0.35)); neb.addColorStop(0.5, hexA(B, 0.08)); neb.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = neb; ctx.fillRect(0, 0, W, H);
    var stars = Math.round((W * H) / 1400);
    for (var i = 0; i < stars; i++) {
      var m = Math.pow(r(), 4);
      ctx.fillStyle = "rgba(243,242,239," + (0.15 + m * 0.75) + ")";
      ctx.beginPath(); ctx.arc(r() * W, r() * H, 0.3 + m * 1.4, 0, 6.283); ctx.fill();
    }

    var cx = W * 0.5, cy = H * 0.5, R = Math.min(W, H) * 0.3;
    if (spec.kind === "horizon") { cx = W * (0.5 + (r() - 0.5) * 0.2); cy = H * 1.42; R = W * 1.05; }
    if (spec.kind === "binary") { cx = W * 0.42; cy = H * 0.56; R = Math.min(W, H) * 0.24; }
    spec.geo = { cx: cx, cy: cy, R: R };

    if (spec.kind === "eclipse") {
      var cor = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 2.1);
      cor.addColorStop(0, hexA(HI, 0.9)); cor.addColorStop(0.08, hexA(A, 0.7)); cor.addColorStop(0.35, hexA(A, 0.12)); cor.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(cx, cy, R * 2.1, 0, 6.283); ctx.fill();
      ctx.fillStyle = "#050506"; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();
      ctx.strokeStyle = hexA(HI, 0.55); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R + 0.5, 0, 6.283); ctx.stroke();
      grainOver(ctx, W, H, 0.09);
      return;
    }

    // lit sphere: light comes from lightAngle, phase controls how much of the face is lit
    var la = spec.lightAngle, lx = cx + Math.cos(la) * R * 0.75, ly = cy - Math.abs(Math.sin(la)) * R * 0.55 - R * 0.1;
    if (spec.kind === "horizon") { lx = cx + (r() - 0.5) * R * 0.3; ly = cy - R * 0.98; }

    var glow = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.25);
    glow.addColorStop(0, hexA(A, 0.45)); glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, 6.283); ctx.fill();

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.clip();
    var body = ctx.createRadialGradient(lx, ly, R * 0.02, cx, cy, R * 1.05);
    body.addColorStop(0, HI); body.addColorStop(0.22, A); body.addColorStop(0.62, B); body.addColorStop(1, "#040506");
    ctx.fillStyle = body; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    // terminator: a soft shadow from the far side
    var sx = cx - (lx - cx) * (1.1 + spec.phase), sy = cy - (ly - cy) * (1.1 + spec.phase);
    var shade = ctx.createRadialGradient(sx, sy, R * 0.2, sx, sy, R * (1.25 + spec.phase * 0.4));
    shade.addColorStop(0, "rgba(3,4,6,0.96)"); shade.addColorStop(0.7, "rgba(3,4,6,0.55)"); shade.addColorStop(1, "rgba(3,4,6,0)");
    ctx.fillStyle = shade; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    // faint bands
    ctx.globalAlpha = 0.07;
    for (var b = 0; b < 9; b++) {
      ctx.fillStyle = b % 2 ? "#000" : HI;
      ctx.fillRect(cx - R, cy - R + (b / 9) * R * 2 + r() * 6, R * 2, R * 0.05 + r() * R * 0.08);
    }
    ctx.globalAlpha = 1;
    grainOver(ctx, W, H, 0.22);
    ctx.restore();

    if (spec.kind === "horizon") {
      ctx.strokeStyle = hexA(HI, 0.8); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    }

    if (spec.kind === "binary") {
      var c2x = W * 0.74, c2y = H * 0.3, R2 = R * 0.28;
      var g2 = ctx.createRadialGradient(c2x - R2 * 0.3, c2y - R2 * 0.3, 0, c2x, c2y, R2);
      g2.addColorStop(0, "#fff"); g2.addColorStop(0.4, HI); g2.addColorStop(1, hexA(A, 0.2));
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(c2x, c2y, R2, 0, 6.283); ctx.fill();
      ctx.strokeStyle = "rgba(243,242,239,0.28)"; ctx.setLineDash([2, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(c2x, c2y); ctx.stroke(); ctx.setLineDash([]);
    }
    grainOver(ctx, W, H, 0.07);
  }

  function grainOver(ctx, W, H, alpha) {
    var n = getNoise();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = ctx.createPattern(n, "repeat");
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // moving layer: orbits and the bodies travelling on them
  function drawOrbits(ctx, W, H, spec, t) {
    if (spec.kind === "horizon") {
      var gx = spec.geo.cx, gy = spec.geo.cy, GR = spec.geo.R;
      ctx.strokeStyle = "rgba(243,242,239,0.22)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(gx, gy - GR * 0.05, GR * 1.25, GR * 0.5, 0, Math.PI, Math.PI * 2); ctx.stroke();
      var a = Math.PI + ((t * 0.03 + spec.seed * 0.13) % 1) * Math.PI;
      ctx.fillStyle = "#E35A2A";
      ctx.beginPath(); ctx.arc(gx + Math.cos(a) * GR * 1.25, gy - GR * 0.05 + Math.sin(a) * GR * 0.5, 3, 0, 6.283); ctx.fill();
      return;
    }
    var cx = spec.geo.cx, cy = spec.geo.cy, R = spec.geo.R, S = Math.min(W, H);
    spec.orbits.forEach(function (o) {
      var rx = o.rx * S, ry = o.ry * S;
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(o.rot);
      ctx.strokeStyle = "rgba(243,242,239,0.26)"; ctx.lineWidth = 1;
      // back half is hidden behind the body; front half is drawn over it
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI); ctx.stroke();
      var a = o.t + t * o.speed;
      var px = Math.cos(a) * rx, py = Math.sin(a) * ry;
      var behind = Math.sin(a) < 0 && Math.hypot(px, py) < R * 1.02;
      if (!behind) {
        ctx.fillStyle = o.signal ? "#E35A2A" : "#F3F2EF";
        if (o.signal) { ctx.shadowColor = "#E35A2A"; ctx.shadowBlur = 12; }
        ctx.beginPath(); ctx.arc(px, py, o.signal ? 3.2 : 2.2, 0, 6.283); ctx.fill();
      }
      ctx.restore();
    });
  }

  var animated = [];
  function renderPlate(canvas) {
    var seed = +canvas.dataset.plate || 1;
    var rect = canvas.getBoundingClientRect();
    var W = Math.max(40, Math.round(rect.width)), H = Math.max(40, Math.round(rect.height));
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    var spec = plateSpec(seed, canvas.dataset.kind);
    var off = document.createElement("canvas"); off.width = W * dpr; off.height = H * dpr;
    var octx = off.getContext("2d"); octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPlateBase(octx, W, H, spec);
    var ctx = canvas.getContext("2d");
    var state = { canvas: canvas, ctx: ctx, off: off, W: W, H: H, dpr: dpr, spec: spec, visible: true };
    paint(state, performance.now() / 1000);
    if (canvas.hasAttribute("data-animate") && !reduceMotion) animated.push(state);
    canvas.classList.add("is-drawn");
    return state;
  }
  function paint(s, t) {
    s.ctx.setTransform(1, 0, 0, 1, 0, 0);
    s.ctx.drawImage(s.off, 0, 0);
    s.ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    drawOrbits(s.ctx, s.W, s.H, s.spec, t);
  }

  function initPlates(root) {
    var canvases = $$("canvas[data-plate]", root);
    if (!canvases.length) return;
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !e.target.classList.contains("is-drawn")) renderPlate(e.target);
          var st = animated.filter(function (a) { return a.canvas === e.target; })[0];
          if (st) st.visible = e.isIntersecting;
        });
      }, { rootMargin: "200px" });
      canvases.forEach(function (c) { io.observe(c); });
    } else {
      canvases.forEach(renderPlate);
    }
  }
  function animatePlates() {
    if (reduceMotion) return;
    (function loop(now) {
      var t = now / 1000;
      animated.forEach(function (s) { if (s.visible) paint(s, t); });
      requestAnimationFrame(loop);
    })(performance.now());
  }
  window.addEventListener("resize", function () {
    clearTimeout(initPlates.t);
    initPlates.t = setTimeout(function () {
      animated.length = 0;
      $$("canvas[data-plate].is-drawn").forEach(function (c) { c.classList.remove("is-drawn"); renderPlate(c); });
    }, 250);
  });

  /* ------------------------------------------------------------------ */
  /* 5. Listings                                                         */
  /* ------------------------------------------------------------------ */

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  // {word} in a title is set in the script face
  function titleHTML(t) { return esc(t).replace(/\{([^}]+)\}/g, '<span class="script">$1</span>'); }
  function titlePlain(t) { return t.replace(/[{}]/g, ""); }

  function media(e, kind, animate) {
    if (e.image) return '<img src="' + esc(e.image) + '" alt="" loading="lazy">';
    return '<canvas data-plate="' + e.id + '"' + (kind ? ' data-kind="' + kind + '"' : "") + (animate ? " data-animate" : "") + ' aria-hidden="true"></canvas>';
  }

  var tpl = {
    card: function (e) {
      return '<article class="card" data-type="' + e.type + '" data-field="' + esc(e.field) + '">' +
        '<a class="card__link" href="' + e.href + '">' +
        '<div class="card__plate">' + media(e) + '<span class="card__vln">' + vln(e.id) + "</span></div>" +
        '<p class="card__meta"><span>' + (e.type === "interview" ? "Interview" : "Essay") + "</span><span>" + esc(e.field) + "</span><span>" + e.minutes + " min</span></p>" +
        '<h3 class="card__title">' + titleHTML(e.title) + "</h3>" +
        (e.subject ? '<p class="card__subject">' + esc(e.subject) + "</p>" : '<p class="card__subject">' + esc(e.dek) + "</p>") +
        "</a></article>";
    },
    row: function (e) {
      return '<li class="row" data-type="' + e.type + '" data-field="' + esc(e.field) + '">' +
        '<a class="row__link" href="' + e.href + '">' +
        '<span class="row__vln">' + vln(e.id) + "<br><span>Letter " + pad(e.letter, 2) + "</span></span>" +
        '<span class="row__plate">' + media(e) + "</span>" +
        '<span class="row__main"><span class="row__title">' + titleHTML(e.title) + '</span><span class="row__subject">' + esc(e.subject || e.dek) + "</span></span>" +
        '<span class="row__field">' + esc(e.field) + "</span>" +
        '<span class="row__time">' + e.minutes + " min<br><span>" + fmtDate(isoToDate(e.date), { month: "short" }) + "</span></span>" +
        "</a></li>";
    },
    poster: function (e) {
      return '<article class="poster" data-type="' + e.type + '" data-field="' + esc(e.field) + '">' +
        '<a class="poster__link" href="' + e.href + '">' +
        '<div class="poster__plate">' + media(e, "horizon") + "</div>" +
        '<div class="poster__text"><p class="poster__vln">' + vln(e.id) + " · Letter " + pad(e.letter, 2) + "</p>" +
        '<h3 class="poster__title">' + titleHTML(e.title) + '</h3><p class="poster__dek">' + esc(e.dek) + "</p>" +
        '<p class="poster__time">' + e.minutes + " min read · " + fmtDate(isoToDate(e.date)) + "</p></div></a></article>";
    },
    next: function (e) {
      return '<a class="next" href="' + e.href + '"><span class="next__plate">' + media(e) + "</span>" +
        '<span class="next__text"><span class="next__meta">' + vln(e.id) + " · " + (e.type === "interview" ? "Interview" : "Essay") + "</span>" +
        '<span class="next__title">' + titleHTML(e.title) + "</span></span></a>";
    }
  };

  function initListings() {
    $$("[data-list]").forEach(function (host) {
      var kind = host.dataset.list;            // card | row | poster | next
      var type = host.dataset.type;            // interview | essay
      var limit = +host.dataset.limit || 999;
      var skip = (host.dataset.skip || "").split(",").map(Number);
      var items = D.entries.filter(function (e) { return (!type || e.type === type) && skip.indexOf(e.id) < 0; }).slice(0, limit);
      host.innerHTML = items.map(tpl[kind]).join("");
    });
    $$("[data-count]").forEach(function (n) {
      var t = n.dataset.count;
      n.textContent = D.entries.filter(function (e) { return !t || e.type === t; }).length;
    });
  }

  /* ------------------------------------------------------------------ */
  /* 6. Page furniture                                                   */
  /* ------------------------------------------------------------------ */

  function initMenu() {
    var btn = $(".menu-btn"), panel = $("#menu");
    if (!btn || !panel) return;
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
      document.documentElement.classList.toggle("menu-open", !open);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") btn.click();
    });
  }

  function initHeader() {
    var h = $(".masthead");
    if (!h) return;
    var update = function () { h.classList.toggle("is-scrolled", window.scrollY > 24); };
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function initFilters() {
    $$("[data-filters]").forEach(function (bar) {
      var target = $(bar.dataset.filters);
      if (!target) return;
      bar.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-filter]");
        if (!b) return;
        $$("button", bar).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        var key = b.dataset.key || "field", val = b.dataset.filter;
        var shown = 0;
        $$("[data-" + key + "]", target).forEach(function (item) {
          var on = val === "all" || item.dataset[key] === val;
          item.hidden = !on;
          if (on) shown++;
        });
        var out = $("[data-filter-count]", bar.parentNode);
        if (out) out.textContent = shown;
      });
    });
  }

  function initReadingOrbit() {
    var orbit = $(".reading-orbit"), article = $("[data-reading]");
    if (!orbit || !article) return;
    var arc = $(".reading-orbit__arc", orbit), dot = $(".reading-orbit__dot", orbit), label = $(".reading-orbit__pct", orbit);
    var C = 2 * Math.PI * 22;
    arc.style.strokeDasharray = C;
    function update() {
      var r = article.getBoundingClientRect();
      var total = r.height - window.innerHeight * 0.6;
      var p = Math.min(1, Math.max(0, -r.top / Math.max(total, 1)));
      arc.style.strokeDashoffset = C * (1 - p);
      var a = -Math.PI / 2 + p * Math.PI * 2;
      dot.setAttribute("cx", 28 + Math.cos(a) * 22);
      dot.setAttribute("cy", 28 + Math.sin(a) * 22);
      label.textContent = Math.round(p * 100) + "%";
      orbit.classList.toggle("is-on", r.top < 0 && p < 1);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    orbit.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); });
  }

  function initSide() {
    var btn = $("[data-side-toggle]");
    if (!btn) return;
    var root = document.documentElement;
    var saved = null;
    try { saved = localStorage.getItem("vlnc-side"); } catch (e) { /* storage unavailable */ }
    if (saved === "day" || saved === "night") root.dataset.side = saved;
    function label() {
      var day = root.dataset.side === "day";
      btn.setAttribute("aria-pressed", String(day));
      $("[data-side-label]", btn).textContent = day ? "Day side" : "Night side";
    }
    label();
    btn.addEventListener("click", function () {
      root.dataset.side = root.dataset.side === "day" ? "night" : "day";
      try { localStorage.setItem("vlnc-side", root.dataset.side); } catch (e) { /* storage unavailable */ }
      label();
    });
  }

  function initQuestions() {
    var host = $("[data-question]");
    if (!host || !D.questions.length) return;
    var text = $(".q__text", host), num = $(".q__num", host), btn = $(".q__draw", host);
    var order = D.questions.map(function (_, i) { return i; });
    var i = 0;
    function show(idx, animate) {
      if (animate && !reduceMotion) {
        text.classList.remove("is-arriving"); void text.offsetWidth; text.classList.add("is-arriving");
      }
      text.textContent = D.questions[order[idx]];
      num.textContent = pad(order[idx] + 1, 2) + " / " + pad(D.questions.length, 2);
    }
    // a different question each day the page is opened
    i = Math.floor(Date.now() / 86400000) % order.length;
    show(i, false);
    btn.addEventListener("click", function () {
      i = (i + 1 + Math.floor(Math.random() * (order.length - 1))) % order.length;
      show(i, true);
    });
  }

  function initLetterForm() {
    $$("form[data-letter]").forEach(function (f) {
      var out = $(".letter__status", f);
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = $("input[type=email]", f);
        if (!input.value || !input.checkValidity()) {
          out.textContent = "That address looks incomplete. Check it and try again.";
          input.focus();
          return;
        }
        out.textContent = "Noted. Subscriptions open with the first public letter, on the next new moon.";
        f.classList.add("is-sent");
      });
    });
  }

  function initCopy() {
    $$("[data-copy]").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = b.dataset.copy, label = b.textContent;
        var done = function (t) { b.textContent = t; setTimeout(function () { b.textContent = label; }, 1800); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(function () { done("Copied"); }, function () { done("Select it above"); });
        else done("Select it above");
      });
    });
  }

  /* Catalogue: a star chart of everything published */
  function initChart() {
    var host = $("#chart");
    if (!host) return;
    var fields = [];
    D.entries.forEach(function (e) { if (fields.indexOf(e.field) < 0) fields.push(e.field); });
    fields.sort();
    var W = 1000, H = 520, L = 120, R = 40, T = 40, B = 60;
    var x = function (iso) { var d = isoToDate(iso); var start = Date.UTC(2026, 0, 1), end = Date.UTC(2026, 11, 31); return L + ((d - start) / (end - start)) * (W - L - R); };
    var y = function (f) { return T + ((fields.indexOf(f) + 0.5) / fields.length) * (H - T - B); };
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-labelledby="chart-t chart-d"><title id="chart-t">Star chart of published pieces</title><desc id="chart-d">Each piece is plotted by publication date across 2026 and by field. Larger stars are longer reads. Filled stars are interviews; open rings are essays.</desc>';
    // grid
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    months.forEach(function (m, i) {
      var gx = x("2026-" + pad(i + 1, 2) + "-01");
      svg += '<line class="ch-grid" x1="' + gx + '" y1="' + T + '" x2="' + gx + '" y2="' + (H - B) + '"/><text class="ch-tick" x="' + (gx + 4) + '" y="' + (H - B + 22) + '">' + m + "</text>";
    });
    fields.forEach(function (f) {
      var gy = y(f);
      svg += '<line class="ch-grid ch-grid--h" x1="' + L + '" y1="' + gy + '" x2="' + (W - R) + '" y2="' + gy + '"/><text class="ch-field" x="' + (L - 14) + '" y="' + (gy + 4) + '" text-anchor="end">' + esc(f) + "</text>";
    });
    // new moons as letters
    D.letters.forEach(function (l) {
      var lx = x(l.date);
      svg += '<circle class="ch-letter" cx="' + lx + '" cy="' + (T - 14) + '" r="4"/><text class="ch-tick" x="' + lx + '" y="' + (T - 24) + '" text-anchor="middle">' + pad(l.n, 2) + "</text>";
    });
    // the path the journal has travelled, joining pieces in order
    var ordered = D.entries.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id; });
    svg += '<polyline class="ch-path" points="' + ordered.map(function (e) { return x(e.date) + "," + y(e.field); }).join(" ") + '"/>';
    ordered.forEach(function (e) {
      var r = 3 + e.minutes * 0.42, cx = x(e.date), cy = y(e.field);
      svg += '<a href="' + e.href + '" class="ch-star" data-id="' + e.id + '"><title>' + vln(e.id) + " · " + esc(titlePlain(e.title)) + "</title>" +
        (e.type === "interview"
          ? '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" class="ch-dot"/><path class="ch-spike" d="M' + (cx - r * 2) + " " + cy + "H" + (cx + r * 2) + "M" + cx + " " + (cy - r * 2) + "V" + (cy + r * 2) + '"/>'
          : '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" class="ch-ring"/>') +
        '<text class="ch-label" x="' + (cx + r + 6) + '" y="' + (cy - r - 4) + '">' + vln(e.id) + "</text></a>";
    });
    svg += "</svg>";
    host.innerHTML = svg;

    var tip = $("#chart-tip");
    $$(".ch-star", host).forEach(function (s) {
      var e = D.entries.filter(function (x) { return x.id === +s.dataset.id; })[0];
      function show() {
        tip.innerHTML = '<span class="tip__vln">' + vln(e.id) + " · " + (e.type === "interview" ? "Interview" : "Essay") + " · " + esc(e.field) + '</span><span class="tip__title">' + titleHTML(e.title) + '</span><span class="tip__meta">' + fmtDate(isoToDate(e.date)) + " · " + jdLabel(e.date) + " · " + e.minutes + " min</span>";
        tip.hidden = false;
      }
      s.addEventListener("mouseenter", show);
      s.addEventListener("focus", show);
    });
    host.addEventListener("mouseleave", function () { tip.hidden = true; });
  }

  function initTable() {
    var body = $("#catalogue-body");
    if (!body) return;
    var rows = D.entries.slice().sort(function (a, b) { return b.id - a.id; });
    body.innerHTML = rows.map(function (e) {
      return '<tr data-search="' + esc((vln(e.id) + " " + titlePlain(e.title) + " " + e.type + " " + e.field + " " + e.subject + " " + e.dek).toLowerCase()) + '">' +
        "<td>" + vln(e.id) + '</td><td><a href="' + e.href + '">' + titleHTML(e.title) + "</a></td><td>" + (e.type === "interview" ? "Interview" : "Essay") + "</td><td>" + esc(e.field) + "</td><td>" + pad(e.letter, 2) +
        "</td><td>" + fmtDate(isoToDate(e.date), { month: "short" }) + "</td><td>" + jdLabel(e.date).replace("JD ", "") + "</td><td>" + e.minutes + " min</td></tr>";
    }).join("");
    var input = $("#catalogue-search"), count = $("#catalogue-count");
    function filter() {
      var q = input.value.trim().toLowerCase(), n = 0;
      $$("tr", body).forEach(function (tr) { var on = !q || tr.dataset.search.indexOf(q) > -1; tr.hidden = !on; if (on) n++; });
      count.textContent = n === 1 ? "1 body" : n + " bodies";
    }
    input.addEventListener("input", filter);
    filter();
  }

  /* Page-level image slots: a photograph replaces the plate when one is set in data.js */
  function initImageSlots() {
    $$("[data-image-slot]").forEach(function (slot) {
      var src = D.images && D.images[slot.dataset.imageSlot];
      if (!src) return;
      var img = new Image();
      img.alt = slot.dataset.alt || "";
      img.className = "slot-img";
      img.onload = function () { slot.classList.add("has-image"); slot.appendChild(img); };
      img.src = src;
    });
  }

  /* Agency page: the capability stack lights the layer you point at, and cycles until you do */
  function initStack() {
    var buttons = $$(".sys"), planes = $$(".stack__plane");
    if (!buttons.length) return;
    var auto = null, idx = 0;
    function activate(layer) {
      planes.forEach(function (p) { p.classList.toggle("is-active", p.dataset.layer === layer); });
      buttons.forEach(function (b) { b.classList.toggle("is-active", b.dataset.layer === layer); });
    }
    function stop() { if (auto) { clearInterval(auto); auto = null; } }
    buttons.forEach(function (b) {
      ["mouseenter", "focus", "click"].forEach(function (ev) { b.addEventListener(ev, function () { stop(); activate(b.dataset.layer); }); });
    });
    activate(buttons[0].dataset.layer);
    if (!reduceMotion) auto = setInterval(function () { idx = (idx + 1) % buttons.length; activate(buttons[idx].dataset.layer); }, 2400);
  }

  /* Agency page: pointing at a charge brings its sphere forward */
  function initCharges() {
    var orbit = $(".orbit");
    if (!orbit) return;
    $$(".charges li").forEach(function (li) {
      li.addEventListener("mouseenter", function () { orbit.dataset.active = li.dataset.orb; });
      li.addEventListener("mouseleave", function () { delete orbit.dataset.active; });
    });
  }

  /* Agency hero: the audience word cycles through the rooms VALENCE works in */
  function initRotator() {
    var r = $(".rotator");
    if (!r || reduceMotion) return;
    var words = r.dataset.words.split("|"), word = $(".rotator__word", r), i = 0;
    setInterval(function () {
      if (document.hidden) return;
      i = (i + 1) % words.length;
      word.classList.remove("is-arriving"); void word.offsetWidth;
      word.textContent = words[i];
      word.classList.add("is-arriving");
    }, 2200);
  }

  /* Elements stamped with today's ephemeris data or entry metadata */
  function initStamps() {
    $$("[data-jd]").forEach(function (n) { n.textContent = jdLabel(n.dataset.jd); });
  }

  window.VLNC = { moonState: moonState, moonGlyph: moonGlyph, jdFromDate: jdFromDate, rng: rng, renderPlate: renderPlate };

  initListings();
  initStarfield();
  initEphemeris();
  initPlates();
  animatePlates();
  initMenu();
  initHeader();
  initFilters();
  initReadingOrbit();
  initSide();
  initQuestions();
  initLetterForm();
  initCopy();
  initChart();
  initTable();
  initImageSlots();
  initStamps();
  initStack();
  initCharges();
  initRotator();
})();
