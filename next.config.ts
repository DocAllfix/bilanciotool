import type { NextConfig } from "next";

// CSP volutamente assente per ora (inline script Next + servizi terzi): step dedicato in Fase 11.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Cache del client router. dynamic:0 è deliberato: il prodotto è data-heavy e
    // ogni schermata mostra numeri che devono riflettere l'ultima scrittura
    // (una cache di 30s faceva vedere risultati stantii dopo il salvataggio).
    staleTimes: { dynamic: 0, static: 180 },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
