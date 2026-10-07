import type { MetadataRoute } from "next";
import { ENV } from "@/data/site";

/** Fino al lancio (NEXT_PUBLIC_ALLOW_INDEXING=false) blocca tutto; al lancio apre e indica la sitemap. */
export default function robots(): MetadataRoute.Robots {
  if (!ENV.allowIndexing) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${ENV.siteUrl}/sitemap.xml`,
    host: ENV.siteUrl,
  };
}
