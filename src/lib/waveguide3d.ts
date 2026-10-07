/**
 * Modello 3D della guida d'onda flessibile (Three.js). Si carica SOLO con import dinamico
 * quando si apre "Vedi in 3D" o si scarica STL/GLB: non pesa sul caricamento del sito.
 *
 * Geometria in millimetri: corpo corrugato a sezione rettangolare arrotondata che alterna
 * cresta (A × B, raggio R) e fondo (C × D, raggio r) con passo P, dalla tabella dimensioni;
 * flange piatte alle due estremità con foro della guida (a × b interni standard) e 4 fori viti.
 * Proporzioni delle flange indicative: il disegno definitivo arriva con il preventivo.
 */
import * as THREE from "three";
import { DIM_BY_WR, SIZE_BY_WR, maxLengthFor } from "@/data/waveguides";
import { BRASS } from "@/data/brand";

export type ModelSpec = { wr: string; lengthMm: number };

function dims(wr: string) {
  const dim = DIM_BY_WR.get(wr);
  const size = SIZE_BY_WR.get(wr);
  const a = size?.a ?? 22.86;
  const b = size?.b ?? 10.16;
  const A = dim?.A ?? a * 1.22;
  const B = dim?.B ?? b * 1.36;
  return {
    a,
    b,
    A,
    B,
    C: dim?.C ?? A * 0.86,
    D: dim?.D ?? B * 0.68,
    P: dim?.P ?? Math.max(1.2, A / 14),
    r: dim?.r ?? Math.max(1, B * 0.2),
    R: dim?.R ?? Math.max(2, B * 0.35),
  };
}

