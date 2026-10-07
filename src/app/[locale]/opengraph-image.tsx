import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { LOGO, THEME } from "@/data/brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Tecnolambro Microwave Components";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** Immagine Open Graph: guida d'onda a linee, onda blu del logo, wordmark. Colori da data/brand. */
export default async function OgImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });
  const wave = Array.from({ length: 120 }, (_, i) => {
    const x = 80 + i * 8.6;
    const y = 470 + Math.sin(i / 3.2) * 22;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: THEME.light.bg, color: THEME.light.fg, padding: "72px 80px", position: "relative" }}>
        <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: "absolute", left: 0, top: 0 }}>
          <path d="M60 430 H1140 M60 510 H1140" stroke={LOGO.grey} strokeWidth="2" fill="none" />
          <rect x="44" y="410" width="16" height="120" fill="none" stroke={LOGO.graphite} strokeWidth="2" />
          <path d={wave} stroke={LOGO.blue} strokeWidth="4" fill="none" />
        </svg>
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 10, color: LOGO.blue, textTransform: "uppercase" }}>Tecnolambro · Microwave Components</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40, fontSize: 92, fontWeight: 800, lineHeight: 1, textTransform: "uppercase" }}>
          <span>{t("titleA")}</span>
          <span style={{ color: THEME.light.accent, fontWeight: 300, textTransform: "none", marginTop: 12 }}>{t("titleB")}</span>
        </div>
      </div>
    ),
    size,
  );
}
