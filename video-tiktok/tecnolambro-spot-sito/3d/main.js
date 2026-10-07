// Motore di render della stanza buia: accumulo di N campioni per fotogramma (antialias, profondità
// di campo con apertura della lente, motion blur a 180°). HDR lineare -> AgX -> sRGB.
// Stesso metodo di limitless-v3/video-tiktok/spot-smartphone/3d/main.js, scena nuova:
// tavolo scuro che riflette, laptop, luce laterale nella tinta del blu del logo, polvere nell'aria.
import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { buildLaptop, LAP } from "./laptop.js";
import { SHOTS } from "./shots.js";

const V = (a) => new THREE.Vector3(...a);
let renderer, scene, camera, lap, mirror, table, pmrem, sampleRT, accumRT, accumScene, finalScene, quadCam;
let key, rim, screenLight, fill, dust, dustBase, W, H;
const texCache = new Map();

function halton(i, b) { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }

async function screenTexture(url) {
  if (texCache.has(url)) return texCache.get(url);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("img " + url)); i.src = url; });
  const t = new THREE.Texture(img);
  t.colorSpace = THREE.NoColorSpace; // lo shader converte da sRGB
  t.anisotropy = 16;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  texCache.set(url, t);
  if (texCache.size > 6) { const k = texCache.keys().next().value; texCache.get(k).dispose(); texCache.delete(k); }
  return t;
}

function dustTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.3)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** Venatura leggera del tavolo scuro (rovere tinto quasi nero). */
function tableTextures() {
  const w = 2048, h = 2048;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = "#121315"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    const y = Math.random() * h, a = 0.02 + Math.random() * 0.05;
    g.strokeStyle = Math.random() < 0.5 ? `rgba(255,255,255,${a * 0.5})` : `rgba(0,0,0,${a * 2})`;
    g.lineWidth = 1 + Math.random() * 3;
    g.beginPath();
    for (let x = 0; x <= w; x += 32) {
      const yy = y + Math.sin(x * 0.002 + i) * 18 + Math.sin(x * 0.011 + i * 3) * 4;
      x === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy);
    }
    g.stroke();
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);
  map.anisotropy = 16;
  return map;
}

