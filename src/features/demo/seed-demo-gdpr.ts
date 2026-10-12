import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import {
  gdprAttivita,
  gdprAttivitaTipo,
  gdprContenutoPolitica,
  gdprDocumento,
  gdprDocumentoTipo,
  gdprFormazione,
  gdprFornitore,
  gdprMisura,
  gdprRequisito,
  gdprRequisitoStato,
  gdprRichiesta,
  gdprRiesame,
  gdprSystem,
  gdprTrattamento,
  gdprTrattamentoTipo,
  gdprVerifica,
  gdprViolazione,
} from "@/lib/db/schema";
import { dbCorrente, type withTenant } from "@/lib/db/tenant";
import { latestGdprSetId } from "@/features/gdpr/sistema";
import { piuGiorni } from "@/lib/calc/segnalazioni/termini";
import { daOraItaliana, oggiIso } from "@/lib/calc/comune/tempo-italia";
import politica from "@/lib/db/seeds/data/gdpr-politica.json";

type Tx = Parameters<Parameters<typeof withTenant>[1]>[0];

/**
 * Il percorso Protezione dei dati della dimostrativa: Meccanica Adriatica S.r.l., Bari,
 * ATECO 25.62, 48 dipendenti — gli STESSI dati degli altri percorsi.
 *
 * ⚠️ Con 48 dipendenti e un'attività manifatturiera l'obbligo del responsabile della
 * protezione dei dati NON ricorre: le tre risposte dell'art. 37 sono «No». La dimostrativa
 * non deve insegnare una conclusione sbagliata.
 *
 * ⚠️ A METÀ DEL GUADO, come gli altri percorsi: una parte dei requisiti valutata, una
 * richiesta SCADUTA, una violazione notificata entro le 72 ore, una valutazione d'impatto
 * in corso. Così il quadro mostra segnali veri, non un elenco vuoto né uno pieno.
 *
 * ⚠️ Le date sono RELATIVE A OGGI, nel giorno italiano: la richiesta resta scaduta e la
 * violazione resta dentro il termine qualunque sia il giorno in cui uno studio si iscrive.
 */
