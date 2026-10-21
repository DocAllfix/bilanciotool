import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { Arrivo } from "@/lib/calc/arrivi";

// Il conteggio degli arrivi da campagna. Il perché sta nello schema (`arrivoCampagna`).
//
// ⚠️ `db` e non `withTenant`: la tabella non ha organizzazione (passthrough come
// `rate_limit`), la rotta che scrive non ha sessione, e la pagina che legge è dello staff.

/** Quanti arrivi al giorno, al massimo, prima che la rotta smetta di contare. Il traffico
 *  vero da campagna è di decine al giorno: il tetto serve solo a non far crescere la tabella
 *  all'infinito se qualcuno la bombarda con campagne inventate. */
export const MASSIMO_ARRIVI_AL_GIORNO = 5000;

/** Conta un arrivo, in UNA istruzione: due arrivi insieme non si perdono a vicenda. */
export async function registraArrivo(giorno: string, a: Arrivo): Promise<void> {
  await db.execute(sql`
    insert into arrivo_campagna (giorno, sorgente, mezzo, campagna, clic_ads, pagina, conteggio)
    values (${giorno}, ${a.sorgente}, ${a.mezzo}, ${a.campagna}, ${a.clicAds}, ${a.pagina}, 1)
    on conflict (giorno, sorgente, mezzo, campagna, clic_ads, pagina)
    do update set conteggio = arrivo_campagna.conteggio + 1
  `);
}

export type RigaArrivi = {
  giorno: string;
  sorgente: string;
  mezzo: string;
  campagna: string;
  clicAds: boolean;
  pagina: string;
  conteggio: number;
};

/** Le righe degli ultimi `giorni` giorni, a partire da `finoA` compreso. */
export async function arriviRecenti(finoA: string, giorni: number): Promise<RigaArrivi[]> {
  const righe = await db.execute<{
    giorno: string;
    sorgente: string;
    mezzo: string;
    campagna: string;
    clic_ads: boolean;
    pagina: string;
    conteggio: number;
  }>(sql`
    select to_char(giorno, 'YYYY-MM-DD') as giorno, sorgente, mezzo, campagna, clic_ads, pagina, conteggio
    from arrivo_campagna
    where giorno <= ${finoA}::date and giorno > ${finoA}::date - ${giorni}::int
    order by giorno desc, conteggio desc
  `);
  return (righe as unknown as Array<Record<string, unknown>>).map((r) => ({
    giorno: String(r.giorno),
    sorgente: String(r.sorgente),
    mezzo: String(r.mezzo),
    campagna: String(r.campagna),
    clicAds: Boolean(r.clic_ads),
    pagina: String(r.pagina),
    conteggio: Number(r.conteggio),
  }));
}
