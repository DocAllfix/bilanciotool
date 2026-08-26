# Il metodo: dal cambiamento alla produzione

Come si porta in produzione un cambiamento — una funzionalità nuova, una correzione, la
manutenzione — senza scoprire i guasti dai clienti.

Non è teoria. Ogni regola qui dentro è stata pagata almeno una volta, e accanto a ciascuna
c'è il difetto che l'ha insegnata.

---

## Il principio

> **I collaudi verdi in locale non sono un permesso di rilascio.
> Sono la condizione per meritarsi l'anteprima.**

Il 26 agosto 2026, con **1178 test verdi in entrambe le modalità** e **dodici moduli
percorsi comando per comando**, mezza giornata di anteprima ha trovato:

| difetto | perché in locale non si vedeva |
|---|---|
| 🔴 la **password nella barra degli indirizzi** | un `<form>` senza `method` è GET, e prima dell'idratazione l'invio è quello nativo. In locale l'idratazione è istantanea: il difetto **non esiste** |
| 🔴 i **PDF erano la pagina di accesso di Vercel** | il generatore apre il proprio indirizzo con Chromium, e in anteprima è protetto. Il PDF era valido e pesava 141 KB: passava «non è vuoto» |
| il **freno sulle iscrizioni frenava noi** | si azzerava «solo in locale», legato all'indirizzo — ma un'anteprima è nostra quanto localhost |
| 37 collaudi rossi con tutti i controlli verdi | Vercel inietta nelle anteprime uno script che la nostra CSP blocca |
| 🔴 la **data resa dal server non coincideva con quella del browser** | `toLocaleDateString` dipende dall'ICU del runtime, e server e browser ne hanno due diversi. In locale è lo stesso Node: non può divergere |
| ⚠️ **nove collaudi dichiaravano un bersaglio e ne misuravano un altro** | avevano l'indirizzo scritto a mano. Solo puntandoli a un deploy si scopre che non ascoltano |

Nessuno di questi era raggiungibile da localhost. Non per sfortuna: **per costruzione**.

⚠️ E l'ultimo e' il piu' istruttivo, perche' non era nel prodotto: era nello **strumento di
misura**. Un metodo va collaudato come il codice che collauda.

---

## Il giro, in sei passi

### 1 · Il cancello locale

```bash
npm run typecheck
npm run build
npm run test                          # senza pipe: in una pipe l'uscita è dell'ultimo comando
RLS_FORCE_ROLE=app_rls npm run test   # come gira la produzione
```

⚠️ **`npm run test | tail` restituisce zero anche con un test rosso.** Il conteggio
stampato è l'unica prova, e va letto.

⚠️ Prima di credere a un referto locale, **confrontare l'ora del processo con quella del
build**: un `next start` non rilegge il sorgente, e se muore con `EADDRINUSE` risponde
quello di prima. `pretendiServerAggiornato` lo coglie chiedendo il manifesto del build
corrente.

### 2 · Il ramo

```bash
git checkout -b anteprima/<cosa-stai-provando>
git push -u origin anteprima/<cosa>
```

Mai `main`: Vercel distribuisce in produzione solo da lì.

⚠️ **Il marcatore `[skip ci]` non è una garanzia.** Provato: Vercel ha costruito lo stesso.
Se serve che il ramo nasca senza build, si **verifica** all'API che nessun deployment sia
partito, e in caso lo si annulla.

### 3 · L'ambiente dell'anteprima

```bash
node scripts/vercel-ambienti.mjs                    # sola lettura: chi vale dove
node scripts/vercel-prepara-anteprima.mjs           # dice cosa farebbe
node scripts/vercel-prepara-anteprima.mjs --applica
```