/** Punti di un rettangolo arrotondato (centrato), n punti per spigolo, in senso antiorario. */
function roundedRect(w: number, h: number, rad: number, n: number): [number, number][] {
  const r = Math.min(rad, w / 2 - 0.01, h / 2 - 0.01);
  const pts: [number, number][] = [];
  const corners: [number, number, number][] = [
    [w / 2 - r, h / 2 - r, 0],
    [-w / 2 + r, h / 2 - r, Math.PI / 2],
    [-w / 2 + r, -h / 2 + r, Math.PI],
    [w / 2 - r, -h / 2 + r, (3 * Math.PI) / 2],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  return pts;
}

function corrugatedBody(d: ReturnType<typeof dims>, length: number): THREE.BufferGeometry {
  const ringPts = 7; // punti per spigolo
  const perRing = 4 * (ringPts + 1);
  // campioni per passo: meno sulle guide lunghe e piccole (resta leggero anche su telefono)
  const pitches = length / d.P;
  const perPitch = pitches > 600 ? 3 : pitches > 300 ? 4 : 6;
  const rings = Math.max(2, Math.round(pitches * perPitch) + 1);
  const pos = new Float32Array(rings * perRing * 3);
  for (let k = 0; k < rings; k++) {
    const z = (k / (rings - 1)) * length - length / 2;
    const s = 0.5 + 0.5 * Math.cos((2 * Math.PI * (z + length / 2)) / d.P);
    const w = d.C + (d.A - d.C) * s;
    const h = d.D + (d.B - d.D) * s;
    const rad = d.r + (d.R - d.r) * s;
    const pts = roundedRect(w, h, rad, ringPts);
    for (let i = 0; i < perRing; i++) {
      const o = (k * perRing + i) * 3;
      pos[o] = pts[i][0];
      pos[o + 1] = pts[i][1];
      pos[o + 2] = z;
    }
  }
  const index: number[] = [];
  for (let k = 0; k < rings - 1; k++) {
    for (let i = 0; i < perRing; i++) {
      const a = k * perRing + i;
      const b = k * perRing + ((i + 1) % perRing);
      const c = a + perRing;
      const e = b + perRing;
      index.push(a, c, b, b, c, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

function flange(d: ReturnType<typeof dims>): THREE.BufferGeometry {
  const side = Math.max(d.A, d.B) * 1.65 + 10;
  const w = Math.max(side, d.A + 16);
  const h = Math.max(d.B * 1.9 + 12, side * 0.82);
  const shape = new THREE.Shape();
  const outline = roundedRect(w, h, 2, 4);
  shape.moveTo(outline[0][0], outline[0][1]);
  for (const p of outline.slice(1)) shape.lineTo(p[0], p[1]);
  shape.closePath();
  const hole = new THREE.Path();
  const inner = roundedRect(d.a, d.b, 0.6, 2);
  hole.moveTo(inner[0][0], inner[0][1]);
  for (const p of inner.slice(1)) hole.lineTo(p[0], p[1]);
  hole.closePath();
  shape.holes.push(hole);
  const boltR = Math.max(1.6, w * 0.045);
  for (const [sx, sy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
    const bolt = new THREE.Path();
    bolt.absarc((sx * w) / 2 - sx * boltR * 2.6, (sy * h) / 2 - sy * boltR * 2.6, boltR, 0, Math.PI * 2, true);
    shape.holes.push(bolt);
  }
  const t = Math.max(4, Math.min(14, d.A * 0.28));
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: true, bevelSize: 0.4, bevelThickness: 0.4, bevelSegments: 2, curveSegments: 18 });
  g.translate(0, 0, -t / 2);
  return g;
}

/** Gruppo del pezzo (unità mm), centrato sull'origine, asse lungo Z. */
export function buildPart(spec: ModelSpec): THREE.Group {
  const d = dims(spec.wr);
  // oltre il doppio della lunghezza massima della tabella il modello resta a quella misura (memoria del browser)
  const length = Math.min(Math.max(20, spec.lengthMm || 600), 2 * maxLengthFor(spec.wr));
  const group = new THREE.Group();
  group.name = "Tecnolambro flexible waveguide";
  const brass = new THREE.MeshStandardMaterial({ color: new THREE.Color(BRASS.color), metalness: 1, roughness: 0.32, side: THREE.DoubleSide, name: "Ottone OT 80" });
  const brassFlange = new THREE.MeshStandardMaterial({ color: new THREE.Color(BRASS.flange), metalness: 1, roughness: 0.4, name: "Ottone flangia" });
  const fl = flange(d);
  const flT = Math.max(4, Math.min(14, d.A * 0.28));
  const body = new THREE.Mesh(corrugatedBody(d, length - flT * 2), brass);
  body.name = "Corpo corrugato";
  group.add(body);
  for (const side of [-1, 1]) {
    const m = new THREE.Mesh(fl, brassFlange);
    m.name = side < 0 ? "Flangia A" : "Flangia B";
    m.position.z = side * (length / 2 - flT / 2);
    group.add(m);
  }
  return group;
}

/* ------------------------------------------------------------------ viewer */

export type Viewer = { dispose: () => void; setSpec: (spec: ModelSpec) => void };

/** Vista interattiva: ruota con mouse e dita (OrbitControls), render solo quando serve. */
export async function mountViewer(container: HTMLElement, spec: ModelSpec): Promise<Viewer> {
  const [{ OrbitControls }, { RoomEnvironment }] = await Promise.all([
    import("three/examples/jsm/controls/OrbitControls.js"),
    import("three/examples/jsm/environments/RoomEnvironment.js"),
  ]);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envTarget = pmrem.fromScene(room, 0.04);
  scene.environment = envTarget.texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(1, 2, 1.5);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 20000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;

  let part: THREE.Group | null = null;
  const fit = () => {
    if (!part) return;
    const box = new THREE.Box3().setFromObject(part);
    const size = box.getSize(new THREE.Vector3());
    const radius = size.length() / 2;
    const dist = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 0.68;
    camera.near = dist / 100;
    camera.far = dist * 10;
    camera.position.set(dist * 0.55, dist * 0.42, dist * 0.72);
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.minDistance = radius * 0.4;
    controls.maxDistance = dist * 2.5;
    controls.update();
  };
  const setSpec = (s: ModelSpec) => {
    if (part) {
      scene.remove(part);
      part.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
    }
    part = buildPart(s);
    // la guida lunga in diagonale nella vista
    part.rotation.y = Math.PI / 2;
    scene.add(part);
    fit();
    render();
  };

  let frame = 0;
  const render = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const moving = controls.update();
      renderer.render(scene, camera);
      if (moving) render();
    });
  };
  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  };
  controls.addEventListener("change", render);
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  setSpec(spec);

  return {
    setSpec,
    dispose: () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      if (part) part.traverse((o) => o instanceof THREE.Mesh && (o.geometry.dispose(), (o.material as THREE.Material).dispose()));
      envTarget.dispose();
      room.traverse((o) => o instanceof THREE.Mesh && (o.geometry.dispose(), (o.material as THREE.Material).dispose()));
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}

/* ---------------------------------------------------------------- export */

export async function exportStl(spec: ModelSpec): Promise<ArrayBuffer> {
  const { STLExporter } = await import("three/examples/jsm/exporters/STLExporter.js");
  const part = buildPart(spec);
  part.updateMatrixWorld(true);
  const data = new STLExporter().parse(part, { binary: true }) as DataView;
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

export async function exportGlb(spec: ModelSpec): Promise<ArrayBuffer> {
  const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
  const scene = new THREE.Scene();
  const part = buildPart(spec);
  // GLB in metri (convenzione glTF)
  part.scale.setScalar(0.001);
  scene.add(part);
  const result = await new GLTFExporter().parseAsync(scene, { binary: true });
  return result as ArrayBuffer;
}
