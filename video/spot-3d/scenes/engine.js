// Motore dello spot 3D Tecnolambro: rendering fotogramma per fotogramma, tempo deterministico.
// Geometria = quella del configuratore del sito (part3d.bundle.js, da src/lib/part3d.ts): twistabile
// corrugata, seamless, curva, twist, disassato, flange con i fori. Nessun modello scaricato.
// Ogni fotogramma accumula N campioni: antialias, profondità di campo (lente sottile) e motion blur
// a 180° solo dove la scena lo chiede. HDR lineare -> AgX -> sRGB. I testi sono HTML sopra il canvas.
import * as THREE from "three";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { buildPart, defaultSpec } from "./part3d.bundle.js";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const easeIO = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a, b, k) => a + (b - a) * k;
function halton(i, b) { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }

let CFG, renderer, scene, camera, pmrem, sampleRT, accumRT, accumScene, finalScene, quadCam, W, H;
let key, rim, fill, floor, world;
const parts = new Map();
const MATS = {};

/* ------------------------------------------------------------------ materiali */

function makeMaterials() {
  const brass = CFG.palette.brass;
  MATS.brass = new THREE.MeshPhysicalMaterial({ color: brass, metalness: 1, roughness: 0.3, clearcoat: 0.15, clearcoatRoughness: 0.4, side: THREE.DoubleSide, clippingPlanes: [] });
  MATS.flange = new THREE.MeshPhysicalMaterial({ color: "#b8913f", metalness: 1, roughness: 0.34, side: THREE.DoubleSide, clippingPlanes: [] });
  MATS.jacket = new THREE.MeshPhysicalMaterial({ color: "#23262b", metalness: 0, roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.55, side: THREE.DoubleSide });
  MATS.steel = new THREE.MeshPhysicalMaterial({ color: "#c3c8cd", metalness: 1, roughness: 0.32 });
  MATS.field = new THREE.MeshBasicMaterial({ color: new THREE.Color(CFG.palette.rim).multiplyScalar(2.4), toneMapped: true });
  MATS.fieldNeg = new THREE.MeshBasicMaterial({ color: new THREE.Color("#b8c6d2").multiplyScalar(1.1), toneMapped: true });
}

/** Materiali da studio al posto di quelli del sito (ottone PBR metalness 1, roughness 0,25–0,35). */
function restyle(group) {
  group.traverse((o) => {
    if (!o.isMesh) return;
    const n = o.material.name;
    o.material = n === "Rivestimento" ? MATS.jacket : o.name?.startsWith("Flangia") ? MATS.flange : MATS.brass;
    o.castShadow = true;
    o.receiveShadow = true;
  });
}

/* ------------------------------------------------------------------ pezzi */

/**
 * Pezzo del configuratore riportato in coordinate "dritte": inizio nell'origine, asse lungo +X,
 * lato largo (a) lungo Z, lato stretto (b) lungo Y. Le geometrie hanno le matrici incorporate,
 * così si possono deformare (torsione, piega) come un unico corpo.
 */
function part(key, specFn) {
  if (parts.has(key)) return parts.get(key);
  const spec = specFn();
  const info = buildPart(spec);
  const f = info.ends[0];
  const basis = new THREE.Matrix4().makeBasis(f.t.clone(), f.v.clone(), f.u.clone()).setPosition(f.p.clone());
  const inv = basis.clone().invert();
  const meshes = [];
  info.group.updateMatrixWorld(true);
  info.group.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const m = new THREE.Mesh(g, o.material);
    m.name = o.name;
    meshes.push(m);
  });
  const group = new THREE.Group();
  meshes.forEach((m) => group.add(m));
  restyle(group);
  const box = new THREE.Box3().setFromObject(group);
  const p = { key, spec, info, group, meshes, box, len: info.total, base: meshes.map((m) => m.geometry.attributes.position.array.slice()), lastDeform: null };
  group.visible = false;
  world.add(group);
  parts.set(key, p);
  return p;
}

