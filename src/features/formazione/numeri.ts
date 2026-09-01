import vettori from "@/lib/db/seeds/data/energy-vectors.json";
import usiFinali from "@/lib/db/seeds/data/energy-end-uses.json";
import areeEnergia from "@/lib/db/seeds/data/energy-areas.json";
import temi from "@/lib/db/seeds/data/report-topics.json";
import indicatori from "@/lib/db/seeds/data/report-kpi.json";
import sezioniKpi from "@/lib/db/seeds/data/report-kpi-sections.json";
import capitoliReport from "@/lib/db/seeds/data/report-narrative-templates.json";
import capitoliEnergia from "@/lib/db/seeds/data/energy-narrative-templates.json";
import indicatoriEnergia from "@/lib/db/seeds/data/energy-indicators.json";
import sorgentiGhg from "@/lib/db/seeds/data/ghg-sources.json";
import categorieGhg from "@/lib/db/seeds/data/ghg-categories.json";
import gwpSet from "@/lib/db/seeds/data/ghg-gwp-sets.json";
import fattoriGhg from "@/lib/db/seeds/data/ghg-emission-factors.json";
import checklistGhg from "@/lib/db/seeds/data/ghg-checklist.json";
import livelliQualita from "@/lib/db/seeds/data/ghg-dq-levels.json";
import domandeFornitore from "@/lib/db/seeds/data/supplier-questions.json";
import areeFornitore from "@/lib/db/seeds/data/supplier-areas.json";
import fasceFornitore from "@/lib/db/seeds/data/supplier-bands.json";
import areeFiliera from "@/lib/db/seeds/data/filiera-aree.json";
import dimensioniFiliera from "@/lib/db/seeds/data/filiera-dim.json";
import fasiFiliera from "@/lib/db/seeds/data/filiera-fasi.json";
import registriFiliera from "@/lib/db/seeds/data/filiera-registri.json";
import procedureFiliera from "@/lib/db/seeds/data/filiera-procedures.json";
import moduliFiliera from "@/lib/db/seeds/data/filiera-modules.json";
import reati231 from "@/lib/db/seeds/data/mog231-reati.json";
import pilastri231 from "@/lib/db/seeds/data/mog231-fam.json";
import presidi231 from "@/lib/db/seeds/data/mog231-req.json";
import documenti231 from "@/lib/db/seeds/data/mog231-procedures.json";
import moduli231 from "@/lib/db/seeds/data/mog231-modules.json";
import registri231 from "@/lib/db/seeds/data/mog231-registri.json";
import capi231 from "@/lib/db/seeds/data/mog231-capi.json";
import req37001 from "@/lib/db/seeds/data/iso37001-req.json";
import procedure37001 from "@/lib/db/seeds/data/iso37001-procedures.json";
import moduli37001 from "@/lib/db/seeds/data/iso37001-modules.json";
import registri37001 from "@/lib/db/seeds/data/iso37001-registri.json";
import reqWb from "@/lib/db/seeds/data/wb-req.json";
import capiWb from "@/lib/db/seeds/data/wb-capi.json";
import procedureWb from "@/lib/db/seeds/data/wb-procedures.json";
import moduliWb from "@/lib/db/seeds/data/wb-modules.json";
import registriWb from "@/lib/db/seeds/data/wb-registri.json";
import procedureQas from "@/lib/db/seeds/data/sgiqas-procedures.json";
import moduliQas from "@/lib/db/seeds/data/sgiqas-modules.json";
import registriQas from "@/lib/db/seeds/data/sgiqas-registri.json";
import sezioniSa8000 from "@/lib/db/seeds/data/sa8000-sezioni.json";
import procedureSa8000 from "@/lib/db/seeds/data/sa8000-procedures.json";
import moduliSa8000 from "@/lib/db/seeds/data/sa8000-modules.json";
import registriSa8000 from "@/lib/db/seeds/data/sa8000-registri.json";
import fasceSoa from "@/lib/db/seeds/data/soa-bands.json";
import capi37001 from "@/lib/db/seeds/data/iso37001-capi.json";
import dimensioni37001 from "@/lib/db/seeds/data/iso37001-dimensioni.json";
import fattori37001 from "@/lib/db/seeds/data/iso37001-fattori.json";
import criteriSa8000 from "@/lib/db/seeds/data/sa8000-criteri.json";
import gruppiSa8000 from "@/lib/db/seeds/data/sa8000-gruppi.json";
import reqQas from "@/lib/db/seeds/data/sgiqas-req.json";
import capiQas from "@/lib/db/seeds/data/sgiqas-capi.json";
import normeQas from "@/lib/db/seeds/data/sgiqas-norme.json";
import indicatoriQas from "@/lib/db/seeds/data/sgiqas-indicatori.json";
import controlliSoa from "@/lib/db/seeds/data/soa-controls.json";
import sezioniSoa from "@/lib/db/seeds/data/soa-sections.json";
import quadriSoa from "@/lib/db/seeds/data/soa-frameworks.json";
import motivazioniSoa from "@/lib/db/seeds/data/soa-motivations.json";
import fasiSgesg from "@/lib/db/seeds/data/sgesg-fasi.json";
import schedeSgesg from "@/lib/db/seeds/data/sgesg-schede.json";


