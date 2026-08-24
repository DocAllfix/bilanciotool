import { and, eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { chainPartner, chainProgram } from "@/lib/db/schema";
import { RAPPORTI_VIVI, type StatoRapporto } from "@/features/filiera/validation";

// Il ponte leggero fra la Due diligence di filiera e l'Autovalutazione ESG.
//
// ⚠️ È **dentro un solo tenant**: legge il programma di filiera della STESSA azienda per
// suggerire le risposte dell'area «Catena di fornitura» della sua autovalutazione. Non
// c'è nessun consenso da chiedere perché non si attraversa nessun confine — sono dati
// che quello studio ha già scritto per quella azienda.
//
// ⚠️ Il ponte PESANTE è un'altra cosa e non si costruisce adesso: quando un partner è a
// sua volta cliente di EvalisDeck, l'acquirente riceve la sua autovalutazione invece di
// ridigitarla. Paga solo quando **entrambe** le estremità sono clienti, e con la base
// attuale la probabilità che il fornitore di un cliente sia anch'esso cliente è vicina a
// zero: costruire ora il flusso di consenso — schermata, notifica, revoca, testo privacy
// — sarebbe una funzione con zero utenti possibili, da mantenere. La chiave però c'è già
// (`chain_partner.piva`), che è l'unica parte che il tempo rende più cara.
//
// ⚠️ E quando si costruirà, la regola da non riscoprire: la mappatura deve **saturare a
// 3** finché la verifica documentale non è compilata. Il 4 significa «documentato,
// applicato e verificato», e una dichiarazione del fornitore non è una verifica di chi la
// riceve.
//
// ⚠️ I suggerimenti NON si scrivono d'ufficio. Sono proposte che il consulente accetta o
// scarta, come i suggerimenti di materialità per ATECO: una risposta comparsa da sola in
// un'autovalutazione che qualcuno firma è una risposta che nessuno ha dato.

export type Suggerimento = {
  /** La domanda dell'area «Catena di fornitura». */
  chiave: string;
  /** La risposta proposta. */
  risposta: "si" | "parziale" | "no";
  /** Perché: si mostra accanto alla proposta, e senza non si accetta niente a scatola chiusa. */
  motivo: string;
};

/**
 * Che cosa il programma di filiera dice, tradotto nelle domande dell'autovalutazione.
 *
 * Vuoto quando il modulo filiera non è avviato: non c'è niente da suggerire, e una
 * proposta senza fondamento è peggio di nessuna proposta.
 */
export async function suggerimentiDaFiliera(
  userId: string,
  orgId: string,
  companyId: string,
): Promise<Suggerimento[]> {
  const [programma] = await withTenant({ userId, orgId }, (tx) =>
    tx
      .select()
      .from(chainProgram)
      .where(and(eq(chainProgram.companyId, companyId), eq(chainProgram.organizationId, orgId)))
      .limit(1),
  );
  if (!programma) return [];

  const partner = await withTenant({ userId, orgId }, (tx) =>
    tx
      .select()
      .from(chainPartner)
      .where(and(eq(chainPartner.programId, programma.id), eq(chainPartner.organizationId, orgId))),
  );

  // I cessati escono da ogni conteggio, qui come nel quadro della filiera.
  const vivi = partner.filter((p) => RAPPORTI_VIVI.includes(p.stato as StatoRapporto));
  if (!vivi.length) return [];

  const conClausole = vivi.filter((p) => p.clausole === "Sì").length;
  const conCodice = vivi.filter((p) => p.codiceCondotta === "Sì").length;
  const qualificati = vivi.filter((p) => p.qualifica === "Piena" || p.qualifica === "Condizionata").length;
  const valutati = vivi.filter((p) => p.qualificaValidaAl || p.qualifica).length;

  const quota = (n: number) => Math.round((n / vivi.length) * 100);
  const grado = (n: number): Suggerimento["risposta"] =>
    n === vivi.length ? "si" : n > 0 ? "parziale" : "no";

  return [
    {
      chiave: "P1",
      risposta: grado(qualificati),
      motivo: `${qualificati} partner su ${vivi.length} hanno una qualifica registrata (${quota(qualificati)}%).`,
    },
    {
      chiave: "P2",
      risposta: grado(valutati),
      motivo: `${valutati} partner su ${vivi.length} hanno una qualifica con validità o stato dichiarato.`,
    },
    {
      chiave: "P3",
      risposta: grado(conClausole),
      motivo: `Clausole contrattuali inserite per ${conClausole} partner su ${vivi.length} (${quota(conClausole)}%).`,
    },
    {
      chiave: "P4",
      risposta: vivi.filter((p) => p.paese).length === vivi.length ? "si" : "parziale",
      motivo: `${vivi.length} partner mappati nel programma di due diligence, con paese del sito produttivo.`,
    },
    {
      chiave: "P5",
      risposta: grado(valutati),
      motivo: "Il programma prevede una frequenza di verifica calcolata dal rischio residuo di ciascun partner.",
    },
    {
      chiave: "P6",
      risposta: grado(conCodice),
      motivo: `Codice di condotta accettato da ${conCodice} partner su ${vivi.length} (${quota(conCodice)}%).`,
    },
  ];
}
