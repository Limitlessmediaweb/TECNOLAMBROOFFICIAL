/**
 * Modello 3D parametrico dei pezzi (Three.js). Si carica SOLO con import dinamico (al clic su
 * "Vedi in 3D" o quando il pannello entra nello schermo): non pesa sul caricamento del sito.
 *
 * Unità: millimetri. Un unico motore "sweep": la sezione (rettangolo della guida) segue la linea
 * mediana del tipo di pezzo — dritto, curva nel piano E o H, twist, disassato a S — con le flange
 * forate alle estremità. Proporzioni: dimensioni interne a × b standard EIA, parete rigida
 * indicativa, quote della tabella TLFX per la flessibile. Il disegno definitivo arriva con il preventivo.
 */
import * as THREE from "three";
import { DIM_BY_WR, SIZE_BY_WR, rigidOuter } from "@/data/waveguides";
import { BRASS } from "@/data/brand";
import { visualBendRadius } from "@/data/configurator/defaults";
import { isFlexible, type PartSpec } from "@/data/configurator/types";

const V3 = THREE.Vector3;
type Frame = { p: THREE.Vector3; t: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3 };
type Segment = { len: number; at: (d: number) => Frame; step: number };

/** Limite di triangoli per pezzo (telefoni compresi). */
export const TRIANGLE_BUDGET = 60000;
/** Lunghezza massima modellata: oltre si modella questa (quote e codice restano quelli scelti). */
const MAX_MODEL_MM = 3000;

/* ------------------------------------------------------------------ misure */

function sizeOf(spec: PartSpec) {
  const s = SIZE_BY_WR.get(spec.wr) ?? SIZE_BY_WR.get("WR-90")!;
  const rigid = rigidOuter(s);
  const dim = DIM_BY_WR.get(s.wr);
  const A = dim?.A ?? s.a * 1.22;
  const B = dim?.B ?? s.b * 1.36;
  const flex = {
    A,
    B,
    C: dim?.C ?? A * 0.86,
    D: dim?.D ?? B * 0.68,
    P: dim?.P ?? Math.max(1.2, A / 14),
    r: dim?.r ?? Math.max(1, B * 0.2),
    R: dim?.R ?? Math.max(2, B * 0.35),
  };
  const outerW = isFlexible(spec.type) ? flex.A : rigid.w;
  const outerH = isFlexible(spec.type) ? flex.B : rigid.h;
  const flangeT = Math.max(4, Math.min(14, Math.max(outerW, outerH) * 0.28));
  return { s, rigid, flex, outerW, outerH, flangeT };
}

/* --------------------------------------------------------------- percorso */

function straight(f: Frame, len: number, twist = 0): Segment {
  return {
    len,
    step: twist ? Math.max(len / 48, 0.5) : len,
    at: (d) => {
      const k = len ? d / len : 0;
      const p = f.p.clone().addScaledVector(f.t, d);
      if (!twist) return { p, t: f.t.clone(), u: f.u.clone(), v: f.v.clone() };
      const q = new THREE.Quaternion().setFromAxisAngle(f.t, twist * k);
      return { p, t: f.t.clone(), u: f.u.clone().applyQuaternion(q), v: f.v.clone().applyQuaternion(q) };
    },
  };
}

/** Arco che curva verso `dir` (v = piano E, u = piano H) di `angle` radianti con raggio R. */
function arc(f: Frame, R: number, angle: number, dir: "u" | "v"): Segment {
  const toward = dir === "v" ? f.v : f.u;
  const axis = new V3().crossVectors(f.t, toward).normalize();
  const center = f.p.clone().addScaledVector(toward, R);
  const rel = f.p.clone().sub(center);
  return {
    len: R * angle,
    step: R * THREE.MathUtils.degToRad(3),
    at: (d) => {
      const q = new THREE.Quaternion().setFromAxisAngle(axis, d / R);
      return { p: center.clone().add(rel.clone().applyQuaternion(q)), t: f.t.clone().applyQuaternion(q), u: f.u.clone().applyQuaternion(q), v: f.v.clone().applyQuaternion(q) };
    },
  };
}

