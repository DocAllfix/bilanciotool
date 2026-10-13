import { cache } from "react";
import { and, asc, desc, eq } from "drizzle-orm";
import { withTenant, dbCorrente } from "@/lib/db/tenant";
import {
  company,
  gdprAttivita,
  gdprAttivitaTipo,
  gdprContenutoPolitica,
  gdprCriterio,
  gdprDocumento,
  gdprDocumentoTipo,
  gdprFormazione,
  gdprFornitore,
  gdprGruppo,
  gdprIndicatore,
  gdprMisura,
  gdprRequisito,
  gdprRequisitoStato,
  gdprRichiesta,
  gdprRiesame,
  gdprScala,
  gdprSezione,
  gdprSystem,
  gdprTrattamento,
  gdprTrattamentoTipo,
  gdprVerifica,
  gdprVerificaAds,
  gdprViolazione,
} from "@/lib/db/schema";
import { latestGdprSetId } from "./sistema";

// Le letture del percorso Protezione dei dati. Una transazione sola, filtro esplicito
// sull'organizzazione in ogni select oltre a RLS, cataloghi letti con `dbCorrente()`
// dentro la stessa transazione (mai una seconda connessione: vedi il blocco del gruppo
// di connessioni del 30 settembre).

/** I cataloghi di un content set, nell'ordine. */
export async function leggiCatalogo(setId: string) {
  const d = dbCorrente();
  const [gruppi, requisiti, criteri, trattamentiTipo, scale, sezioni, indicatori, documentiTipo, attivitaTipo, contenutiPolitica] =
    await Promise.all([
      d.select().from(gdprGruppo).where(eq(gdprGruppo.setId, setId)).orderBy(asc(gdprGruppo.ordine)),
      d.select().from(gdprRequisito).where(eq(gdprRequisito.setId, setId)).orderBy(asc(gdprRequisito.ordine)),
      d.select().from(gdprCriterio).where(eq(gdprCriterio.setId, setId)).orderBy(asc(gdprCriterio.ordine)),
      d.select().from(gdprTrattamentoTipo).where(eq(gdprTrattamentoTipo.setId, setId)).orderBy(asc(gdprTrattamentoTipo.ordine)),
      d.select().from(gdprScala).where(eq(gdprScala.setId, setId)).orderBy(asc(gdprScala.asse), asc(gdprScala.valore)),
      d.select().from(gdprSezione).where(eq(gdprSezione.setId, setId)).orderBy(asc(gdprSezione.ordine)),
      d.select().from(gdprIndicatore).where(eq(gdprIndicatore.setId, setId)).orderBy(asc(gdprIndicatore.ordine)),
      d.select().from(gdprDocumentoTipo).where(eq(gdprDocumentoTipo.setId, setId)).orderBy(asc(gdprDocumentoTipo.ordine)),
      d.select().from(gdprAttivitaTipo).where(eq(gdprAttivitaTipo.setId, setId)).orderBy(asc(gdprAttivitaTipo.ordine)),
      d.select().from(gdprContenutoPolitica).where(eq(gdprContenutoPolitica.setId, setId)).orderBy(asc(gdprContenutoPolitica.ordine)),
    ]);
  return { setId, gruppi, requisiti, criteri, trattamentiTipo, scale, sezioni, indicatori, documentiTipo, attivitaTipo, contenutiPolitica };
}

export type CatalogoGdpr = Awaited<ReturnType<typeof leggiCatalogo>>;

/**
 * Il percorso di un'azienda, con il catalogo del SUO content set. Senza radice
 * restituisce `sistema: null` e il catalogo corrente: la pagina mostra il percorso vuoto
 * in sola lettura e il comando «Avvia», e non scrive niente aprendosi.
 *
 * `cache()`: pagina, tour e pannello di pubblicazione possono chiederlo nella stessa
 * richiesta senza ripetere i viaggi.
 */
