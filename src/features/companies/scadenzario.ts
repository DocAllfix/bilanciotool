import { withTenant } from "@/lib/db/tenant";
import {
  company,
  documentSnapshot,
  ghgInventory,
  reportProject,
  energyBalance,
  supplierAssessment,
  soaDeclaration, briberySystem } from "@/lib/db/schema";
import { MODULI_AZIENDA, type ModuloAzienda } from "./moduli";
import { and, desc, eq, max } from "drizzle-orm";

// Che cosa resta da fare, sul portafoglio intero.
//
// Sostituisce la somma delle tCO₂e di tutte le aziende, che era un numero senza
// domanda: addizionare una fonderia e uno studio di software produce una cifra
// su cui nessuno può decidere niente, perché quelle emissioni non sono dello
// studio ma di clienti diversi fra loro.
//
// Il consulente, la mattina, si chiede altro: chi è indietro, cosa ho lasciato
// a metà, cosa va aggiornato. Sono domande da elenco.
//
// Costo: sei query aggregate per l'intero portafoglio, nessun ciclo per azienda
// e nessun motore di calcolo eseguito. Questa pagina serve a scegliere dove
// andare, non a calcolare.

export type MotivoScadenza = "mai-avviato" | "da-pubblicare" | "esercizio-mancante";

export type VoceScadenzario = {
  companyId: string;
  companyNome: string;
  isDemo: boolean;
  modulo: ModuloAzienda;
  moduloNome: string;
  motivo: MotivoScadenza;
  /** Esercizio a cui si riferisce la voce, per i moduli annuali. */
  anno: number | null;
  href: string;
  /** Più basso = più urgente. */
  priorita: number;
};

const MOTIVO_TESTO: Record<MotivoScadenza, string> = {
  "esercizio-mancante": "ultimo esercizio da aprire",
  "da-pubblicare": "avviato, mai pubblicato",
  "mai-avviato": "mai avviato",
};

export function testoMotivo(m: MotivoScadenza): string {
  return MOTIVO_TESTO[m];
}

