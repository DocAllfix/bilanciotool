import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
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
  pasSystem,
  pasTesto,
} from "@/lib/db/schema";
import { dbCorrente, type withTenant } from "@/lib/db/tenant";
import { latestPasSetId } from "@/features/pas/sistema";
import { piuGiorni } from "@/lib/calc/segnalazioni/termini";
import { oggiIso } from "@/lib/calc/comune/tempo-italia";

type Tx = Parameters<Parameters<typeof withTenant>[1]>[0];

/**
 * Il sistema di gestione sociale della dimostrativa: la stessa manifattura metalmeccanica
 * di 48 dipendenti degli altri percorsi, con lo stesso ATECO e la stessa sede. NON i numeri
 * del prototipo (86 addetti, conserve): un consulente che apre due percorsi della stessa
 * azienda e trova organici diversi smette di fidarsi di entrambi.
 *
 * ⚠️ Il NOME dell'azienda si legge dal database, non si scrive qui: la politica lo porta nel
 * testo, e un nome ricopiato in un secondo posto diverge al primo cambio.
 *
 * ⚠️ A METÀ DEL GUADO, come gli altri percorsi: una parte dei requisiti valutata, un rischio
 * alto ancora senza misure, un'agenzia per il lavoro a rischio alto mai verificata, un
 * reclamo da sollecitare, un'azione correttiva scaduta, nessuna comunicazione esterna e il
 * riesame dell'esercizio non ancora fatto. Il quadro mostra segnali veri.
 *
 * ⚠️ Le date sono RELATIVE A OGGI, nel giorno italiano: il reclamo resta da sollecitare e
 * l'azione resta scaduta qualunque sia il giorno in cui uno studio si iscrive.
 */
