import { and, desc, eq } from "drizzle-orm";
import { company, companyContact } from "@/lib/db/schema";
import type { Tx } from "@/lib/db/tenant";
import { profiloAteco, type ProfiloAteco } from "@/lib/calc/ateco";

// L'anagrafica dell'azienda, letta UNA volta per tutti i percorsi.
//
// ⚠️ Prima di questo lettore, ragione sociale, P.IVA, ATECO, sede, settore e addetti si
// riscrivevano a mano in ogni percorso — fino a sedici volte — e nessun percorso leggeva
// la scheda dell'azienda. Ora i percorsi la COPIANO alla creazione, solo nei campi vuoti, e
// da lì in poi il dato è loro: un valore scritto a mano nel percorso non viene mai
// sovrascritto.
//
// ⚠️ NON È UN COLLEGAMENTO VIVO. `dipendenti` e `fatturato` del percorso sono i valori
// DELL'ESERCIZIO (vedi `tenancy.ts`): l'organico del 2024 con cui si è calcolata l'intensità
// di quell'anno. Legarli all'anagrafica corrente farebbe cambiare sotto i piedi il
// denominatore di un indicatore già consegnato. Si copia, una volta.
//
// Riceve la transazione: lo chiamano le funzioni che creano i percorsi, che ne hanno già una.

export type ProfiloAzienda = {
  nome: string;
  piva: string | null;
  settore: string | null;
  ateco: string | null;
  sede: string | null;
  nazione: string | null;
  dipendenti: number | null;
  /** In euro, come stringa decimale (numeric): mai float. */
  fatturato: string | null;
  sitoWeb: string | null;
  /** Il contatto di riferimento della rubrica, se c'è. */
  referente: { nome: string; ruolo: string | null; email: string | null } | null;
  /** Il profilo da cui nascono le proposte per codice ATECO, se il codice si legge. */
  profilo: ProfiloAteco | null;
};

export async function profiloAzienda(tx: Tx, orgId: string, companyId: string): Promise<ProfiloAzienda | null> {
  const [az] = await tx
    .select()
    .from(company)
    // Filtro esplicito oltre a RLS: i due strati si difendono a vicenda.
    .where(and(eq(company.id, companyId), eq(company.organizationId, orgId)))
    .limit(1);
  if (!az) return null;
  const [ref] = await tx
    .select({ nome: companyContact.nome, ruolo: companyContact.ruolo, email: companyContact.email })
    .from(companyContact)
    .where(and(eq(companyContact.companyId, companyId), eq(companyContact.organizationId, orgId)))
    .orderBy(desc(companyContact.principale))
    .limit(1);
  return {
    nome: az.nome,
    piva: az.piva,
    settore: az.settore,
    ateco: az.ateco,
    sede: az.sede,
    nazione: az.nazione,
    dipendenti: az.dipendenti,
    fatturato: az.fatturato,
    sitoWeb: az.sitoWeb,
    referente: ref ?? null,
    profilo: profiloAteco(az.ateco),
  };
}

/**
 * Un valore copiato dall'anagrafica SOLO dove il percorso è vuoto.
 *
 * Una stringa di soli spazi vale vuoto; zero NON vale vuoto (zero dipendenti è un dato).
 */
export function seVuoto<T>(attuale: T | null | undefined, daAnagrafica: T | null | undefined): T | null {
  const vuoto = attuale === null || attuale === undefined || (typeof attuale === "string" && attuale.trim() === "");
  return vuoto ? (daAnagrafica ?? null) : attuale;
}

/**
 * L'anagrafica nella forma in cui i percorsi la scrivono: testo, o assente.
 *
 * ⚠️ Un campo assente resta ASSENTE, non vuoto: chi inserisce scrive solo le chiavi presenti,
 * e una stringa vuota scritta d'ufficio sembrerebbe un campo compilato e lasciato in bianco.
 */
export function anagraficaInTesto(az: ProfiloAzienda | null): {
  piva?: string;
  sede?: string;
  settore?: string;
  ateco?: string;
  addetti?: string;
  sitoWeb?: string;
  /** Per l'autovalutazione ESG, che lo chiede «in milioni di €». */
  fatturatoMilioni?: string;
} {
  if (!az) return {};
  const out: ReturnType<typeof anagraficaInTesto> = {};
  if (az.piva?.trim()) out.piva = az.piva.trim();
  if (az.sede?.trim()) out.sede = az.sede.trim();
  if (az.settore?.trim()) out.settore = az.settore.trim();
  if (az.ateco?.trim()) out.ateco = az.ateco.trim();
  if (az.dipendenti != null) out.addetti = String(az.dipendenti);
  if (az.sitoWeb?.trim()) out.sitoWeb = az.sitoWeb.trim();
  if (az.fatturato != null) {
    // Milioni con la virgola e al massimo due decimali, come lo scriverebbe una persona:
    // 5200000 → «5,2». Aritmetica sui centesimi interi, mai float sugli euro.
    const centesimi = Math.round(Number(az.fatturato) * 100);
    const milioniPer100 = Math.round(centesimi / 1_000_000);
    out.fatturatoMilioni = (milioniPer100 / 100).toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
  }
  return out;
}
