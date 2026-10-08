import { useId, type ReactNode } from "react";
import { SIZE_BY_WR } from "@/data/waveguides";

/**
 * Disegni tecnici a linee (vista laterale) delle famiglie: guida flessibile (con il simbolo di
 * torsione per la twistabile), curva, twist rigido e disassato.
 * Ogni parte è un <g data-part> con il vettore di esplosione in data-dx/data-dy:
 * ExplodedPart lo usa per separare le parti allo scroll. Le quote stanno in <g data-dim>.
 * Le misure interne riportate (a × b) sono dimensioni standard EIA, non dati Tecnolambro.
 */

export type PartLabels = {
  flange: string;
  body: string;
  gasket: string;
};

export type DrawingKind = "flexible" | "bend" | "twist" | "offset";

type DrawingProps = {
  family: DrawingKind;
  /** simbolo di torsione (guida twistabile) */
  twist?: boolean;
  /** versione per le card: niente quote né etichette */
  compact?: boolean;
  labels?: PartLabels;
  locale?: string;
  className?: string;
  title?: string;
  /** misura WR del pezzo (quote e annotazioni); predefinita WR-90 */
  size?: string | null;
  /** annotazione in basso al posto di quella predefinita (es. "WR-90 · UBR100 / N") */
  caption?: string;
};

const VIEW = "0 0 640 280";

function n(value: number, locale = "it") {
  return new Intl.NumberFormat(locale === "it" ? "it-IT" : "en-GB", { minimumFractionDigits: 2 }).format(value);
}

function Part({ dx = 0, dy = 0, label, lx, ly, children }: { dx?: number; dy?: number; label?: string; lx?: number; ly?: number; children: ReactNode }) {
  return (
    <g data-part data-dx={dx} data-dy={dy}>
      {children}
      {label && lx !== undefined && ly !== undefined ? (
        <g data-label>
          <line x1={lx} y1={ly} x2={lx} y2={ly - 22} className="draw-dim" />
          <text x={lx} y={ly - 28} textAnchor="middle" className="draw-text">
            {label}
          </text>
        </g>
      ) : null}
    </g>
  );
}

/** Quota orizzontale con frecce */
function DimH({ x1, x2, y, text }: { x1: number; x2: number; y: number; text: string }) {
  return (
    <g data-dim>
      <line x1={x1} y1={y - 8} x2={x1} y2={y + 8} className="draw-dim" />
      <line x1={x2} y1={y - 8} x2={x2} y2={y + 8} className="draw-dim" />
      <path d={`M${x1} ${y} H${x2} M${x1 + 7} ${y - 3.5} L${x1} ${y} L${x1 + 7} ${y + 3.5} M${x2 - 7} ${y - 3.5} L${x2} ${y} L${x2 - 7} ${y + 3.5}`} className="draw-dim" />
      <text x={(x1 + x2) / 2} y={y - 7} textAnchor="middle" className="draw-text">
        {text}
      </text>
    </g>
  );
}

/** Quota verticale con frecce */
function DimV({ y1, y2, x, text, side = "right" }: { y1: number; y2: number; x: number; text: string; side?: "left" | "right" }) {
  const tx = side === "right" ? x + 10 : x - 10;
  return (
    <g data-dim>
      <line x1={x - 8} y1={y1} x2={x + 8} y2={y1} className="draw-dim" />
      <line x1={x - 8} y1={y2} x2={x + 8} y2={y2} className="draw-dim" />
      <path d={`M${x} ${y1} V${y2} M${x - 3.5} ${y1 + 7} L${x} ${y1} L${x + 3.5} ${y1 + 7} M${x - 3.5} ${y2 - 7} L${x} ${y2} L${x + 3.5} ${y2 - 7}`} className="draw-dim" />
      <text x={tx} y={(y1 + y2) / 2 + 4} textAnchor={side === "right" ? "start" : "end"} className="draw-text">
        {text}
      </text>
    </g>
  );
}

