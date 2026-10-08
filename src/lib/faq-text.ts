import "server-only";
import { getLocale, getTranslations } from "next-intl/server";
import { VISIBLE_FAMILIES } from "@/data/families";
import { SIZES, range } from "@/data/waveguides";

/**
 * Testi delle FAQ con i valori calcolati dai dati: "Quali misure producete?" elenca le famiglie
 * visibili (data/families.ts) e le misure della guida flessibile, così si aggiorna da sola.
 */
export async function faqText(): Promise<(id: string) => { q: string; a: string }> {
  const f = await getTranslations("faq.items");
  const p = await getTranslations("products.items");
  const locale = await getLocale();
  const list = new Intl.ListFormat(locale, { style: "long", type: "conjunction" });
  const values = {
    families: list.format(VISIBLE_FAMILIES.map((fam) => p(`${fam.key}.name`).toLowerCase())),
    count: String(SIZES.length),
    sizes: SIZES.map((s) => `${s.wr} (${range(s.min, s.max, locale)} GHz)`).join(", "),
  };
  return (id) => ({ q: f(`${id}.q`), a: id === "sizes" ? f("sizes.a", values) : f(`${id}.a`) });
}
