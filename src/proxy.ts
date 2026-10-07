import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Tutto tranne API, file interni di Next, file con estensione (robots.txt, sitemap.xml, immagini).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
