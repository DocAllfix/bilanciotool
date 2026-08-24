import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { BannerCookie } from "@/components/legal/banner-cookie";
import { Analytics } from "@/components/legal/analytics";
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

const SITO = "https://evalisdeck.it";
const DESCRIZIONE =
  "La piattaforma per bilanci di sostenibilità e inventari GHG delle PMI: percorso guidato GRI/ESRS-VSME e ISO 14064-1.";

export const metadata: Metadata = {
  // Nome scelto dal committente (2026-07-30): famiglia di prodotto Evalis.
  title: { default: "EvalisDeck", template: "%s · EvalisDeck" },
  description: DESCRIZIONE,
  // `metadataBase` serve a Next per rendere assoluti gli indirizzi delle immagini
  // sociali: senza, l'anteprima di WhatsApp e LinkedIn resta vuota perché il percorso
  // relativo non significa niente fuori dal sito.
  metadataBase: new URL(SITO),
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: "EvalisDeck",
    title: "EvalisDeck · Undici documenti di conformità, un solo strumento",
    description: DESCRIZIONE,
    url: SITO,
  },
  // Il prodotto si passa per messaggio, non per social: la scheda grande serve
  // soprattutto a chi apre il link da WhatsApp e da LinkedIn.
  twitter: { card: "summary_large_image" },
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
              nasce dentro l'app, quindi la richiesta di consenso deve raggiungere
              anche chi arriva direttamente su /login o su un documento condiviso. */}
          <BannerCookie />
          {/* Non rende niente finché il consenso non è esplicito: nessuno script,
              nessuna richiesta verso Google. */}
          <Analytics />
          {/* Il contenitore dei messaggi. Senza, `toast(...)` non rende NIENTE: sette
              componenti dicevano «collegamento copiato», «azienda archiviata», «nome
              dello studio salvato» e gli errori del dialogo d'acquisto, e nessuno li ha
              mai visti.

              Sta dentro `ThemeProvider` perché legge il tema con `useTheme`.

              Va alla radice e non nel gruppo `(app)`: i messaggi servono anche fuori
              dall'area autenticata — il pannello di condivisione e l'offerta di lancio
              vivono altrove. */}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
