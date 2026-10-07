import Script from "next/script";
import { ENV } from "@/data/site";

/** Plausible (senza cookie). Non carica nulla se NEXT_PUBLIC_PLAUSIBLE_DOMAIN è vuota. */
export function Analytics() {
  if (!ENV.plausibleDomain) return null;
  return (
    <>
      <Script defer data-domain={ENV.plausibleDomain} src="https://plausible.io/js/script.tagged-events.js" strategy="afterInteractive" />
      <Script id="plausible-queue" strategy="afterInteractive">
        {`window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}`}
      </Script>
    </>
  );
}