export async function seedDemoPas(tx: Tx, orgId: string, companyId: string): Promise<void> {
  const setId = await latestPasSetId().catch(() => null);
  if (!setId) return;
  const d = dbCorrente();
  const [requisiti, partiTipo, rischiTipo, attivitaTipo, contenuti, modelli] = await Promise.all([
    d.select().from(pasRequisito).where(eq(pasRequisito.setId, setId)).orderBy(asc(pasRequisito.ordine)),
    d.select().from(pasParteTipo).where(eq(pasParteTipo.setId, setId)).orderBy(asc(pasParteTipo.ordine)),
    d.select().from(pasRischioTipo).where(eq(pasRischioTipo.setId, setId)).orderBy(asc(pasRischioTipo.ordine)),
    d.select().from(pasAttivitaTipo).where(eq(pasAttivitaTipo.setId, setId)).orderBy(asc(pasAttivitaTipo.ordine)),
    d.select().from(pasContenutoPolitica).where(eq(pasContenutoPolitica.setId, setId)).orderBy(asc(pasContenutoPolitica.ordine)),
    d.select().from(pasTesto).where(and(eq(pasTesto.setId, setId), eq(pasTesto.key, "politica"))),
  ]);
  // La dimostrativa si semina durante la registrazione: un catalogo assente non deve fermarla.
  if (!requisiti.length) return;
  const [azienda] = await tx.select({ nome: company.nome }).from(company).where(and(eq(company.id, companyId), eq(company.organizationId, orgId)));
  if (!azienda) return;

  const oggi = oggiIso();
  const anno = Number(oggi.slice(0, 4));
  const giorni = (n: number) => piuGiorni(oggi, n)!;
  const base = { organizationId: orgId } as const;

  const systemId = randomUUID();
  await tx.insert(pasSystem).values({
    id: systemId,
    ...base,
    companyId,
    contentSetId: setId,
    forma: "Società a responsabilità limitata",
    sede: "Zona industriale, Bari",
    settore: "Fabbricazione di prodotti in metallo",
    ateco: "25.62",
    ccnl: "Metalmeccanica industria",
    siti: "Stabilimento produttivo e uffici a Bari",
    campo:
      "Progettazione e lavorazione meccanica di componenti in metallo nello stabilimento di Bari. Comprende i dipendenti, i lavoratori somministrati e il personale delle imprese di pulizia e di manutenzione che opera nel sito.",
    direzione: "Amministratore unico",
    responsabile: "Responsabile delle risorse umane",
    rappresentanti: "Rappresentante dei lavoratori per la sicurezza e rappresentanza sindacale aziendale",
    politicaTesto: modelli[0] ? modelli[0].testo.split("{nome}").join(azienda.nome) : null,
    politicaContenuti: contenuti.slice(0, 7).map((c) => c.key),
    politicaApprovataIl: giorni(-150),
    politicaFirma: "Amministratore unico",
  });

  await tx.insert(pasFattore).values([
    { id: randomUUID(), ...base, systemId, tipo: "Esterno", descrizione: "Mercato del lavoro locale con poca disponibilità di saldatori e tornitori qualificati", effetto: "Rischio", ordine: 0 },
    { id: randomUUID(), ...base, systemId, tipo: "Esterno", descrizione: "Committenti che chiedono requisiti sociali lungo la filiera", effetto: "Opportunità", ordine: 1 },
    { id: randomUUID(), ...base, systemId, tipo: "Interno", descrizione: "Picchi di produzione stagionali coperti con straordinari e lavoro somministrato", effetto: "Rischio", ordine: 2 },
    { id: randomUUID(), ...base, systemId, tipo: "Interno", descrizione: "Rappresentanza sindacale presente e consultata con regolarità", effetto: "Opportunità", ordine: 3 },
  ]);

  await tx.insert(pasParte).values(
    partiTipo.map((p, i) => ({ id: randomUUID(), ...base, systemId, tipoKey: p.key, nome: p.nome, esigenze: p.esigenze, obbligo: p.obbligo, gestita: true, coinvolgimento: p.coinvolgimento, ordine: i })),
  );

  // Dodici rischi valutati su venti; l'ultimo valutato è alto e ancora senza misure.
  const valutazioni: [number, number, string | null][] = [
    [2, 4, "Clausola sociale nei contratti e questionario ai fornitori di materie prime"],
    [3, 4, "Verifica dei contratti dell'agenzia per il lavoro e colloqui con i somministrati"],
    [1, 5, "Controllo dei documenti all'assunzione"],
    [2, 3, "Bacheca sindacale e incontri trimestrali"],
    [2, 3, "Criteri scritti per assunzioni e progressioni"],
    [3, 4, "Formazione periodica, dispositivi di protezione, mancati infortuni registrati"],
    [2, 4, "Prove di evacuazione e manutenzione dei presidi"],
    [2, 3, "Confronto mensile delle buste paga col minimo contrattuale"],
    [3, 3, "Pianificazione dei turni e limite allo straordinario"],
    [2, 2, "Canale di reclamo con più vie, anche anonime"],
    [1, 3, "Codice etico e regole sui regali"],
    [4, 4, null],
  ];
  await tx.insert(pasRischio).values(
    rischiTipo.map((r, i) => {
      const v = valutazioni[i];
      return {
        id: randomUUID(), ...base, systemId, tipoKey: r.key, area: r.area, ambito: r.ambito, testo: r.testo,
        probabilita: v?.[0] ?? null, gravita: v?.[1] ?? null, misure: v?.[2] ?? null, responsabile: v ? "Responsabile del sistema" : null, ordine: i,
      };
    }),
  );

  await tx.insert(pasFornitore).values([
    { id: randomUUID(), ...base, systemId, nome: "Acciaieria fornitrice di barre", categoria: "Materie prime", paese: "Italia", rischio: "Basso", clausola: true, questionario: true, verificatoIl: giorni(-200), esito: "Adeguato", ordine: 0 },
    { id: randomUUID(), ...base, systemId, nome: "Agenzia per il lavoro", categoria: "Agenzia per il lavoro", paese: "Italia", rischio: "Alto", clausola: true, questionario: false, ordine: 1 },
    { id: randomUUID(), ...base, systemId, nome: "Cooperativa di pulizie", categoria: "Cooperativa di servizi", paese: "Italia", rischio: "Medio", clausola: true, questionario: true, verificatoIl: giorni(-90), esito: "Azioni richieste", ordine: 2 },
    { id: randomUUID(), ...base, systemId, nome: "Trasporti in uscita", categoria: "Trasporti e logistica", paese: "Italia", rischio: "Medio", clausola: false, questionario: false, ordine: 3 },
  ]);

  // Poco più di metà dei requisiti valutata, con tutti e quattro gli stati: l'indice non è né
  // zero né cento, e si vede che i non valutati pesano.
  const valutati = requisiti.slice(0, Math.round(requisiti.length * 0.6));
  await tx.insert(pasRequisitoStato).values(
    valutati.map((r, i) => {
      const stato = r.key === "A.3-4" ? "na" : i % 7 === 3 ? "n" : i % 5 === 2 ? "p" : "c";
      const aperto = stato === "p" || stato === "n";
      return {
        id: randomUUID(), ...base, systemId, requisitoKey: r.key, stato,
        evidenza: stato === "na" ? "Nessun lavoratore tra 15 e 17 anni negli ultimi tre esercizi" : stato === "c" && i % 3 === 0 ? "Procedura del sistema, revisione 01" : null,
        azione: aperto ? "Redigere la procedura e farla approvare dalla direzione" : null,
        responsabile: aperto ? "Responsabile del sistema" : null,
        scadenza: aperto ? giorni(45 + (i % 4) * 30) : null,
      };
    }),
  );

  await tx.insert(pasObiettivo).values([
    { id: randomUUID(), ...base, systemId, obiettivo: "Ridurre l'incidenza dello straordinario", area: "A9", indicatore: "Ore di straordinario sull'ordinario", traguardo: "sotto il 4%", scadenza: `${anno}-12-31`, responsabile: "Responsabile di produzione", risorse: "Un operatore in più nei mesi di picco", stato: "In corso", ordine: 0 },
    { id: randomUUID(), ...base, systemId, obiettivo: "Verificare tutti i fornitori a rischio alto", area: "A1", indicatore: "Fornitori a rischio alto verificati", traguardo: "100%", scadenza: giorni(90), responsabile: "Ufficio acquisti", risorse: "Audit di seconda parte", stato: "In corso", ordine: 1 },
    { id: randomUUID(), ...base, systemId, obiettivo: "Formare tutti i lavoratori sul canale di reclamo", area: "A10", indicatore: "Lavoratori formati sul sistema", traguardo: "100%", scadenza: giorni(-30), responsabile: "Responsabile delle risorse umane", risorse: "Due sessioni in aula", stato: "Raggiunto", ordine: 2 },
  ]);

  const meseOra = Number(oggi.slice(5, 7));
  await tx.insert(pasAttivita).values(
    attivitaTipo.map((a, i) => ({
      id: randomUUID(), ...base, systemId, tipoKey: a.key, mese: a.mese, riferimento: a.riferimento, attivita: a.attivita,
      responsabile: "Responsabile del sistema", stato: a.mese < meseOra ? "Fatto" : a.mese === meseOra ? "In corso" : "Da fare", ordine: i,
    })),
  );

  // Gli stessi 48 addetti degli altri percorsi. Nessun minore, retribuzioni sopra il minimo,
  // straordinario contenuto ma presente: numeri plausibili per una piccola officina.
  const misure = (a: number, f: number): [string, number][] => [
    ["lav_tot", 48], ["lav_don", 14], ["lav_ind", 42], ["lav_stran", 6], ["lav_min", 0], ["lav_u15", 0], ["lav_somm", 5],
    ["ass", 4], ["ces", 3], ["re_min", 1620], ["re_ccnl", 1580], ["re_lw", 1700], ["re_don", Math.round(30500 * f)], ["re_uom", Math.round(33100 * f)],
    ["cop", 48], ["rit", 0], ["tratt", 1], ["ore_ord", 76800], ["ore_str", Math.round(3100 / f)], ["ore_max", 52], ["sett_60", 0], ["riposi", 0],
    ["inf", 2], ["gg", 31], ["nm", 5], ["mal", 0], ["fssl", 46], ["fo_ore", Math.round(620 * f)], ["fo_sgs", Math.round(40 * f)], ["fo_nuovi", 3],
    ["rapp", 2], ["disc", 1], ["molest", 0], ["sanz", 0], ["corr", 0],
  ];
  const righe = (a: number, f: number) => misure(a, f).map(([k, v]) => ({ id: randomUUID(), ...base, systemId, anno: a, indicatoreKey: k, valore: String(v) }));
  await tx.insert(pasMisura).values([...righe(anno, 1), ...righe(anno - 1, 0.97)]);

  // Un reclamo chiuso, uno recente e uno aperto da quarantacinque giorni: da sollecitare.
  await tx.insert(pasReclamo).values([
    { id: randomUUID(), ...base, systemId, data: giorni(-120), canale: "Rappresentante dei lavoratori", provenienza: "Lavoratore", area: "A9", oggetto: "Turni del sabato comunicati con poco preavviso", istruttoria: "Calendario dei turni pubblicato con due settimane di anticipo", responsabile: "Responsabile di produzione", chiusoIl: giorni(-100), esito: "Fondato, risolto" },
    { id: randomUUID(), ...base, systemId, data: giorni(-45), canale: "Cassetta o modulo", provenienza: "Anonimo", area: "A6", oggetto: "Ventilazione insufficiente nel reparto saldatura", responsabile: "Responsabile del servizio di prevenzione", esito: "In istruttoria" },
    { id: randomUUID(), ...base, systemId, data: giorni(-6), canale: "Indirizzo dedicato", provenienza: "Lavoratore di un fornitore", area: "A8", oggetto: "Ritardo nel pagamento delle ore di straordinario", responsabile: "Ufficio acquisti", esito: "In istruttoria" },
  ]);
  await tx.insert(pasNonConformita).values([
    { id: randomUUID(), ...base, systemId, data: giorni(-150), origine: "Audit interno", requisito: "A.6", responsabile: "Responsabile del servizio di prevenzione", descrizione: "Registro dei mancati infortuni non aggiornato", cause: "Nessuno incaricato della raccolta", azione: "Incarico al preposto e modulo in reparto", scadenza: giorni(-120), chiusaIl: giorni(-125), efficacia: "Efficace" },
    { id: randomUUID(), ...base, systemId, data: giorni(-60), origine: "Reclamo", requisito: "A.9", responsabile: "Responsabile di produzione", descrizione: "Due settimane oltre il limite complessivo nel picco di primavera", cause: "Commessa urgente senza personale aggiuntivo", azione: "Procedura per il ricorso ai somministrati nei picchi", scadenza: giorni(-10), efficacia: "Da verificare" },
  ]);
  await tx.insert(pasFormazione).values([
    { id: randomUUID(), ...base, systemId, data: giorni(-80), tema: "Il sistema di gestione sociale e il canale di reclamo", destinatari: "Tutti i lavoratori", docente: "Responsabile del sistema", partecipanti: 40, ore: "2", efficacia: "Questionario finale" },
    { id: randomUUID(), ...base, systemId, data: giorni(-40), tema: "Aggiornamento sicurezza per i preposti", destinatari: "Preposti", docente: "Consulente esterno", partecipanti: 6, ore: "6", efficacia: "Verifica scritta" },
  ]);
  await tx.insert(pasEmergenza).values({ id: randomUUID(), ...base, systemId, data: giorni(-70), tipo: "Prova di evacuazione", sito: "Stabilimento di Bari", responsabile: "Addetto antincendio", esito: "Evacuazione in quattro minuti", azioni: "Segnaletica aggiunta all'uscita del magazzino" });
  // Una comunicazione interna e nessuna esterna: il segnale lo deve dire.
  await tx.insert(pasComunicazione).values({ id: randomUUID(), ...base, systemId, data: giorni(-75), tipo: "Interna", destinatari: "Tutti i lavoratori", canale: "Bacheca e riunione", contenuto: "Politica sociale e obiettivi dell'anno" });
  await tx.insert(pasConsultazione).values([
    { id: randomUUID(), ...base, systemId, data: giorni(-110), forma: "Incontro con i rappresentanti", partecipanti: 3, condottaDa: "Responsabile delle risorse umane", argomenti: "Turni e straordinari", esiti: "Calendario anticipato" },
    { id: randomUUID(), ...base, systemId, data: giorni(-35), forma: "Riunione con i lavoratori", partecipanti: 38, condottaDa: "Responsabile del sistema", argomenti: "Rischi sociali e obiettivi", esiti: "Due proposte raccolte" },
  ]);
  await tx.insert(pasAudit).values({ id: randomUUID(), ...base, systemId, data: giorni(-50), ambito: "Clausole 7 e 8, Allegato A da A.6 a A.9", auditor: "Auditor interno qualificato", stato: "Svolto", rilievi: 3, sintesi: "Tre rilievi sull'orario e sulla registrazione dei mancati infortuni" });
  // Il riesame dell'esercizio precedente, non ancora quello di quest'anno.
  await tx.insert(pasRiesame).values({
    id: randomUUID(), ...base, systemId, data: `${anno - 1}-12-15`, partecipanti: "Amministratore unico, responsabile del sistema, rappresentanti dei lavoratori",
    comunicatoIl: `${anno - 1}-12-20`, risorse: "Adeguate, salvo i mesi di picco", idoneita: "Il sistema è avviato e funziona; da rafforzare la due diligence sui fornitori.",
    miglioramento: "Ridurre lo straordinario nei picchi", modifiche: "Nessuna", azioni: "Procedura per i somministrati; verifica dei fornitori a rischio alto entro l'anno.",
  });
}