/** Disassato a S: spostamento laterale X lungo L con profilo smoothstep (tangenti parallele agli estremi). */
function sCurve(L: number, X: number, plane: "E" | "H"): Segment {
  const lateral = plane === "E" ? new V3(0, 1, 0) : new V3(1, 0, 0);
  const h = (s: number) => s * s * (3 - 2 * s);
  const dh = (s: number) => 6 * s * (1 - s);
  // lunghezza dell'arco della curva (numerica)
  const N = 64;
  const cum = [0];
  let prev = new V3(0, 0, 0);
  for (let i = 1; i <= N; i++) {
    const s = i / N;
    const p = new V3().addScaledVector(lateral, X * h(s)).setZ(L * s);
    cum.push(cum[i - 1] + p.distanceTo(prev));
    prev = p;
  }
  const total = cum[N];
  return {
    len: total,
    step: total / 48,
    at: (d) => {
      // dalla lunghezza d'arco al parametro s
      let i = 1;
      while (i < N && cum[i] < d) i++;
      const s = THREE.MathUtils.clamp((i - 1 + (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1])) / N, 0, 1);
      const p = new V3().addScaledVector(lateral, X * h(s)).setZ(L * s);
      const t = new V3().addScaledVector(lateral, X * dh(s)).setZ(L).normalize();
      if (plane === "E") {
        const u = new V3(1, 0, 0);
        return { p, t, u, v: new V3().crossVectors(t, u).normalize() };
      }
      const v = new V3(0, 1, 0);
      return { p, t, u: new V3().crossVectors(v, t).normalize(), v };
    },
  };
}

const START: Frame = { p: new V3(0, 0, 0), t: new V3(0, 0, 1), u: new V3(1, 0, 0), v: new V3(0, 1, 0) };

function pathFor(spec: PartSpec): Segment[] {
  const clampLen = (v: number | undefined, def: number) => Math.min(MAX_MODEL_MM, Math.max(1, v || def));
  switch (spec.type) {
    case "bend": {
      const angle = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(spec.angle ?? 90, 1, 180));
      const R = Math.min(MAX_MODEL_MM, visualBendRadius(spec));
      const dir = spec.plane === "H" ? "u" : "v";
      const leg1 = straight(START, clampLen(spec.leg1, 100));
      const a = arc(leg1.at(leg1.len), R, angle, dir);
      const leg2 = straight(a.at(a.len), clampLen(spec.leg2, 100));
      return [leg1, a, leg2];
    }
    case "twist": {
      const rot = THREE.MathUtils.degToRad(spec.rotation ?? 90) * (spec.direction === "ccw" ? 1 : -1);
      return [straight(START, clampLen(spec.length, 100), rot)];
    }
    case "offset":
      return [sCurve(clampLen(spec.length, 150), Math.min(MAX_MODEL_MM, spec.offset ?? 20), spec.plane ?? "E")];
    default:
      return [straight(START, clampLen(spec.length, 600))];
  }
}

/** Punto della linea mediana alla distanza d (0..totale). */
function sampler(segs: Segment[]) {
  const total = segs.reduce((s, g) => s + g.len, 0);
  const at = (d: number): Frame => {
    let rest = THREE.MathUtils.clamp(d, 0, total);
    for (const g of segs) {
      if (rest <= g.len || g === segs[segs.length - 1]) return g.at(Math.min(rest, g.len));
      rest -= g.len;
    }
    return segs[0].at(0);
  };
  return { total, at };
}

/* ----------------------------------------------------------------- sezioni */

