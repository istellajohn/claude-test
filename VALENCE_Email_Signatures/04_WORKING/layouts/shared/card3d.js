// VALENCE signature card: renders a real 3D scene from the brand vectors (three.js, MIT).
// Each card HTML sets window.CFG (scene) and holds the overlay text; this module draws the scene
// into <canvas id="scene"> and sets window.READY = true when the frame is final.
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const C = window.CFG;
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(C.w, C.h, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = C.exposure ?? 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.bg);
if (C.fog) scene.fog = new THREE.Fog(C.bg, C.fog[0], C.fog[1]);
const pmrem = new THREE.PMREMGenerator(renderer);
function studio(panels) {
  // dark photo studio: emissive softboxes the gloss can reflect
  const env = new THREE.Scene();
  env.background = new THREE.Color('#000000');
  panels.forEach((p) => {
    let map = null;
    if (p.gradient) { // vertical falloff, like a photographer's strip softbox
      const c = document.createElement('canvas'); c.width = 4; c.height = 256;
      const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#5a5a5a'); gr.addColorStop(1, '#000000');
      g.fillStyle = gr; g.fillRect(0, 0, 4, 256); map = new THREE.CanvasTexture(c);
    }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(p.size[0], p.size[1]),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color).multiplyScalar(p.intensity), map, side: THREE.DoubleSide }));
    m.position.set(...p.pos); m.lookAt(0, p.lookY ?? 0.5, 0); env.add(m);
  });
  return env;
}
scene.environment = pmrem.fromScene(C.studio ? studio(C.studio) : new RoomEnvironment(renderer), 0.02).texture;

function material(m) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(m.color), roughness: m.roughness ?? 0.5, metalness: m.metalness ?? 0,
    clearcoat: m.clearcoat ?? 0, clearcoatRoughness: m.clearcoatRoughness ?? 0.1,
    envMapIntensity: m.env ?? 1, sheen: m.sheen ?? 0, sheenRoughness: 0.8,
    sheenColor: new THREE.Color(m.sheenColor ?? '#ffffff'),
  });
  return mat;
}

function extruded(o) {
  const data = new SVGLoader().parse(C.svgs[o.svg]);
  const shapes = [];
  data.paths.forEach((p) => SVGLoader.createShapes(p).forEach((s) => shapes.push(s)));
  const g = new THREE.ExtrudeGeometry(shapes, {
    depth: o.depth, bevelEnabled: true, bevelThickness: o.bt, bevelSize: o.bs,
    bevelSegments: 6, curveSegments: 28,
  });
  g.scale(o.scale, o.scale, o.scale);
  g.rotateX(Math.PI); // SVG y-down to world y-up, without mirroring
  g.center();
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, material(o.mat));
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.position.set(...o.pos); mesh.rotation.set(...o.rot);
  return mesh;
}

C.objects.forEach((o) => {
  if (o.kind === 'svg') scene.add(extruded(o));
  if (o.kind === 'torus') {
    const m = new THREE.Mesh(new THREE.TorusGeometry(o.r, o.tube, 48, 220), material(o.mat));
    m.position.set(...o.pos); m.rotation.set(...o.rot); m.castShadow = true; scene.add(m);
  }
  if (o.kind === 'sphere') {
    const m = new THREE.Mesh(new THREE.SphereGeometry(o.r, 64, 48), material(o.mat));
    m.position.set(...o.pos); m.castShadow = true; scene.add(m);
  }
});

const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60),
  C.ground.shadowOnly ? new THREE.ShadowMaterial({ opacity: C.ground.opacity ?? 0.5, color: new THREE.Color(C.ground.shadowColor ?? '#000000') }) : material(C.ground));
ground.rotation.x = -Math.PI / 2; ground.position.y = C.ground.y ?? 0; ground.receiveShadow = true;
scene.add(ground);

C.lights.forEach((l) => {
  let light;
  if (l.type === 'dir') {
    light = new THREE.DirectionalLight(l.color, l.intensity);
    if (l.shadow) {
      light.castShadow = true; light.shadow.mapSize.set(4096, 4096);
      const s = light.shadow.camera; s.left = -4; s.right = 4; s.top = 4; s.bottom = -4; s.near = 0.1; s.far = 30;
      light.shadow.radius = l.softness ?? 6; light.shadow.bias = -0.0004; light.shadow.normalBias = 0.01;
    }
  } else if (l.type === 'point') {
    light = new THREE.PointLight(l.color, l.intensity, l.distance ?? 0, 2);
  } else if (l.type === 'hemi') {
    light = new THREE.HemisphereLight(l.color, l.ground ?? '#000000', l.intensity);
  }
  light.position.set(...(l.pos ?? [0, 5, 0]));
  scene.add(light);
});

const cam = new THREE.PerspectiveCamera(C.camera.fov, C.w / C.h, 0.05, 100);
cam.position.set(...C.camera.pos);
cam.lookAt(...C.camera.look);

await document.fonts.ready;
renderer.render(scene, cam);
window.READY = true;