import { MODULI_AZIENDA, MODULI_PER_AREA } from "@/features/companies/moduli";
import { DRIVER_ATTESI, INTERVENTI_ATTESI, PROFILO_ATTESI } from "@/lib/calc/energy/progress";
import { PAROLE_MINIME } from "@/lib/calc/report/gap-analysis";

/**
 * I numeri che la formazione cita, presi da dove il prodotto li prende.
 *
 * ⚠️ NESSUNO DI QUESTI SI SCRIVE A MANO, e la ragione è costata cara. `llms.txt` dichiarava
 * «30 derivati automatici» quando `deriveKpi` ne calcola **25**: un numero scritto una
 * volta e mai più riletto, su una pagina fatta apposta per essere citata dai modelli
 * linguistici. Quel «30» è poi ricomparso in un documento commerciale redatto da un
 * consulente esterno che si era fidato di noi. Un dato falso su una pagina di riferimento
 * non resta dov'è: viene ripetuto.
 *
 * Un corso è esattamente quel tipo di pagina. Chi lo legge non ha modo di verificare, e
 * ciò che impara se lo porta dietro davanti a un cliente.
 *
 * ⚠️ I conteggi vengono dai file del SEME e non dal database: sono gli stessi dati che il
 * prodotto semina, si leggono in fase di build, e una pagina di formazione non deve
 * costare un viaggio a Francoforte per dire «dodici vettori».
 *
 * Le costanti del motore (`DRIVER_ATTESI`, `PAROLE_MINIME`) sono state ESPORTATE apposta:
 * erano private, e citarle avrebbe voluto dire ricopiarle.
 */
