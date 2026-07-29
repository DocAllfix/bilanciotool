# PRODUCT.md — registro di prodotto (fonte di verità per il design)

## Cosa

SaaS multi-studio per la rendicontazione ESG delle PMI italiane: un modulo **Inventario GHG** (ISO 14064-1:2018, percorso in 8 passi fino al rapporto conforme al §9.3.1) e un modulo **Bilancio di Sostenibilità** (GRI 2021 / ESRS-VSME, percorso in 7 passi fino al documento impaginato), integrati: l'inventario alimenta la sezione emissioni del bilancio. Il valore non è il calcolo ma il **metodo incorporato**: guide per tema, motivazioni d'esclusione, checklist d'audit, scale di valutazione — un consulente impacchettato in software. Nato dai due prototipi in `archivio/`.

## Utenti

- **Consulente ESG di studio** (utente primario): gestisce un portafoglio di aziende clienti. La sua domanda: *"a che punto è ogni pratica, cosa manca prima della verifica, dove lo dimostro?"* Tollera densità; non tollera perdite di dati o numeri non difendibili in audit.
- **Titolare dello studio** (compratore): paga l'abbonamento annuale. Domanda: *"quanto tempo risparmio per pratica e che figura faccio col cliente?"* Guarda il documento finale, non i form.
- **Referente PMI** (fase 2, invitato): compila dati e carica evidenze su richiesta. Domanda: *"cosa devo mettere qui e dove lo trovo?"* Zero gergo, guide contestuali.

## Tono di voce

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