/** Rettangolo arrotondato centrato, `k` punti per spigolo (stesso numero di punti per ogni raggio). */
function rectPoints(w: number, h: number, r: number, k: number): [number, number][] {
  const rr = Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001));
  const out: [number, number][] = [];
  const corners: [number, number, number][] = [
    [w / 2 - rr, h / 2 - rr, 0],
    [-w / 2 + rr, h / 2 - rr, Math.PI / 2],
    [-w / 2 + rr, -h / 2 + rr, Math.PI],
    [w / 2 - rr, -h / 2 + rr, (3 * Math.PI) / 2],
  ];
  for (const [cx, cy, a0] of corners) for (let i = 0; i <= k; i++) {
    const a = a0 + (i / k) * (Math.PI / 2);
    out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return out;
}

type Ring = { d: number; w: number; h: number; r: number };

/** Superficie spazzata: anelli lungo la linea mediana. inward = normali verso l'interno (parete interna). */
function sweep(at: (d: number) => Frame, rings: Ring[], k: number, inward = false): THREE.BufferGeometry {
  const M = 4 * (k + 1);
  const pos = new Float32Array(rings.length * M * 3);
  rings.forEach((ring, i) => {
    const f = at(ring.d);
    rectPoints(ring.w, ring.h, ring.r, k).forEach(([x, y], j) => {
      const p = f.p.clone().addScaledVector(f.u, x).addScaledVector(f.v, y);
      pos.set([p.x, p.y, p.z], (i * M + j) * 3);
    });
  });
  const index: number[] = [];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * M + j;
      const b = i * M + ((j + 1) % M);
      const c = a + M;
      const e = b + M;
      if (inward) index.push(a, b, c, b, e, c);
      else index.push(a, c, b, b, c, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/* ----------------------------------------------------------------- flangia */

function flangeGeometry(size: ReturnType<typeof sizeOf>): THREE.ExtrudeGeometry {
  const big = Math.max(size.outerW, size.outerH);
  const w = Math.max(big * 1.6 + 10, size.outerW + 16);
  const h = Math.max(size.outerH * 1.9 + 12, w * 0.82);
  const shape = new THREE.Shape();
  const outline = rectPoints(w, h, 2, 3);
  shape.moveTo(outline[0][0], outline[0][1]);
  outline.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();
  const hole = new THREE.Path();
  const inner = rectPoints(size.s.a, size.s.b, 0.5, 1);
  hole.moveTo(inner[0][0], inner[0][1]);
  inner.slice(1).forEach(([x, y]) => hole.lineTo(x, y));
  hole.closePath();
  shape.holes.push(hole);
  const boltR = Math.max(1.6, w * 0.045);
  for (const [sx, sy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
    const bolt = new THREE.Path();
    bolt.absarc((sx * w) / 2 - sx * boltR * 2.6, (sy * h) / 2 - sy * boltR * 2.6, boltR, 0, Math.PI * 2, true);
    shape.holes.push(bolt);
  }
  return new THREE.ExtrudeGeometry(shape, { depth: size.flangeT, bevelEnabled: true, bevelSize: 0.35, bevelThickness: 0.35, bevelSegments: 1, curveSegments: 10 });
}

/** Matrice che porta la geometria della flangia (piano XY, spessore lungo +Z) sul fotogramma f. */
function frameMatrix(f: Frame, outward: boolean): THREE.Matrix4 {
  const z = outward ? f.t.clone().negate() : f.t.clone();
  const x = f.u.clone();
  const y = new V3().crossVectors(z, x).normalize();
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(f.p);
}

/* ---------------------------------------------------------------- materiali */

function materials(spec: PartSpec, fade: boolean) {
  const finish = spec.finish;
  const brass = new THREE.MeshStandardMaterial(
    finish === "painted"
      ? { color: new THREE.Color("#c9ced2"), metalness: 0.1, roughness: 0.55, name: "Verniciata" }
      : { color: new THREE.Color(finish === "bright" ? BRASS.color : BRASS.flange), metalness: 1, roughness: finish === "bright" ? 0.18 : 0.42, name: "Ottone OT 80" },
  );
  const flange = brass.clone();
  if (finish !== "painted") flange.roughness = Math.min(1, brass.roughness + 0.06);
  const jacket = new THREE.MeshStandardMaterial({ color: new THREE.Color("#25282d"), metalness: 0, roughness: 0.72, name: "Rivestimento" });
  for (const m of [brass, flange, jacket]) {
    m.side = THREE.DoubleSide;
    if (fade) {
      m.transparent = true;
      m.opacity = 0;
    }
  }
  return { brass, flange, jacket };
}

/** Texture di rilievo a righe per la corrugazione quando la geometria supererebbe il limite di triangoli. */
function corrugationBump(repeat: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(0.5, "#000");
  grad.addColorStop(1, "#fff");
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 64);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, repeat);
  return t;
}

/* -------------------------------------------------------------- costruzione */

export type BuildOptions = { fade?: boolean };
export type PartInfo = { group: THREE.Group; triangles: number; ends: [Frame, Frame]; size: ReturnType<typeof sizeOf>; total: number };

export function buildPart(spec: PartSpec, opts: BuildOptions = {}): PartInfo {
  const size = sizeOf(spec);
  const mats = materials(spec, Boolean(opts.fade));
  const { total, at } = sampler(pathFor(spec));
  const segs = pathFor(spec);
  const T = size.flangeT;
  const from = Math.min(T, total / 3);
  const to = Math.max(total - T, (2 * total) / 3);
  const group = new THREE.Group();
  group.name = "Tecnolambro";
  const k = 3;

  // distanze di campionamento: confini dei segmenti + passo di ogni segmento
  const ds: number[] = [];
  let acc = 0;
  for (const g of segs) {
    const n = Math.max(1, Math.ceil(g.len / g.step));
    for (let i = 0; i < n; i++) ds.push(acc + (g.len * i) / n);
    acc += g.len;
  }
  ds.push(total);
  const body = ds.filter((d) => d > from && d < to);
  const bodyD = [from, ...body, to];

  if (spec.type === "twistable") {
    const f = size.flex;
    const pitches = (to - from) / f.P;
    const M = 4 * (k + 1);
    const perPitch = Math.max(2, Math.min(6, Math.floor(TRIANGLE_BUDGET * 0.8 / (2 * M) / Math.max(1, pitches))));
    const ringsCount = Math.round(pitches * perPitch) + 1;
    if (ringsCount * M * 2 <= TRIANGLE_BUDGET * 0.85 && perPitch >= 2) {
      const rings: Ring[] = [];
      for (let i = 0; i < ringsCount; i++) {
        const d = from + ((to - from) * i) / (ringsCount - 1);
        const s = 0.5 + 0.5 * Math.cos((2 * Math.PI * (d - from)) / f.P);
        rings.push({ d, w: f.C + (f.A - f.C) * s, h: f.D + (f.B - f.D) * s, r: f.r + (f.R - f.r) * s });
      }
      group.add(new THREE.Mesh(sweep(at, rings, k), mats.brass));
    } else {
      // troppo lunga per la corrugazione in geometria: tubo liscio con rilievo a righe
      const mid = { w: (f.A + f.C) / 2, h: (f.B + f.D) / 2, r: (f.R + f.r) / 2 };
      const geo = sweep(at, bodyD.map((d) => ({ d, ...mid })), k);
      const uv = new Float32Array((geo.attributes.position.count) * 2);
      const M = 4 * (k + 1);
      bodyD.forEach((d, i) => {
        for (let j = 0; j < M; j++) uv.set([j / M, (d - from) / (to - from)], (i * M + j) * 2);
      });
      geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      const m = mats.brass.clone();
      m.bumpMap = corrugationBump(pitches);
      m.bumpScale = 2;
      group.add(new THREE.Mesh(geo, m));
    }
  } else if (spec.type === "seamless") {
    const f = size.flex;
    group.add(new THREE.Mesh(sweep(at, bodyD.map((d) => ({ d, w: f.A, h: f.B, r: f.R })), k), mats.jacket));
  } else {
    // guida rigida: parete esterna, parete interna, corone alle estremità
    const outer = { w: size.rigid.w, h: size.rigid.h, r: 0.6 };
    const inner = { w: size.s.a, h: size.s.b, r: 0.2 };
    group.add(new THREE.Mesh(sweep(at, bodyD.map((d) => ({ d, ...outer })), k), mats.brass));
    group.add(new THREE.Mesh(sweep(at, bodyD.map((d) => ({ d, ...inner })), k, true), mats.brass));
  }

  // flange alle due estremità, con la faccia esterna sul fondo del percorso
  const fGeo = flangeGeometry(size);
  const startF = at(0);
  const endF = at(total);
  const flangeA = new THREE.Mesh(fGeo, mats.flange);
  flangeA.name = "Flangia 1";
  flangeA.applyMatrix4(frameMatrix(startF, false));
  const flangeB = new THREE.Mesh(fGeo, mats.flange);
  flangeB.name = "Flangia 2";
  flangeB.applyMatrix4(frameMatrix(endF, true));
  flangeA.userData.axis = startF.t.clone().negate();
  flangeB.userData.axis = endF.t.clone();
  group.add(flangeA, flangeB);

  let triangles = 0;
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const g = o.geometry as THREE.BufferGeometry;
      triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
    }
  });
  return { group, triangles: Math.round(triangles), ends: [startF, endF], size, total };
}

