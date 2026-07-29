import { z } from "zod";
import { nz, toFixedStr } from "@/lib/calc/shared/decimal";

// Parser puro dei JSON esportati dai prototipi (contratto in
// docs/formato-export-prototipi.md). Solo parsing e normalizzazione:
// la persistenza transazionale arriva nei moduli backend (Fasi 4 e 6).
// Numeri → stringa decimale canonica; "" → null; id originali conservati
// come riferimento ma destinati a essere rigenerati in persistenza.

const numOrNull = (v: unknown): string | null => {
  if (v === null || v === undefined || v === "") return null;
  return toFixedStr(nz(v as string | number));
};
const num = (v: unknown): string => toFixedStr(nz((v ?? 0) as string | number));

// ---------------------------------------------------------------- GHG
const vocePrototipo = z
  .object({
    id: z.string().optional(),
    anno: z.coerce.number().int(),
    cat: z.enum(["1", "2", "3", "4", "5", "6"]),
    src: z.string(),
    sede: z.string().optional().default(""),
    desc: z.string().optional().default(""),
    feId: z.string().optional().default("custom"),
    um: z.string().optional().default(""),
    q: z.union([z.string(), z.number()]).optional(),
    fe: z.union([z.string(), z.number()]).optional(),
    feM: z.union([z.string(), z.number()]).optional(),
    qGO: z.union([z.string(), z.number()]).optional(),
    feB: z.union([z.string(), z.number()]).optional(),
    dq: z.enum(["M", "F", "C", "E", "S"]).optional().default("F"),
    inc: z.union([z.string(), z.number()]).optional(),
    ev: z.string().optional().default(""),
    note: z.string().optional().default(""),
  })
  .loose();

const fePrototipo = z
  .object({
    id: z.string(),
    g: z.string().optional().default(""),
    n: z.string(),
    um: z.string().optional().default(""),
    fe: z.union([z.string(), z.number()]),
    mkt: z.union([z.string(), z.number()]).optional(),
    bio: z.union([z.string(), z.number()]).optional(),
    cat: z.string().optional().default("1"),
    src: z.string().optional().default("1a"),
    f: z.string().optional().default(""),
  })
  .loose();

const orgPrototipo = z
  .object({
    id: z.string().optional(),
    nome: z.string(),
    anno: z.coerce.number().int(),
    annoBase: z.coerce.number().int().optional(),
    profilo: z.record(z.string(), z.unknown()).optional().default({}),
    fe: z.array(fePrototipo).optional().default([]),
    voci: z.array(vocePrototipo),
    sorgenti: z.record(z.string(), z.object({ st: z.enum(["in", "out", "na"]).optional(), note: z.string().optional() }).loose()).optional().default({}),
    anni: z.record(z.string(), z.record(z.string(), z.unknown())).optional().default({}),
    obiettivi: z.array(z.object({ id: z.string().optional(), n: z.string().optional().default(""), ambito: z.string().optional().default("tot"), anno: z.union([z.string(), z.number()]).optional(), rid: z.union([z.string(), z.number()]).optional(), note: z.string().optional().default("") }).loose()).optional().default([]),
    verifica: z.record(z.string(), z.object({ st: z.enum(["ok", "par", "no"]).optional(), note: z.string().optional() }).loose()).optional().default({}),
  })
  .loose();

const archivioGhg = z.object({ org: z.array(orgPrototipo) }).loose();

export type GhgImport = ReturnType<typeof parseGhgExport>;

export function parseGhgExport(json: unknown) {
  let orgs: z.infer<typeof orgPrototipo>[];
  const arch = archivioGhg.safeParse(json);
  if (arch.success) {
    orgs = arch.data.org;
  } else {
    const single = orgPrototipo.safeParse(json);
    if (!single.success) {
      throw new Error("File non riconosciuto: atteso l'export del prototipo GHG (archivio {org:[…]} o singola organizzazione)");
    }
    orgs = [single.data];
  }

  return {
    organizzazioni: orgs.map((o) => ({
      idOriginale: o.id ?? null,
      nome: o.nome,
      anno: o.anno,
      annoBase: o.annoBase ?? o.anno,
      profilo: Object.fromEntries(Object.entries(o.profilo).map(([k, v]) => [k, v == null ? "" : String(v)])),
      fattori: o.fe.map((f) => ({
        key: f.id,
        gruppo: f.g,
        nome: f.n,
        um: f.um,
        fe: num(f.fe),
        feMarket: numOrNull(f.mkt),
        feBiogenic: numOrNull(f.bio),
        categoryKey: f.cat,
        sourceTypeKey: f.src,
        fonte: f.f || null,
      })),
      voci: o.voci.map((v) => ({
        idOriginale: v.id ?? null,
        anno: v.anno,
        categoryKey: v.cat,
        sourceTypeKey: v.src,
        sede: v.sede,
        descrizione: v.desc,
        factorKey: v.feId === "custom" ? null : v.feId,
        um: v.um,
        quantita: num(v.q),
        fe: num(v.fe),
        feMarket: numOrNull(v.feM),
        quotaGo: numOrNull(v.qGO),
        feBiogenic: numOrNull(v.feB),
        dq: v.dq,
        incertezza: numOrNull(v.inc),
        evidenza: v.ev,
        note: v.note,
      })),
      sorgenti: Object.fromEntries(
        Object.entries(o.sorgenti)
          .filter(([, s]) => s.st)
          .map(([k, s]) => [k, { stato: s.st!, motivazione: s.note ?? "" }]),
      ),
      metaAnnuali: Object.fromEntries(
        Object.entries(o.anni).map(([anno, m]) => [
          anno,
          { ricavi: numOrNull(m.ricavi), fte: numOrNull(m.fte), produzione: numOrNull(m.prod), umProduzione: (m.umProd as string) ?? "" },
        ]),
      ),
      obiettivi: o.obiettivi.map((b) => ({
        nome: b.n,
        ambito: (["1", "2", "12", "3", "tot"].includes(b.ambito) ? b.ambito : "tot") as "1" | "2" | "12" | "3" | "tot",
        annoTarget: Number(b.anno) || o.anno + 5,
        riduzionePct: num(b.rid),
        note: b.note,
      })),
      checklist: Object.fromEntries(
        Object.entries(o.verifica)
          .filter(([, s]) => s.st)
          .map(([k, s]) => [k, { stato: s.st!, nota: s.note ?? "" }]),
      ),
    })),
  };
}