/** Torsione (rad) e piega (rad) lungo l'asse X della lunghezza L: la guida si torce e si curva da sola. */
function deform(p, twist, bend) {
  const keyNow = `${twist.toFixed(4)}:${bend.toFixed(4)}`;
  if (p.lastDeform === keyNow) return;
  p.lastDeform = keyNow;
  const L = p.len;
  p.meshes.forEach((m, mi) => {
    const src = p.base[mi];
    const pos = m.geometry.attributes.position;
    const dst = pos.array;
    for (let i = 0; i < src.length; i += 3) {
      const d = src[i], y0 = src[i + 1], z0 = src[i + 2];
      const s = clamp(d / L, -0.05, 1.05);
      const a = twist * s;
      const y = y0 * Math.cos(a) - z0 * Math.sin(a);
      const z = y0 * Math.sin(a) + z0 * Math.cos(a);
      if (Math.abs(bend) < 1e-4) {
        dst[i] = d; dst[i + 1] = y; dst[i + 2] = z;
      } else {
        const R = L / bend;
        const phi = d / R;
        dst[i] = (R - y) * Math.sin(phi);
        dst[i + 1] = R - (R - y) * Math.cos(phi);
        dst[i + 2] = z;
      }
    }
    pos.needsUpdate = true;
    m.geometry.computeVertexNormals();
  });
}

/** Mostra la geometria del corpo fino alla frazione k del percorso (la curva che "si costruisce"). */
function grow(p, k) {
  const RING = 16 * 6; // indici per tratto: 4 × (3 + 1) punti per anello, 2 triangoli per lato
  p.meshes.forEach((m) => {
    if (m.name.startsWith("Flangia")) return;
    const n = m.geometry.index.count;
    m.geometry.setDrawRange(0, Math.round((n / RING) * k) * RING);
  });
}

/** Viti delle flange, ricavate dalla stessa regola dei fori del configuratore. */
function screws(p, which = "Flangia 2") {
  if (p.screws) return p.screws;
  const s = p.info.size;
  const big = Math.max(s.outerW, s.outerH);
  const w = Math.max(big * 1.6 + 10, s.outerW + 16);
  const h = Math.max(s.outerH * 1.9 + 12, w * 0.82);
  const r = Math.max(1.6, w * 0.045);
  const fl = p.meshes.find((m) => m.name === which);
  fl.geometry.computeBoundingBox();
  const end = fl.geometry.boundingBox.max.x;
  const list = [];
  for (const [sy, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
    const g = new THREE.Group();
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.82, r * 0.82, s.flangeT * 3.2, 20), MATS.steel);
    shank.rotation.z = Math.PI / 2;
    shank.position.x = -s.flangeT * 1.1;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.75, r * 1.75, r * 1.2, 6), MATS.steel);
    head.rotation.z = Math.PI / 2;
    head.position.x = r * 0.6;
    for (const m of [shank, head]) { m.castShadow = true; g.add(m); }
    // posizione sul piano della flangia: lato stretto lungo Y, lato largo lungo Z (come le coordinate dritte)
    g.userData.home = V(end, sy * (h / 2 - r * 2.6), sz * (w / 2 - r * 2.6));
    g.position.copy(g.userData.home);
    p.group.add(g);
    list.push(g);
  }
  p.screws = { list, fl, end };
  return p.screws;
}

/* ------------------------------------------------------------------ campo TE10 */

let field;
function te10Field() {
  if (field) return field;
  const p = part("te10", () => ({ ...defaultSpec("twist", "WR-284"), rotation: 0, length: 330 }));
  const a = p.info.size.s.a, b = p.info.size.s.b;
  const NX = 26, NZ = 7;
  const shaft = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 1, 1.4), MATS.field, NX * NZ);
  const head = new THREE.InstancedMesh(new THREE.ConeGeometry(2.4, 4.5, 14), MATS.field, NX * NZ);
  const shaftN = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 1, 1.4), MATS.fieldNeg, NX * NZ);
  const headN = new THREE.InstancedMesh(new THREE.ConeGeometry(2.4, 4.5, 14), MATS.fieldNeg, NX * NZ);
  for (const m of [shaft, head, shaftN, headN]) { m.frustumCulled = false; p.group.add(m); }
  // metà anteriore tagliata via: materiali propri con un piano di taglio
  const plane = new THREE.Plane(V(0, 0, -1), 0);
  p.meshes.forEach((m) => {
    m.material = m.material.clone();
    m.material.clippingPlanes = [plane];
    m.material.clipShadows = true;
  });
  p.noReset = true;
  field = { p, a, b, NX, NZ, shaft, head, shaftN, headN, plane };
  return field;
}

