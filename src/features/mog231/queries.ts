import { and, eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { company } from "@/lib/db/schema";
import { accettabile, livelloDelProcesso, rischioInerente, rischioResiduo } from "@/lib/calc/mog231/rischio";
import { idoneitaModello, idoneitaPilastro, valutati } from "@/lib/calc/mog231/idoneita";
import { SCALA_IMPATTO, SCALA_PROBABILITA } from "./validation";
import {
  getCatalogo,
  getModello,
  listaApplicabilita,
  listaProcessi,
  listaRequisiti,
  listaScenari,
} from "./modello";

// Il modello di lettura del Modello 231.
//
// Rischio inerente, rischio residuo, livello di processo e idoneità si CALCOLANO a ogni
// lettura dalle funzioni pure di `src/lib/calc/mog231`. Niente è persistito.

/**
 * Dal gradino numerico alla stringa che il motore legge.
 *
 * ⚠️ In UN POSTO SOLO. Il motore ragiona sulla forma «3 · grave» perché è quella del
 * catalogo; il database tiene un `smallint` perché è interrogabile. La conversione fra i
 * due mondi è l'unico punto in cui si toccano, e due copie divergerebbero in silenzio.
 */
export function scalaProbabilita(n: number | null): string {
  return n ? (SCALA_PROBABILITA[n - 1] ?? "") : "";
}
export function scalaImpatto(n: number | null): string {
  return n ? (SCALA_IMPATTO[n - 1] ?? "") : "";
}

export async function getMog231(userId: string, orgId: string, companyId: string) {
  // L'azienda si legge sempre: la pagina deve distinguere «non esiste o è di un altro
  // studio» — che è un 404 — da «il Modello non è ancora stato avviato».
  const [azienda] = await withTenant({ userId, orgId }, (tx) =>
    tx
      .select({ id: company.id, nome: company.nome, settore: company.settore, sede: company.sede })
      .from(company)
      .where(and(eq(company.id, companyId), eq(company.organizationId, orgId))),
  );
  if (!azienda) return null;

  const modello = await getModello(userId, orgId, companyId);
  if (!modello) return { azienda, modello: null } as const;

  const [catalogo, processi, applicabilita, statiRequisiti] = await Promise.all([
    getCatalogo(modello.contentSetId),
    listaProcessi(userId, orgId, modello.id),
    listaApplicabilita(userId, orgId, modello.id),
    listaRequisiti(userId, orgId, modello.id),
  ]);
  const scenari = await listaScenari(userId, orgId, processi.map((p) => p.id));

  const scenariCalcolati = scenari.map((s) => {
    const prob = scalaProbabilita(s.probabilita);
    const imp = scalaImpatto(s.impatto);
    // ⚠️ `adeguatezza` NULL diventa stringa vuota, e il motore la tratta come «Assenti».
    // La conversione avviene QUI e non nel database: nel documento «non dichiarato» e
    // «dichiarato assente» restano due fatti diversi.
    const adeg = s.adeguatezza ?? "";
    return {
      ...s,
      inerente: rischioInerente(prob, imp),
      residuo: rischioResiduo(prob, imp, adeg),
      accettabile: accettabile(prob, imp, adeg),
    };
  });

  const perProcesso = new Map<string, typeof scenariCalcolati>();
  for (const s of scenariCalcolati) {
    const elenco = perProcesso.get(s.processId) ?? [];
    elenco.push(s);
    perProcesso.set(s.processId, elenco);
  }

  const processiCalcolati = processi.map((p) => {
    const suoi = perProcesso.get(p.id) ?? [];
    return {
      ...p,
      scenari: suoi.length,
      nonAccettabili: suoi.filter((s) => !s.accettabile).length,
      livello: livelloDelProcesso(suoi.map((s) => s.residuo)),
    };
  });

  const statoPerChiave = new Map(statiRequisiti.map((r) => [r.requirementKey, r]));
  const pilastri = catalogo.pilastri.map((c) => {
    const requisiti = catalogo.requisiti.filter((r) => r.pillarKey === c.key);
    // ⚠️ Si passano gli stati di TUTTI i requisiti, compresi i vuoti: è ciò che fa
    // pesare zero un presidio dovuto e mai valutato.
    const stati = requisiti.map((r) => statoPerChiave.get(r.key)?.stato ?? null);
    return {
      ...c,
      requisiti: requisiti.length,
      valutati: valutati(stati),
      idoneita: idoneitaPilastro(stati),
    };
  });

  const appPerReato = new Map(applicabilita.map((a) => [a.crimeKey, a]));
  const applicabili = catalogo.reati.filter((r) => appPerReato.get(r.key)?.applicabile === "Sì");
  const copertiDaScenario = new Set(scenari.map((s) => s.crimeKey));

  return {
    azienda,
    modello,
    catalogo,
    processi: processiCalcolati,
    scenari: scenariCalcolati,
    applicabilita,
    statiRequisiti,
    pilastri,
    idoneita: idoneitaModello(pilastri.map((p) => p.idoneita)),
    indicatori: {
      processi: processi.length,
      scenari: scenari.length,
      nonAccettabili: scenariCalcolati.filter((s) => !s.accettabile).length,
      nonValutati: scenariCalcolati.filter((s) => s.residuo === null).length,
      reatiApplicabili: applicabili.length,
      reatiDaDeterminare: catalogo.reati.length - applicabilita.filter((a) => a.applicabile).length,
      // ⚠️ Un reato dichiarato applicabile e non associato a nessun processo e' una
      // lacuna del Modello: la mappatura dice DOVE quel reato puo' essere commesso, e
      // se non lo dice da nessuna parte il Modello non lo presidia.
      applicabiliSenzaScenario: applicabili.filter((r) => !copertiDaScenario.has(r.key)).length,
      requisitiValutati: pilastri.reduce((a, p) => a + p.valutati, 0),
      requisitiTotali: catalogo.requisiti.length,
    },
  };
}
