import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const ora = new Date();
  return [
    { url: `${base}/`, lastModified: ora, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/privacy`, lastModified: ora, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/termini`, lastModified: ora, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/cookie`, lastModified: ora, changeFrequency: "yearly", priority: 0.2 },
  ];
}