export const leggiPercorsoGdpr = cache(async (userId: string, orgId: string, companyId: string) => {
  return withTenant({ userId, orgId }, async (tx) => {
    const [azienda] = await tx
      .select({ id: company.id, nome: company.nome, stato: company.stato })
      .from(company)
      .where(and(eq(company.id, companyId), eq(company.organizationId, orgId)));
    if (!azienda) return null;

    const [sistema] = await tx
      .select()
      .from(gdprSystem)
      .where(and(eq(gdprSystem.companyId, companyId), eq(gdprSystem.organizationId, orgId)));
    if (!sistema) {
      return { azienda, sistema: null, catalogo: await leggiCatalogo(await latestGdprSetId()), righe: null };
    }

    const per = { org: orgId, sys: sistema.id };
    const filtro = <T extends { systemId: unknown; organizationId: unknown }>(t: T) =>
      and(eq(t.systemId as never, per.sys), eq(t.organizationId as never, per.org));
    // ⚠️ Dentro una transazione `Promise.all` non parallelizza (una connessione esegue
    // un'istruzione per volta): qui serve solo a scrivere le letture una volta sola.
    const [catalogo, trattamenti, requisiti, fornitori, documenti, attivita, misure, richieste, violazioni, formazione, verifiche, verificheAds, riesami] =
      await Promise.all([
        leggiCatalogo(sistema.contentSetId),
        tx.select().from(gdprTrattamento).where(filtro(gdprTrattamento)).orderBy(asc(gdprTrattamento.ordine), asc(gdprTrattamento.createdAt)),
        tx.select().from(gdprRequisitoStato).where(filtro(gdprRequisitoStato)),
        tx.select().from(gdprFornitore).where(filtro(gdprFornitore)).orderBy(asc(gdprFornitore.ordine), asc(gdprFornitore.createdAt)),
        tx.select().from(gdprDocumento).where(filtro(gdprDocumento)).orderBy(asc(gdprDocumento.ordine), asc(gdprDocumento.createdAt)),
        tx.select().from(gdprAttivita).where(filtro(gdprAttivita)).orderBy(asc(gdprAttivita.mese), asc(gdprAttivita.ordine)),
        tx.select().from(gdprMisura).where(filtro(gdprMisura)),
        tx.select().from(gdprRichiesta).where(filtro(gdprRichiesta)).orderBy(desc(gdprRichiesta.ricevutaIl), desc(gdprRichiesta.createdAt)),
        tx.select().from(gdprViolazione).where(filtro(gdprViolazione)).orderBy(desc(gdprViolazione.conoscenzaIl), desc(gdprViolazione.createdAt)),
        tx.select().from(gdprFormazione).where(filtro(gdprFormazione)).orderBy(desc(gdprFormazione.data), desc(gdprFormazione.createdAt)),
        tx.select().from(gdprVerifica).where(filtro(gdprVerifica)).orderBy(desc(gdprVerifica.data), desc(gdprVerifica.createdAt)),
        tx.select().from(gdprVerificaAds).where(filtro(gdprVerificaAds)).orderBy(desc(gdprVerificaAds.data), desc(gdprVerificaAds.createdAt)),
        tx.select().from(gdprRiesame).where(filtro(gdprRiesame)).orderBy(desc(gdprRiesame.data), desc(gdprRiesame.createdAt)),
      ]);

    return {
      azienda,
      sistema,
      catalogo,
      righe: { trattamenti, requisiti, fornitori, documenti, attivita, misure, richieste, violazioni, formazione, verifiche, verificheAds, riesami },
    };
  });
});

export type PercorsoGdpr = NonNullable<Awaited<ReturnType<typeof leggiPercorsoGdpr>>>;
export type PercorsoGdprAvviato = PercorsoGdpr & { sistema: NonNullable<PercorsoGdpr["sistema"]>; righe: NonNullable<PercorsoGdpr["righe"]> };
