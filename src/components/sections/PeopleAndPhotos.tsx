import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { LocalLink as Link } from "@/components/ui/LocalLink";
import { MissingBadge } from "@/components/ui/Bits";
import { Gallery, type Photo } from "@/components/ui/Gallery";
import { PENDING, PENDING_LABELS } from "@/data/pending";
import { OWNER_PHOTO, PHOTO_ALTS, PHOTO_DIRS, workshopArea } from "@/data/photos";
import { publicExists, publicImages } from "@/lib/public-files";
import { cn } from "@/lib/cn";

async function galleryLabels() {
  const t = await getTranslations("gallery");
  return { open: t("open"), close: t("close"), prev: t("prev"), next: t("next"), counter: t("counter") };
}

/**
 * "Chi guida Tecnolambro": foto verticale a sinistra (sopra su telefono), testo a destra.
 * Senza foto il testo occupa tutta la riga; la citazione compare solo se c'è in data/pending.ts.
 */
export async function OwnerSection({ variant = "full" }: { variant?: "full" | "short" }) {
  const t = await getTranslations("owner");
  const c = await getTranslations("common");
  const locale = (await getLocale()) as Locale;
  const photo = OWNER_PHOTO.find((p) => publicExists(p));
  const quote = PENDING.ownerQuote?.[locale] ?? null;
  const short = variant === "short";
  return (
    <section className={cn("border-t border-line", short ? "py-16" : "section-y")} aria-labelledby={`owner-${variant}`}>
      <div className={cn("container-site grid gap-8", photo ? "md:grid-cols-[minmax(0,18rem)_1fr] md:gap-12" : "")}>
        {photo ? (
          <div className={cn("relative aspect-[3/4] w-full overflow-hidden border border-line bg-surface", short ? "max-w-[14rem]" : "max-w-[18rem]")}>
            <Image src={`/${photo}`} alt={t("photoAlt")} fill sizes="(min-width: 768px) 18rem, 80vw" className="object-cover" />
          </div>
        ) : null}
        <div className="max-w-[60ch]">
          <h2 id={`owner-${variant}`} className={short ? "text-display-s font-bold" : "text-display-m font-bold"}>
            {t("title")}
          </h2>
          <p className="mt-4 font-display text-xl font-bold wdth-wide">{t("name")}</p>
          <p className="annot mt-1 uppercase tracking-[0.14em] text-muted">{t("role")}</p>
          <p className="mt-5 text-lead text-muted">{short ? t("bodyShort") : t("body")}</p>
          {quote ? (
            <blockquote className="mt-6 border-l-2 border-accent pl-5 text-lg italic">
              <p>“{quote}”</p>
            </blockquote>
          ) : null}
          {short ? (
            <Link href="/azienda" className="mt-6 inline-flex items-center gap-2 font-medium underline decoration-accent underline-offset-4 hover:text-accent">
              {t("more")}
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </Link>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {!photo ? <MissingBadge label={c("missing", { what: PENDING_LABELS.ownerPhoto[locale] })} /> : null}
            {!quote && !short ? <MissingBadge label={c("missing", { what: PENDING_LABELS.ownerQuote[locale] })} /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/** "L'officina": griglia di foto con didascalie corte. Senza foto il blocco non esiste (in anteprima un badge). */
export async function WorkshopSection() {
  const t = await getTranslations("workshop");
  const c = await getTranslations("common");
  const locale = (await getLocale()) as Locale;
  const photos = publicImages(PHOTO_DIRS.workshop);
  if (!photos.length) {
    return (
      <div className="container-site">
        <MissingBadge label={c("missing", { what: PENDING_LABELS.workshopPhotos[locale] })} className="mb-8" />
      </div>
    );
  }
  return (
    <section className="section-y border-t border-line" aria-labelledby="workshop-title">
      <div className="container-site">
        <h2 id="workshop-title" className="text-display-l font-bold">
          {t("title")}
        </h2>
        <p className="mt-4 max-w-[56ch] text-lead text-muted">{t("body")}</p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((src, i) => {
            const area = workshopArea(src);
            const caption = area ? t(`areas.${area}`) : t("generic");
            const alt = PHOTO_ALTS[src]?.[locale] ?? t("alt", { what: caption.toLowerCase(), n: i + 1 });
            return (
              <li key={src}>
                <figure>
                  <div className="relative aspect-[4/3] overflow-hidden border border-line bg-surface">
                    <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                  </div>
                  <figcaption className="annot mt-2 text-muted">{caption}</figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Galleria della famiglia di prodotto (public/foto/prodotti/<famiglia>/). Senza foto non si vede. */
export async function FamilyGallery({ family, familyName }: { family: string; familyName: string }) {
  const t = await getTranslations("gallery");
  const c = await getTranslations("common");
  const locale = (await getLocale()) as Locale;
  const files = publicImages(PHOTO_DIRS.products(family));
  if (!files.length) {
    return (
      <div className="container-site">
        <MissingBadge label={c("missing", { what: `${PENDING_LABELS.productPhotos[locale]} (${familyName})` })} className="mb-8" />
      </div>
    );
  }
  const photos: Photo[] = files.map((src, i) => ({ src, alt: PHOTO_ALTS[src]?.[locale] ?? t("alt", { name: familyName, n: i + 1 }) }));
  return (
    <section className="container-site pb-16" aria-label={t("title", { name: familyName })}>
      <Gallery photos={photos} labels={await galleryLabels()} />
    </section>
  );
}
