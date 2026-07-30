import { Bricolage_Grotesque } from "next/font/google";

// Voce tipografica della landing: Bricolage Grotesque per i titoli (carattere,
// non costume) sopra il Geist di sistema per testo e UI. Solo qui: l'app resta
// sul suo registro denso e silenzioso.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
});

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${display.variable} contents`}>{children}</div>;
}