function updateField(t) {
  const { p, a, b, NX, NZ, shaft, head, shaftN, headN } = field;
  const L = p.len;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = V(), pos = V();
  const up = new THREE.Quaternion(), down = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI);
  let ip = 0, ineg = 0;
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < NX; i++) {
    const x = 18 + ((L - 36) * i) / (NX - 1);
    for (let j = 0; j < NZ; j++) {
      const zz = (j + 0.5) / NZ; // 0..1 sul lato largo
      const z = -a / 2 + zz * a;
      const E = Math.sin(Math.PI * zz) * Math.cos((2 * Math.PI * x) / 150 - t * 2 * Math.PI / 1.2);
      const len = Math.abs(E) * b * 0.86;
      const target = E >= 0 ? [shaft, head] : [shaftN, headN];
      const idx = E >= 0 ? ip++ : ineg++;
      if (len < 1.2) { target[0].setMatrixAt(idx, hide); target[1].setMatrixAt(idx, hide); continue; }
      const dir = E >= 0 ? 1 : -1;
      // freccia centrata sull'asse della guida, tra le due pareti larghe
      pos.set(x, -dir * 2.25, z);
      m.compose(pos, up, sc.set(1, Math.max(0.01, len - 4.5), 1));
      target[0].setMatrixAt(idx, m);
      pos.set(x, dir * (len / 2 - 2.25), z);
      m.compose(pos, dir > 0 ? up : down, sc.set(1, 1, 1));
      target[1].setMatrixAt(idx, m);
    }
  }
  for (const [mesh, n] of [[shaft, ip], [head, ip], [shaftN, ineg], [headN, ineg]]) {
    for (let k = n; k < NX * NZ; k++) mesh.setMatrixAt(k, hide);
    mesh.instanceMatrix.needsUpdate = true;
  }
}

/* ------------------------------------------------------------------ messa in scena */

