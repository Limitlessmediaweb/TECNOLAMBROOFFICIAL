import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { ClientI18nProvider } from "@/lib/client-i18n";
import { ClickTracker } from "@/components/ui/ClickTracker";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { LOCALE_META, isReviewLocale } from "@/i18n/locales";
import { fontVariables } from "../fonts";
import "../globals.css";
import { ENV } from "@/data/site";
import { THEME } from "@/data/brand";
import { organizationJsonLd } from "@/lib/seo";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { DemoBadge } from "@/components/ui/Bits";
import { WhatsAppFloat } from "@/components/ui/WhatsAppFloat";
import { LanguageBanner } from "@/components/ui/LanguageBanner";
import { JsonLd } from "@/components/ui/JsonLd";
import { Analytics } from "@/components/ui/Analytics";
import { InlineScript, BOOT_SCRIPT } from "@/components/ui/InlineScript";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { CursorFollower } from "@/components/motion/CursorFollower";
import { PageTransition } from "@/components/motion/PageTransition";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME.light.bg },
    { media: "(prefers-color-scheme: dark)", color: THEME.dark.bg },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(ENV.siteUrl),
    applicationName: t("siteName"),
    // Fino al lancio: noindex globale (NEXT_PUBLIC_ALLOW_INDEXING=false).
    // Lingue nuove (ES, ZH, DE) fuori dai motori finché non sono riviste: NEXT_PUBLIC_NEW_LOCALES_NOINDEX=true
    robots: ENV.allowIndexing && !isReviewLocale(locale) ? { index: true, follow: true } : { index: false, follow: false, googleBot: { index: false, follow: false } },
    formatDetection: { telephone: false, email: false, address: false },
    authors: [{ name: "Tecnolambro S.a.s." }],
    creator: "LIMITLESS",
  };
}

/** Solo i namespace usati dai componenti client: il resto dei testi resta sul server. */
const CLIENT_NAMESPACES = ["nav", "common", "bandFinder", "quote", "intro", "request"] as const;

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const clientMessages = Object.fromEntries(CLIENT_NAMESPACES.map((ns) => [ns, messages[ns]]));
  const t = await getTranslations("nav");
  const highlightTodo = ENV.demo || process.env.NODE_ENV === "development";

  return (
    <html lang={LOCALE_META[locale as Locale].hreflang} data-theme="light" data-demo={highlightTodo ? "true" : "false"} className={fontVariables} suppressHydrationWarning>
      <head>
        <InlineScript html={BOOT_SCRIPT} />
      </head>
      <body>
        <ClientI18nProvider locale={locale} messages={clientMessages}>
          <a
            href="#main"
            className="sr-only z-[110] rounded-full bg-accent px-4 py-2 font-semibold text-on-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            {t("skip")}
          </a>
          <SmoothScroll />
          <ScrollProgress />
          <CursorFollower />
          <Header />
          <PageTransition>
            <main id="main" tabIndex={-1} className="outline-none">
              {children}
            </main>
          </PageTransition>
          {/* Idratato a parte, dopo il contenuto principale */}
          <Suspense fallback={null}>
            <Footer />
          </Suspense>
          <DemoBadge />
          <WhatsAppFloat />
          <LanguageBanner />
        </ClientI18nProvider>
        <ClickTracker />
        <JsonLd data={organizationJsonLd(locale as Locale)} />
        <Analytics />
      </body>
    </html>
  );
}
