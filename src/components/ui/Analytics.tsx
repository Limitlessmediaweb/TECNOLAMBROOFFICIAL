import Script from "next/script";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { ENV } from "@/data/site";
import { FirstVisitCapture } from "./FirstVisitCapture";

/**
 * Vercel Web Analytics (senza cookie), solo sui deploy Vercel (lo script /_vercel/insights esiste solo lì),
 * + Plausible opzionale (NEXT_PUBLIC_PLAUSIBLE_DOMAIN).
 */
export function Analytics() {
  return (
    <>
      {process.env.VERCEL ? <VercelAnalytics /> : null}
      <FirstVisitCapture />
      {ENV.plausibleDomain ? (
        <>
          <Script defer data-domain={ENV.plausibleDomain} src="https://plausible.io/js/script.tagged-events.js" strategy="afterInteractive" />
          <Script id="plausible-queue" strategy="afterInteractive">
            {`window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}`}
          </Script>
        </>
      ) : null}
    </>
  );
}
