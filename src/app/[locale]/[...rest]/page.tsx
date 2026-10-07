import { notFound } from "next/navigation";

// Qualsiasi percorso non previsto sotto una lingua: 404 localizzata (app/[locale]/not-found.tsx).
export default function CatchAll() {
  notFound();
}
