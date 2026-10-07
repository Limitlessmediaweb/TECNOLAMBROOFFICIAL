import type { ReactNode } from "react";
import { getLocale, getMessages } from "next-intl/server";
import { ClientI18nProvider } from "@/lib/client-i18n";

/** Aggiunge ai componenti client solo i namespace richiesti (es. "shop", "checkout"), solo su queste pagine. */
export async function ShopMessages({ namespaces, children }: { namespaces: string[]; children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const picked = Object.fromEntries(namespaces.map((ns) => [ns, messages[ns]]));
  return (
    <ClientI18nProvider locale={locale} messages={picked}>
      {children}
    </ClientI18nProvider>
  );
}