export function disposeGroup(group: THREE.Object3D) {
  const seen = new Set<unknown>();
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    if (!seen.has(o.geometry)) {
      (o.geometry as THREE.BufferGeometry).dispose();
      seen.add(o.geometry);
    }
    const m = o.material as THREE.MeshStandardMaterial;
    if (!seen.has(m)) {
      m.bumpMap?.dispose();
      m.dispose();
      seen.add(m);
    }
  });
}

/* -------------------------------------------------------------------- quote */

export type DimLabel = { text: string; at: THREE.Vector3 };

/** Posizioni e testi delle quote 3D (lunghezze, gambe, angolo, disassamento). */
export function dimLabels(spec: PartSpec, info: PartInfo, fmt: (v: number) => string): { labels: DimLabel[]; lines: [THREE.Vector3, THREE.Vector3][] } {
  const { at, total } = sampler(pathFor(spec));
  const off = Math.max(info.size.outerW, info.size.outerH) * 1.4 + 6;
  const labels: DimLabel[] = [];
  const lines: [THREE.Vector3, THREE.Vector3][] = [];
  const side = (f: Frame) => f.p.clone().addScaledVector(spec.plane === "H" ? f.v : f.u, off);
  if (spec.type === "bend") {
    const l1 = spec.leg1 ?? 100;
    const R = visualBendRadius(spec);
    const arcLen = R * THREE.MathUtils.degToRad(spec.angle ?? 90);
    const a = at(0), b = at(l1), c = at(l1 + arcLen), d = at(total);
    lines.push([side(a), side(b)], [side(c), side(d)]);
    labels.push({ text: `L1 = ${fmt(l1)}`, at: side(at(l1 / 2)) });
    labels.push({ text: `L2 = ${fmt(spec.leg2 ?? 100)}`, at: side(at(l1 + arcLen + (spec.leg2 ?? 100) / 2)) });
    const mid = at(l1 + arcLen / 2);
    labels.push({ text: `${fmt(spec.angle ?? 90)}°${spec.radius ? ` · R ${fmt(spec.radius)}` : ""}`, at: mid.p.clone().addScaledVector(spec.plane === "H" ? mid.u : mid.v, -off) });
  } else {
    const a = at(0), b = at(total);
    const pa = a.p.clone().addScaledVector(a.v, info.size.outerH * 2.2 + 10);
    const pb = b.p.clone().addScaledVector(b.v, info.size.outerH * 2.2 + 10);
    lines.push([pa, pb]);
    labels.push({ text: `L = ${fmt(spec.length ?? 0)}`, at: pa.clone().lerp(pb, 0.5) });
    if (spec.type === "twist") labels.push({ text: `${fmt(spec.rotation ?? 90)}° ${spec.direction === "ccw" ? "↺" : "↻"}`, at: at(total / 2).p.clone().addScaledVector(at(total / 2).u, off) });
    if (spec.type === "offset") labels.push({ text: `X = ${fmt(spec.offset ?? 0)}`, at: b.p.clone().addScaledVector(spec.plane === "H" ? b.u : b.v, -off) });
  }
  return { labels, lines };
}

