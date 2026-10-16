import { z } from "zod";
import {
  companyIdSchema,
  dataIsoSchema,
  dataOpzionale as data,
  decimale,
  interoNonNegativo,
  scelta,
  sceltaObbligatoria,
  testo,
  validaCampo,
} from "@/features/campi";
import { daOraItaliana } from "@/lib/calc/comune/tempo-italia";
import domini from "@/lib/db/seeds/data/gdpr-domini.json";
import registri from "@/lib/db/seeds/data/gdpr-registri.json";
import criteri from "@/lib/db/seeds/data/gdpr-criteri.json";
import politica from "@/lib/db/seeds/data/gdpr-politica.json";
import indicatori from "@/lib/db/seeds/data/gdpr-indicatori.json";
import requisiti from "@/lib/db/seeds/data/gdpr-requisiti.json";

// Validazioni del percorso Protezione dei dati.
//
// Due strati, come in ogni modulo: qui il «no» con una frase per il consulente, nella
// migrazione 0063 i CHECK che impediscono a una riga sbagliata di esistere. Le liste
// vengono dagli stessi JSON estratti dal prototipo da cui la 0063 è generata.
//
// ⚠️ OGNI MUTAZIONE TOCCA UN CAMPO SOLO. Si manda `{ campo, valore }`, mai la riga intera:
// rimandare la riga letta dalle props cancella ciò che un altro comando ha appena salvato,
// e in questo progetto è successo quattro volte.

/**
 * Un istante scritto in ORA ITALIANA (`AAAA-MM-GGThh:mm`, il formato di un campo
 * `datetime-local`), oppure vuoto.
 *
 * ⚠️ Si converte qui, sul server, con le regole italiane dell'ora legale. Il prototipo lo
 * leggeva nel fuso del processo: giusto nel browser di un consulente italiano, due ore
 * sbagliato su un server in UTC — e da questo istante decorrono le 72 ore della notifica.
 */
export const istanteItaliano = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(v);
    const giorno = m && dataIsoSchema.safeParse(m[1]).success ? m[1] : null;
    const d = giorno && m ? daOraItaliana(giorno, m[2]) : null;
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Data e ora non valide" });
      return z.NEVER;
    }
    return d.toISOString();
  });

const SI_NO = ["Sì", "No"] as const;
const opzioni = (reg: string, col: string) =>
  (registri.find((r) => r.key === reg)!.colonne.find((c) => c.chiave === col)!.opzioni ?? []).filter((x) => x !== "");

export const RUOLI_SISTEMA = ["Titolare del trattamento", "Titolare e responsabile per conto di clienti", "Contitolare con altri soggetti"] as const;
export const RUOLI_TRATTAMENTO = ["Titolare", "Contitolare", "Responsabile"] as const;
export const STATI_DPIA = ["Da avviare", "In corso", "Conclusa"] as const;
export const ESITI_DPIA = ["Rischio residuo accettabile", "Consultazione preventiva del Garante"] as const;
export const CONTRATTI = ["Sì", "No", "Non dovuto"] as const;
export const ESITI_FORNITORE = ["Adeguato", "Azioni richieste", "Critico"] as const;
export const STATI_ATTIVITA = ["Da fare", "In corso", "Fatto"] as const;
export const OPZIONI_REGISTRI = {
  diritto: opzioni("dir", "diritto"),
  canale: opzioni("dir", "canale"),
  esitoRichiesta: opzioni("dir", "esito"),
  natura: opzioni("breach", "natura"),
  rischio: opzioni("breach", "rischio"),
  tipoVerifica: opzioni("audit", "tipo"),
  statoVerifica: opzioni("audit", "stato"),
};
const CRITERI = criteri.map((c) => c.key);
const CONTENUTI = politica.contenuti.map((c) => c.key);
const INDICATORI = indicatori.indicatori.map((k) => k.key);
const REQUISITI = requisiti.map((r) => r.key);

export const avviaSchema = z.object({ companyId: companyIdSchema });

// ─── Radice: profilo, DPO, parametri, politica ──────────────────────────────

export const CAMPI_SISTEMA = {
  forma: testo(120),
  piva: testo(60),
  sede: testo(300),
  settore: testo(300),
  ateco: testo(20),
  dipendenti: testo(60),
  siti: testo(2000),
  ruolo: scelta(RUOLI_SISTEMA),
  legale: testo(300),
  referente: testo(300),
  contatto: testo(300),
  amministratori: scelta(SI_NO),
  dpoA: scelta(SI_NO),
  dpoB: scelta(SI_NO),
  dpoC: scelta(SI_NO),
  dpoNome: testo(300),
  dpoContatti: testo(300),
  dpoComunicatoIl: data,
  politicaTesto: testo(40_000),
  politicaApprovataIl: data,
  politicaFirma: testo(300),
} as const;
export type CampoSistema = keyof typeof CAMPI_SISTEMA;

