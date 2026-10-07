import type { Metadata } from "next";
import Link from "next/link";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Segnale perso | Tecnolambro",
  description: "La pagina cercata non esiste. / The page you are looking for does not exist.",
  robots: { index: false },
};

/**
 * 404 globale per URL fuori dalle lingue (es. file inesistenti con estensione).
 * Le 404 delle pagine passano da app/[locale]/not-found.tsx, con header e footer.
 */
export default function GlobalNotFound() {
  return (
    <html lang="it" data-theme="light" className={fontVariables}>
      <body>
        <main className="container-site grid min-h-[100dvh] content-center gap-6 py-20">
          <p className="annot text-accent">404</p>
          <h1 className="text-display-l font-extrabold uppercase wdth-wide [overflow-wrap:break-word] [hyphens:auto] md:[overflow-wrap:normal] lg:text-[clamp(3rem,5.4vw,5.5rem)]">Segnale perso.</h1>
          <p lang="en" className="text-lead text-muted">
            Signal lost.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="btn btn-primary">
              Torna alla home
            </Link>
            <Link href="/en" lang="en" className="btn btn-ghost">
              English home
            </Link>
            <Link href="/contatti#preventivo" className="btn btn-ghost">
              Chiedi un preventivo
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