⚠️ **Il predefinito di Vercel è spuntare tutti e tre gli ambienti.** Misurato il 26 agosto:
cinque variabili critiche — `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `BETTER_AUTH_SECRET` — valevano in produzione **e** in
anteprima. Spingere un ramo avrebbe collaudato contro il database che incassa.

La soluzione non tocca niente di esistente: **variabili legate al singolo ramo**, che su
Vercel hanno la precedenza. Additive, reversibili cancellandole.

Lo script si ferma da solo se il `.env` locale non punta allo sviluppo o se la chiave
Stripe non è `sk_test_`, e riverifica in coda che le voci di produzione siano intatte.

### 4 · Il giro completo sull'anteprima

```bash
node scripts/qa-anteprima.mjs --su https://<anteprima>
node scripts/qa-anteprima.mjs --su <url> --da fornitore   # riprende
node scripts/qa-anteprima.mjs --elenco                    # cosa girerebbe
```

Elenca i collaudi **dalla cartella**: uno nuovo entra da solo. I tredici esclusi portano la
ragione accanto — un'esclusione senza motivo scritto diventa, sei mesi dopo, un collaudo
che nessuno lancia più e nessuno sa perché.

### 5 · Le migrazioni, prima della fusione

⚠️ **È il blocco duro.** Lo schema della produzione può essere indietro di settimane:
fondere senza applicarle manda in produzione codice che cerca tabelle inesistenti.

`scripts/guardia-database.mjs` si rifiuta di scrivere su un database con abbonamenti Stripe
o sul riferimento noto della produzione. L'override è `SO_CHE_E_PRODUZIONE=1`, **e va
dichiarato da una persona**.

### 6 · La fusione, e dopo

Dopo il rilascio, i collaudi in **sola lettura** sul sito vivo: `tutto-pubblico`,
`sitemap`, `legale`, `csp`. Sono puri GET su pagine pubbliche — verificato file per file
che non registrino niente e non tocchino Stripe.

⚠️ **Mai in produzione i collaudi che scrivono.** Registrano utenti veri, pubblicano
documenti veri, e le chiavi Stripe lì sono **vive**: un clic su «Paga» crea un cliente e un
addebito. `verifica-checkout` e `verifica-pagamento` si rifiutano di partire fuori da
localhost senza `SO_CHE_E_VIVO=1`, ed è giusto così.

L'unica prova d'acquisto vera la fa **una persona**, una volta, con una carta propria.

---

## Le regole che valgono sempre

**Sul bersaglio — la lezione più cara**

- ⚠️ **Non basta che il lanciatore dichiari il bersaglio: deve essere il collaudo ad
  ascoltarlo.** Nove collaudi su cinquantotto avevano l'indirizzo scritto a mano, e
  `qa.mjs` stampava l'anteprima mentre loro parlavano con localhost. Un'etichetta sbagliata
  è peggio di un'etichetta assente: a quella ci si crede. Sono state ore di diagnosi su un
  difetto che non esisteva dove lo cercavo, e i «33 su 34» che riferivo non dicevano niente
  sul deploy. Guardia: `collaudi-bersaglio-pure`.
- **`x-vercel-id` assente in una risposta è la firma di qualcosa che non viene da Vercel.**
  L'indizio era lì dalla prima misura, e l'ho letto solo dopo.
- **Prima di credere a un referto locale, confrontare l'ora del processo con quella del
  build.** Un `next start` non rilegge il sorgente, e se muore con `EADDRINUSE` risponde
  quello di prima.

**Sul misurare**

- **Un collaudo dichiara sempre contro cosa parla.** Un referto senza bersaglio può essere
  verde sull'ambiente sbagliato.
- **La prova di un divieto è la riga che non compare nel database**, non il messaggio: un
  divieto applicato in silenzio e un'azione riuscita in silenzio si somigliano troppo.
- **Un'asserzione sulla dimensione di un file non dice niente su cosa c'è dentro.** Due
  documenti diversi che pesano uguale sono la domanda da farsi: 141.714 byte identici erano
  la pagina di accesso di Vercel stampata due volte.
- **Un controllo che scandisce cartelle deve morire se non trova niente**, altrimenti un
  giorno passerà guardando zero file.
- **Ogni controllo nuovo si mette in rosso di proposito**, rimettendo il difetto, per
  vederlo fallire sull'asserzione giusta.

**Sul diagnosticare**

- **La prima spiegazione plausibile va messa alla prova, non applicata.** La diagnosi si
  chiude con un esperimento a variabile singola.
- **Un collaudo deve dire perché**, non solo che non è arrivato: «nessun download» manda a
  cercare un difetto del pulsante; «rotta 500 — {"errore":…}» dice dove guardare.
- **Un difetto intermittente non si dichiara chiuso su una misura sola.** «Ha funzionato
  una volta» non distingue corretto da fortunato.
- **Un fallimento di massa parla dell'ambiente, non del prodotto.** 111 file su 111 in
  raccolta, `ENOTFOUND` a raffica, un 503 durante una batteria concorrente: si verifica e
  si rilancia, non si corregge.

**Sul correggere**

- **Un pericolo si evita, non si filtra.** Il campo `etichetta` non è stato corretto: è
  stato tolto. Senza secondo nome, due nomi non possono divergere.
- **Mai rimandare la riga intera da props.** Quattro occorrenze finora: quantità
  dell'energetico, impatto della materialità, contatto di riferimento, politiche del
  bilancio. Ogni aggiornamento è per singolo campo, con dominio chiuso.
- **Una correzione a valle di un generatore sparisce alla prima riesecuzione**, in silenzio
  e coi conteggi ancora giusti. Si corregge dove il dato nasce.
- **Una strozzatura che non è l'unica non è una strozzatura**: dei 42 pittogrammi il primo
  tentativo ne tolse uno, perché due punti prendevano la stringa grezza dalle props.

**Sull'ambiente**

- **La documentazione che dice il falso su un ambiente è peggio della sua assenza.** Due
  volte: le chiavi Stripe date per di prova mentre erano vive, e l'archivio di sviluppo che
  era quello della produzione.
- **Ciò che la CSP permette si ricava dall'ambiente.** Un host ricopiato in tre direttive è
  una configurazione travestita da costante.
- **Un ambiente di prova si crea uguale a quello vero**, non più permissivo: le differenze
  comode sono quelle che fanno passare i collaudi e cadere la produzione.

---

## Per la manutenzione e la caccia ai difetti

**Quando arriva una segnalazione**, il giro è lo stesso al contrario:

1. si riproduce **sull'anteprima**, non in locale: metà dei difetti di questo prodotto
   esistono solo dove c'è rete vera;
2. si scrive il collaudo che lo coglie, e **lo si vede rosso**;
3. si corregge;
4. lo si vede verde, e si rilancia il giro completo.

**Prima di dare per rotto il codice**: guardare da quando gira il processo che si sta
collaudando, e contro quale bersaglio.

**Un collaudo va rilanciato anche quando non l'hai toccato.** Sei su quaranta erano rossi
da settimane, e cinque per cambiamenti fatti **altrove** — navigazione, verifica
dell'indirizzo, un dialogo in mezzo. Chi cambia una superficie condivisa non sa quali
collaudi la attraversano.