export async function seedDemoGdpr(tx: Tx, orgId: string, companyId: string): Promise<void> {
  const setId = await latestGdprSetId().catch(() => null);
  if (!setId) return;
  const d = dbCorrente();
  const [requisiti, trattamentiTipo, documentiTipo, attivitaTipo, contenuti] = await Promise.all([
    d.select().from(gdprRequisito).where(eq(gdprRequisito.setId, setId)).orderBy(asc(gdprRequisito.ordine)),
    d.select().from(gdprTrattamentoTipo).where(eq(gdprTrattamentoTipo.setId, setId)).orderBy(asc(gdprTrattamentoTipo.ordine)),
    d.select().from(gdprDocumentoTipo).where(eq(gdprDocumentoTipo.setId, setId)).orderBy(asc(gdprDocumentoTipo.ordine)),
    d.select().from(gdprAttivitaTipo).where(eq(gdprAttivitaTipo.setId, setId)).orderBy(asc(gdprAttivitaTipo.ordine)),
    d.select().from(gdprContenutoPolitica).where(eq(gdprContenutoPolitica.setId, setId)).orderBy(asc(gdprContenutoPolitica.ordine)),
  ]);
  // La dimostrativa si semina durante la registrazione: un catalogo assente non deve fermarla.
  if (!requisiti.length) return;

  const oggi = oggiIso();
  const anno = Number(oggi.slice(0, 4));
  const giorni = (n: number) => piuGiorni(oggi, n)!;
  const nome = "Meccanica Adriatica S.r.l.";

  const systemId = randomUUID();
  await tx.insert(gdprSystem).values({
    id: systemId,
    organizationId: orgId,
    companyId,
    contentSetId: setId,
    forma: "Società a responsabilità limitata",
    sede: "Zona industriale, Bari",
    settore: "Fabbricazione di prodotti in metallo",
    ateco: "25.62",
    dipendenti: "48",
    siti: "Stabilimento produttivo e uffici a Bari",
    ruolo: "Titolare del trattamento",
    legale: "Amministratore unico",
    referente: "Ing. Paola Ranieri, responsabile HSE",
    contatto: "privacy@meccanica-adriatica.example",
    amministratori: "Sì",
    dpoA: "No",
    dpoB: "No",
    dpoC: "No",
    politicaTesto: politica.modello.split("{nome}").join(nome),
    politicaContenuti: contenuti.slice(0, 6).map((c) => c.key),
    politicaApprovataIl: giorni(-120),
    politicaFirma: "Amministratore unico",
  });

  // Cinque trattamenti tipici di una manifattura, non l'e-commerce del prototipo. La
  // videosorveglianza porta due criteri di vaglio: la valutazione d'impatto è necessaria,
  // ed è in corso.
  const scelti = [
    "gestione-del-rapporto-di-lavoro",
    "salute-e-sicurezza-sul-lavoro",
    "clienti-contratti-ordini-e-fatturazione",
    "fornitori-contratti-e-pagamenti",
    "videosorveglianza",
  ];
  const rischio: Record<string, [number, number, string]> = {
    "gestione-del-rapporto-di-lavoro": [2, 3, "Accessi per profilo al gestionale paghe; armadi chiusi per i fascicoli cartacei."],
    "salute-e-sicurezza-sul-lavoro": [2, 4, "Cartelle sanitarie custodite dal medico competente; giudizi di idoneità senza diagnosi."],
    "clienti-contratti-ordini-e-fatturazione": [2, 2, "Accessi nominativi al gestionale; copie di sicurezza giornaliere."],
    videosorveglianza: [3, 4, ""],
  };
  await tx.insert(gdprTrattamento).values(
    trattamentiTipo
      .filter((t) => scelti.includes(t.key))
      .map((t, i) => {
        const r = rischio[t.key];
        return {
          id: randomUUID(),
          organizationId: orgId,
          systemId,
          tipoKey: t.key,
          nome: t.nome,
          finalita: t.finalita,
          base: t.base,
          interessati: t.interessati,
          dati: t.dati,
          particolari: t.particolari,
          condizione9: t.condizione9 || null,
          destinatari: t.destinatari,
          conservazione: t.conservazione,
          criteri: t.criteri,
          misure: i < 3 ? "Accessi per profilo, copie di sicurezza, formazione degli autorizzati." : null,
          probabilita: r?.[0] ?? null,
          gravita: r?.[1] ?? null,
          mitigazione: r?.[2] || null,
          dpiaStato: t.key === "videosorveglianza" ? "In corso" : "Da avviare",
          dpiaData: t.key === "videosorveglianza" ? giorni(-20) : null,
          ordine: i,
        };
      }),
  );

  // Poco più di metà dei requisiti valutata, con tutti e quattro gli stati: l'indice non
  // è né zero né cento, e si vede che i non valutati pesano.
  const valutati = requisiti.slice(0, Math.round(requisiti.length * 0.55));
  await tx.insert(gdprRequisitoStato).values(
    valutati.map((r, i) => {
      const stato = i % 23 === 11 ? "na" : i % 7 === 3 ? "n" : i % 5 === 2 ? "p" : "c";
      const aperto = stato === "p" || stato === "n";
      return {
        id: randomUUID(),
        organizationId: orgId,
        systemId,
        requisitoKey: r.key,
        stato,
        evidenza: stato === "c" && i % 3 === 0 ? "Registro dei trattamenti, revisione 02" : null,
        azione: aperto ? "Redigere la procedura e farla approvare" : null,
        responsabile: aperto ? "Referente privacy" : null,
        scadenza: aperto ? giorni(60 + (i % 4) * 30) : null,
      };
    }),
  );

  await tx.insert(gdprFornitore).values([
    { id: randomUUID(), organizationId: orgId, systemId, nome: "Studio paghe", servizio: "Elaborazione delle buste paga", qualifica: "Responsabile (art. 28)", paese: "Italia", contratto: "Sì", garanzia: "Nessun trasferimento", verificatoIl: giorni(-90), esito: "Adeguato", ordine: 0 },
    { id: randomUUID(), organizationId: orgId, systemId, nome: "Fornitore del gestionale in cloud", servizio: "Gestionale e posta elettronica", qualifica: "Responsabile (art. 28)", paese: "Stati Uniti", contratto: "Sì", garanzia: "Decisione di adeguatezza", ordine: 1 },
    { id: randomUUID(), organizationId: orgId, systemId, nome: "Istituto di vigilanza", servizio: "Gestione dell'impianto di videosorveglianza", qualifica: "Responsabile (art. 28)", paese: "Italia", contratto: "No", garanzia: "Nessun trasferimento", ordine: 2 },
  ]);

  await tx.insert(gdprDocumento).values(
    documentiTipo.slice(0, 8).map((x, i) => ({
      id: randomUUID(),
      organizationId: orgId,
      systemId,
      tipoKey: x.key,
      tipo: x.tipo,
      oggetto: x.oggetto,
      versione: i < 5 ? "1.0" : "0.1",
      adottatoIl: i < 5 ? giorni(-200) : null,
      revisioneIl: i < 5 ? giorni(165) : null,
      stato: i < 5 ? "Adottato" : i < 7 ? "In bozza" : "Da redigere",
      ordine: i,
    })),
  );

  const meseOra = Number(oggi.slice(5, 7));
  await tx.insert(gdprAttivita).values(
    attivitaTipo.map((a, i) => ({
      id: randomUUID(),
      organizationId: orgId,
      systemId,
      tipoKey: a.key,
      mese: a.mese,
      riferimento: a.riferimento,
      attivita: a.attivita,
      responsabile: "Referente privacy",
      stato: a.mese < meseOra ? "Fatto" : a.mese === meseOra ? "In corso" : "Da fare",
      ordine: i,
    })),
  );

  const misure = (a: number, f: number) => [
    ["dip", 48], ["aut", 30], ["aut_form", Math.round(24 * f)], ["fo_ore", Math.round(60 * f)], ["nuovi", 4], ["nuovi_form", Math.round(3 * f)],
    ["acc", 30], ["acc_mfa", Math.round(18 * f)], ["disp", 36], ["disp_cif", Math.round(28 * f)], ["bk_test", 2], ["inc", 1],
  ].map(([k, v]) => ({ id: randomUUID(), organizationId: orgId, systemId, anno: a, indicatoreKey: String(k), valore: String(v) }));
  await tx.insert(gdprMisura).values([...misure(anno, 1), ...misure(anno - 1, 0.7)]);

  // Una richiesta SCADUTA (ricevuta 45 giorni fa, senza riscontro) e una evasa nei termini.
  await tx.insert(gdprRichiesta).values([
    { id: randomUUID(), organizationId: orgId, systemId, ricevutaIl: giorni(-45), diritto: "Accesso (art. 15)", riferimento: "RIC-01", canale: "Posta elettronica", trattamento: "Gestione del rapporto di lavoro", esito: "In lavorazione" },
    { id: randomUUID(), organizationId: orgId, systemId, ricevutaIl: giorni(-80), diritto: "Rettifica (art. 16)", riferimento: "RIC-02", canale: "PEC", trattamento: "Clienti, contratti, ordini e fatturazione", riscontroIl: giorni(-70), esito: "Accolta" },
  ]);

  // Una violazione notificata entro le 72 ore: conosciuta alle 9:00 italiane di venti
  // giorni fa, notificata trenta ore dopo.
  const conoscenza = daOraItaliana(giorni(-20), "09:00")!;
  await tx.insert(gdprViolazione).values({
    id: randomUUID(),
    organizationId: orgId,
    systemId,
    conoscenzaIl: conoscenza,
    natura: "Riservatezza",
    interessati: 12,
    rischio: "Rischio",
    descrizione: "Invio di un prospetto paghe a un destinatario errato.",
    categorie: "Dati retributivi",
    notificataIl: new Date(conoscenza.getTime() + 30 * 3_600_000),
    chiusaIl: giorni(-10),
    valutazione: "Rischio non elevato: destinatario interno, documento cancellato su richiesta.",
  });

  await tx.insert(gdprFormazione).values({
    id: randomUUID(), organizationId: orgId, systemId, data: giorni(-60), tema: "Il registro dei trattamenti e le richieste degli interessati",
    destinatari: "Autorizzati degli uffici", docente: "Consulente esterno", partecipanti: 24, ore: "2.5", apprendimento: "Questionario finale",
  });
  await tx.insert(gdprVerifica).values({
    id: randomUUID(), organizationId: orgId, systemId, data: giorni(-30), tipo: "Prova di ripristino", ambito: "Gestionale",
    svoltaDa: "Responsabile IT", stato: "Svolto", rilievi: 1, sintesi: "Ripristino riuscito in quattro ore; un rilievo sui tempi.",
  });
  await tx.insert(gdprRiesame).values({
    id: randomUUID(), organizationId: orgId, systemId, data: `${anno - 1}-12-15`, partecipanti: "Amministratore unico, referente privacy",
    relazione: "Primo anno del sistema: registro completato, politica adottata.", adeguatezza: "Adeguato, con lacune sulla formazione.",
    miglioramento: "Estendere la formazione a tutti gli autorizzati.", azioni: "Piano di formazione nel primo semestre.",
  });
}
