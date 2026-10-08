import { routing, type Locale, type StaticPathname } from "./routing";
import { FAMILIES, familySlug } from "@/data/families";

/**
 * Converte un percorso reale ("/en/products/seamless-flexible-waveguide") nel percorso equivalente
 * dell'altra lingua ("/prodotti/guida-flessibile-seamless"). Funzione pura, usata dal selettore lingua lato client senza next-intl.
 */
type Templates = Record<string, string | Record<Locale, string>>;

function templateFor(entry: string | Record<Locale, string>, locale: Locale): string {
  return typeof entry === "string" ? entry : entry[locale];
}

function withPrefix(path: string, locale: Locale): string {
  if (locale === routing.defaultLocale) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** Toglie l'eventuale prefisso di lingua ("/en/…" o, dopo una riscrittura del proxy, "/it/…"). */
export function stripLocale(pathname: string): string {
  return pathname.replace(/^\/(it|en)(?=\/|$)/, "") || "/";
}

export function switchLocalePath(pathname: string, from: Locale, target: Locale): string {
  const bare = stripLocale(pathname);
  const pathnames = routing.pathnames as Templates;

  // Prima i percorsi fissi, poi quelli con parametri (/prodotti/tabelle prima di /prodotti/[famiglia])
  const entries = Object.values(pathnames).sort((a, b) => Number(templateFor(a, from).includes("[")) - Number(templateFor(b, from).includes("[")));
  for (const entry of entries) {
    const source = templateFor(entry, from);
    const pattern = new RegExp(`^${source.replace(/\[(\w+)\]/g, "(?<$1>[^/]+)")}/?$`);
    const match = bare.match(pattern);
    if (!match) continue;
    let out = templateFor(entry, target);
    for (const [key, value] of Object.entries(match.groups ?? {})) {
      // Le famiglie hanno slug tradotti
      const fam = key === "famiglia" ? FAMILIES.find((f) => familySlug(f, from) === value) : undefined;
      const translated = fam ? familySlug(fam, target) : value;
      out = out.replace(`[${key}]`, translated);
    }
    return withPrefix(out, target);
  }
  return withPrefix("/", target);
}

/** Il percorso corrente corrisponde alla voce di menu? (entrambi confrontati senza prefisso di lingua) */
export function isActivePath(pathname: string, href: string): boolean {
  const a = stripLocale(pathname);
  const b = stripLocale(href);
  if (b === "/") return a === "/";
  return a === b || a.startsWith(`${b}/`);
}

/** href nel formato di next-intl: percorso interno (chiave di routing.pathnames) + parametri e query. */
export type LocalHref =
  | StaticPathname
  | { pathname: StaticPathname; query?: Record<string, string>; hash?: string }
  | { pathname: "/prodotti/[famiglia]"; params: { famiglia: string }; query?: Record<string, string>; hash?: string }
  | { pathname: "/prodotti/guida-flessibile/[wr]"; params: { wr: string }; query?: Record<string, string>; hash?: string };

/**
 * Percorso pubblico localizzato di un href interno ("/prodotti" → "/en/products").
 * Sostituisce getPathname di next-intl: importare createNavigation sul server porta nel bundle
 * client il Link di next-intl (con use-intl/IntlMessageFormat) anche se non viene usato.
 */
export function getPathname({ href, locale }: { href: LocalHref; locale: Locale }): string {
  const obj = typeof href === "string" ? { pathname: href } : href;
  const entry = (routing.pathnames as Templates)[obj.pathname];
  let path = templateFor(entry, locale);
  if ("params" in obj && obj.params) {
    for (const [key, value] of Object.entries(obj.params)) path = path.replace(`[${key}]`, encodeURIComponent(value));
  }
  path = withPrefix(path, locale);
  if (obj.query && Object.keys(obj.query).length) path += `?${new URLSearchParams(obj.query)}`;
  if (obj.hash) path += `#${obj.hash}`;
  return path;
}
