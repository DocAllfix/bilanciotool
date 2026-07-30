"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

// FAQ con risposte VERE (niente riempitivi): funnel demo, norme, dati, prezzi.
const DOMANDE: [string, string][] = [
  [
    "Come funziona la demo guidata?",
    "Ti registri in un minuto e trovi un'azienda d'esempio già compilata: puoi percorrere entrambi i moduli, modificare i dati, vedere i calcoli cambiare. Un tour ti accompagna nelle schermate principali. Quando decidi di lavorare sulle tue aziende, sblocchi l'abbonamento: fino ad allora nessuna carta è richiesta.",
  ],
  [
    "Serve essere consulenti per usarlo?",
    "No, ma è pensato per chi la rendicontazione la fa di mestiere: studi, consulenti HSE/ESG, responsabili qualità. Una PMI può usarlo in autonomia, perché le guide di valutazione tema per tema spiegano cosa guardare e dove trovare i dati in azienda.",
  ],
  [
    "A quali norme sono conformi i documenti?",
    "Il rapporto GHG segue i contenuti minimi del §9.3.1 della UNI EN ISO 14064-1:2018, con doppia rendicontazione Scope 2 e CO₂ biogenica separata. Il bilancio è redatto con riferimento ai GRI Standards 2021 e alla struttura ESRS/VSME, con analisi di doppia rilevanza e indice dei contenuti.",
  ],
  [
    "I fattori di emissione sono aggiornati?",
    "La libreria di partenza usa fonti pubbliche (ISPRA, DEFRA, IPCC) versionate per edizione: gli aggiornamenti annuali arrivano con l'abbonamento e non riscrivono mai gli inventari già pubblicati. Ogni fattore può essere personalizzato dallo studio, con fonte documentata.",
  ],
  [
    "Dove stanno i dati? E se non rinnovo?",
    "Su database europei (Francoforte), isolati per studio a livello di database. Se non rinnovi, l'account passa in sola lettura: i dati restano tuoi, consultabili ed esportabili. Non cancelliamo il lavoro di nessuno.",
  ],
  [
    "Cosa succede quando pubblico un documento?",
    "La pubblicazione congela dati e calcoli in una versione numerata e immutabile: un vincolo a livello di database, non una promessa. Puoi sempre ripubblicare una nuova versione; quelle consegnate restano identiche per sempre. È la garanzia che porti in verifica.",
  ],
];

export function Faq() {
  const [aperta, setAperta] = useState<number | null>(0);
  return (
    <div className="divide-y rounded-2xl border bg-card px-6">
      {DOMANDE.map(([q, a], i) => (
        <div key={q}>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-4 py-4 text-left text-[15px] font-medium"
            aria-expanded={aperta === i}
            onClick={() => setAperta(aperta === i ? null : i)}
          >
            {q}
            <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", aperta === i && "rotate-180")} />
          </button>
          <div className={cn("grid transition-all duration-300", aperta === i ? "grid-rows-[1fr] pb-4" : "grid-rows-[0fr]")}>
            <p className="overflow-hidden text-sm leading-relaxed text-muted-foreground">{a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