/* ------------------------------------------------------------------ viewer */

export type ViewPreset = "iso" | "front" | "side";
export type Viewer = {
  setSpec: (spec: PartSpec) => void;
  setView: (v: ViewPreset) => void;
  setDims: (on: boolean) => void;
  setExploded: (on: boolean) => void;
  triangles: () => number;
  dispose: () => void;
};

export async function mountViewer(container: HTMLElement, spec: PartSpec, fmt: (v: number) => string): Promise<Viewer> {
  const [{ OrbitControls }, { RoomEnvironment }, { CSS2DRenderer, CSS2DObject }] = await Promise.all([
    import("three/examples/jsm/controls/OrbitControls.js"),
    import("three/examples/jsm/environments/RoomEnvironment.js"),
    import("three/examples/jsm/renderers/CSS2DRenderer.js"),
  ]);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
  container.appendChild(renderer.domElement);
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.cssText = "position:absolute;inset:0;pointer-events:none";
  container.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04);
  scene.environment = env.texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.3);
  key.position.set(1, 2, 1.5);
  scene.add(key);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 50000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;

  let current: PartInfo | null = null;
  let currentSpec = spec;
  let dims = false;
  let exploded = 0;
  let explodedTarget = 0;
  const dimGroup = new THREE.Group();
  scene.add(dimGroup);
  const fading: { info: PartInfo; dir: 1 | -1; start: number }[] = [];

  const sphere = () => {
    const box = new THREE.Box3().setFromObject(current!.group);
    return box.getBoundingSphere(new THREE.Sphere());
  };
  let view: ViewPreset = "iso";
  const camAnim = { from: new V3(), to: new V3(), tFrom: new V3(), tTo: new V3(), start: 0, active: false };
  const placeCamera = (instant: boolean) => {
    if (!current) return;
    const s = sphere();
    const dist = (s.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 0.82;
    const dir = view === "front" ? new V3(0, 0.02, 1) : view === "side" ? new V3(1, 0.02, 0) : new V3(0.62, 0.46, 0.72);
    const pos = s.center.clone().addScaledVector(dir.normalize(), dist);
    camera.near = dist / 200;
    camera.far = dist * 20;
    camera.updateProjectionMatrix();
    controls.minDistance = s.radius * 0.35;
    controls.maxDistance = dist * 3;
    if (instant) {
      camera.position.copy(pos);
      controls.target.copy(s.center);
      controls.update();
      return;
    }
    Object.assign(camAnim, { from: camera.position.clone(), to: pos, tFrom: controls.target.clone(), tTo: s.center.clone(), start: performance.now(), active: true });
  };

  const rebuildDims = () => {
    dimGroup.children.slice().forEach((c) => {
      dimGroup.remove(c);
      if (c instanceof CSS2DObject) c.element.remove();
      if (c instanceof THREE.Line) {
        c.geometry.dispose();
        (c.material as THREE.Material).dispose();
      }
    });
    if (!dims || !current || currentSpec.type === "custom") return;
    const { labels, lines } = dimLabels(currentSpec, current, fmt);
    for (const [a, b] of lines) {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color: 0x0066cc }));
      dimGroup.add(line);
    }
    for (const l of labels) {
      const el = document.createElement("span");
      el.textContent = l.text;
      el.className = "part3d-dim";
      const obj = new CSS2DObject(el);
      obj.position.copy(l.at);
      dimGroup.add(obj);
    }
  };

  const setOpacity = (info: PartInfo, o: number) =>
    info.group.traverse((m) => {
      if (m instanceof THREE.Mesh) {
        const mat = m.material as THREE.Material;
        mat.opacity = o;
        mat.transparent = o < 1;
        mat.depthWrite = o > 0.5;
      }
    });

  const applyExplode = () => {
    if (!current) return;
    const dist = current.size.flangeT * 3 * exploded;
    current.group.children.forEach((c) => {
      const axis = c.userData.axis as THREE.Vector3 | undefined;
      if (!axis) return;
      if (!c.userData.base) c.userData.base = c.position.clone();
      c.position.copy((c.userData.base as THREE.Vector3).clone().addScaledVector(axis, dist));
    });
  };

  let frame = 0;
  const tick = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const now = performance.now();
      let busy = controls.update();
      for (const f of fading.slice()) {
        const p = Math.min(1, (now - f.start) / 300);
        setOpacity(f.info, f.dir === 1 ? p : 1 - p);
        if (p >= 1) {
          fading.splice(fading.indexOf(f), 1);
          if (f.dir === -1) {
            scene.remove(f.info.group);
            disposeGroup(f.info.group);
          }
        } else busy = true;
      }
      if (camAnim.active) {
        const p = Math.min(1, (now - camAnim.start) / 300);
        const e = 1 - Math.pow(1 - p, 3);
        camera.position.lerpVectors(camAnim.from, camAnim.to, e);
        controls.target.lerpVectors(camAnim.tFrom, camAnim.tTo, e);
        if (p >= 1) camAnim.active = false;
        busy = true;
      }
      if (Math.abs(exploded - explodedTarget) > 0.001) {
        exploded += (explodedTarget - exploded) * 0.2;
        if (Math.abs(exploded - explodedTarget) < 0.01) exploded = explodedTarget;
        applyExplode();
        busy = true;
      }
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      if (busy) tick();
    });
  };

  const setSpec = (next: PartSpec) => {
    currentSpec = next;
    const first = !current;
    if (current) fading.push({ info: current, dir: -1, start: performance.now() });
    current = buildPart(next, { fade: !first });
    scene.add(current.group);
    if (!first) fading.push({ info: current, dir: 1, start: performance.now() });
    applyExplode();
    placeCamera(first);
    rebuildDims();
    tick();
  };

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    labelRenderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    tick();
  };
  controls.addEventListener("change", tick);
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  setSpec(spec);

  return {
    setSpec,
    setView: (v) => {
      view = v;
      placeCamera(false);
      tick();
    },
    setDims: (on) => {
      dims = on;
      rebuildDims();
      tick();
    },
    setExploded: (on) => {
      explodedTarget = on ? 1 : 0;
      tick();
    },
    triangles: () => current?.triangles ?? 0,
    dispose: () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      dims = false;
      rebuildDims();
      for (const f of fading) disposeGroup(f.info.group);
      if (current) disposeGroup(current.group);
      env.dispose();
      room.traverse((o) => o instanceof THREE.Mesh && (o.geometry.dispose(), (o.material as THREE.Material).dispose()));
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      labelRenderer.domElement.remove();
    },
  };
}

