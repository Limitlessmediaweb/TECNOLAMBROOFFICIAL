// Laptop generico (nessun marchio) in alluminio spazzolato. Unità: cm.
// Origine: centro del bordo posteriore della base, sul piano del tavolo (y = 0).
// La base va verso +z (verso chi guarda), il coperchio ruota attorno alla cerniera (asse x).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const LAP = { W: 31.2, D: 22.0, BASE_H: 1.15, LID_T: 0.55, LID_H: 21.2, SCREEN_W: 28.8, SCREEN_H: 18.0 };

function brushedTexture(w = 1024, h = 1024, base = 168, spread = 20) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  const img = g.createImageData(w, h);
  // righe orizzontali di rumore: alluminio spazzolato
  for (let y = 0; y < h; y++) {
    let v = base + (Math.random() - 0.5) * spread;
    for (let x = 0; x < w; x++) {
      v += (Math.random() - 0.5) * 3;
      v = v * 0.98 + base * 0.02;
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v));
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Piano tastiera: alluminio, pozzetto scuro con tasti, trackpad, griglie altoparlanti. */
function deckTextures() {
  const S = 40; // px per cm
  const w = Math.round(LAP.W * S), h = Math.round(LAP.D * S);
  const col = document.createElement("canvas");
  col.width = w; col.height = h;
  const g = col.getContext("2d");
  const rough = document.createElement("canvas");
  rough.width = w; rough.height = h;
  const r = rough.getContext("2d");
  g.fillStyle = "#9a9ea4"; g.fillRect(0, 0, w, h);
  r.fillStyle = "#6a6a6a"; r.fillRect(0, 0, w, h);
  // pozzetto tastiera
  const kx = 2.6 * S, ky = 1.6 * S, kw = w - 2 * kx, kh = 10.6 * S;
  g.fillStyle = "#1a1c20";
  g.beginPath(); g.roundRect(kx - 6, ky - 6, kw + 12, kh + 12, 10); g.fill();
  r.fillStyle = "#a0a0a0";
  r.beginPath(); r.roundRect(kx - 6, ky - 6, kw + 12, kh + 12, 10); r.fill();
  // tasti: 6 righe
  const rows = [
    { n: 14, h: 0.55 }, { n: 14, h: 1 }, { n: 14, h: 1 }, { n: 13, h: 1 }, { n: 12, h: 1 }, { n: 10, h: 1 },
  ];
  const unitH = kh / 5.75, gap = 0.22 * S;
  let y = ky;
  for (const [ri, row] of rows.entries()) {
    const rh = unitH * row.h;
    const widths = new Array(row.n).fill(1);
    if (ri === 3) { widths[0] = 1.8; widths[row.n - 1] = 1.8; }
    if (ri === 4) { widths[0] = 2.3; widths[row.n - 1] = 2.3; }
    if (ri === 5) { widths[4] = 5.2; }
    const total = widths.reduce((a, b) => a + b, 0);
    let x = kx;
    for (const u of widths) {
      const kw2 = (kw - gap * (row.n - 1)) * (u / total);
      g.fillStyle = "#08090b";
      g.beginPath(); g.roundRect(x, y, kw2, rh - gap, 6); g.fill();
      g.fillStyle = "rgba(255,255,255,0.05)";
      g.fillRect(x + 3, y + 1, kw2 - 6, 2);
      r.fillStyle = "#cfcfcf";
      r.beginPath(); r.roundRect(x, y, kw2, rh - gap, 6); r.fill();
      x += kw2 + gap;
    }
    y += rh;
  }
  // trackpad
  const tw = 12.6 * S, th = 7.6 * S, tx = (w - tw) / 2, ty = ky + kh + 1.1 * S;
  g.fillStyle = "#8d9197";
  g.beginPath(); g.roundRect(tx, ty, tw, th, 18); g.fill();
  g.strokeStyle = "#6f7378"; g.lineWidth = 3; g.stroke();
  r.fillStyle = "#3c3c3c";
  r.beginPath(); r.roundRect(tx, ty, tw, th, 18); r.fill();
  // griglie altoparlanti ai lati della tastiera
  g.fillStyle = "#3a3d42";
  for (const sx of [0.9 * S, w - 1.6 * S]) {
    for (let yy = ky + 4; yy < ky + kh; yy += 10) for (let xx = 0; xx < 0.7 * S; xx += 10) {
      g.beginPath(); g.arc(sx + xx, yy, 2.2, 0, Math.PI * 2); g.fill();
    }
  }
  const map = new THREE.CanvasTexture(col);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 16;
  const rmap = new THREE.CanvasTexture(rough);
  return { map, rmap };
}

