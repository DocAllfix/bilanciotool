import { conformitaCapitolo, conformitaSistema, valutati } from "@/lib/calc/anticorruzione/conformita";
import { obblighiAperti, obblighiDi, statoObblighi } from "@/lib/calc/anticorruzione/obblighi";
import { frequenzaDueDiligence, livello, livelloDueDiligence, scaduta, superiore } from "@/lib/calc/anticorruzione/rischio";
import type { Dimensione, SocioInAffari } from "@/lib/calc/anticorruzione/tipi";
import type { briberyPartner } from "@/lib/db/schema";
import { getCatalogo, getSistema, listaRequisiti, listaSoci } from "./sistema";

// Il modello di lettura del modulo ISO 37001.
//
// Niente di ciò che sta qui è persistito: livello di rischio, obblighi e conformità si
// CALCOLANO a ogni lettura dalle funzioni pure di `src/lib/calc/anticorruzione`. È la
// stessa regola degli altri cinque moduli, e la ragione è sempre la stessa: un derivato
// scritto nel database è una copia che comincia a invecchiare nell'istante in cui la
// si scrive.

type RigaSocio = typeof briberyPartner.$inferSelect;

/**
 * Dalla riga del database alla forma che il motore conosce.
 *
 * ⚠️ Sta in UN POSTO SOLO, ed è deliberato. La corrispondenza fra colonne e campi del
 * motore è l'unico punto in cui i due mondi si toccano: due copie divergerebbero al
 * primo campo aggiunto, e la divergenza si vedrebbe come un livello di rischio
 * sbagliato — cioè come un difetto del motore, che sarebbe innocente.
 */
export function socioDalDatabase(p: RigaSocio): SocioInAffari {
  const dim = (v: number | null): Dimensione => (v === 1 || v === 2 || v === 3 || v === 4 ? v : null);
  return {
    paese: dim(p.dimPaese),
    pubbliciUfficiali: dim(p.dimPubbliciUfficiali),
    natura: dim(p.dimNatura),
    valore: dim(p.dimValore),
    remunerazioneSuccesso: p.flagSuccesso,
    impostoDalCliente: p.flagCliente,
    titolaritaOpaca: p.flagTitolarita,
    precedenti: p.flagPrecedenti,
    legamiPubblici: p.flagLegami,
    pagamentiATerzi: p.flagPagamenti,
    dueDiligenceIl: p.dueDiligenceIl,
    politicaComunicata: p.politicaComunicata,
    impegni: p.impegni,
    clausole: p.clausole,
    controlli: p.controlli,
    formazioneIl: p.formazioneIl,
    verificaCorrispettivo: p.verificaCorrispettivo,
    remunerazione: p.remunerazione,
    controllata: p.controllata,
    adeguamento: p.adeguamento,
    stato: p.stato === "Sospeso" || p.stato === "Cessato" ? p.stato : "Attivo",
  };
}

export type SocioCalcolato = RigaSocio & {
  livello: ReturnType<typeof livello>;
  sopraSoglia: boolean;
  livelloDD: number;
  frequenzaDD: number;
  obblighi: number;
  aperti: number;
  ddScaduta: boolean;
};

/**
 * Tutto ciò che serve a disegnare il modulo, in una lettura sola.
 *
 * `oggi` si passa da fuori e non si legge qui dall'orologio: le scadenze sono funzioni
 * pure, e una funzione che legge il tempo non si può provare due volte allo stesso modo.
 */
export async function getAnticorruzione(userId: string, orgId: string, companyId: string, oggi = new Date()) {
  const sistema = await getSistema(userId, orgId, companyId);
  if (!sistema) return null;

  const [catalogo, righeSoci, statiRequisiti] = await Promise.all([
    getCatalogo(sistema.contentSetId),
    listaSoci(userId, orgId, sistema.id),
    listaRequisiti(userId, orgId, sistema.id),
  ]);

  const soci: SocioCalcolato[] = righeSoci.map((p) => {
    const s = socioDalDatabase(p);
    return {
      ...p,
      livello: livello(s),
      sopraSoglia: superiore(s),
      livelloDD: livelloDueDiligence(s),
      frequenzaDD: frequenzaDueDiligence(s),
      obblighi: obblighiDi(s).length,
      aperti: obblighiAperti(s, oggi).length,
      ddScaduta: superiore(s) && !!p.dueDiligenceIl && scaduta(p.dueDiligenceIl, frequenzaDueDiligence(s), oggi),
    };
  });

  // Gli indicatori escludono i rapporti CESSATI: rinnovare la due diligence su un
  // rapporto finito non è un adempimento aperto, è un ricordo. Sulla scheda del singolo
  // socio gli obblighi restano visibili comunque, perché lì raccontano la storia.
  const attivi = soci.filter((s) => s.stato !== "Cessato");

  const statoPerChiave = new Map(statiRequisiti.map((r) => [r.requirementKey, r]));
  const capitoli = catalogo.capitoli.map((c) => {
    const requisiti = catalogo.requisiti.filter((r) => r.chapterKey === c.key);
    // ⚠️ Si passano gli stati di TUTTI i requisiti del capitolo, compresi i vuoti: è
    // ciò che fa pesare zero un requisito applicabile e non valutato. Filtrare qui i
    // non valutati rimetterebbe il difetto che `conformita.ts` esiste per chiudere.
    const stati = requisiti.map((r) => statoPerChiave.get(r.key)?.stato ?? null);
    return {
      ...c,
      requisiti: requisiti.length,
      valutati: valutati(stati),
      conformita: conformitaCapitolo(stati),
    };
  });

  return {
    sistema,
    catalogo,
    soci,
    statiRequisiti,
    capitoli,
    conformita: conformitaSistema(capitoli.map((c) => c.conformita)),
    indicatori: {
      sociTotali: soci.length,
      sociAttivi: attivi.length,
      sopraSoglia: attivi.filter((s) => s.sopraSoglia).length,
      senzaLivello: attivi.filter((s) => s.livello === null).length,
      conObblighiAperti: attivi.filter((s) => s.sopraSoglia && s.aperti > 0).length,
      ddScadute: attivi.filter((s) => s.ddScaduta).length,
      obblighiApplicabili: attivi.reduce((a, s) => a + s.obblighi, 0),
      obblighiAssolti: attivi.reduce((a, s) => a + (s.obblighi - s.aperti), 0),
      requisitiValutati: capitoli.reduce((a, c) => a + c.valutati, 0),
      requisitiTotali: catalogo.requisiti.length,
    },
  };
}

/** Gli obblighi di un socio, con stato e nota: per la sua scheda. */
export function obblighiDelSocio(p: RigaSocio, oggi = new Date()) {
  return statoObblighi(socioDalDatabase(p), oggi);
}
