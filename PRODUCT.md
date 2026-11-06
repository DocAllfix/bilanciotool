# PRODUCT.md — registro di prodotto (fonte di verità per il design)

## Cosa

SaaS multi-studio per la rendicontazione ESG delle PMI italiane: un modulo **Inventario GHG** (ISO 14064-1:2018, percorso in 8 passi fino al rapporto conforme al §9.3.1) e un modulo **Bilancio di Sostenibilità** (GRI 2021 / ESRS-VSME, percorso in 7 passi fino al documento impaginato), integrati: l'inventario alimenta la sezione emissioni del bilancio. Il valore non è il calcolo ma il **metodo incorporato**: guide per tema, motivazioni d'esclusione, checklist d'audit, scale di valutazione — un consulente impacchettato in software. Nato dai due prototipi in `archivio/`.

## Utenti

- **Responsabile interno dell'azienda** (utente primario e compratore, dal 6 novembre 2026): la persona a cui arrivano le richieste di clienti, banche, enti di certificazione e autorità: qualità, ambiente, sicurezza, HR, amministrazione. Spesso non è un esperto di ogni norma. La sua domanda: *"che cosa mi stanno chiedendo, che cosa rischio, e come ne esco con un documento che regge?"* Il piano è «Azienda».
- **Colleghi dell'azienda** (invitati dal responsabile): lavorano solo sui percorsi assegnati. Domanda: *"cosa devo mettere qui e dove lo trovo?"* Zero gergo, guide contestuali.
- **Consulente che segue più aziende** (secondario): gestisce un portafoglio di clienti, coi piani per capienza. Domanda: *"a che punto è ogni pratica, cosa manca prima della verifica, dove lo dimostro?"* Tollera densità; non tollera perdite di dati o numeri non difendibili in audit.

⚠️ L'app interna parla ancora a uno studio («portafoglio», «studio»): il riallineamento del sito pubblico è del 6 novembre 2026, quello dell'app è un lavoro a sé.

## Tono di voce

**Sulle pagine pubbliche la copy è dura ma vera** (decisione del committente, 6 novembre 2026): si parte da ciò che pesa davvero su chi legge, obblighi, sanzioni, richieste dei clienti, e si dice con chiarezza che cosa fa il sistema. Ogni obbligo o sanzione porta la fonte normativa, stampata in pagina, e si dice chi è obbligato: mai scadenze inventate, mai «obbligatorio per tutti» dove la legge pone soglie. Le fonti stanno in `docs/fonti-vetrina.md`. Dentro l'app il tono resta quello che segue.

Italiano professionale e concreto, come i prototipi: frasi che spiegano il *perché normativo* ("un'esclusione senza motivazione è il rilievo più frequente in verifica"). Niente hype, niente anglicismi evitabili, niente emoji nel prodotto. I numeri parlano: sempre unità di misura e fonte.

## Anti-reference (cosa NON essere)

- Non la famiglia calda "Ambra" di Evalis: questo prodotto è freddo, istituzionale, corporate-tech.
- Non il verde brillante "eco-friendly" da greenwashing: la sostenibilità qui è contabilità, non marketing.
- Non il template SaaS AI-generico: gradient text, glassmorphism di default, griglie di card identiche, hero-metric giganti.
- Non un gestionale anni 2000: denso non significa brutto; il documento finale deve sembrare uscito da una big-four.

## Principi

1. **Il server è la verità**: la UI mostra stato e chiama azioni, non decide. Entitlement, limiti, calcoli: tutto server-side.
2. **I numeri dei prototipi sono il contratto**: il motore di calcolo riproduce i golden test; ogni scostamento è documentato e approvato.
3. **Due registri**: app di lavoro densa e silenziosa; documento finale editoriale e ricco. Il contrasto tra i due è il lusso.
4. **Mai perdere il lavoro**: autosave, snapshot immutabili dei documenti pubblicati, dati mai cancellati alla scadenza (sola lettura).