export async function getScadenzario(userId: string, orgId: string): Promise<VoceScadenzario[]> {
  // L'esercizio che ci si aspetta di trovare chiuso: quello scorso.
  const annoDaRendicontare = new Date().getFullYear() - 1;

  // Ogni select porta il proprio filtro sull'organizzazione, in aggiunta alle
  // policy RLS. In sviluppo la connessione e privilegiata e le policy non
  // scattano: senza il filtro esplicito questa pagina mostrava le aziende di
  // TUTTI gli studi, e in produzione sarebbe passata inosservata perche li RLS
  // avrebbe coperto il difetto. La difesa deve stare in tutti e due gli strati.
  return withTenant({ userId, orgId }, async (tx) => {
    const perCompany = <T extends { companyId: string }>(righe: T[]) => new Map(righe.map((r) => [r.companyId, r]));

    const [aziende, ghg, bil, ene, sup, soa, pc, docs] = await Promise.all([
      tx
        .select({ id: company.id, nome: company.nome, isDemo: company.isDemo })
        .from(company)
        .where(and(eq(company.organizationId, orgId), eq(company.stato, "active")))
        .orderBy(desc(company.createdAt)),
      tx
        .select({ companyId: ghgInventory.companyId, anno: max(ghgInventory.anno) })
        .from(ghgInventory)
        .where(eq(ghgInventory.organizationId, orgId))
        .groupBy(ghgInventory.companyId),
      tx
        .select({ companyId: reportProject.companyId, anno: max(reportProject.anno) })
        .from(reportProject)
        .where(eq(reportProject.organizationId, orgId))
        .groupBy(reportProject.companyId),
      tx
        .select({ companyId: energyBalance.companyId, anno: max(energyBalance.anno) })
        .from(energyBalance)
        .where(eq(energyBalance.organizationId, orgId))
        .groupBy(energyBalance.companyId),
      tx
        .select({ companyId: supplierAssessment.companyId })
        .from(supplierAssessment)
        .where(eq(supplierAssessment.organizationId, orgId)),
      tx
        .select({ companyId: soaDeclaration.companyId })
        .from(soaDeclaration)
        .where(eq(soaDeclaration.organizationId, orgId)),
      tx
        .select({ companyId: briberySystem.companyId })
        .from(briberySystem)
        .where(eq(briberySystem.organizationId, orgId)),
      tx
        .select({
          companyId: documentSnapshot.companyId,
          tipo: documentSnapshot.tipo,
          anno: max(documentSnapshot.anno),
        })
        .from(documentSnapshot)
        .where(eq(documentSnapshot.organizationId, orgId))
        .groupBy(documentSnapshot.companyId, documentSnapshot.tipo),
    ]);

    const radici = {
      ghg: perCompany(ghg),
      bilancio: perCompany(bil),
      energetico: perCompany(ene),
      fornitore: perCompany(sup),
      soa: perCompany(soa),
      anticorruzione: perCompany(pc),
    } as const;

    // Chiave `companyId|tipo` → anno massimo pubblicato.
    const pubblicati = new Map(docs.map((d) => [`${d.companyId}|${d.tipo}`, d.anno ?? 0]));

    const voci: VoceScadenzario[] = [];
    for (const a of aziende) {
      for (const m of MODULI_AZIENDA) {
        const radice = radici[m.href].get(a.id) as { anno?: number | null } | undefined;
        const base = `/aziende/${a.id}/${m.href}`;
        const annoPubblicato = pubblicati.get(`${a.id}|${m.documenti[0]}`) ?? null;

        if (!radice) {
          // Mai avviato: è un promemoria, non un ritardo. Sta in fondo.
          voci.push({
            companyId: a.id,
            companyNome: a.nome,
            isDemo: a.isDemo,
            modulo: m.href,
            moduloNome: m.nome,
            motivo: "mai-avviato",
            anno: null,
            href: base,
            priorita: 30,
          });
          continue;
        }

        const anno = m.perEsercizio ? (radice.anno ?? null) : null;

        // Annuale rimasto indietro. La soglia è l'anno SCORSO, non quello in
        // corso: la rendicontazione dell'esercizio N si redige durante l'anno
        // N+1, quindi ad agosto 2026 avere l'inventario 2025 è il normale, non
        // un ritardo. Si segnala solo chi è fermo a prima di quello.
        if (m.perEsercizio && anno !== null && anno < annoDaRendicontare) {
          voci.push({
            companyId: a.id,
            companyNome: a.nome,
            isDemo: a.isDemo,
            modulo: m.href,
            moduloNome: m.nome,
            motivo: "esercizio-mancante",
            anno: annoDaRendicontare,
            href: base,
            // Più vecchio l'ultimo esercizio, più in alto la voce.
            priorita: 10 - (annoDaRendicontare - anno),
          });
          continue;
        }

        // Avviato e mai pubblicato: il lavoro lasciato a metà.
        const pubblicatoPerQuestoAnno = m.perEsercizio ? annoPubblicato === anno : annoPubblicato !== null;
        if (!pubblicatoPerQuestoAnno) {
          voci.push({
            companyId: a.id,
            companyNome: a.nome,
            isDemo: a.isDemo,
            modulo: m.href,
            moduloNome: m.nome,
            motivo: "da-pubblicare",
            anno,
            href: m.perEsercizio && anno !== null ? `${base}/${anno}` : base,
            priorita: 20,
          });
        }
      }
    }

    // Le aziende dimostrative in fondo: sono per provare, non per consegnare.
    return voci.sort(
      (x, y) =>
        Number(x.isDemo) - Number(y.isDemo) ||
        x.priorita - y.priorita ||
        x.companyNome.localeCompare(y.companyNome, "it"),
    );
  });
}
