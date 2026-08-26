import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { indirizzoCanonico } from "@/lib/indirizzo";

// Aree applicative fuori dagli indici; crawler AI esplicitamente ammessi sul
// contenuto pubblico (GEO: le risposte degli assistenti citano chi si fa leggere).
const PRIVATE = ["/dashboard", "/aziende/", "/documento/",
  // I collegamenti del portale cliente: il token sta nell'indirizzo, e un indirizzo
  // scansionato finisce nei registri di chi lo scansiona.
  "/documenti-cliente/", "/api/", "/impostazioni", "/guida", "/design"];

export default function robots(): MetadataRoute.Robots {
  const base =indirizzoCanonico();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "OAI-SearchBot"], allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
