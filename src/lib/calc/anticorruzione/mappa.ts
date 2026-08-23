import type { Dimensione, SocioInAffari } from "./tipi";

// Dalla riga del database alla forma che il motore conosce.
//
// ⚠️ Sta QUI, fra le funzioni pure, e non nel modello di lettura del server: la scheda
// del socio ricalcola livello e obblighi nel browser mentre si compila, e per farlo ha
// bisogno dello stesso mappatore. Tenerlo in `features/anticorruzione/queries.ts`
// significava trascinare il database dentro un componente client — il build lo ha
// rifiutato, e ha fatto bene: sarebbe stata la porta da cui entrano `db` e `withTenant`
// in un bundle del browser.
//
// L'argomento è tipizzato per STRUTTURA e non con il tipo di Drizzle, così questo file
// non importa nulla dallo schema: chi lo usa passa una riga, chiunque l'abbia letta.

export type RigaSocio = {
  dimPaese: number | null;
  dimPubbliciUfficiali: number | null;
  dimNatura: number | null;
  dimValore: number | null;
  flagSuccesso: boolean;
  flagCliente: boolean;
  flagTitolarita: boolean;
  flagPrecedenti: boolean;
  flagLegami: boolean;
  flagPagamenti: boolean;
  dueDiligenceIl: string | null;
  politicaComunicata: string | null;
  impegni: string | null;
  clausole: string | null;
  controlli: string | null;
  formazioneIl: string | null;
  verificaCorrispettivo: string | null;
  remunerazione: string | null;
  controllata: string | null;
  adeguamento: string | null;
  stato: string;
};

/**
 * ⚠️ La corrispondenza fra colonne e campi del motore sta in UN POSTO SOLO.
 *
 * È l'unico punto in cui i due mondi si toccano: due copie divergerebbero al primo
 * campo aggiunto, e la divergenza si vedrebbe come un livello di rischio sbagliato —
 * cioè come un difetto del motore, che sarebbe innocente.
 */
export function socioDalDatabase(p: RigaSocio): SocioInAffari {
  const dim = (v: number | null): Dimensione => (v === 1 || v === 2 || v === 3 || v === 4 ? v : null);
  return {
    paese: dim(p.dimPaese),
    pubbliciUfficiali: dim(p.dimPubbliciUfficiali),
    natura: dim(p.dimNatura),
    valore: dim(p.dimValore),
    remunerazioneSuccesso: p.flagSuccesso,
    impostoDalCliente: p.flagCliente,
    titolaritaOpaca: p.flagTitolarita,
    precedenti: p.flagPrecedenti,
    legamiPubblici: p.flagLegami,
    pagamentiATerzi: p.flagPagamenti,
    dueDiligenceIl: p.dueDiligenceIl,
    politicaComunicata: p.politicaComunicata,
    impegni: p.impegni,
    clausole: p.clausole,
    controlli: p.controlli,
    formazioneIl: p.formazioneIl,
    verificaCorrispettivo: p.verificaCorrispettivo,
    remunerazione: p.remunerazione,
    controllata: p.controllata,
    adeguamento: p.adeguamento,
    stato: p.stato === "Sospeso" || p.stato === "Cessato" ? p.stato : "Attivo",
  };
}
