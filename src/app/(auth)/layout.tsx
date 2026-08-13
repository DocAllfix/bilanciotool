import type { Metadata } from "next";
import Link from "next/link";
import { LogoVerticale } from "@/components/brand/logo";

// Accesso e registrazione restano fuori dagli indici.
//
// Sono moduli, non pagine da leggere: chi cerca il prodotto deve arrivare alla home, che
// spiega di cosa si tratta, non a un campo password. Una pagina sottile che si posiziona
// sul nome del marchio è un danno silenzioso — porta la persona giusta nel posto sbagliato.
//
// Vale anche per la registrazione: la conversione parte dai richiami sulla home, e averla
// due volte negli indici significa due risultati che si fanno concorrenza.
//
// Sta nel layout e non nelle pagine perché entrambe sono componenti client, che in Next non
// possono esportare `metadata`.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

// Registro auth: pagina silenziosa e centrata, il marchio al centro della scena.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <Link href="/" className="mb-7" aria-label="EvalisDeck">
        <LogoVerticale className="h-24" />
      </Link>
      {/* `main` e non `div`: e' il punto di riferimento con cui una tecnologia
          assistiva salta direttamente al contenuto. Il resto del prodotto ce l'ha,
          queste pagine no — e sono le prime che si incontrano. */}
      <main className="w-full max-w-sm">{children}</main>
      <p className="mt-10 max-w-sm text-center text-xs leading-relaxed text-muted-foreground">
        Bilanci di sostenibilità e inventari GHG per le PMI, con il metodo incorporato.
      </p>
    </div>
  );
}
