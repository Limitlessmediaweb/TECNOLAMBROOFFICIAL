// Inquadrature del laptop: ogni funzione restituisce lo stato della scena all'istante t (s).
// Movimento lento e continuo dentro l'inquadratura (gimbal): il ritmo lo danno i tagli.
// Il laptop sta nella metà bassa del 9:16, sopra resta il buio per i testi (25-35% dell'altezza).
const lerp = (a, b, p) => a + (b - a) * p;
const lerp3 = (a, b, p) => a.map((v, i) => lerp(v, b[i], p));
const clamp = (p) => Math.min(1, Math.max(0, p));
const smooth = (p) => { p = clamp(p); return p * p * (3 - 2 * p); };
const easeInOut = (p) => { p = clamp(p); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };

// luce laterale: tinta del blu del logo (205°) portata a luminosità alta
const CYAN = "#1aa0ff";
// centro dello schermo con il coperchio a 110°
const SCREEN_C = [0, 11.9, -2.7];

const TABLE = 0.94;
const keyLeft = (k = 1) => ({ color: CYAN, intensity: 9000 * k, pos: [-95, 70, -40], target: [0, 0, 8], angle: Math.PI / 8, penumbra: 0.7 });
const rimRight = (k = 1) => ({ color: CYAN, intensity: 18 * k, pos: [60, 30, -70], target: [0, 10, 0] });

export const SHOTS = {
  // 1. Laptop chiuso al buio, il coperchio si apre e lo schermo illumina il tavolo
  open(t, { dur }) {
    const p = t / dur;
    const o = easeInOut((t - 0.15) / 1.7);
    return {
      cam: { pos: lerp3([58, 38, 146], [46, 33, 122], smooth(p)), target: [0, 17, 4], fov: 30, aperture: 1.0, focus: [0, 6, 8] },
      open: lerp(1.5, 108, o),
      screen: { wake: smooth((o - 0.35) / 0.45), gain: 2.3 },
      screenLight: 1.1,
      key: keyLeft(1), rim: rimRight(1), dust: 0.55, env: 0.1,
    };
  },
  // 2. Macro sullo schermo, di taglio: pixel e testo; si scivola di lato
  macro(t, { dur, opts }) {
    const p = smooth(t / dur);
    const f = opts.focus ?? [-8.5, 13.6, -3.0];
    return {
      // il punto a fuoco sta nella metà bassa del fotogramma: sopra il bordo del coperchio resta il buio per il testo
      cam: { pos: lerp3([f[0] - 16, f[1] + 3, f[2] + 32], [f[0] - 8, f[1] + 2.4, f[2] + 33], p), target: [f[0] + 1, f[1] + (opts.lift ?? 8), f[2] - 2], fov: 34, aperture: 0.3, focus: f },
      open: 108,
      screen: { gain: 2.3, grid: 0.55, sheen: 0.1 },
      screenLight: 1.0, key: keyLeft(1), rim: rimRight(1.2), dust: 0.25, env: 0.1, fog: 0.002,
    };
  },
  // 3. Tre quarti con scivolamento laterale (hero, prodotti)
  slide(t, { dur, opts }) {
    const p = smooth(t / dur);
    const side = opts.side ?? 1;
    return {
      cam: {
        pos: lerp3([side * 58, 30, 92], [side * 41, 28, 102], p),
        target: [0, 17, 2], fov: 30, aperture: 0.9, focus: SCREEN_C,
      },
      open: 108,
      screen: { gain: 2.3 },
      screenLight: 1.0, key: keyLeft(1), rim: rimRight(1), dust: 0.5, env: 0.1,
    };
  },
  // 4. Ricerca per frequenza: quasi frontale, leggera spinta in avanti
  front(t, { dur, opts }) {
    const p = smooth(t / dur);
    const z0 = opts.z0 ?? 88, z1 = opts.z1 ?? 76;
    return {
      cam: { pos: [lerp(-10, -4, p), lerp(26, 24, p), lerp(z0, z1, p)], target: [0, 16, 0], fov: 30, aperture: 0.7, focus: SCREEN_C },
      open: 108,
      screen: { gain: 2.3 },
      screenLight: 1.0, key: keyLeft(0.9), rim: rimRight(1), dust: 0.45, env: 0.1,
    };
  },
  // 5. Packshot: frontale, basso, il logo sullo schermo; lenta avanzata
  pack(t, { dur }) {
    const p = smooth(t / dur);
    return {
      cam: { pos: [0, lerp(20, 19, p), lerp(150, 132, p)], target: [0, 16.5, 0], fov: 28, aperture: 0.6, focus: SCREEN_C },
      open: 108,
      screen: { gain: 2.1 },
      screenLight: 0.9, key: keyLeft(0.8), rim: rimRight(1.1), dust: 0.6, env: 0.08,
    };
  },
};
