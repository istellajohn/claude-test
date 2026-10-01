/* VALENCE Journal · home hero
   A charged body in WebGL. It opens in eclipse, lit from behind so only its rim burns, then the
   light swings round to the side: old light arriving. Three electron shells orbit it; the
   outermost carries the single valence electron in verve, the only one that forms bonds. */

(function () {
  "use strict";
  var hero = document.querySelector(".hero");
  var canvas = document.getElementById("hero-gl");
  if (!hero || !canvas || typeof THREE === "undefined") return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // "orbit": the journal's body beside the headline. "horizon": the agency's planet rising under the mark.
  var horizon = hero.dataset.hero === "horizon";
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) { return; }
  hero.classList.add("has-gl");
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  var world = new THREE.Group();
  scene.add(world);

  /* the body */
  var uniforms = {
    uLight: { value: new THREE.Vector3(0, 0, -1) },
    uTime: { value: 0 },
    cLit: { value: new THREE.Color("#ffd6b8") },
    cHot: { value: new THREE.Color("#e35a2a") },
    cMid: { value: new THREE.Color("#0b5962") },
    cDark: { value: new THREE.Color("#030406") },
    cRim: { value: new THREE.Color("#e35a2a") }
  };
  var bodyMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: [
      "varying vec3 vN; varying vec3 vW; varying vec2 vUv;",
      "void main(){",
      "  vUv = uv;",
      "  vec4 w = modelMatrix * vec4(position, 1.0);",
      "  vW = w.xyz;",
      "  vN = normalize(mat3(modelMatrix) * normal);",
      "  gl_Position = projectionMatrix * viewMatrix * w;",
      "}"
    ].join("\n"),
    fragmentShader: [
      "uniform vec3 uLight; uniform float uTime;",
      "uniform vec3 cLit; uniform vec3 cHot; uniform vec3 cMid; uniform vec3 cDark; uniform vec3 cRim;",
      "varying vec3 vN; varying vec3 vW; varying vec2 vUv;",
      "float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }",
      "void main(){",
      "  vec3 n = normalize(vN);",
      "  vec3 L = normalize(uLight);",
      "  vec3 V = normalize(cameraPosition - vW);",
      "  float d = dot(n, L);",
      "  vec3 col = mix(cDark, cMid, smoothstep(-0.25, 0.3, d));",
      "  col = mix(col, cHot, smoothstep(0.15, 0.7, d));",
      "  col = mix(col, cLit, smoothstep(0.6, 1.0, d));",
      "  float bands = sin(vUv.y * 38.0 + sin(vUv.x * 6.2831 + uTime * 0.04) * 1.6);",
      "  col *= 0.93 + 0.07 * bands;",
      "  float fres = pow(1.0 - max(dot(n, V), 0.0), 2.6);",
      "  float backlit = smoothstep(-0.2, 0.9, dot(-V, L));",
      "  col += cRim * fres * (0.25 + 1.6 * backlit) * smoothstep(-0.6, 0.3, d + backlit);",
      "  col += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.09;",
      "  gl_FragColor = vec4(col, 1.0);",
      "}"
    ].join("\n")
  });
  var R = 1.25;
  var body = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), bodyMat);
  body.rotation.z = 0.32;
  world.add(body);

  /* halo */
  function radial(stops) {
    var c = document.createElement("canvas"); c.width = c.height = 256;
    var g = c.getContext("2d"), grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(function (s) { grd.addColorStop(s[0], s[1]); });
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }
  var haloTex = radial([[0, "rgba(255,255,255,0)"], [0.42, "rgba(255,255,255,0)"], [0.48, "rgba(255,255,255,0.9)"], [0.56, "rgba(255,255,255,0.25)"], [1, "rgba(255,255,255,0)"]]);
  var halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: 0xe35a2a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(R * 4.2, R * 4.2, 1);
  halo.position.z = -0.4;
  world.add(halo);

  /* electron shells */
  var dotTex = radial([[0, "rgba(255,255,255,1)"], [0.2, "rgba(255,255,255,0.8)"], [1, "rgba(255,255,255,0)"]]);
  var shells = [
    { a: 1.95, b: 1.95, tilt: [1.2, 0.2, 0.3], speed: 0.42, n: 2, color: 0xf3f2ef, opacity: 0.2 },
    { a: 2.6, b: 2.6, tilt: [1.35, -0.45, -0.2], speed: -0.28, n: 2, color: 0xf3f2ef, opacity: 0.16 },
    { a: 3.4, b: 3.4, tilt: [1.05, 0.55, 0.15], speed: 0.16, n: 1, color: 0xe35a2a, opacity: 0.38, valence: true }
  ].map(function (s) {
    var g = new THREE.Group();
    g.rotation.set(s.tilt[0], s.tilt[1], s.tilt[2]);
    var pts = new THREE.EllipseCurve(0, 0, s.a, s.b, 0, Math.PI * 2).getPoints(220);
    var line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: s.color, transparent: true, opacity: s.opacity }));
    g.add(line);
    s.electrons = [];
    for (var i = 0; i < s.n; i++) {
      var e = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: s.valence ? 0xff7a45 : 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      var size = s.valence ? 0.42 : 0.2;
      e.scale.set(size, size, 1);
      e.userData.offset = (i / s.n) * Math.PI * 2;
      g.add(e);
      s.electrons.push(e);
    }
    s.group = g;
    world.add(g);
    return s;
  });

  /* state */
  if (horizon) {
    shells[0].group.visible = false;
    shells[1].group.visible = false;
    shells[2].group.rotation.set(1.42, 0.05, 0.1);
  }

  var mouse = { x: 0, y: 0, tx: 0, ty: 0 }, scroll = 0, visible = true, running = false, baseY = 0;
  var t0 = performance.now();

  function layout() {
    var w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    var wide = w > 860;
    if (horizon) {
      var halfH = 13 * Math.tan((camera.fov / 2) * Math.PI / 180);
      var s = wide ? 2.5 : 1.55;
      world.scale.setScalar(s);
      baseY = -halfH - R * s + halfH * (wide ? 0.4 : 0.42);
      world.position.set(0, baseY, 0);
      camera.position.set(0, 0, 13);
      return;
    }
    world.position.set(wide ? 2.3 : 0, wide ? 0.25 : 1.9, 0);
    world.scale.setScalar(wide ? 1 : 0.62);
    camera.position.set(0, 0, wide ? 13 : 14);
  }

  function ease(x) { return 1 - Math.pow(1 - x, 3); }

  function frame(now) {
    var t = (now - t0) / 1000;
    var intro = reduceMotion ? 1 : Math.min(t / 4.5, 1);
    var e = ease(intro);
    uniforms.uTime.value = t;

    if (horizon) {
      // the planet rises into frame while its upper limb catches the light, like dawn seen from orbit
      var th2 = Math.PI - e * (Math.PI - 2.05) + (reduceMotion ? 0 : Math.sin(t * 0.06) * 0.08);
      uniforms.uLight.value.set(Math.sin(th2) * 0.45, 0.85, Math.cos(th2)).normalize();
      world.position.y = baseY - (1 - e) * 2.2 - scroll * 1.2;
    } else {
      // light swings from behind the body (eclipse) to the upper side (dawn)
      var th = Math.PI - e * (Math.PI - 1.05) + (reduceMotion ? 0 : Math.sin(t * 0.07) * 0.1) - scroll * 0.5;
      uniforms.uLight.value.set(Math.sin(th), 0.42 + scroll * 0.2, Math.cos(th)).normalize();
    }
    halo.material.opacity = 0.95 - e * 0.65;
    halo.scale.setScalar(R * (4.2 - e * 0.5));

    body.rotation.y = t * 0.045;
    shells.forEach(function (s) {
      s.electrons.forEach(function (el) {
        var a = el.userData.offset + t * s.speed;
        el.position.set(Math.cos(a) * s.a, Math.sin(a) * s.b, 0);
      });
    });
    shells[2].electrons[0].material.opacity = 0.75 + 0.25 * Math.sin(t * 3.1);

    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;
    if (horizon) {
      world.rotation.y = mouse.x * 0.08;
      world.rotation.x = -mouse.y * 0.04;
      camera.lookAt(0, 0, 0);
    } else {
      world.rotation.y = mouse.x * 0.18;
      world.rotation.x = -mouse.y * 0.12 + scroll * 0.3;
      camera.position.y = scroll * -1.2;
      camera.lookAt(0, scroll * -1.2, 0);
    }

    renderer.render(scene, camera);
    if (reduceMotion || !visible) { running = false; return; }
    requestAnimationFrame(frame);
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }

  layout();
  kick();
  window.addEventListener("resize", function () { layout(); kick(); });
  window.addEventListener("scroll", function () {
    scroll = Math.min(Math.max(window.scrollY / (hero.offsetHeight || 1), 0), 1);
    if (reduceMotion) kick();
  }, { passive: true });
  if (window.matchMedia("(pointer: fine)").matches && !reduceMotion) {
    window.addEventListener("pointermove", function (ev) {
      mouse.tx = (ev.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (ev.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) kick(); }).observe(hero);
  }
  document.addEventListener("visibilitychange", function () { visible = !document.hidden; if (visible) kick(); });
})();
