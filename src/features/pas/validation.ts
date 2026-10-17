import { z } from "zod";
import {
  companyIdSchema,
  dataOpzionale as data,
  decimale,
  interoNonNegativo,
  scelta,
  sceltaObbligatoria,
  testo,
} from "@/features/campi";
import domini from "@/lib/db/seeds/data/pas-domini.json";
import gruppi from "@/lib/db/seeds/data/pas-gruppi.json";
import politica from "@/lib/db/seeds/data/pas-politica.json";
import indicatori from "@/lib/db/seeds/data/pas-indicatori.json";
import requisiti from "@/lib/db/seeds/data/pas-requisiti.json";
import {
  CATEGORIE_FORNITORE,
  EFFETTI_FATTORE,
  ESITI_FORNITORE,
  RISCHI_FORNITORE,
  STATI_ATTIVITA,
  STATI_OBIETTIVO,
  TIPI_FATTORE,
} from "@/lib/calc/pas/tipi";

export { validaCampo } from "@/features/campi";

// Validazioni del percorso Sistema di gestione sociale (PAS 24000:2022).
//
// Due strati, come in ogni modulo: qui il «no» con una frase per il consulente, nella
// migrazione 0066 i CHECK che impediscono a una riga sbagliata di esistere. Le liste vengono
// dagli stessi JSON estratti dal prototipo da cui la 0066 è generata.
//
// ⚠️ OGNI MUTAZIONE TOCCA UN CAMPO SOLO. Si manda `{ campo, valore }`, mai la riga intera:
// rimandare la riga letta dalle props cancella ciò che un altro comando ha appena salvato.

const reg = domini.registri;
const ALLEGATO = gruppi.filter((g) => g.natura === "allegato").map((g) => g.key);
/** Rischi e obiettivi stanno in un'area dell'Allegato A o nel sistema (C5): le tendine del prototipo. */
export const AREE_LAVORO = [...ALLEGATO, "C5"] as const;
const CONTENUTI = politica.contenuti.map((c) => c.key);
const INDICATORI = indicatori.indicatori.map((k) => k.key);
const REQUISITI = requisiti.map((r) => r.key);

export const OPZIONI_REGISTRI = {
  canale: reg.reclamoCanale,
  provenienza: reg.reclamoProvenienza,
  esitoReclamo: reg.reclamoEsito,
  origine: reg.ncOrigine,
  efficacia: reg.ncEfficacia,
  tipoEmergenza: reg.emergenzaTipo,
  tipoComunicazione: reg.comunicazioneTipo,
  forma: reg.consultazioneForma,
  statoAudit: reg.auditStato,
} as const;

/** Un punteggio da 1 a 5, oppure vuoto. */
const punteggio = interoNonNegativo(5).refine((v) => v === null || v >= 1, "Da 1 a 5");

export const avviaSchema = z.object({ companyId: companyIdSchema });

// ─── Radice: profilo, ruoli, politica ───────────────────────────────────────

export const CAMPI_SISTEMA = {
  forma: testo(120),
  piva: testo(60),
  sede: testo(300),
  settore: testo(300),
  ateco: testo(20),
  ccnl: testo(300),
  siti: testo(2000),
  campo: testo(4000),
  direzione: testo(300),
  responsabile: testo(300),
  rappresentanti: testo(1000),
  contatto: testo(300),
  politicaTesto: testo(40_000),
  politicaApprovataIl: data,
  politicaFirma: testo(300),
} as const;
export type CampoSistema = keyof typeof CAMPI_SISTEMA;

/** Le soglie, con l'intervallo ammesso. Le coppie (orario, rischio) si controllano insieme sul server. */
export const PARAMETRI = {
  paramOreOrdinarie: [1, 168],
  paramOreTotali: [1, 168],
  paramSettimane: [1, 53],
  paramAlto: [2, 25],
  paramMedio: [1, 24],
  paramGiorniReclamo: [1, 365],
} as const;
export type Parametro = keyof typeof PARAMETRI;
export const parametroSchema = z.object({
  campo: z.enum(Object.keys(PARAMETRI) as [Parametro, ...Parametro[]]),
  valore: z.coerce.number().int(),
});

export const contenutoPoliticaSchema = z.object({ chiave: z.enum(CONTENUTI as [string, ...string[]]), acceso: z.boolean() });

// ─── Requisiti ──────────────────────────────────────────────────────────────

export const CAMPI_REQUISITO = {
  stato: scelta(domini.stati.map((s) => s.key)),
  evidenza: testo(2000),
  azione: testo(2000),
  responsabile: testo(300),
  scadenza: data,
} as const;
export const requisitoChiaveSchema = z.enum(REQUISITI as [string, ...string[]]);

// ─── Misure ─────────────────────────────────────────────────────────────────