function bgTexture() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 512;
  const g = c.getContext("2d");
  const [inner, outer] = CFG.palette.background;
  const gr = g.createRadialGradient(256, 210, 10, 256, 256, 420);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export async function setup({ width, height, config }) {
  CFG = config; W = width; H = height;
  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;
  document.getElementById("stage").appendChild(renderer.domElement);
  RectAreaLightUniformsLib.init();
  makeMaterials();
  pmrem = new THREE.PMREMGenerator(renderer);
  const hdr = await new HDRLoader().loadAsync("/video/spot-3d/assets/studio.hdr");
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene = new THREE.Scene();
  scene.background = bgTexture();
  scene.environment = pmrem.fromEquirectangular(hdr).texture;
  hdr.dispose();
  camera = new THREE.PerspectiveCamera(30, W / H, 1, 20000);
  world = new THREE.Group();
  scene.add(world);

  floor = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), new THREE.MeshStandardMaterial({ color: "#0b0c0e", roughness: 0.55, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  key = new THREE.SpotLight(CFG.palette.key, 0, 0, Math.PI / 5, 0.8, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0003;
  key.shadow.radius = 8;
  scene.add(key, key.target);
  rim = new THREE.RectAreaLight(CFG.palette.rim, 0, 300, 600);
  scene.add(rim);
  fill = new THREE.DirectionalLight("#9fb4c8", 0);
  scene.add(fill, fill.target);

  const rtOpts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, samples: 0 };
  sampleRT = new THREE.WebGLRenderTarget(W, H, rtOpts);
  accumRT = new THREE.WebGLRenderTarget(W, H, rtOpts);
  quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = (mat) => { const s = new THREE.Scene(); s.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)); return s; };
  accumScene = quad(new THREE.ShaderMaterial({
    uniforms: { tex: { value: sampleRT.texture }, w: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }",
    fragmentShader: "uniform sampler2D tex; uniform float w; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tex, vUv) * w; }",
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor, depthTest: false, depthWrite: false, toneMapped: false,
  }));
  finalScene = quad(new THREE.ShaderMaterial({
    uniforms: { tex: { value: accumRT.texture } },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }",
    fragmentShader: `uniform sampler2D tex; varying vec2 vUv;
      void main(){ gl_FragColor = vec4(texture2D(tex, vUv).rgb, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    blending: THREE.NoBlending, depthTest: false, depthWrite: false, toneMapped: true,
  }));

  // pezzi usati dalle scene (costruiti una volta)
  part("flex", () => ({ ...defaultSpec("twistable", "WR-90"), length: 600 }));
  part("flexLoop", () => ({ ...defaultSpec("twistable", "WR-112"), length: 600 }));
  part("seam", () => ({ ...defaultSpec("seamless", "WR-90"), length: 500 }));
  part("straight", () => ({ ...defaultSpec("twist", "WR-112"), rotation: 0, length: 120 }));
  part("bendE", () => ({ ...defaultSpec("bend", "WR-90"), plane: "E", leg1: 90, leg2: 90 }));
  part("bendH", () => ({ ...defaultSpec("bend", "WR-90"), plane: "H", leg1: 90, leg2: 90 }));
  part("twist90", () => ({ ...defaultSpec("twist", "WR-90"), length: 140 }));
  part("offset", () => ({ ...defaultSpec("offset", "WR-90"), offset: 30, length: 170 }));
  part("row1", () => ({ ...defaultSpec("twistable", "WR-284"), length: 300 }));
  part("row2", () => ({ ...defaultSpec("seamless", "WR-187"), length: 260 }));
  part("row3", () => ({ ...defaultSpec("bend", "WR-112"), leg1: 80, leg2: 80 }));
  part("row4", () => ({ ...defaultSpec("twist", "WR-62"), length: 110 }));
  part("row5", () => ({ ...defaultSpec("offset", "WR-22"), offset: 10, length: 70 }));
  te10Field();
  screws(parts.get("straight"));
  return true;
}

/* ------------------------------------------------------------------ inquadrature */

/** Campo orizzontale in gradi -> fov verticale (in 9:16 il pezzo resta largo uguale, con più aria sopra). */
const vfov = (hfov) => (2 * Math.atan(Math.tan((hfov * Math.PI) / 360) / (W / H)) * 180) / Math.PI;
const portrait = () => H > W;

function show(...keys) { for (const [k, p] of parts) p.group.visible = keys.includes(k); }
function place(k, pos, rot = [0, 0, 0]) {
  const p = parts.get(k);
  p.group.position.set(...pos);
  p.group.rotation.set(...rot);
  return p;
}
function reset(k) {
  const p = parts.get(k);
  deform(p, 0, 0);
  grow(p, 1);
  p.meshes.forEach((m) => { m.visible = true; m.scale.setScalar(1); m.position.set(0, 0, 0); });
  p.screws?.list.forEach((sc) => { sc.position.copy(sc.userData.home); sc.rotation.set(0, 0, 0); });
}
/** Sfera che contiene il pezzo nelle sue coordinate (non cambia quando ruota): inquadrature stabili. */
function sphereOf(k) {
  const p = parts.get(k);
  if (!p.sphere || p.sphereKey !== p.lastDeform) {
    const box = new THREE.Box3();
    p.meshes.forEach((m) => { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox); });
    p.sphere = box.getBoundingSphere(new THREE.Sphere());
    p.sphereKey = p.lastDeform;
  }
  p.group.updateMatrixWorld(true);
  return { c: p.group.localToWorld(p.sphere.center.clone()), R: p.sphere.radius };
}

/**
 * Inquadratura automatica: il pezzo occupa `fill` della larghezza del fotogramma, visto da azimut/elevazione,
 * con il centro nella posizione (x, y) dello schermo (0..1): in 9:16 sotto la fascia del titolo,
 * in 16:9 a destra del titolo, che sta in basso a sinistra.
 */
function frame(k, { az = 0.6, el = 0.3, fill = 0.8, hfov = 26, aperture = 0.02, x, y, R: Rover } = {}) {
  const { c, R: R0 } = sphereOf(k);
  const R = Rover ?? R0;
  const dir = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
  const th = Math.tan((hfov * Math.PI) / 360);
  const dist = R / (fill * th);
  const pos = c.clone().addScaledVector(dir, dist);
  const right = V(0, 1, 0).cross(dir).normalize();
  const up = dir.clone().cross(right).normalize();
  const sx = x ?? (portrait() ? 0.5 : 0.6);
  const sy = y ?? (portrait() ? 0.64 : 0.46);
  const tv = th * (H / W);
  const target = c.clone().addScaledVector(right, (0.5 - sx) * 2 * dist * th).addScaledVector(up, (sy - 0.5) * 2 * dist * tv);
  return { cam: { pos: pos.toArray(), target: target.toArray(), hfov, aperture: R * aperture, focus: c.toArray() }, c, R };
}

/** Luci da studio attorno al soggetto: chiave calda in alto a sinistra, controluce nel blu del logo, riempimento freddo. */
const lights = (c, R, o = {}) => ({
  key: { pos: c.clone().add(V(-1.3, 1.8, 1.4).multiplyScalar(R * 2.6)).toArray(), target: c.toArray(), intensity: 7, ...o.key },
  rim: { pos: c.clone().add(V(1.1, 0.7, -1.7).multiplyScalar(R * 2.4)).toArray(), target: c.toArray(), intensity: 9, w: R * 2.2, h: R * 3.6, ...o.rim },
  fill: { pos: c.clone().add(V(2, 1, 2)).toArray(), target: c.toArray(), intensity: 0.35, ...o.fill },
  floor: false,
  env: o.env ?? 0.5,
  exposure: o.exposure ?? 1,
});

/**
 * Le scene: (t locale in secondi, durata) -> stato. cam.hfov = campo orizzontale; aperture = raggio
 * della lente sottile in mm (profondità di campo); blur = motion blur a 180° (solo movimenti veloci).
 */
const SHOTS = {
  // 1. macro della corrugazione che scorre, luce radente
  macro(t, dur) {
    show("flex"); reset("flex");
    place("flex", [-300, 0, 0]);
    const x = lerp(-120, 40, ease(t / dur));
    const c = V(x + 30, 0, 0);
    return {
      cam: { pos: [x, 34, 46], target: [x + 30, 0, 0], hfov: portrait() ? 34 : 30, aperture: 1.6, focus: [x + 22, 12, 12] },
      ...lights(c, 60, { key: { pos: [x + 40, 80, -160], target: [x + 30, 0, 0], intensity: 6 }, rim: { pos: [x + 200, 190, 120], target: [x, 0, 0], intensity: 7, w: 200, h: 400 }, env: 0.32 }),
    };
  },
  // 2. la twistabile si torce e si piega da sola nello spazio
  flexBend(t, dur) {
    show("flex");
    const p = parts.get("flex"); grow(p, 1);
    const k = easeIO(t / dur);
    deform(p, lerp(0, Math.PI * 0.55, k), lerp(0.15, Math.PI * 0.62, k));
    place("flex", [0, 0, 0], [0, lerp(0.25, -0.15, k), 0]);
    const f = frame("flex", { az: lerp(0.55, 0.2, k), el: 0.22, fill: portrait() ? 0.98 : 0.6, hfov: 28, aperture: 0.012 });
    return { ...f, ...lights(f.c, f.R) };
  },
  // 3. la flangia si svita, si allontana e torna con le viti
  flange(t, dur) {
    show("straight"); reset("straight");
    const p = place("straight", [0, 0, 0], [0, 0, 0]);
    const { list, fl } = screws(p);
    const e = t < dur / 2 ? easeIO(t / (dur / 2)) : easeIO(1 - (t - dur / 2) / (dur / 2));
    fl.position.x = e * 34;
    list.forEach((s, i) => {
      s.position.copy(s.userData.home).add(V(e * (70 + i * 6), 0, 0));
      s.rotation.x = e * Math.PI * 3 * (i % 2 ? 1 : -1);
    });
    const f = frame("straight", { az: 1.05, el: 0.28, fill: portrait() ? 0.82 : 0.55, hfov: 24, aperture: 0.02, R: sphereOf("straight").R * 1.25 });
    return { ...f, blur: true, ...lights(f.c, f.R, { rim: { intensity: 11 } }) };
  },
  // 4. una curva E si costruisce lungo il percorso
  bendBuild(t, dur) {
    show("bendE");
    const p = parts.get("bendE"); deform(p, 0, 0);
    p.meshes.forEach((m) => m.position.set(0, 0, 0));
    grow(p, easeIO(clamp(t / (dur * 0.8))));
    const fl2 = p.meshes.find((m) => m.name === "Flangia 2");
    fl2.visible = t > dur * 0.78;
    fl2.scale.setScalar(fl2.visible ? lerp(0.6, 1, ease((t - dur * 0.78) / (dur * 0.12))) : 1);
    place("bendE", [0, 0, 0], [0, 0.6, 0]);
    const f = frame("bendE", { az: lerp(0.75, 1.0, t / dur), el: 0.3, fill: portrait() ? 0.86 : 0.55, hfov: 26 });
    return { ...f, ...lights(f.c, f.R) };
  },
  // 5. twist a 90° che ruota lentamente, poi un disassato
  twistOffset(t, dur) {
    const first = t < dur / 2;
    const k = first ? "twist90" : "offset";
    show(k); reset(k);
    const lt = first ? t : t - dur / 2;
    const p = parts.get(k);
    place(k, [0, 0, 0], [0, 0.4 + lt * 0.55, 0]);
    const { c } = sphereOf(k);
    p.group.position.sub(c);
    const f = frame(k, { az: 0.15, el: 0.24, fill: portrait() ? 0.9 : 0.55, hfov: 26 });
    return { ...f, ...lights(f.c, f.R, { rim: { intensity: 12 } }) };
  },
  // 6. carrellata sulla fila delle famiglie, dalla misura più grande alla più piccola: la camera passa
  //    da un pezzo all'altro e si avvicina man mano che le misure si rimpiccioliscono
  row(t, dur) {
    const keys = ["row1", "row2", "row3", "row4", "row5"];
    show(...keys);
    keys.forEach((k) => reset(k));
    const xs = [0, 470, 820, 1060, 1210];
    keys.forEach((k, i) => {
      const p = parts.get(k);
      place(k, [xs[i] - p.len / 2, p.info.size.outerH / 2 + (i === 2 ? 30 : 0), 0], [0, -0.35, 0]);
    });
    const u = easeIO(t / dur) * (keys.length - 1);
    const i = Math.min(keys.length - 2, Math.floor(u));
    const f = u - i;
    const opts = { az: 0.42, el: 0.2, fill: portrait() ? 0.78 : 0.42, hfov: 30, aperture: 0.018 };
    const A = frame(keys[i], opts);
    const B = frame(keys[i + 1], opts);
    const mix = (x, y) => x.map((v, j) => lerp(v, y[j], ease(f)));
    const c = A.c.clone().lerp(B.c, ease(f));
    const R = lerp(A.R, B.R, ease(f));
    return {
      cam: { pos: mix(A.cam.pos, B.cam.pos), target: mix(A.cam.target, B.cam.target), hfov: 30, aperture: lerp(A.cam.aperture, B.cam.aperture, f), focus: c.toArray() },
      blur: true,
      ...lights(c, R),
    };
  },
  // 7. raffica di 6 dettagli da mezzo beat (fori, ondulazione, sezione…)
  burst(t) {
    // con il motion blur il tempo può uscire di poco dalla scena: indice sempre valido
    const i = Math.max(0, Math.min(5, Math.floor(t / 0.3)));
    const s = Math.max(0, Math.min(1, (t - i * 0.3) / 0.3));
    const set = [
      () => { show("straight"); reset("straight"); place("straight", [0, 0, 0]);
        return frame("straight", { az: lerp(1.25, 1.35, s), el: 0.35, fill: 2.2, hfov: 22, aperture: 0.015 }); },
      () => { show("flex"); reset("flex"); place("flex", [-300, 0, 0], [0, 0.3, 0]);
        return { cam: { pos: [lerp(-60, -30, s), 26, 60], target: [0, 2, -10], hfov: 22, aperture: 1.2, focus: [-10, 10, 10] }, c: V(0, 0, 0), R: 60 }; },
      () => { show("straight"); reset("straight"); place("straight", [0, 0, 0]);
        return frame("straight", { az: lerp(-1.35, -1.25, s), el: 0.12, fill: 1.6, hfov: 24, aperture: 0.015 }); },
      () => { show("seam"); reset("seam"); place("seam", [-250, 0, 0], [0, -0.2, 0]);
        return { cam: { pos: [lerp(-40, -10, s), 50, 90], target: [20, 0, 0], hfov: 26, aperture: 1.2, focus: [10, 5, 20] }, c: V(10, 5, 20), R: 70 }; },
      () => { show("bendE"); reset("bendE"); place("bendE", [0, 0, 0], [0, 0.6, 0]);
        return frame("bendE", { az: lerp(0.2, 0.3, s), el: 0.5, fill: 1.5, hfov: 24 }); },
      () => { show("twist90"); reset("twist90"); place("twist90", [0, 0, 0], [0, lerp(0.2, 0.5, s), 0]);
        return frame("twist90", { az: 0.5, el: 0.3, fill: 1.4, hfov: 26 }); },
    ];
    const st = set[i]();
    return { cam: st.cam, blur: true, ...lights(st.c, st.R, { env: 0.6 }) };
  },
  // 8. la sezione del tubo con l'onda TE10 dentro (come nell'intro del sito)
  te10(t, dur) {
    show("te10");
    const p = parts.get("te10"); deform(p, 0, 0); grow(p, 1);
    place("te10", [0, 0, 0], [0, 0, 0]);
    p.group.updateMatrixWorld(true);
    field.plane.set(V(0, 0, -1), 0).applyMatrix4(p.group.matrixWorld);
    updateField(t);
    const k = ease(t / dur);
    const f = frame("te10", { az: lerp(0.5, 0.2, k), el: 0.42, fill: portrait() ? 1.05 : 0.62, hfov: 26, aperture: 0.01 });
    return { ...f, ...lights(f.c, f.R, { key: { intensity: 4.5 }, rim: { intensity: 7 }, env: 0.42, exposure: 0.95 }) };
  },
  // 9. configuratore stilizzato: le opzioni cambiano e il pezzo cambia forma (un beat ciascuna)
  configurator(t) {
    const seq = ["flex", "bendE", "bendH", "twist90"];
    const i = Math.max(0, Math.min(seq.length - 1, Math.floor(t / 0.6)));
    const k = seq[i];
    show(k); reset(k);
    const p = parts.get(k);
    place(k, [0, 0, 0], [0, 0.5 + t * 0.25, 0]);
    const { c } = sphereOf(k);
    p.group.position.sub(c);
    const f = frame(k, { az: 0.25, el: 0.28, fill: portrait() ? 0.62 : 0.36, hfov: 26, x: portrait() ? 0.5 : 0.36, y: portrait() ? 0.52 : 0.45, R: k === "flex" ? 230 : undefined });
    return { ...f, ui: i, ...lights(f.c, f.R) };
  },
  // 10. logo vero che si forma dalla scia (HTML), fondo scuro
  logo() {
    show();
    return { cam: { pos: [0, 200, 600], target: [0, 0, 0], hfov: 40 }, ...lights(V(), 100, { key: { intensity: 0 }, rim: { intensity: 0 }, env: 0 }) };
  },
  // loop di 8 s senza testi: la twistabile ruota e si torce e torna al punto di partenza
  loop(t, dur) {
    show("flexLoop");
    const p = parts.get("flexLoop"); grow(p, 1);
    const ph = (t / dur) * Math.PI * 2;
    deform(p, Math.sin(ph) * Math.PI * 0.45, 0.9 + Math.sin(ph + Math.PI / 2) * 0.35);
    place("flexLoop", [0, 0, 0], [0, ph, 0]);
    p.group.position.sub(sphereOf("flexLoop").c);
    const f = frame("flexLoop", { az: 0.3, el: 0.2, fill: 0.62, hfov: 28, x: 0.5, y: 0.5, R: 330, aperture: 0.01 });
    return { ...f, ...lights(f.c, f.R) };
  },
};

/* ------------------------------------------------------------------ fotogramma */

function apply(st) {
  camera.fov = vfov(st.cam.hfov);
  camera.aspect = W / H;
  camera.position.set(...st.cam.pos);
  camera.up.set(0, 1, 0);
  camera.lookAt(V(...st.cam.target));
  camera.updateProjectionMatrix();
  const L = (light, cfg) => {
    light.intensity = cfg.intensity ?? 0;
    light.position.set(...cfg.pos);
    if (light.isRectAreaLight) {
      light.lookAt(V(...(cfg.target ?? [0, 0, 0])));
      if (cfg.w) { light.width = cfg.w; light.height = cfg.h; }
    }
    else if (light.target) { light.target.position.set(...(cfg.target ?? [0, 0, 0])); light.target.updateMatrixWorld(); }
  };
  L(key, st.key);
  L(rim, st.rim);
  L(fill, st.fill);
  floor.visible = st.floor;
  scene.environmentIntensity = st.env;
  renderer.toneMappingExposure = st.exposure;
}

/** Un fotogramma: shot, t locale, durata della scena. Restituisce lo stato per i livelli HTML. */
export function renderFrame({ shot, t, dur, samples, fps = 30 }) {
  const def = SHOTS[shot];
  if (!def) throw new Error("scena sconosciuta " + shot);
  const base = def(t, dur);
  const N = samples ?? CFG.samples ?? 10;
  renderer.setRenderTarget(accumRT);
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  for (let i = 0; i < N; i++) {
    // motion blur a 180° solo dove la scena lo chiede; altrimenti tutti i campioni allo stesso istante
    const ts = base.blur ? t + ((i + 0.5) / N - 0.5) * (0.5 / fps) : t;
    const st = base.blur ? def(ts, dur) : base;
    apply(st);
    camera.setViewOffset(W, H, halton(i + 1, 5) - 0.5, halton(i + 1, 7) - 0.5, W, H);
    const ap = st.cam.aperture ?? 0;
    if (ap > 0) {
      const r = Math.sqrt(halton(i + 1, 2)) * ap, th = halton(i + 1, 3) * Math.PI * 2;
      const rx = Math.cos(th) * r, ry = Math.sin(th) * r;
      camera.updateMatrixWorld();
      const right = V().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = V().setFromMatrixColumn(camera.matrixWorld, 1);
      const fwd = V().setFromMatrixColumn(camera.matrixWorld, 2).negate();
      const d = Math.max(1, V(...(st.cam.focus ?? st.cam.target)).sub(camera.position).dot(fwd));
      camera.position.addScaledVector(right, rx).addScaledVector(up, ry);
      const e = camera.projectionMatrix.elements;
      e[8] -= (e[0] * rx) / d;
      e[9] -= (e[5] * ry) / d;
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    }
    camera.updateMatrixWorld();
    renderer.setRenderTarget(sampleRT);
    renderer.clear();
    renderer.render(scene, camera);
    camera.clearViewOffset();
    accumScene.children[0].material.uniforms.w.value = 1 / N;
    renderer.setRenderTarget(accumRT);
    renderer.autoClear = false;
    renderer.render(accumScene, quadCam);
    renderer.autoClear = true;
  }
  renderer.setRenderTarget(null);
  renderer.render(finalScene, quadCam);
  return { ui: base.ui ?? null };
}

window.ENGINE = { setup, renderFrame };
window.ENGINE_READY = true;
