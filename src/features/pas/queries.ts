import { cache } from "react";
import { and, asc, desc, eq } from "drizzle-orm";
import { withTenant, dbCorrente } from "@/lib/db/tenant";
import {
  company,
  pasAttivita,
  pasAttivitaTipo,
  pasAudit,
  pasComunicazione,
  pasConsultazione,
  pasContenutoPolitica,
  pasEmergenza,
  pasFattore,
  pasFormazione,
  pasFornitore,
  pasGruppo,
  pasIndicatore,
  pasMisura,
  pasNonConformita,
  pasObiettivo,
  pasParte,
  pasParteTipo,
  pasReclamo,
  pasRequisito,
  pasRequisitoStato,
  pasRiesame,
  pasRischio,
  pasRischioTipo,
  pasScala,
  pasSezione,
  pasSystem,
} from "@/lib/db/schema";
import { latestPasSetId } from "./sistema";

// Le letture del percorso Sistema di gestione sociale. Una transazione sola, filtro esplicito
// sull'organizzazione in ogni select oltre a RLS, cataloghi letti con `dbCorrente()` dentro la
// stessa transazione (mai una seconda connessione: vedi il blocco del gruppo di connessioni
// del 30 settembre).

/** I cataloghi di un content set, nell'ordine. */
export async function leggiCatalogo(setId: string) {
  const d = dbCorrente();
  const [gruppi, requisiti, partiTipo, rischiTipo, scale, sezioni, indicatori, attivitaTipo, contenutiPolitica] = await Promise.all([
    d.select().from(pasGruppo).where(eq(pasGruppo.setId, setId)).orderBy(asc(pasGruppo.ordine)),
    d.select().from(pasRequisito).where(eq(pasRequisito.setId, setId)).orderBy(asc(pasRequisito.ordine)),
    d.select().from(pasParteTipo).where(eq(pasParteTipo.setId, setId)).orderBy(asc(pasParteTipo.ordine)),
    d.select().from(pasRischioTipo).where(eq(pasRischioTipo.setId, setId)).orderBy(asc(pasRischioTipo.ordine)),
    d.select().from(pasScala).where(eq(pasScala.setId, setId)).orderBy(asc(pasScala.asse), asc(pasScala.valore)),
    d.select().from(pasSezione).where(eq(pasSezione.setId, setId)).orderBy(asc(pasSezione.ordine)),
    d.select().from(pasIndicatore).where(eq(pasIndicatore.setId, setId)).orderBy(asc(pasIndicatore.ordine)),
    d.select().from(pasAttivitaTipo).where(eq(pasAttivitaTipo.setId, setId)).orderBy(asc(pasAttivitaTipo.ordine)),
    d.select().from(pasContenutoPolitica).where(eq(pasContenutoPolitica.setId, setId)).orderBy(asc(pasContenutoPolitica.ordine)),
  ]);
  return { setId, gruppi, requisiti, partiTipo, rischiTipo, scale, sezioni, indicatori, attivitaTipo, contenutiPolitica };
}

export type CatalogoPas = Awaited<ReturnType<typeof leggiCatalogo>>;

/**
 * Il percorso di un'azienda, con il catalogo del SUO content set. Senza radice restituisce
 * `sistema: null` e il catalogo corrente: la pagina mostra il percorso vuoto in sola lettura
 * e il comando «Avvia», e non scrive niente aprendosi.
 *
 * `cache()`: pagina, tour e pannello di pubblicazione possono chiederlo nella stessa
 * richiesta senza ripetere i viaggi.
 */