export const PARAMETRI = { paramAlto: [2, 25], paramMedio: [1, 24], paramSogliaDpia: [1, 9] } as const;
export type Parametro = keyof typeof PARAMETRI;
export const parametroSchema = z.object({
  campo: z.enum(["paramAlto", "paramMedio", "paramSogliaDpia"]),
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
  trattamento: {
    nome: testo(200),
    ruolo: sceltaObbligatoria(RUOLI_TRATTAMENTO),
    funzione: testo(200),
    finalita: testo(4000),
    base: scelta(domini.basi),
    bilanciamento: scelta(SI_NO),
    interessati: testo(1000),
    destinatari: testo(1000),
    dati: testo(4000),
    particolari: z.boolean(),
    condizione9: scelta(domini.condizioni9),
    giudiziari: z.boolean(),
    trasferimento: z.boolean(),
    trasferimentoDettaglio: testo(500),
    conservazione: testo(500),
    sistemi: testo(1000),
    misure: testo(4000),
    probabilita: interoNonNegativo(5).refine((v) => v === null || v >= 1, "Da 1 a 5"),
    gravita: interoNonNegativo(5).refine((v) => v === null || v >= 1, "Da 1 a 5"),
    mitigazione: testo(4000),
    dpiaStato: sceltaObbligatoria(STATI_DPIA),
    dpiaData: data,
    dpiaNecessita: testo(8000),
    dpiaParere: testo(2000),
    dpiaEsito: scelta(ESITI_DPIA),
  },
  fornitore: {
    nome: testo(300),
    servizio: testo(300),
    qualifica: sceltaObbligatoria(domini.qualifiche),
    paese: testo(120),
    contratto: scelta(CONTRATTI),
    garanzia: scelta(domini.garanzie),
    verificatoIl: data,
    esito: scelta(ESITI_FORNITORE),
  },
  documento: {
    tipo: sceltaObbligatoria(domini.tipiDocumento),
    oggetto: testo(300),
    versione: testo(20),
    adottatoIl: data,
    revisioneIl: data,
    stato: sceltaObbligatoria(domini.statiDocumento),
  },
  attivita: {
    mese: z.coerce.number().int().min(1, "Mese non valido").max(12, "Mese non valido"),
    attivita: testo(300),
    riferimento: testo(120),
    responsabile: testo(300),
    stato: sceltaObbligatoria(STATI_ATTIVITA),
  },
  richiesta: {
    ricevutaIl: data,
    diritto: sceltaObbligatoria(OPZIONI_REGISTRI.diritto),
    riferimento: testo(120),
    canale: scelta(OPZIONI_REGISTRI.canale),
    trattamento: testo(300),
    proroga: z.boolean(),
    riscontroIl: data,
    esito: sceltaObbligatoria(OPZIONI_REGISTRI.esitoRichiesta),
    note: testo(4000),
  },
  violazione: {
    conoscenzaIl: istanteItaliano,
    natura: sceltaObbligatoria(OPZIONI_REGISTRI.natura),
    interessati: interoNonNegativo(),
    rischio: scelta(OPZIONI_REGISTRI.rischio),
    descrizione: testo(4000),
    categorie: testo(1000),
    notificataIl: istanteItaliano,
    comunicataIl: data,
    chiusaIl: data,
    valutazione: testo(8000),
  },
  formazione: {
    data,
    tema: testo(300),
    destinatari: testo(300),
    docente: testo(300),
    partecipanti: interoNonNegativo(100_000),
    ore: decimale,
    apprendimento: testo(300),
  },
  verifica: {
    data,
    tipo: sceltaObbligatoria(OPZIONI_REGISTRI.tipoVerifica),
    ambito: testo(300),
    svoltaDa: testo(300),
    stato: sceltaObbligatoria(OPZIONI_REGISTRI.statoVerifica),
    rilievi: interoNonNegativo(10_000),
    sintesi: testo(4000),
  },
  verificaAds: {
    data,
    amministratore: testo(300),
    ambito: testo(300),
    registrazioniConservate: scelta(SI_NO),
    esito: testo(4000),
  },
  riesame: {
    data,
    partecipanti: testo(1000),
    relazione: testo(8000),
    adeguatezza: testo(8000),
    miglioramento: testo(8000),
    azioni: testo(8000),
  },
} as const;

export type TipoRiga = keyof typeof CAMPI_RIGHE;
export const TIPI_RIGA = Object.keys(CAMPI_RIGHE) as TipoRiga[];

export { decimale, validaCampo };

export const criterioSchema = z.object({ chiave: z.enum(CRITERI as [string, ...string[]]), acceso: z.boolean() });
