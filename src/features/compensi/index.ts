import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { withTenant } from "@/lib/db/tenant";
import { company, compenso, compensoIncasso } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireEntitlement } from "@/features/entitlement";
import { dataIsoValida } from "@/features/sgesg/programma";
// ⚠️ L'aritmetica del denaro sta in un modulo PURO, e ci sta per necessità: il
// componente della pagina è `"use client"` e importa `euro`. Tenendola qui,
// importarla dal browser trascinava `postgres` nel bundle e il build si fermava con
// «Can't resolve 'fs'». Si ri-esporta, così chi sta sul server ha un import solo.
import { aCentesimi, euro, riepilogo, type Riepilogo, type StatoCompenso } from "@/lib/calc/compensi/importi";
export { aCentesimi, euro, riepilogo };
export type { Riepilogo, StatoCompenso };

// I compensi dello studio.
//
// ⚠️ Questo modulo NON viene importato da `features/condivisione` né da nessuna rotta del
// portale cliente, ed è la sua difesa principale. Il portale serve i documenti di
// un'azienda a chi ha il collegamento, senza sessione: un importo che ci arrivasse
// sarebbe il prezzo di uno studio visibile al cliente che lo paga. Un pericolo si evita,
// non si filtra.
//
// ⚠️ Tutti gli importi sono in CENTESIMI, interi. Un totale è una somma di interi e resta
// esatto; con i decimali in virgola mobile «tre acconti da 333,33» non fanno mai 1000.

export type Compenso = typeof compenso.$inferSelect;
export type Incasso = typeof compensoIncasso.$inferSelect;

export type VoceCompenso = Compenso & {
  companyNome: string;
  incassi: Incasso[];
  /** Somma degli acconti, in centesimi. */
  incassato: number;
  /** `importo - incassato`, mai negativo: un acconto in eccesso non è un debito. */
  residuo: number;
};


export async function elencaCompensi(userId: string, orgId: string): Promise<VoceCompenso[]> {
  return withTenant({ userId, orgId }, async (tx) => {
    const righe = await tx
      .select()
      .from(compenso)
      .where(eq(compenso.organizationId, orgId))
      .orderBy(asc(compenso.scadenza), desc(compenso.createdAt));
    if (!righe.length) return [];

    // I nomi e gli incassi in DUE letture, non due per compenso: su questo database un
    // viaggio costa più della lettura.
    const [nomi, incassi] = await Promise.all([
      tx
        .select({ id: company.id, nome: company.nome })
        .from(company)
        .where(
          and(
            inArray(company.id, [...new Set(righe.map((r) => r.companyId))]),
            eq(company.organizationId, orgId),
          ),
        ),
      tx
        .select()
        .from(compensoIncasso)
        .where(
          and(
            inArray(compensoIncasso.compensoId, righe.map((r) => r.id)),
            eq(compensoIncasso.organizationId, orgId),
          ),
        )
        .orderBy(asc(compensoIncasso.data)),
    ]);

    const perAzienda = new Map(nomi.map((c) => [c.id, c.nome]));
    const perCompenso = new Map<string, Incasso[]>();
    for (const i of incassi) {
      const a = perCompenso.get(i.compensoId) ?? [];
      a.push(i);
      perCompenso.set(i.compensoId, a);
    }

    return righe.map((r) => {
      const suoi = perCompenso.get(r.id) ?? [];
      const incassato = suoi.reduce((n, i) => n + i.importo, 0);
      return {
        ...r,
        companyNome: perAzienda.get(r.companyId) ?? "—",
        incassi: suoi,
        incassato,
        // ⚠️ Mai negativo: un acconto in eccesso — un arrotondamento, un bonifico
        // sbagliato — non è un debito dello studio verso il cliente, e mostrarlo come
        // tale metterebbe un meno in una colonna che si somma.
        residuo: Math.max(0, r.importo - incassato),
      };
    });
  });
}