/**
 * Schermo: ShaderMaterial autoilluminato. Il contenuto (registrazione del sito) arriva come texture;
 * uniform: gain (luminosità), wake (0 nero → 1 acceso), grid (griglia dei subpixel per le macro),
 * sheen (riflesso morbido della luce ambiente sul vetro).
 */
export function screenMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: null },
      gain: { value: 1.0 },
      wake: { value: 1.0 },
      grid: { value: 0.0 },
      res: { value: new THREE.Vector2(2880, 1800) },
      sheen: { value: 0.06 },
      sheenColor: { value: new THREE.Color("#38b6ff") },
    },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D map; uniform float gain, wake, grid, sheen; uniform vec2 res; uniform vec3 sheenColor;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      vec3 toLin(vec3 c){ return pow(c, vec3(2.2)); }
      void main(){
        vec3 c = toLin(texture2D(map, vUv).rgb);
        // subpixel RGB a strisce verticali, visibili solo da vicino
        vec2 p = vUv * res;
        float sx = fract(p.x) * 3.0;
        vec3 mask = vec3(step(sx, 1.0), step(1.0, sx) * step(sx, 2.0), step(2.0, sx));
        float rowGap = smoothstep(0.0, 0.12, fract(p.y)) * smoothstep(1.0, 0.88, fract(p.y));
        c = mix(c, c * mask * 2.6 * rowGap, grid);
        // retroilluminazione che si accende: prima il nero "acceso", poi il contenuto
        c = mix(vec3(0.004), c, wake);
        float fres = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 3.0);
        vec3 col = c * gain + sheenColor * sheen * (0.35 + fres) * (1.0 - 0.6 * vUv.y);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    toneMapped: true,
  });
}

export function buildLaptop() {
  const group = new THREE.Group();
  const brushed = brushedTexture();
  brushed.repeat.set(1, 6);
  const alu = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#a8adb4"), metalness: 1, roughness: 0.38, roughnessMap: brushed,
    anisotropy: 0.7, clearcoat: 0.15, clearcoatRoughness: 0.4,
  });
  const deck = deckTextures();
  const deckMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: deck.map, metalness: 0.85, roughness: 0.42, roughnessMap: deck.rmap,
  });
  const bezelMat = new THREE.MeshPhysicalMaterial({ color: 0x050506, metalness: 0.1, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.9 });

  // base
  const base = new THREE.Mesh(new RoundedBoxGeometry(LAP.W, LAP.BASE_H, LAP.D, 6, 0.55), alu);
  base.position.set(0, LAP.BASE_H / 2, LAP.D / 2);
  base.castShadow = base.receiveShadow = true;
  group.add(base);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(LAP.W - 0.9, LAP.D - 0.9), deckMat);
  top.rotation.x = -Math.PI / 2;
  top.position.set(0, LAP.BASE_H + 0.002, LAP.D / 2);
  top.receiveShadow = true;
  group.add(top);
  // incavo frontale per aprire
  const notch = new THREE.Mesh(new THREE.BoxGeometry(5, 0.12, 0.4), rubber);
  notch.position.set(0, LAP.BASE_H - 0.05, LAP.D - 0.1);
  group.add(notch);

  // coperchio: pivot alla cerniera, il pannello sale lungo +y quando è aperto (angolo 90°)
  const hinge = new THREE.Group();
  hinge.position.set(0, LAP.BASE_H + LAP.LID_T / 2, 0.45);
  group.add(hinge);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(LAP.W, LAP.LID_H, LAP.LID_T, 6, 0.26), alu);
  lid.position.set(0, LAP.LID_H / 2, 0);
  lid.castShadow = true;
  hinge.add(lid);
  // vetro nero con cornice sottile
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(LAP.W - 0.5, LAP.LID_H - 0.5), bezelMat);
  glass.position.set(0, LAP.LID_H / 2, LAP.LID_T / 2 + 0.003);
  hinge.add(glass);
  const scr = screenMaterial();
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(LAP.SCREEN_W, LAP.SCREEN_H), scr);
  screen.position.set(0, LAP.LID_H / 2 + 0.35, LAP.LID_T / 2 + 0.006);
  hinge.add(screen);
  // cerniera scura
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, LAP.W - 6, 24), rubber);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(0, LAP.BASE_H + 0.1, 0.5);
  group.add(barrel);

  /** angolo in gradi tra base e coperchio (0 = chiuso, 110 = aperto) */
  function setOpen(deg) {
    // a 0° il coperchio è disteso sulla base (rotazione +90° attorno a x: il pannello va verso +z)
    hinge.rotation.x = THREE.MathUtils.degToRad(90 - deg);
  }
  setOpen(110);
  return { group, hinge, screen, screenMat: scr, setOpen, mats: { alu, deckMat, bezelMat } };
}
