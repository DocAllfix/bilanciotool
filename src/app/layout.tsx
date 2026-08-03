import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { InformativaCookie } from "@/components/landing/informativa-cookie";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Voce tipografica del marchio: titoli di landing e app (il documento resta serif).
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  // Nome scelto dal committente (2026-07-30): famiglia di prodotto Evalis.
  title: { default: "EvalisDeck", template: "%s · EvalisDeck" },
  description:
    "La piattaforma per bilanci di sostenibilità e inventari GHG delle PMI: percorso guidato GRI/ESRS-VSME e ISO 14064-1.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Tema chiaro di default (decisione di prodotto); dark disponibile e memorizzato */}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
          {/* Alla radice e non nel solo gruppo marketing: il cookie di sessione
              nasce dentro l'app, quindi l'informativa deve raggiungere anche chi
              arriva direttamente su /login o su un documento condiviso. */}
          <InformativaCookie />
        </ThemeProvider>
      </body>
    </html>
  );
}