export const misuraSchema = z.object({
  anno: z.coerce.number().int().min(1990).max(2100),
  chiave: z.enum(INDICATORI as [string, ...string[]]),
  valore: decimale,
});

// ─── Righe ──────────────────────────────────────────────────────────────────
//
// I campi modificabili di ogni tabella di righe, con il loro schema. Chi manda un campo che
// qui non c'è riceve un rifiuto: il nome finisce in `set({ [campo]: … })`, e un dominio
// aperto lascerebbe scrivere `organizationId` o `systemId` dal browser.

export const CAMPI_RIGHE = {
  fattore: {
    tipo: sceltaObbligatoria(TIPI_FATTORE),
    descrizione: testo(2000),
    effetto: sceltaObbligatoria(EFFETTI_FATTORE),
  },
  parte: {
    nome: testo(300),
    esigenze: testo(2000),
    obbligo: z.boolean(),
    gestita: z.boolean(),
    coinvolgimento: testo(2000),
  },
  rischio: {
    area: sceltaObbligatoria(AREE_LAVORO),
    ambito: sceltaObbligatoria(domini.ambiti.map((a) => a.key)),
    testo: testo(2000),
    probabilita: punteggio,
    gravita: punteggio,
    misure: testo(4000),
    responsabile: testo(300),
  },
  fornitore: {
    nome: testo(300),
    categoria: sceltaObbligatoria(CATEGORIE_FORNITORE),
    paese: testo(120),
    rischio: scelta(RISCHI_FORNITORE),
    clausola: z.boolean(),
    questionario: z.boolean(),
    verificatoIl: data,
    esito: scelta(ESITI_FORNITORE),
  },
  obiettivo: {
    obiettivo: testo(500),
    area: sceltaObbligatoria(AREE_LAVORO),
    indicatore: testo(300),
    traguardo: testo(300),
    scadenza: data,
    responsabile: testo(300),
    risorse: testo(1000),
    stato: sceltaObbligatoria(STATI_OBIETTIVO),
  },
  attivita: {
    mese: z.coerce.number().int().min(1, "Mese non valido").max(12, "Mese non valido"),
    attivita: testo(300),
    riferimento: testo(120),
    responsabile: testo(300),
    stato: sceltaObbligatoria(STATI_ATTIVITA),
  },
  reclamo: {
    data,
    canale: scelta(OPZIONI_REGISTRI.canale),
    provenienza: scelta(OPZIONI_REGISTRI.provenienza),
    area: scelta(ALLEGATO),
    oggetto: testo(4000),
    istruttoria: testo(4000),
    responsabile: testo(300),
    chiusoIl: data,
    esito: sceltaObbligatoria(OPZIONI_REGISTRI.esitoReclamo),
  },
  nonConformita: {
    data,
    origine: scelta(OPZIONI_REGISTRI.origine),
    requisito: testo(120),
    responsabile: testo(300),
    descrizione: testo(4000),
    cause: testo(4000),
    azione: testo(4000),
    scadenza: data,
    chiusaIl: data,
    efficacia: sceltaObbligatoria(OPZIONI_REGISTRI.efficacia),
  },
  formazione: {
    data,
    tema: testo(300),
    destinatari: testo(300),
    docente: testo(300),
    partecipanti: interoNonNegativo(100_000),
    ore: decimale,
    efficacia: testo(1000),
  },
  emergenza: {
    data,
    tipo: sceltaObbligatoria(OPZIONI_REGISTRI.tipoEmergenza),
    sito: testo(300),
    responsabile: testo(300),
    esito: testo(4000),
    azioni: testo(4000),
  },
  comunicazione: {
    data,
    tipo: sceltaObbligatoria(OPZIONI_REGISTRI.tipoComunicazione),
    destinatari: testo(300),
    canale: testo(300),
    contenuto: testo(4000),
  },
  consultazione: {
    data,
    forma: sceltaObbligatoria(OPZIONI_REGISTRI.forma),
    partecipanti: interoNonNegativo(100_000),
    condottaDa: testo(300),
    argomenti: testo(4000),
    esiti: testo(4000),
  },
  audit: {
    data,
    ambito: testo(1000),
    auditor: testo(300),
    stato: sceltaObbligatoria(OPZIONI_REGISTRI.statoAudit),
    rilievi: interoNonNegativo(10_000),
    sintesi: testo(4000),
  },
  riesame: {
    data,
    partecipanti: testo(1000),
    comunicatoIl: data,
    risorse: testo(8000),
    idoneita: testo(8000),
    miglioramento: testo(8000),
    modifiche: testo(8000),
    azioni: testo(8000),
  },
} as const;

export type TipoRiga = keyof typeof CAMPI_RIGHE;
export const TIPI_RIGA = Object.keys(CAMPI_RIGHE) as TipoRiga[];