export const NUMERI = {
  /** Percorsi del prodotto, e gruppi in cui stanno. */
  moduli: MODULI_AZIENDA.length,
  gruppi: MODULI_PER_AREA.length,

  /** Bilancio energetico. */
  vettori: vettori.length,
  usiFinali: usiFinali.length,
  areeEnergia: Object.keys(areeEnergia).length,
  driverAttesi: DRIVER_ATTESI,
  interventiAttesi: INTERVENTI_ATTESI,
  profiloAttesiEnergia: PROFILO_ATTESI,
  indicatoriEnergia: indicatoriEnergia.length,
  capitoliEnergia: capitoliEnergia.length,

  /** Bilancio di sostenibilità. */
  temi: temi.length,
  indicatori: indicatori.length,
  sezioniKpi: sezioniKpi.length,
  capitoliReport: capitoliReport.length,

  /**
   * Soglia predefinita della doppia rilevanza.
   *
   * ⚠️ È il `default("3")` della colonna, non una regola: si regola per progetto, e dirlo
   * come se fosse fissa è lo stesso piccolo falso della tolleranza di quadratura.
   */
  sogliaMaterialitaPredefinita: 3,

  /** Inventario GHG. */
  sorgentiGhg: sorgentiGhg.length,
  categorieGhg: categorieGhg.length,
  fattoriGhg: fattoriGhg.length,
  checklistGhg: checklistGhg.length,
  livelliQualitaGhg: livelliQualita.length,
  gwpSet: Object.keys(gwpSet).length,

  /** Autovalutazione ESG del fornitore. */
  domandeFornitore: domandeFornitore.length,
  areeFornitore: Object.keys(areeFornitore).length,
  fasceFornitore: fasceFornitore.length,

  /** Due diligence di filiera. */
  areeFiliera: areeFiliera.length,
  dimensioniFiliera: dimensioniFiliera.length,
  fasiFiliera: fasiFiliera.length,
  registriFiliera: registriFiliera.length,
  procedureFiliera: procedureFiliera.length,
  moduliFiliera: moduliFiliera.length,

  /** Modello 231. */
  reati231: reati231.length,
  pilastri231: pilastri231.length,
  presidi231: presidi231.length,
  capi231: capi231.length,
  documenti231: documenti231.length,
  moduli231: moduli231.length,
  registri231: registri231.length,

  /** Prevenzione della corruzione. */
  requisiti37001: req37001.length,
  capi37001: capi37001.length,
  dimensioni37001: dimensioni37001.length,
  fattori37001: fattori37001.length,
  procedure37001: procedure37001.length,
  moduli37001: moduli37001.length,
  registri37001: registri37001.length,

  /** Gestione delle segnalazioni. */
  requisitiWb: reqWb.length,
  ambitiWb: capiWb.length,
  procedureWb: procedureWb.length,
  moduliWb: moduliWb.length,
  registriWb: registriWb.length,

  /** SA8000. */
  criteriSa8000: criteriSa8000.length,
  gruppiSa8000: gruppiSa8000.length,
  sezioniSa8000: sezioniSa8000.length,
  procedureSa8000: procedureSa8000.length,
  moduliSa8000: moduliSa8000.length,
  registriSa8000: registriSa8000.length,

  /** SGI QAS. */
  requisitiQas: reqQas.length,
  capiQas: capiQas.length,
  normeQas: normeQas.length,
  indicatoriQas: indicatoriQas.length,
  procedureQas: procedureQas.length,
  moduliQas: moduliQas.length,
  registriQas: registriQas.length,

  /** Dichiarazione di Applicabilità. */
  controlliSoa: controlliSoa.length,
  sezioniSoa: Object.keys(sezioniSoa).length,
  quadriSoa: Object.keys(quadriSoa).length,
  motivazioniSoa: Object.keys(motivazioniSoa).length,
  fasceSoa: fasceSoa.length,
  /** I controlli «cardine»: quelli che il seme marca come tali. */
  cardineSoa: controlliSoa.filter((c) => c.c === 1).length,

  /** Sistema di gestione ESG. */
  fasiSgesg: fasiSgesg.length,
  schedeSgesg: schedeSgesg.length,


  /**
   * Parole oltre le quali un capitolo si considera scritto.
   *
   * ⚠️ Il corso del committente diceva «oltre gli 80 caratteri». Era vero nel PROTOTIPO;
   * qui la soglia è in parole, e il commento in `gap-analysis.ts` lo dice a chiare
   * lettere. È il tipo di scarto che nessuno verifica, perché la frase suona plausibile.
   */
  paroleMinimeCapitolo: PAROLE_MINIME,

  /**
   * Tolleranza predefinita della quadratura, in punti percentuali.
   *
   * ⚠️ È un PARAMETRO con questo valore di partenza, non una regola fissa: `quadratura()`
   * accetta `tolleranzaPct`. Dirlo come se fosse una costante di legge è un piccolo falso
   * che si nota solo quando qualcuno la cambia.
   */
  tolleranzaQuadraturaPct: 2,
} as const;