function Flange({ x, w = 26, y1 = 64, y2 = 216, hatch }: { x: number; w?: number; y1?: number; y2?: number; hatch: string }) {
  return (
    <>
      <rect x={x} y={y1} width={w} height={y2 - y1} fill={`url(#${hatch})`} />
      <rect x={x} y={y1} width={w} height={y2 - y1} className="draw-accent" />
      {/* fori passanti delle viti, linee nascoste */}
      <line x1={x} y1={y1 + 16} x2={x + w} y2={y1 + 16} className="draw-dim" strokeDasharray="4 3" />
      <line x1={x} y1={y2 - 16} x2={x + w} y2={y2 - 16} className="draw-dim" strokeDasharray="4 3" />
    </>
  );
}

function Gasket({ x, y1 = 92, y2 = 188 }: { x: number; y1?: number; y2?: number }) {
  return <rect x={x} y={y1} width={5} height={y2 - y1} className="draw-line draw-fill" />;
}

function Corrugated({ x1, x2, top, bottom }: { x1: number; x2: number; top: number; bottom: number }) {
  const step = 10;
  let up = `M${x1} ${top}`;
  let down = `M${x1} ${bottom}`;
  for (let x = x1; x < x2; x += step) {
    up += ` L${x + step / 2} ${top - 7} L${x + step} ${top}`;
    down += ` L${x + step / 2} ${bottom + 7} L${x + step} ${bottom}`;
  }
  return (
    <>
      <rect x={x1} y={top} width={x2 - x1} height={bottom - top} className="draw-fill" />
      <path d={up} className="draw-line" />
      <path d={down} className="draw-line" />
      <line x1={x1} y1={top + 10} x2={x2} y2={top + 10} className="draw-dim" strokeDasharray="4 3" />
      <line x1={x1} y1={bottom - 10} x2={x2} y2={bottom - 10} className="draw-dim" strokeDasharray="4 3" />
    </>
  );
}

