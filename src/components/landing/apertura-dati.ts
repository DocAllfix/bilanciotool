// I testi e i dati d'esempio dell'apertura della home.
//
// Stanno in un file senza "use client" perché li leggono sia la home sia il laboratorio
// (`/lab/landing`), che sono componenti server.
import type { ModuloAzienda } from "@/features/companies/moduli";
import { QUANTI_PERCORSI } from "./percorsi-vetrina";

/** Le due immagini dell'apertura fra cui si sceglie nel laboratorio. */
export const FORME = ["fascicolo", "documento"] as const;
export type Forma = (typeof FORME)[number];

/**
 * I titoli da confrontare (docs/copy-landing-v3.md, sezione 1).
 *
 * ⚠️ «Uno» porta sempre accanto la cosa plurale che raccoglie: «un solo strumento» da
 * solo si leggerebbe «un solo modulo». Il numero dei percorsi si conta, non si scrive.
 *
 * ⚠️ Il quinto è la formulazione del committente, ristretta a «per rispondere»: detta
 * senza limite («di cui la tua azienda avrà bisogno») prometterebbe anche ciò che non
 * copriamo, come la sicurezza sul lavoro. Resta un'affermazione assoluta: va scelta
 * sapendolo.
 */
export const TITOLI: string[] = [
  "Tutta la conformità dell'azienda, in un posto solo.",
  "Clienti, banche, gare, legge. Rispondi da qui.",
  `${QUANTI_PERCORSI} percorsi. Un solo strumento.`,
  "Una richiesta arriva. Il documento è già pronto.",
  "L'unico strumento che ti serve per rispondere.",
];

export const SOTTOTITOLO = `${QUANTI_PERCORSI} percorsi guidati, dalle emissioni al Modello 231. Rispondi alle domande, i calcoli si fanno da soli, consegni un documento verificabile.`;

/** La scelta che la home usa finché il laboratorio non ne decide un'altra. */
export const APERTURA_PREDEFINITA = { forma: "fascicolo" as Forma, titolo: 2, tema: "petrolio" as const };

/** L'azienda d'esempio: la stessa della dimostrativa, così chi entra nella demo la ritrova. */
export const AZIENDA_ESEMPIO = { nome: "Corvane Meccanica S.r.l.", ateco: "25.62" };

/**
 * Il codice di verifica stampato sul documento d'esempio, che si clicca e apre la pagina
 * pubblica di verifica.
 *
 * ⚠️ DEVE ESISTERE nel database dell'ambiente: un codice inventato porterebbe a «non
 * trovato», cioè alla prova del contrario. Questo è di un documento della dimostrativa nel
 * database di SVILUPPO, e serve all'anteprima. Prima del rilascio va sostituito con il
 * codice di un documento pubblicato sulla dimostrativa dello studio Evalis in produzione.
 */
export const CODICE_ESEMPIO = "EV-DJQ3-HYQJ";

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
