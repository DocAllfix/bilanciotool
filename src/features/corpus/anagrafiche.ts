import { and, eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import {
  briberySystem,
  chainProgram,
  mogModel,
  qasSystem,
  saSystem,
  wbSystem,
} from "@/lib/db/schema";
import { anagraficaCorpusPc } from "@/features/anticorruzione/anagrafica-corpus";
import { anagraficaCorpusFiliera } from "@/features/filiera/anagrafica-corpus";
import { anagraficaCorpus231 } from "@/features/mog231/anagrafica-corpus";
import { anagraficaCorpusSa } from "@/features/sa8000/anagrafica-corpus";
import { anagraficaCorpus } from "@/features/segnalazioni/anagrafica-corpus";
import { anagraficaCorpusQas } from "@/features/sgiqas/anagrafica-corpus";

// L'anagrafica che riempie i segnaposto, per edizione del corpus.
//
// ⚠️ Serve a chi il modulo NON lo conosce: la pagina di stampa riceve un'azienda e un
// codice di documento, e deve sapere dove pescare ragione sociale, sede e revisione. Ogni
// modulo lo sa per conto suo — le sue funzioni `anagraficaCorpus*` esistono da prima — ma
// nessuno sapeva scegliere fra le sei.
//
// ⚠️ Un `Record` e non uno `switch` sparso: aggiungendo un settimo modulo col corpus, la
// riga da aggiungere è una sola e sta qui. Se manca, la stampa lo dice invece di
// produrre un documento con tutti i segnaposto in bianco — che è il modo peggiore di
// sbagliare, perché sembra un dato mancante del cliente.

type Caricatore = (
  userId: string,
  orgId: string,
  companyId: string,
) => Promise<Record<string, string | null | undefined> | null>;

const uno = <T,>(righe: T[]): T | null => righe[0] ?? null;

export const ANAGRAFICHE_CORPUS: Record<string, Caricatore> = {
  "iso37001-v1": async (userId, orgId, companyId) => {
    const r = uno(
      await withTenant({ userId, orgId }, (tx) =>
        tx
          .select()
          .from(briberySystem)
          .where(and(eq(briberySystem.companyId, companyId), eq(briberySystem.organizationId, orgId))),
      ),
    );
    return r ? anagraficaCorpusPc(r) : null;
  },
  "mog231-v1": async (userId, orgId, companyId) => {
    const r = uno(
      await withTenant({ userId, orgId }, (tx) =>
        tx
          .select()
          .from(mogModel)
          .where(and(eq(mogModel.companyId, companyId), eq(mogModel.organizationId, orgId))),
      ),
    );
    return r ? anagraficaCorpus231(r) : null;
  },
  "wb-v1": async (userId, orgId, companyId) => {
    const r = uno(
      await withTenant({ userId, orgId }, (tx) =>
        tx
          .select()
          .from(wbSystem)
          .where(and(eq(wbSystem.companyId, companyId), eq(wbSystem.organizationId, orgId))),
      ),
    );
    return r ? anagraficaCorpus(r) : null;
  },
  "sgiqas-v1": async (userId, orgId, companyId) => {
    const r = uno(
      await withTenant({ userId, orgId }, (tx) =>
        tx
          .select()
          .from(qasSystem)
          .where(and(eq(qasSystem.companyId, companyId), eq(qasSystem.organizationId, orgId))),
      ),
    );
    return r ? anagraficaCorpusQas(r) : null;
  },
  "sa8000-v1": async (userId, orgId, companyId) => {
    const r = uno(
      await withTenant({ userId, orgId }, (tx) =>
        tx
          .select()
          .from(saSystem)
          .where(and(eq(saSystem.companyId, companyId), eq(saSystem.organizationId, orgId))),
      ),
    );
    return r ? anagraficaCorpusSa(r) : null;
  },
  "filiera-v1": async (userId, orgId, companyId) => {
    const r = uno(
      await withTenant({ userId, orgId }, (tx) =>
        tx
          .select()
          .from(chainProgram)
          .where(and(eq(chainProgram.companyId, companyId), eq(chainProgram.organizationId, orgId))),
      ),
    );
    return r ? anagraficaCorpusFiliera(r) : null;
  },
};

/** L'anagrafica per questa edizione, o `null` se il modulo non è avviato per l'azienda. */
export async function anagraficaPerEdizione(
  userId: string,
  orgId: string,
  companyId: string,
  contentSetId: string,
): Promise<Record<string, string | null | undefined> | null> {
  const caricatore = ANAGRAFICHE_CORPUS[contentSetId];
  if (!caricatore) return null;
  return caricatore(userId, orgId, companyId);
}
