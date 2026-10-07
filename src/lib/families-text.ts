import { getTranslations } from "next-intl/server";
import { VISIBLE_FAMILIES } from "@/data/families";

/** Nomi e descrizioni brevi delle famiglie visibili, per i componenti client. */
export async function familyTexts(): Promise<{ names: Record<string, string>; short: Record<string, string> }> {
  const t = await getTranslations("products.items");
  return {
    names: Object.fromEntries(VISIBLE_FAMILIES.map((f) => [f.key, t(`${f.key}.name`)])),
    short: Object.fromEntries(VISIBLE_FAMILIES.map((f) => [f.key, t(`${f.key}.short`)])),
  };
}