export function PartDrawing({ family, twist = false, compact = false, labels, locale = "it", className, title, size, caption }: DrawingProps) {
  const band = SIZE_BY_WR.get(size ?? "WR-90") ?? SIZE_BY_WR.get("WR-90")!;
  const uid = useId().replace(/[:]/g, "");
  const hatch = `hatch-${uid}`;
  const L = labels;
  const showDims = !compact;

  return (
    <svg viewBox={VIEW} className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <pattern id={hatch} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="var(--c-accent)" strokeWidth="1" opacity="0.55" />
        </pattern>
      </defs>

      {family === "flexible" && (
        <>
          <line x1="30" y1="140" x2="610" y2="140" className="draw-center" />
          <Part dx={-105}>
            <Gasket x={116} />
          </Part>
          <Part dx={-55} label={L?.flange} lx={134} ly={64}>
            <Flange x={121} hatch={hatch} />
          </Part>
          <Part label={L?.body} lx={320} ly={96}>
            <Corrugated x1={147} x2={493} top={104} bottom={176} />
            {twist ? (
              <>
                {/* senso di torsione: guida twistabile */}
                <path d="M300 92 A 24 8 0 1 1 340 92" className="draw-accent" />
                <path d="M336 87 L341 92 L334 95" className="draw-accent" />
              </>
            ) : null}
          </Part>
          <Part dx={55}>
            <Flange x={493} hatch={hatch} />
          </Part>
          <Part dx={105} label={L?.gasket} lx={521} ly={92}>
            <Gasket x={519} />
          </Part>
          {showDims && (
            <>
              <DimH x1={116} x2={524} y={36} text="L" />
              <text x={320} y={250} textAnchor="middle" className="draw-text" data-dim>
                {caption ?? `${band.wr} · ${band.iec} · a × b = ${n(band.a, locale)} × ${n(band.b, locale)} mm`}
              </text>
            </>
          )}
        </>
      )}

      {family === "offset" && (
        <>
          <path d="M30 170 H240 C 300 170 330 110 390 110 H610" className="draw-center" />
          <Part dx={-100}>
            <Gasket x={116} y1={122} y2={218} />
          </Part>
          <Part dx={-50} label={L?.flange} lx={134} ly={94}>
            <Flange x={121} y1={94} y2={246} hatch={hatch} />
          </Part>
          <Part label={L?.body} lx={318} ly={70}>
            <path d="M147 134 H240 C 300 134 330 74 390 74 H493 V146 H390 C 330 146 300 206 240 206 H147 Z" className="draw-line draw-fill" />
            <path d="M147 143 H240 C 300 143 330 83 390 83 H493 M147 197 H240 C 300 197 330 137 390 137 H493" className="draw-dim" strokeDasharray="4 3" />
          </Part>
          <Part dx={50}>
            <Flange x={493} y1={34} y2={186} hatch={hatch} />
          </Part>
          <Part dx={100}>
            <Gasket x={519} y1={62} y2={158} />
          </Part>
          {showDims && (
            <>
              <DimV x={580} y1={110} y2={170} text="d" />
              <line x1={524} y1={170} x2={588} y2={170} className="draw-dim" strokeDasharray="4 3" data-dim />
              <DimH x1={116} x2={524} y={18} text="L" />
              <text x={320} y={268} textAnchor="middle" className="draw-text" data-dim>
                {caption ?? `${band.wr} · ${band.iec}`}
              </text>
            </>
          )}
        </>
      )}
      {family === "bend" && (
        <>
          <path d="M30 190 H300 A80 80 0 0 0 380 110 V8" className="draw-center" />
          <Part dx={-100}>
            <Gasket x={116} y1={142} y2={238} />
          </Part>
          <Part dx={-50} label={L?.flange} lx={134} ly={118}>
            <Flange x={121} y1={118} y2={262} hatch={hatch} />
          </Part>
          <Part label={L?.body} lx={230} ly={154}>
            <path d="M147 154 H300 A44 44 0 0 0 344 110 V60 H416 V110 A116 116 0 0 1 300 226 H147 Z" className="draw-line draw-fill" />
            <path d="M147 163 H300 A53 53 0 0 0 353 110 V60 M147 217 H300 A107 107 0 0 0 407 110 V60" className="draw-dim" strokeDasharray="4 3" />
          </Part>
          <Part dy={-26}>
            <rect x={308} y={34} width={144} height={26} fill={`url(#${hatch})`} />
            <rect x={308} y={34} width={144} height={26} className="draw-accent" />
          </Part>
          <Part dy={-46}>
            <rect x={332} y={29} width={96} height={5} className="draw-line draw-fill" />
          </Part>
          {showDims && (
            <>
              <DimH x1={116} x2={380} y={274} text="L1" />
              <DimV x={600} y1={34} y2={190} text="L2" />
              <line x1={452} y1={34} x2={608} y2={34} className="draw-dim" strokeDasharray="4 3" data-dim />
              <line x1={416} y1={190} x2={608} y2={190} className="draw-dim" strokeDasharray="4 3" data-dim />
              <text x={318} y={140} textAnchor="end" className="draw-text" data-dim>
                90°
              </text>
              <text x={520} y={250} textAnchor="middle" className="draw-text" data-dim>
                {caption ?? `${band.wr} · ${band.iec}`}
              </text>
            </>
          )}
        </>
      )}

      {family === "twist" && (
        <>
          <line x1="30" y1="140" x2="610" y2="140" className="draw-center" />
          <Part dx={-105}>
            <Gasket x={116} />
          </Part>
          <Part dx={-55} label={L?.flange} lx={134} ly={64}>
            <Flange x={121} hatch={hatch} />
          </Part>
          <Part label={L?.body} lx={320} ly={96}>
            <path d="M147 104 H230 C 290 104 350 122 410 122 H493 V158 H410 C 350 158 290 176 230 176 H147 Z" className="draw-line draw-fill" />
            <path d="M230 104 C 290 104 350 158 410 158 M230 176 C 290 176 350 122 410 122" className="draw-dim" strokeDasharray="4 3" />
            <path d="M300 92 A 24 8 0 1 1 340 92" className="draw-accent" />
            <path d="M336 87 L341 92 L334 95" className="draw-accent" />
          </Part>
          <Part dx={55}>
            <Flange x={493} y1={92} y2={188} hatch={hatch} />
          </Part>
          <Part dx={105} label={L?.gasket} lx={521} ly={92}>
            <Gasket x={519} y1={122} y2={158} />
          </Part>
          {showDims && (
            <>
              <DimH x1={116} x2={524} y={36} text="L" />
              <text x={320} y={250} textAnchor="middle" className="draw-text" data-dim>
                {caption ?? `${band.wr} · ${band.iec} · 90°`}
              </text>
            </>
          )}
        </>
      )}
    </svg>
  );
}