export async function setup({ width, height }) {
  W = width; H = height;
  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);
  RectAreaLightUniformsLib.init();
  pmrem = new THREE.PMREMGenerator(renderer);
  const hdr = await new RGBELoader().loadAsync("/3d/assets/studio.hdr");
  hdr.mapping = THREE.EquirectangularReflectionMapping;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.environment = pmrem.fromEquirectangular(hdr).texture;
  hdr.dispose();
  scene.fog = new THREE.FogExp2(0x000000, 0.0045);
  camera = new THREE.PerspectiveCamera(30, W / H, 1, 2000);

  lap = buildLaptop();
  scene.add(lap.group);
  // riflesso nel tavolo: copia specchiata del laptop sotto un piano semitrasparente
  mirror = lap.group.clone();
  mirror.matrixAutoUpdate = false;
  scene.add(mirror);

  table = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: tableTextures(), roughness: 0.42, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.35, transparent: true, opacity: 0.86 }),
  );
  table.rotation.x = -Math.PI / 2;
  table.receiveShadow = true;
  scene.add(table);

  // luce chiave laterale nella tinta del blu del logo
  key = new THREE.SpotLight(0x1aa0ff, 0, 0, Math.PI / 9, 0.6, 1.4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;
  scene.add(key, key.target);
  // controluce sui bordi del coperchio
  rim = new THREE.RectAreaLight(0x1aa0ff, 0, 20, 70);
  scene.add(rim);
  // luce dello schermo sul tavolo e sulla tastiera
  screenLight = new THREE.RectAreaLight(0xeaf2ff, 0, LAP.SCREEN_W, LAP.SCREEN_H);
  scene.add(screenLight);
  fill = new THREE.DirectionalLight(0x9fb8d0, 0);
  scene.add(fill, fill.target);

  // polvere nel fascio di luce
  const N = 1800;
  dustBase = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    dustBase[i * 4] = (Math.random() - 0.5) * 140;
    dustBase[i * 4 + 1] = Math.random() * 70;
    dustBase[i * 4 + 2] = (Math.random() - 0.5) * 140;
    dustBase[i * 4 + 3] = Math.random() * 100;
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  dust = new THREE.Points(dg, new THREE.PointsMaterial({
    size: 0.28, map: dustTexture(), color: new THREE.Color("#bfe6ff"), transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: true,
  }));
  dust.frustumCulled = false;
  scene.add(dust);

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
  // nei render target i campioni restano HDR lineari: tone mapping AgX e sRGB solo qui, sulla media
  finalScene = quad(new THREE.ShaderMaterial({
    uniforms: { tex: { value: accumRT.texture } },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }",
    fragmentShader: `uniform sampler2D tex; varying vec2 vUv;
      void main(){
        gl_FragColor = vec4(texture2D(tex, vUv).rgb, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    blending: THREE.NoBlending, depthTest: false, depthWrite: false, toneMapped: true,
  }));
  return true;
}

function applyState(st, t) {
  camera.position.copy(V(st.cam.pos));
  camera.up.set(0, 1, 0);
  camera.lookAt(V(st.cam.target));
  if (st.cam.roll) camera.rotateZ(st.cam.roll);
  camera.fov = st.cam.fov;
  camera.aspect = W / H;
  camera.updateProjectionMatrix();

  lap.setOpen(st.open ?? 110);
  lap.group.updateMatrixWorld(true);
  // copia specchiata rispetto al piano y = 0
  mirror.children.forEach((c, i) => { if (c.isGroup) c.rotation.copy(lap.group.children[i].rotation); });
  const hingeIdx = lap.group.children.indexOf(lap.hinge);
  mirror.children[hingeIdx].rotation.copy(lap.hinge.rotation);
  mirror.matrix.copy(new THREE.Matrix4().makeScale(1, -1, 1)).multiply(lap.group.matrix);
  mirror.matrixWorldNeedsUpdate = true;
  table.material.opacity = st.tableOpacity ?? 0.978;

  const s = st.screen ?? {};
  lap.screenMat.uniforms.gain.value = s.gain ?? 1.0;
  lap.screenMat.uniforms.wake.value = s.wake ?? 1.0;
  lap.screenMat.uniforms.grid.value = s.grid ?? 0.0;
  lap.screenMat.uniforms.sheen.value = s.sheen ?? 0.05;

  // luce dello schermo: segue il pannello, verso chi guarda
  lap.screen.updateMatrixWorld(true);
  screenLight.position.setFromMatrixPosition(lap.screen.matrixWorld);
  screenLight.quaternion.setFromRotationMatrix(lap.screen.matrixWorld);
  screenLight.rotateY(Math.PI); // il RectAreaLight emette lungo il suo -z
  screenLight.intensity = (st.screenLight ?? 2.2) * (s.wake ?? 1) * (s.gain ?? 1);
  screenLight.color.set(st.screenLightColor ?? "#eaf2ff");

  const L = (light, cfg) => {
    if (!cfg) { light.intensity = 0; return; }
    light.color.set(cfg.color ?? "#1aa0ff");
    light.intensity = cfg.intensity;
    light.position.copy(V(cfg.pos));
    if (light.isRectAreaLight) light.lookAt(V(cfg.target ?? [0, 8, 10]));
    else if (light.target) { light.target.position.copy(V(cfg.target ?? [0, 0, 10])); light.target.updateMatrixWorld(); }
    if (light.isSpotLight && cfg.angle) { light.angle = cfg.angle; light.penumbra = cfg.penumbra ?? 0.6; }
  };
  L(key, st.key);
  L(rim, st.rim);
  L(fill, st.fill);
  scene.environmentIntensity = st.env ?? 0.12;
  scene.environmentRotation.set(0, st.envRot ?? 0.6, 0);
  renderer.toneMappingExposure = st.exposure ?? 1;
  scene.fog.density = st.fog ?? 0.0045;

  dust.material.opacity = st.dust ?? 0;
  dust.visible = (st.dust ?? 0) > 0;
  if (dust.visible) {
    const a = dust.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const sd = dustBase[i * 4 + 3];
      a.setXYZ(i,
        dustBase[i * 4] + Math.sin(t * 0.21 + sd) * 2.4 + t * 0.6,
        dustBase[i * 4 + 1] + Math.sin(t * 0.13 + sd * 1.7) * 1.6 + t * 0.25,
        dustBase[i * 4 + 2] + Math.cos(t * 0.17 + sd * 0.7) * 2.4);
    }
    a.needsUpdate = true;
  }
}

/** Un fotogramma: shot = nome, t = secondi dentro lo shot; screenUrl = fotogramma della registrazione. */
export async function renderFrame({ shot, t, dur, samples = 16, shutter = 0.5, fps = 30, screenUrl = null, opts = {} }) {
  const def = SHOTS[shot];
  if (!def) throw new Error("shot sconosciuto " + shot);
  const ctx = { dur, aspect: W / H, opts };
  if (screenUrl) {
    const tex = await screenTexture(screenUrl);
    lap.screenMat.uniforms.map.value = tex;
    lap.screenMat.uniforms.res.value.set(tex.image.width, tex.image.height);
  }
  renderer.setRenderTarget(accumRT);
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  const N = def(t, ctx).samples ?? samples;
  for (let i = 0; i < N; i++) {
    const ts = t + ((i + 0.5) / N - 0.5) * (shutter / fps);
    const st = def(ts, ctx);
    applyState(st, ts);
    // lente sottile: la camera si sposta sul disco dell'apertura senza cambiare direzione e il
    // frustum viene inclinato (off-axis) perché il piano a fuoco resti fermo; l'inquadratura non cambia
    const ap = st.cam.aperture ?? 0;
    camera.setViewOffset(W, H, halton(i + 1, 5) - 0.5, halton(i + 1, 7) - 0.5, W, H);
    if (ap > 0) {
      const r = Math.sqrt(halton(i + 1, 2)) * ap, th = halton(i + 1, 3) * Math.PI * 2;
      const rx = Math.cos(th) * r, ry = Math.sin(th) * r;
      camera.updateMatrixWorld();
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      const fwd = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 2).negate();
      const d = Math.max(1, V(st.cam.focus ?? st.cam.target).sub(camera.position).dot(fwd));
      camera.position.addScaledVector(right, rx).addScaledVector(up, ry);
      const e = camera.projectionMatrix.elements;
      e[8] -= (e[0] * rx) / d;
      e[9] -= (e[5] * ry) / d;
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    }
    camera.updateMatrixWorld();
    renderer.setRenderTarget(sampleRT);
    renderer.setClearColor(0x000000, 1);
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
  return renderer.domElement.toDataURL("image/png");
}

window.ENGINE = { setup, renderFrame };
window.ENGINE_READY = true;
