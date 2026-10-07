import { useId, type ReactNode } from "react";
import type { FamilyKey } from "@/data/products";
import { BANDS } from "@/data/bands";

/**
 * Disegni tecnici a linee (vista laterale) delle sei famiglie di prodotto.
 * Ogni parte è un <g data-part> con il vettore di esplosione in data-dx/data-dy:
 * ExplodedPart lo usa per separare le parti allo scroll. Le quote stanno in <g data-dim>.
 * Le misure riportate (WR-90, WR-75) sono dimensioni standard EIA, non dati Tecnolambro.
 */

export type PartLabels = {
  flange: string;
  body: string;
  gasket: string;
  screws: string;
  cover: string;
  horn: string;
  taper: string;
};

type DrawingProps = {
  family: FamilyKey;
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

export function PartDrawing({ family, compact = false, labels, locale = "it", className, title, size, caption }: DrawingProps) {
  const band = BANDS.find((b) => b.wr === size) ?? BANDS.find((b) => b.wr === "WR-90")!;
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

      {/* asse */}
      <line x1="30" y1="140" x2="610" y2="140" className="draw-center" />

      {family === "rigid" && (
        <>
          <Part dx={-110} label={L?.gasket} lx={118} ly={92}>
            <Gasket x={116} />
          </Part>
          <Part dx={-55} label={L?.flange} lx={134} ly={64}>
            <Flange x={121} hatch={hatch} />
          </Part>
          <Part label={L?.body} lx={320} ly={104}>
            <rect x={147} y={104} width={346} height={72} className="draw-line draw-fill" />
            <line x1={147} y1={113} x2={493} y2={113} className="draw-dim" strokeDasharray="4 3" />
            <line x1={147} y1={167} x2={493} y2={167} className="draw-dim" strokeDasharray="4 3" />
          </Part>
          <Part dx={55}>
            <Flange x={493} hatch={hatch} />
          </Part>
          <Part dx={110}>
            <Gasket x={519} />
          </Part>
          {showDims && (
            <>
              <DimH x1={116} x2={524} y={36} text="L" />
              <DimV x={572} y1={113} y2={167} text={`b = ${n(band.b, locale)}`} />
              <text x={320} y={250} textAnchor="middle" className="draw-text" data-dim>
                {caption ?? `${band.wr} · ${band.iec} · a × b = ${n(band.a, locale)} × ${n(band.b, locale)} mm`}
              </text>
            </>
          )}
        </>
      )}

      {family === "flexible" && (
        <>
          <Part dx={-105}>
            <Gasket x={116} />
          </Part>
          <Part dx={-55} label={L?.flange} lx={134} ly={64}>
            <Flange x={121} hatch={hatch} />
          </Part>
          <Part label={L?.body} lx={320} ly={96}>
            <Corrugated x1={147} x2={493} top={104} bottom={176} />
            {/* senso di torsione: guida twistabile */}
            <path d="M300 92 A 24 8 0 1 1 340 92" className="draw-accent" />
            <path d="M336 87 L341 92 L334 95" className="draw-accent" />
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
                {caption ?? `${band.wr} · E/H · twist`}
              </text>
            </>
          )}
        </>
      )}

      {family === "feeds" && (
        <>
          <Part dx={-110} label={L?.gasket} lx={78} ly={92}>
            <Gasket x={76} />
          </Part>
          <Part dx={-55} label={L?.flange} lx={94} ly={64}>
            <Flange x={81} hatch={hatch} />
          </Part>
          <Part label={L?.body} lx={190} ly={104}>
            <rect x={107} y={104} width={170} height={72} className="draw-line draw-fill" />
          </Part>
          <Part dx={40} label={L?.horn} lx={440} ly={40}>
            <path d="M277 104 L560 34 L560 246 L277 176 Z" className="draw-line draw-fill" />
            <path d="M277 113 L551 46 M277 167 L551 234" className="draw-dim" strokeDasharray="4 3" />
            {/* fronti d'onda in uscita */}
            <path d="M584 70 Q 606 140 584 210" className="draw-accent" opacity="0.8" />
            <path d="M600 84 Q 618 140 600 196" className="draw-accent" opacity="0.5" />
          </Part>
          {showDims && (
            <>
              <DimV x={40} y1={113} y2={167} text="b" side="left" />
              <text x={192} y={250} textAnchor="middle" className="draw-text" data-dim>
                {caption ?? `${band.wr} · ${band.iec}`}
              </text>
            </>
          )}
        </>
      )}

      {family === "transitions" && (
        <>
          <Part dx={-100}>
            <Gasket x={86} y1={84} y2={196} />
          </Part>
          <Part dx={-50} label={L?.flange} lx={104} ly={58}>
            <Flange x={91} y1={58} y2={222} hatch={hatch} />
          </Part>
          <Part label={L?.taper} lx={300} ly={92}>
            <path d="M117 94 H220 L400 102 H497 V178 H400 L220 186 H117 Z" className="draw-line draw-fill" />
            <line x1={220} y1={94} x2={220} y2={186} className="draw-dim" strokeDasharray="4 3" />
            <line x1={400} y1={102} x2={400} y2={178} className="draw-dim" strokeDasharray="4 3" />
          </Part>
          <Part dx={50}>
            <Flange x={497} w={24} y1={72} y2={208} hatch={hatch} />
          </Part>
          <Part dx={100}>
            <Gasket x={521} y1={96} y2={184} />
          </Part>
          {showDims && (
            <>
              {/* esempio della pagina famiglia: WR-90 → WR-75. Con una didascalia specifica (shop) le quote si omettono */}
              {caption ? null : (
                <g data-dim>
                  <text x={168} y={210} textAnchor="middle" className="draw-text">
                    a = {n(22.86, locale)}
                  </text>
                  <text x={448} y={202} textAnchor="middle" className="draw-text">
                    a = {n(19.05, locale)}
                  </text>
                </g>
              )}
              <text x={310} y={250} textAnchor="middle" className="draw-text" data-dim>
                {caption ?? "WR-90 → WR-75"}
              </text>
            </>
          )}
        </>
      )}

      {family === "flanges" && (
        <>
          <Part dx={-150} label={L?.screws} lx={70} ly={66}>
            {[78, 202].map((y) => (
              <g key={y}>
                <rect x={56} y={y - 9} width={14} height={18} className="draw-line draw-fill" />
                <rect x={70} y={y - 5} width={60} height={10} className="draw-line" />
                <path d={`M74 ${y - 5} v10 M80 ${y - 5} v10 M86 ${y - 5} v10 M92 ${y - 5} v10 M98 ${y - 5} v10 M104 ${y - 5} v10`} className="draw-dim" />
              </g>
            ))}
          </Part>
          <Part dx={-95} label={L?.cover} lx={144} ly={60}>
            <rect x={136} y={60} width={16} height={160} className="draw-line draw-fill" />
          </Part>
          <Part dx={-45} label={L?.gasket} lx={161} ly={92}>
            <Gasket x={158} />
          </Part>
          <Part label={L?.flange} lx={182} ly={60}>
            <Flange x={163} w={38} y1={60} y2={220} hatch={hatch} />
            <rect x={201} y={104} width={260} height={72} className="draw-line draw-fill" />
            <path d="M461 104 l12 36 l-12 36" className="draw-dim" />
          </Part>
          {showDims && (
            <>
              <DimV x={505} y1={104} y2={176} text={band.wr} />
              <DimH x1={163} x2={201} y={248} text="t" />
            </>
          )}
        </>
      )}

      {family === "custom" && (
        <>
          <Part dx={-60} label={L?.flange} lx={104} ly={64}>
            <Flange x={91} hatch={hatch} />
          </Part>
          <Part label={L?.body} lx={300} ly={78}>
            <path
              d="M117 104 H210 Q 236 104 244 86 L262 52 H352 L370 86 Q 378 104 404 104 H500 V176 H404 Q 378 176 370 194 L352 228 H262 L244 194 Q 236 176 210 176 H117 Z"
              className="draw-line draw-fill"
            />
            <path d="M262 52 H352 L370 86 M244 194 L262 228 H352" className="draw-accent" opacity="0.7" />
            <text x={307} y={145} textAnchor="middle" className="draw-text">
              Ni
            </text>
          </Part>
          <Part dx={60}>
            <Flange x={500} hatch={hatch} />
          </Part>
          {showDims && (
            <>
              <DimH x1={262} x2={352} y={36} text="Ø" />
              <DimV x={572} y1={104} y2={176} text="b" />
            </>
          )}
        </>
      )}
    </svg>
  );
}