// ---------------------------------------------------------------- Bilancio
const mediaPrototipo = z
  .object({
    t: z.enum(["img", "ch"]),
    src: z.string().optional(),
    ch: z.string().optional(),
    cap: z.string().optional().default(""),
    cred: z.string().optional().default(""),
    w: z.enum(["full", "half"]).optional().default("full"),
  })
  .loose();

const narrativaVoce = z.union([z.string(), z.object({ testo: z.string().optional().default(""), media: z.array(mediaPrototipo).optional().default([]) }).loose()]);

const aziendaPrototipo = z
  .object({
    id: z.string().optional(),
    nome: z.string(),
    anno: z.coerce.number().int(),
    profilo: z.record(z.string(), z.unknown()).optional().default({}),
    fattori: z.record(z.string(), z.union([z.string(), z.number()])).optional().default({}),
    dati: z.record(z.string(), z.record(z.string(), z.unknown())).optional().default({}),
    materialita: z.record(z.string(), z.object({ imp: z.union([z.string(), z.number()]).optional(), fin: z.union([z.string(), z.number()]).optional() }).loose()).optional().default({}),
    soglia: z.union([z.string(), z.number()]).optional().default(3),
    gestione: z.record(z.string(), z.record(z.string(), z.unknown())).optional().default({}),
    narrativa: z.record(z.string(), narrativaVoce).optional().default({}),
  })
  .loose();

const archivioBilancio = z.object({ aziende: z.array(aziendaPrototipo) }).loose();

export type BilancioImport = ReturnType<typeof parseBilancioExport>;

export function parseBilancioExport(json: unknown) {
  let aziende: z.infer<typeof aziendaPrototipo>[];
  const arch = archivioBilancio.safeParse(json);
  if (arch.success) {
    aziende = arch.data.aziende;
  } else {
    const single = aziendaPrototipo.safeParse(json);
    if (!single.success) {
      throw new Error("File non riconosciuto: atteso l'export del prototipo Bilancio (archivio {aziende:[…]} o singola azienda)");
    }
    aziende = [single.data];
  }

  return {
    aziende: aziende.map((a) => {
      const profilo = Object.fromEntries(
        Object.entries(a.profilo)
          .filter(([k]) => k !== "logo" && k !== "copertina")
          .map(([k, v]) => [k, v == null ? "" : String(v)]),
      );
      return {
        idOriginale: a.id ?? null,
        nome: a.nome,
        anno: a.anno,
        profilo,
        immagini: {
          logoDataUrl: typeof a.profilo.logo === "string" && a.profilo.logo.startsWith("data:") ? a.profilo.logo : null,
          coverDataUrl: typeof a.profilo.copertina === "string" && a.profilo.copertina.startsWith("data:") ? a.profilo.copertina : null,
        },
        fattori: Object.fromEntries(Object.entries(a.fattori).map(([k, v]) => [k, num(v)])),
        kpi: Object.fromEntries(
          Object.entries(a.dati).map(([anno, valori]) => [
            anno,
            Object.fromEntries(
              Object.entries(valori)
                .filter(([, v]) => v !== "" && v != null)
                .map(([k, v]) => [k, num(v as string | number)]),
            ),
          ]),
        ),
        materialita: Object.fromEntries(
          Object.entries(a.materialita).map(([k, m]) => [k, { imp: numOrNull(m.imp), fin: numOrNull(m.fin) }]),
        ),
        soglia: num(a.soglia),
        gestione: Object.fromEntries(
          Object.entries(a.gestione).map(([k, g]) => [
            k,
            Object.fromEntries(Object.entries(g).map(([kk, v]) => [kk, v == null ? "" : String(v)])),
          ]),
        ),
        narrativa: Object.fromEntries(
          Object.entries(a.narrativa).map(([k, v]) => {
            const obj = typeof v === "string" ? { testo: v, media: [] } : { testo: v.testo ?? "", media: v.media ?? [] };
            return [
              k,
              {
                testo: obj.testo,
                media: obj.media.map((m) => ({
                  tipo: m.t === "img" ? ("img" as const) : ("chart" as const),
                  dataUrl: m.t === "img" ? (m.src ?? null) : null,
                  chartKey: m.t === "ch" ? (m.ch ?? null) : null,
                  didascalia: m.cap,
                  credito: m.cred,
                  larghezza: m.w,
                })),
              },
            ];
          }),
        ),
      };
    }),
  };
}