/* ------------------------------------------------------------------ export */

function exportGroup(spec: PartSpec): THREE.Group {
  const g = buildPart(spec).group;
  g.updateMatrixWorld(true);
  return g;
}

export async function exportStl(spec: PartSpec): Promise<ArrayBuffer> {
  const { STLExporter } = await import("three/examples/jsm/exporters/STLExporter.js");
  const g = exportGroup(spec);
  const data = new STLExporter().parse(g, { binary: true }) as DataView;
  disposeGroup(g);
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

/** GLB in metri (convenzione glTF). */
export async function exportGlb(spec: PartSpec): Promise<ArrayBuffer> {
  const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
  const scene = new THREE.Scene();
  const g = exportGroup(spec);
  g.scale.setScalar(0.001);
  scene.add(g);
  const out = (await new GLTFExporter().parseAsync(scene, { binary: true })) as ArrayBuffer;
  disposeGroup(g);
  return out;
}

/** USDZ per "Vedi nel tuo spazio" su iPhone/iPad (AR Quick Look), in metri. */
export async function exportUsdz(spec: PartSpec): Promise<Uint8Array> {
  const { USDZExporter } = await import("three/examples/jsm/exporters/USDZExporter.js");
  const scene = new THREE.Scene();
  const g = exportGroup(spec);
  g.scale.setScalar(0.001);
  scene.add(g);
  const out = await new USDZExporter().parseAsync(scene);
  disposeGroup(g);
  return out;
}

/** Anteprima 3D di un file STL caricato dal cliente (solo visualizzazione, nessun invio). */
export async function mountStlPreview(container: HTMLElement, file: File): Promise<() => void> {
  const [{ OrbitControls }, { STLLoader }, { RoomEnvironment }] = await Promise.all([
    import("three/examples/jsm/controls/OrbitControls.js"),
    import("three/examples/jsm/loaders/STLLoader.js"),
    import("three/examples/jsm/environments/RoomEnvironment.js"),
  ]);
  const geo = new STLLoader().parse(await file.arrayBuffer());
  geo.computeVertexNormals();
  geo.center();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = env.texture;
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: new THREE.Color(BRASS.color), metalness: 0.9, roughness: 0.35, side: THREE.DoubleSide }));
  scene.add(mesh);
  geo.computeBoundingSphere();
  const r = geo.boundingSphere?.radius ?? 50;
  const camera = new THREE.PerspectiveCamera(32, 1, r / 100, r * 100);
  camera.position.set(r * 1.6, r * 1.2, r * 2);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  let frame = 0;
  const draw = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const moving = controls.update();
      renderer.render(scene, camera);
      if (moving) draw();
    });
  };
  const resize = () => {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    draw();
  };
  controls.addEventListener("change", draw);
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  return () => {
    cancelAnimationFrame(frame);
    ro.disconnect();
    controls.dispose();
    geo.dispose();
    (mesh.material as THREE.Material).dispose();
    env.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
}

/** Miniatura PNG del pezzo (sfondo trasparente), per le card del catalogo. */
export async function renderThumbnail(spec: PartSpec, width = 480, height = 320): Promise<string> {
  const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = env.texture;
  const light = new THREE.DirectionalLight(0xffffff, 1.3);
  light.position.set(1, 2, 1.5);
  scene.add(light);
  const info = buildPart(spec);
  scene.add(info.group);
  const s = new THREE.Box3().setFromObject(info.group).getBoundingSphere(new THREE.Sphere());
  const camera = new THREE.PerspectiveCamera(30, width / height, 1, 100000);
  const dist = (s.radius / Math.sin(THREE.MathUtils.degToRad(15))) * 0.78;
  camera.position.copy(s.center.clone().addScaledVector(new V3(0.62, 0.46, 0.72).normalize(), dist));
  camera.lookAt(s.center);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");
  disposeGroup(info.group);
  env.dispose();
  pmrem.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return url;
}

/** Triangoli del pezzo (per i test del limite). */
export function triangleCount(spec: PartSpec): number {
  const info = buildPart(spec);
  disposeGroup(info.group);
  return info.triangles;
}
