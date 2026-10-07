import type { ComponentProps } from "react";
import NextLink from "next/link";
import { localizedHref, type Href } from "./TrackedLink";

/**
 * Link interno per i componenti server: risolve sul server il percorso localizzato
 * (slug tradotti, prefisso /en) e rende un next/link semplice. Evita di portare nel bundle
 * client il runtime di next-intl.
 */
export async function LocalLink({ href, ...rest }: Omit<ComponentProps<typeof NextLink>, "href"> & { href: Href }) {
  return <NextLink href={await localizedHref(href)} {...rest} />;
}