export const leggiPercorsoPas = cache(async (userId: string, orgId: string, companyId: string) => {
  return withTenant({ userId, orgId }, async (tx) => {
    const [azienda] = await tx
      .select({ id: company.id, nome: company.nome, stato: company.stato })
      .from(company)
      .where(and(eq(company.id, companyId), eq(company.organizationId, orgId)));
    if (!azienda) return null;

    const [sistema] = await tx
      .select()
      .from(pasSystem)
      .where(and(eq(pasSystem.companyId, companyId), eq(pasSystem.organizationId, orgId)));
    if (!sistema) {
      return { azienda, sistema: null, catalogo: await leggiCatalogo(await latestPasSetId()), righe: null };
    }

    const filtro = <T extends { systemId: unknown; organizationId: unknown }>(t: T) =>
      and(eq(t.systemId as never, sistema.id), eq(t.organizationId as never, orgId));
    // ⚠️ Dentro una transazione `Promise.all` non parallelizza (una connessione esegue
    // un'istruzione per volta): qui serve solo a scrivere le letture una volta sola.
    const [
      catalogo,
      fattori,
      parti,
      requisiti,
      rischi,
      fornitori,
      obiettivi,
      attivita,
      misure,
      reclami,
      nonConformita,
      formazione,
      emergenze,
      comunicazioni,
      consultazioni,
      audit,
      riesami,
    ] = await Promise.all([
      leggiCatalogo(sistema.contentSetId),
      tx.select().from(pasFattore).where(filtro(pasFattore)).orderBy(asc(pasFattore.ordine), asc(pasFattore.createdAt)),
      tx.select().from(pasParte).where(filtro(pasParte)).orderBy(asc(pasParte.ordine), asc(pasParte.createdAt)),
      tx.select().from(pasRequisitoStato).where(filtro(pasRequisitoStato)),
      tx.select().from(pasRischio).where(filtro(pasRischio)).orderBy(asc(pasRischio.ordine), asc(pasRischio.createdAt)),
      tx.select().from(pasFornitore).where(filtro(pasFornitore)).orderBy(asc(pasFornitore.ordine), asc(pasFornitore.createdAt)),
      tx.select().from(pasObiettivo).where(filtro(pasObiettivo)).orderBy(asc(pasObiettivo.ordine), asc(pasObiettivo.createdAt)),
      tx.select().from(pasAttivita).where(filtro(pasAttivita)).orderBy(asc(pasAttivita.mese), asc(pasAttivita.ordine)),
      tx.select().from(pasMisura).where(filtro(pasMisura)),
      tx.select().from(pasReclamo).where(filtro(pasReclamo)).orderBy(desc(pasReclamo.data), desc(pasReclamo.createdAt)),
      tx.select().from(pasNonConformita).where(filtro(pasNonConformita)).orderBy(desc(pasNonConformita.data), desc(pasNonConformita.createdAt)),
      tx.select().from(pasFormazione).where(filtro(pasFormazione)).orderBy(desc(pasFormazione.data), desc(pasFormazione.createdAt)),
      tx.select().from(pasEmergenza).where(filtro(pasEmergenza)).orderBy(desc(pasEmergenza.data), desc(pasEmergenza.createdAt)),
      tx.select().from(pasComunicazione).where(filtro(pasComunicazione)).orderBy(desc(pasComunicazione.data), desc(pasComunicazione.createdAt)),
      tx.select().from(pasConsultazione).where(filtro(pasConsultazione)).orderBy(desc(pasConsultazione.data), desc(pasConsultazione.createdAt)),
      tx.select().from(pasAudit).where(filtro(pasAudit)).orderBy(desc(pasAudit.data), desc(pasAudit.createdAt)),
      tx.select().from(pasRiesame).where(filtro(pasRiesame)).orderBy(desc(pasRiesame.data), desc(pasRiesame.createdAt)),
    ]);

    return {
      azienda,
      sistema,
      catalogo,
      righe: {
        fattori,
        parti,
        requisiti,
        rischi,
        fornitori,
        obiettivi,
        attivita,
        misure,
        reclami,
        nonConformita,
        formazione,
        emergenze,
        comunicazioni,
        consultazioni,
        audit,
        riesami,
      },
    };
  });
});

export type PercorsoPas = NonNullable<Awaited<ReturnType<typeof leggiPercorsoPas>>>;
export type PercorsoPasAvviato = PercorsoPas & { sistema: NonNullable<PercorsoPas["sistema"]>; righe: NonNullable<PercorsoPas["righe"]> };
