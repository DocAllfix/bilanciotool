// I testi e i dati d'esempio dell'apertura della home.
//
// Stanno in un file senza "use client" perché li leggono componenti server.
import type { ModuloAzienda } from "@/features/companies/moduli";
import { QUANTI_PERCORSI } from "./percorsi-vetrina";

/**
 * Il titolo dell'apertura, scelto dal committente l'8 novembre 2026 fra i cinque del
 * laboratorio (docs/copy-landing-v3.md, sezione 1), con l'immagine del fascicolo e il
 * tema «petrolio».
 *
 * ⚠️ «Un posto solo» porta accanto la cosa plurale che raccoglie («tutta la
 * conformità»): detto da solo si leggerebbe «un solo modulo».
 */
export const TITOLO = "Tutta la conformità dell'azienda, in un posto solo.";

export const SOTTOTITOLO = `${QUANTI_PERCORSI} percorsi guidati, dalle emissioni al Modello 231. Rispondi alle domande, i calcoli si fanno da soli, consegni un documento verificabile.`;

/** L'azienda d'esempio: la stessa della dimostrativa, così chi entra nella demo la ritrova. */
export const AZIENDA_ESEMPIO = { nome: "Corvane Meccanica S.r.l.", ateco: "25.62" };

/**
 * Il codice di verifica stampato sul documento d'esempio, che si clicca e apre la pagina
 * pubblica di verifica.
 *
 * ⚠️ DEVE ESISTERE nel database della PRODUZIONE: un codice inventato porterebbe a «non
 * trovato», cioè alla prova del contrario. E deve essere di un documento GHG della
 * «Corvane Meccanica S.r.l.» con la versione di `STATI_ESEMPIO.ghg`, e con un emittente
 * che non sia il nome di una persona: la pagina di verifica li mostra, a un clic dal
 * fascicolo che dice il contrario.
 *
 * L'8 novembre 2026, al rilascio, in produzione un documento così NON c'era (le
 * dimostrative interne sono precedenti alla rinomina e si chiamano ancora «Meccanica
 * Adriatica»). Finché manca, `null`: il fascicolo porta alla pagina che spiega la verifica
 * invece che a un codice che non esiste.
 */
export const CODICE_ESEMPIO: string | null = null;

/** Lo stato di ogni percorso nel fascicolo d'esempio. Il compilatore li pretende tutti. */
export type StatoEsempio = { stato: "pubblicato"; versione: number } | { stato: "in-corso" } | { stato: "da-avviare" };

export const STATI_ESEMPIO: Record<ModuloAzienda, StatoEsempio> = {
  // ⚠️ La versione è quella del documento a cui punta CODICE_ESEMPIO: la pagina di verifica
  // la conferma, e se il disegno ne dicesse un'altra si contraddirebbero a un clic di distanza.
  ghg: { stato: "pubblicato", versione: 1 },
  energetico: { stato: "pubblicato", versione: 1 },
  bilancio: { stato: "in-corso" },
  sgesg: { stato: "da-avviare" },
  fornitore: { stato: "pubblicato", versione: 3 },
  mog231: { stato: "in-corso" },
  anticorruzione: { stato: "da-avviare" },
  segnalazioni: { stato: "pubblicato", versione: 1 },
  filiera: { stato: "da-avviare" },
  nis2: { stato: "in-corso" },
  sgnis2: { stato: "da-avviare" },
  gdpr: { stato: "in-corso" },
  sgiqas: { stato: "in-corso" },
  sa8000: { stato: "da-avviare" },
  pas24000: { stato: "da-avviare" },
  soa: { stato: "da-avviare" },
};