export async function creaCompenso(
  userId: string,
  orgId: string,
  dati: { companyId: string; descrizione: string; importo: number; scadenza?: string | null; note?: string | null },
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  const descrizione = dati.descrizione.trim();
  if (!descrizione) throw new Error("La descrizione non puo' essere vuota");
  if (!Number.isInteger(dati.importo) || dati.importo < 0) throw new Error("L'importo non e' valido");
  if (dati.scadenza && !dataIsoValida(dati.scadenza)) {
    throw new Error("La scadenza va scritta come AAAA-MM-GG e deve esistere");
  }

  const id = randomUUID();
  await withTenant({ userId, orgId }, async (tx) => {
    const [az] = await tx
      .select({ id: company.id })
      .from(company)
      .where(and(eq(company.id, dati.companyId), eq(company.organizationId, orgId)))
      .limit(1);
    if (!az) throw new Error("Azienda inesistente o di un altro studio");

    await tx.insert(compenso).values({
      id,
      organizationId: orgId,
      companyId: dati.companyId,
      descrizione,
      importo: dati.importo,
      scadenza: dati.scadenza ?? null,
      note: dati.note?.trim() || null,
      creatoDa: userId,
    });
    // ⚠️ L'audit NON riporta l'importo. Questa cronologia si vede nel quadro dello studio,
    // e un socio che apre la dashboard vedrebbe quanto e' stato chiesto a un cliente che
    // non segue. Che sia stato registrato un compenso basta.
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "compenso.create",
      entita: "compenso",
      entitaId: id,
    });
  });
  return id;
}

export type CampoCompenso = "descrizione" | "importo" | "scadenza" | "note" | "stato";

export async function setCampoCompenso(
  userId: string,
  orgId: string,
  compensoId: string,
  campo: CampoCompenso,
  valore: string | null,
): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  const v = valore?.trim() || null;

  let da: string | number | null = v;
  if (campo === "descrizione") {
    if (!v) throw new Error("La descrizione non puo' essere vuota");
  }
  if (campo === "importo") {
    const c = v === null ? null : aCentesimi(v);
    if (c === null) throw new Error("L'importo non e' valido");
    da = c;
  }
  if (campo === "scadenza" && v && !dataIsoValida(v)) {
    throw new Error("La scadenza va scritta come AAAA-MM-GG e deve esistere");
  }
  if (campo === "stato") {
    if (!v || !["previsto", "concordato", "fatturato", "incassato"].includes(v)) {
      throw new Error("Stato non riconosciuto");
    }
  }

  await withTenant({ userId, orgId }, async (tx) => {
    const tocca = await tx
      .update(compenso)
      .set({ [campo]: da, updatedAt: new Date() })
      .where(and(eq(compenso.id, compensoId), eq(compenso.organizationId, orgId)))
      .returning({ id: compenso.id });
    if (!tocca.length) throw new Error("Compenso inesistente o di un altro studio");
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "compenso.set",
      entita: "compenso",
      entitaId: compensoId,
      dettagli: { campo },
    });
  });
}

/** Registra un acconto. Una riga, non un totale che si riscrive. */
export async function registraIncasso(
  userId: string,
  orgId: string,
  compensoId: string,
  dati: { importo: number; data: string; note?: string | null },
): Promise<string> {
  await requireEntitlement(userId, orgId, "write_data");
  if (!Number.isInteger(dati.importo) || dati.importo <= 0) throw new Error("L'importo non e' valido");
  if (!dataIsoValida(dati.data)) throw new Error("La data va scritta come AAAA-MM-GG e deve esistere");

  const id = randomUUID();
  await withTenant({ userId, orgId }, async (tx) => {
    const [c] = await tx
      .select({ id: compenso.id })
      .from(compenso)
      .where(and(eq(compenso.id, compensoId), eq(compenso.organizationId, orgId)))
      .limit(1);
    if (!c) throw new Error("Compenso inesistente o di un altro studio");
    await tx.insert(compensoIncasso).values({
      id,
      organizationId: orgId,
      compensoId,
      importo: dati.importo,
      data: dati.data,
      note: dati.note?.trim() || null,
    });
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "compenso.incasso",
      entita: "compenso_incasso",
      entitaId: id,
    });
  });
  return id;
}

export async function eliminaIncasso(userId: string, orgId: string, incassoId: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const tolto = await tx
      .delete(compensoIncasso)
      .where(and(eq(compensoIncasso.id, incassoId), eq(compensoIncasso.organizationId, orgId)))
      .returning({ id: compensoIncasso.id });
    if (!tolto.length) throw new Error("Incasso inesistente o di un altro studio");
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "compenso.incasso.delete",
      entita: "compenso_incasso",
      entitaId: incassoId,
    });
  });
}

export async function eliminaCompenso(userId: string, orgId: string, compensoId: string): Promise<void> {
  await requireEntitlement(userId, orgId, "write_data");
  await withTenant({ userId, orgId }, async (tx) => {
    const tolto = await tx
      .delete(compenso)
      .where(and(eq(compenso.id, compensoId), eq(compenso.organizationId, orgId)))
      .returning({ id: compenso.id });
    if (!tolto.length) throw new Error("Compenso inesistente o di un altro studio");
    await logAudit(tx, {
      organizationId: orgId,
      userId,
      azione: "compenso.delete",
      entita: "compenso",
      entitaId: compensoId,
    });
  });
}
