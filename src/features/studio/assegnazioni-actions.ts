"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/db/tenant";
import { assegnazionePercorso, member } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { requireStudioAdmin } from "@/features/auth/guards";
import { usoInterno } from "@/features/auth/percorsi";
import { MODULI } from "@/features/companies/moduli";
import { daErrore, type ActionEsito } from "@/features/esito";

// Fascia «Azienda»: l'amministratore assegna i percorsi ai collaboratori, uno per volta.
//
// ⚠️ UN'ASSEGNAZIONE PER CHIAMATA, con lo stato voluto (acceso o spento), mai l'elenco
// intero. Rimandare l'elenco letto dalle props cancellerebbe ciò che un altro amministratore
// ha appena assegnato: è il difetto della lettura-modifica-scrittura che questo progetto ha
// già pagato quattro volte.
//
// ⚠️ Lo si fa solo nella fascia «Azienda»: in uno studio ognuno vede tutto il portafoglio, e
// un'assegnazione lì non avrebbe effetto — cioè prometterebbe una restrizione inesistente.

const assegnaSchema = z.object({
  userId: z.string().min(1),
  modulo: z.enum(MODULI),
  acceso: z.boolean(),
});

export async function assegnaPercorsoAction(input: z.input<typeof assegnaSchema>): Promise<ActionEsito> {
  try {
    const s = await requireStudioAdmin();
    const p = assegnaSchema.parse(input);
    if (!(await usoInterno(s.userId, s.orgId))) {
      throw new Error("I percorsi si assegnano alle persone solo nella fascia «Azienda».");
    }
    await withTenant({ userId: s.userId, orgId: s.orgId }, async (tx) => {
      const [m] = await tx
        .select({ role: member.role })
        .from(member)
        .where(and(eq(member.organizationId, s.orgId), eq(member.userId, p.userId)))
        .limit(1);
      if (!m) throw new Error("Questa persona non fa parte dell'azienda.");
      if (m.role !== "member") throw new Error("Gli amministratori vedono già tutti i percorsi.");
      if (p.acceso) {
        await tx
          .insert(assegnazionePercorso)
          .values({ id: randomUUID(), organizationId: s.orgId, userId: p.userId, modulo: p.modulo, createdBy: s.userId })
          .onConflictDoNothing();
      } else {
        await tx
          .delete(assegnazionePercorso)
          .where(
            and(
              eq(assegnazionePercorso.organizationId, s.orgId),
              eq(assegnazionePercorso.userId, p.userId),
              eq(assegnazionePercorso.modulo, p.modulo),
            ),
          );
      }
      await logAudit(tx, {
        organizationId: s.orgId,
        userId: s.userId,
        azione: p.acceso ? "percorso.assegna" : "percorso.revoca",
        entita: "member",
        entitaId: p.userId,
        dettagli: { modulo: p.modulo },
      });
    });
    revalidatePath("/impostazioni/membri");
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}

const ruoloSchema = z.object({ memberId: z.string().min(1), ruolo: z.enum(["admin", "member"]) });

/**
 * Amministratore o collaboratore. Il titolare non si tocca: lo impedisce già Better Auth, e
 * lo si ripete qui perché il messaggio arrivi in italiano.
 */
export async function cambiaRuoloAction(input: z.input<typeof ruoloSchema>): Promise<ActionEsito> {
  try {
    const s = await requireStudioAdmin();
    const p = ruoloSchema.parse(input);
    const [m] = await withTenant({ userId: s.userId, orgId: s.orgId }, (tx) =>
      tx
        .select({ role: member.role, userId: member.userId })
        .from(member)
        .where(and(eq(member.id, p.memberId), eq(member.organizationId, s.orgId)))
        .limit(1),
    );
    if (!m) throw new Error("Questa persona non fa parte dell'azienda.");
    if (m.role === "owner") throw new Error("Il ruolo del titolare non si cambia.");
    if (m.userId === s.userId) throw new Error("Non puoi cambiare il tuo stesso ruolo.");
    await auth.api.updateMemberRole({
      headers: await headers(),
      body: { memberId: p.memberId, role: p.ruolo, organizationId: s.orgId },
    });
    await withTenant({ userId: s.userId, orgId: s.orgId }, (tx) =>
      logAudit(tx, {
        organizationId: s.orgId,
        userId: s.userId,
        azione: "membro.ruolo",
        entita: "member",
        entitaId: m.userId,
        dettagli: { ruolo: p.ruolo },
      }),
    );
    revalidatePath("/impostazioni/membri");
    return { ok: true };
  } catch (e) {
    return daErrore(e);
  }
}
