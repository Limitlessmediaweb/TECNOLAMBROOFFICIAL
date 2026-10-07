import type { ReactNode } from "react";
import { getLocale, getMessages } from "next-intl/server";
import { ClientI18nProvider } from "@/lib/client-i18n";

/** Aggiunge ai componenti client della pagina solo i namespace di testi che usano. */
export async function PageMessages({ namespaces, children }: { namespaces: string[]; children: ReactNode }) {
  const messages = await getMessages();
  const locale = await getLocale();
  return (
    <ClientI18nProvider locale={locale} messages={Object.fromEntries(namespaces.map((ns) => [ns, messages[ns]]))}>
      {children}
    </ClientI18nProvider>
  );
}
