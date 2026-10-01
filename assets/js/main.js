/* VALENCE · landing page behaviour
   1. Hero: a matte monolith split by a seam of light (WebGL, three.js r149)
   2. Perception stack, orbit and stage interactions
   3. Small utilities: top bar state, frame tilt, copy email */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ------------------------------------------------------------------ */
  /* 1. Hero monolith                                                    */
  /* ------------------------------------------------------------------ */

  function initHero() {
    var canvas = document.getElementById("gl");
    var hero = document.querySelector(".hero");
    if (!canvas || !hero || typeof THREE === "undefined") return;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance" });
    } catch (e) {
      return; // fallback photograph stays visible
    }
    hero.classList.add("has-gl");

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x07090b, 1);

    var scene = new THREE.Scene();
    var FOG = new THREE.Color(0x1a2026);
    scene.fog = new THREE.FogExp2(FOG, 0.055);

    var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);

    // Sky: cold blue-grey overhead, a warm bruise of light low on the horizon behind the slab
    var skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color(0x10151b) },
        mid: { value: new THREE.Color(0x1a2026) },
        warm: { value: new THREE.Color(0x5a2c18) },
        warmDir: { value: new THREE.Vector3(0.35, 0.0, -1.0).normalize() }
      },
      vertexShader:
        "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader:
        "uniform vec3 top; uniform vec3 mid; uniform vec3 warm; uniform vec3 warmDir; varying vec3 vDir;" +
        "void main(){ float h = clamp(vDir.y, -0.2, 1.0);" +
        " vec3 col = mix(mid, top, smoothstep(0.0, 0.55, h));" +
        " float w = pow(max(dot(normalize(vec3(vDir.x,0.0,vDir.z)), warmDir), 0.0), 6.0) * (1.0 - smoothstep(0.0, 0.35, h));" +
        " w *= smoothstep(-0.01, 0.09, h);" +
        " col += warm * w * 0.9;" +
        " gl_FragColor = vec4(col, 1.0); }"
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), skyMat));

    // Ground: matte, almost absorbent
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshStandardMaterial({ color: 0x0f0f10, roughness: 0.94, metalness: 0.04 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // The monolith, in two halves
    var group = new THREE.Group();
    scene.add(group);

    var slabMat = new THREE.MeshStandardMaterial({ color: 0x0e0e0f, roughness: 0.86, metalness: 0.1 });
    var W = 1.55, H = 7.6, D = 1.2;
    var slabGeo = new THREE.BoxGeometry(W, H, D);
    var left = new THREE.Mesh(slabGeo, slabMat);
    var right = new THREE.Mesh(slabGeo, slabMat);
    left.position.y = right.position.y = H / 2;
    group.add(left, right);

    // The seam: what the thing carries before anyone explains it
    var seam = new THREE.Mesh(
      new THREE.PlaneGeometry(1, H * 0.985),
      new THREE.MeshBasicMaterial({ color: 0xffa070, fog: false })
    );
    seam.position.set(0, H / 2, 0.2);
    group.add(seam);

    function radialTexture(stops) {
      var c = document.createElement("canvas");
      c.width = c.height = 256;
      var g = c.getContext("2d");
      var grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      stops.forEach(function (s) { grd.addColorStop(s[0], s[1]); });
      g.fillStyle = grd;
      g.fillRect(0, 0, 256, 256);
      var t = new THREE.CanvasTexture(c);
      t.encoding = THREE.sRGBEncoding;
      return t;
    }
    var glowTex = radialTexture([
      [0, "rgba(255,255,255,1)"],
      [0.25, "rgba(255,255,255,0.45)"],
      [1, "rgba(255,255,255,0)"]
    ]);

    var glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xe35a2a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false
    }));
    glow.position.set(0, H * 0.5, 0.9);
    group.add(glow);

    var spill = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: glowTex, color: 0xe35a2a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55
      })
    );
    spill.rotation.x = -Math.PI / 2;
    spill.position.set(0, 0.01, 2.2);
    spill.scale.set(3.5, 7, 1);
    group.add(spill);

    // Light
    scene.add(new THREE.AmbientLight(0x2a3644, 0.55));
    var rim = new THREE.DirectionalLight(0x9fb2c8, 0.55);
    rim.position.set(-8, 10, -6);
    scene.add(rim);
    var key = new THREE.DirectionalLight(0x6b7480, 0.25);
    key.position.set(6, 4, 10);
    scene.add(key);
    var ember = new THREE.PointLight(0xff6a2a, 2.4, 9, 2);
    ember.position.set(0, 0.5, 0.9);
    group.add(ember);

    // Dust in the air, caught by the light
    var COUNT = window.innerWidth < 720 ? 260 : 620;
    var pos = new Float32Array(COUNT * 3);
    var vel = new Float32Array(COUNT);
    for (var i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = Math.random() * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14 + 2;
      vel[i] = 0.002 + Math.random() * 0.006;
    }
    var dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    var dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: 0xe8ddd0, size: 0.035, transparent: true, opacity: 0.45, depthWrite: false, sizeAttenuation: true
    }));
    scene.add(dust);

    // State
    var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    var scroll = 0;
    var start = performance.now();
    var visible = true;
    var running = false;

    function layout() {
      var w = hero.clientWidth, h = hero.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // keep the slab clear of the type: right of frame on wide screens, centred behind on phones
      group.position.x = w > 900 ? 3.4 : w > 600 ? 2.6 : 2.9;
      group.rotation.y = w > 900 ? -0.28 : -0.18;
    }

    function setGap(g) {
      left.position.x = -(W / 2 + g / 2);
      right.position.x = W / 2 + g / 2;
      seam.scale.x = Math.max(g * 0.9, 0.01);
    }

    function frame(now) {
      var t = (now - start) / 1000;
      var intro = reduceMotion ? 1 : Math.min(t / 4.2, 1);
      var ease = 1 - Math.pow(1 - intro, 3);

      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;

      // the seam opens as you scroll into the page: from a hairline to a doorway
      var open = 0.05 + scroll * 0.55 + ease * 0.05;
      setGap(open);

      var flicker = reduceMotion ? 1 : 0.92 + Math.sin(t * 1.7) * 0.04 + Math.sin(t * 7.3) * 0.02;
      var charge = (0.55 + ease * 0.45 + scroll * 0.6) * flicker;
      ember.intensity = 2.4 * charge;
      glow.material.opacity = 0.75 * charge;
      glow.scale.set(1.6 + open * 4, 9 + scroll * 3, 1);
      spill.material.opacity = 0.5 * charge;
      spill.scale.set(2.6 + open * 6, 6.5, 1);

      var camZ = 26 - ease * 6 - scroll * 3.5;
      camera.position.set(mouse.x * 0.9, 1.7 + mouse.y * 0.45 + scroll * 0.6, camZ);
      camera.lookAt(group.position.x * 0.42, 3.1 - scroll * 0.4, 0);

      if (!reduceMotion) {
        var p = dustGeo.attributes.position.array;
        for (var i = 0; i < COUNT; i++) {
          p[i * 3 + 1] += vel[i];
          p[i * 3] += Math.sin(t * 0.3 + i) * 0.0015;
          if (p[i * 3 + 1] > 10) p[i * 3 + 1] = 0;
        }
        dustGeo.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);

      if (reduceMotion || !visible) { running = false; return; }
      requestAnimationFrame(frame);
    }

    function kick() {
      if (!running) { running = true; requestAnimationFrame(frame); }
    }

    layout();
    kick();

    window.addEventListener("resize", function () { layout(); if (reduceMotion) kick(); });
    window.addEventListener("scroll", function () {
      var h = hero.offsetHeight || 1;
      scroll = Math.min(Math.max(window.scrollY / h, 0), 1);
      if (reduceMotion) kick();
    }, { passive: true });
    if (finePointer && !reduceMotion) {
      window.addEventListener("pointermove", function (e) {
        mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
      }, { passive: true });
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting && !document.hidden;
        if (visible) kick();
      }).observe(hero);
    }
    document.addEventListener("visibilitychange", function () {
      visible = !document.hidden;
      if (visible) kick();
    });
  }

  /* ------------------------------------------------------------------ */
  /* 2. Systems stack, orbit, stages                                     */
  /* ------------------------------------------------------------------ */

  function initStack() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll(".sys"));
    var planes = document.querySelectorAll(".stack__plane");
    if (!buttons.length) return;
    var auto = null;
    var idx = 0;

    function activate(layer) {
      planes.forEach(function (p) { p.classList.toggle("is-active", p.dataset.layer === layer); });
      buttons.forEach(function (b) { b.classList.toggle("is-active", b.dataset.layer === layer); });
    }
    function stopAuto() { if (auto) { clearInterval(auto); auto = null; } }

    buttons.forEach(function (b) {
      ["mouseenter", "focus", "click"].forEach(function (ev) {
        b.addEventListener(ev, function () { stopAuto(); activate(b.dataset.layer); });
      });
    });

    activate(buttons[0].dataset.layer);
    if (!reduceMotion) {
      auto = setInterval(function () {
        idx = (idx + 1) % buttons.length;
        activate(buttons[idx].dataset.layer);
      }, 2400);
    }
  }

  function initOrbit() {
    var orbit = document.querySelector(".orbit");
    if (!orbit) return;
    document.querySelectorAll(".charges li").forEach(function (li) {
      li.addEventListener("mouseenter", function () { orbit.dataset.active = li.dataset.orb; });
      li.addEventListener("mouseleave", function () { delete orbit.dataset.active; });
    });
  }

  function initStages() {
    var list = document.querySelector(".stages");
    if (!list || !("IntersectionObserver" in window) || reduceMotion) {
      if (list) list.querySelectorAll(".stage").forEach(function (s) { s.classList.add("is-lit"); });
      return;
    }
    var stages = list.querySelectorAll(".stage");
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      // authority accumulates: each stage stays lit once reached
      stages.forEach(function (s, i) { setTimeout(function () { s.classList.add("is-lit"); }, 350 + i * 420); });
    }, { threshold: 0.4 });
    io.observe(list);
  }

  /* ------------------------------------------------------------------ */
  /* 3. Utilities                                                        */
  /* ------------------------------------------------------------------ */

  function initTopbar() {
    var bar = document.querySelector(".topbar");
    if (!bar) return;
    function update() { bar.classList.toggle("is-scrolled", window.scrollY > 40); }
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function initTilt() {
    if (!finePointer || reduceMotion) return;
    document.querySelectorAll(".tilt").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = "perspective(900px) rotateY(" + (x * 6).toFixed(2) + "deg) rotateX(" + (-y * 6).toFixed(2) + "deg)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  function initCopy() {
    var btn = document.getElementById("copy-mail");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var email = btn.dataset.email;
      function done(label) {
        btn.textContent = label;
        setTimeout(function () { btn.textContent = "Copy"; }, 1800);
      }
      function fallback() {
        var addr = document.querySelector(".mail__addr");
        var range = document.createRange();
        range.selectNodeContents(addr);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        done("Selected");
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(function () { done("Copied"); }, fallback);
      } else {
        fallback();
      }
    });
  }

  initHero();
  initStack();
  initOrbit();
  initStages();
  initTopbar();
  initTilt();
  initCopy();
})();
