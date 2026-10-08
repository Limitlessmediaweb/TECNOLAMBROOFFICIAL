// Livelli HTML sopra il canvas: titoli (una parola chiave in serif corsivo), scheda del configuratore,
// logo vero con la scia. Tutto in funzione del tempo locale: fotogrammi deterministici.
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const layer = document.getElementById("layer");

const CONFIG_STEPS = [
  { tipo: 0, piano: null, ang: null },
  { tipo: 1, piano: 0, ang: 3 },
  { tipo: 1, piano: 1, ang: 3 },
  { tipo: 2, piano: null, ang: 3 },
];

function title(html, t, dur) {
  if (!html) return "";
  const a = ease((t - 0.06) / 0.28);
  const b = 1 - ease((t - (dur - 0.16)) / 0.16);
  const k = Math.min(a, b);
  return `<div class="title" style="opacity:${k};transform:translateY(${(1 - a) * 28}px);filter:blur(${(1 - a) * 6}px)">${html}</div>`;
}

function card(ui, labels) {
  const st = CONFIG_STEPS[ui ?? 0];
  const chips = (arr, on) => arr.map((c, i) => `<span class="chip${i === on ? " on" : ""}">${c}</span>`).join("");
  return `<div class="card">
    <div class="row"><span class="lab">${labels.type}</span>${chips(labels.types, st.tipo)}</div>
    <div class="row"><span class="lab">${labels.plane}</span>${chips(["E", "H"], st.piano)}</div>
    <div class="row"><span class="lab">${labels.size}</span>${chips(["WR-75", "WR-90", "WR-112"], 1)}</div>
    <div class="row"><span class="lab">${labels.angle}</span>${chips(["30°", "45°", "60°", "90°"], st.ang)}</div>
  </div>`;
}

function logo(t, dur, url) {
  const draw = ease(t / 1.0);
  const plate = ease((t - 0.7) / 0.35);
  const iso = ease((t - 1.1) / 0.3);
  const site = ease((t - 1.3) / 0.3);
  const out = 1 - ease((t - (dur - 0.3)) / 0.3);
  return `<div class="logo" style="opacity:${out}">
    <div class="plate" style="background:rgba(245,248,250,${plate})">
      <svg class="trail" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="1" y="1" width="98" height="98" rx="4" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${100 - draw * 100}" style="opacity:${1 - plate * 0.6}" vector-effect="non-scaling-stroke"/></svg>
      <img src="/public/brand/logo.png" alt="" style="opacity:${plate}">
    </div>
    <div class="iso" style="opacity:${iso}">ISO 9001 · ISO 14001</div>
    <div class="url" style="opacity:${site};transform:translateY(${(1 - site) * 20}px)">${url}</div>
  </div>`;
}

window.OVERLAY = {
  set({ format, scene, t, dur, ui, labels }) {
    document.body.className = format === "9x16" ? "v" : "h";
    if (!scene) { layer.innerHTML = ""; return; }
    let html = "";
    if (scene.shot === "logo") html = logo(t, dur, scene.text);
    else {
      if (scene.shot === "configurator") html += card(ui, labels);
      html += title(scene.text, t, dur);
    }
    layer.innerHTML = html;
  },
  ready: () => document.fonts.ready.then(() => Promise.all([...document.images].map((i) => i.decode?.().catch(() => {})))),
};
window.OVERLAY_READY = true;
