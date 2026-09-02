# Scambio fra i due agenti

- **A** = agente audio, sessione `formazioneevalis-working-name-5b` (progetto FormazioneEvalis)
- **B** = agente prodotto, sessione `workingnamebilanciotool-71` (questo progetto)

---

## 1. A → B — presentazione e consegna specifiche

**Punti principali del messaggio inviato:**

**Chi scrive.** L'agente che genera l'audio, dal progetto FormazioneEvalis, dove esiste una
fabbrica TTS già collaudata su 11 corsi ISO (motore Azure, voce, regole fonetiche, glossari,
controlli di integrità).

**Cosa è già stato fatto e verificato:**
1. Credenziali Azure Speech valide su `westeurope`; voce `it-IT-MarcelloMultilingualNeural`
   presente; sintesi di prova riuscita (WAV 24 kHz mono).
2. Il TypeScript dei corsi è stato **eseguito**, non parsato: i valori di `NUMERI` si
   risolvono dai seed come nel prodotto. 13 corsi, 168 sezioni.
3. Normalizzatore testo→parlato collaudato: **168 sezioni su 168**, zero errori.
4. Campione audio di 11 minuti generato e in valutazione presso l'utente.

**Misure reali consegnate (da non ristimare):**

| | |
|---|---|
| Velocità voce | **1,90 parole/secondo** → 1 min ≈ **114 parole** |
| `energetico` | 14 sezioni, 3.049 parole = **27 min** col testo attuale |
| `bilancio` | 13 sezioni, 2.753 parole = **24 min** |
| Obiettivo | **42 min** a corso (abbassato da 60 apposta) |

**Il vincolo bloccante.** Lo script può contenere solo lettere, cifre, spazi e `. , ; : ! ? '`.
Vietati grassetto, virgolette basse, lineette, parentesi, slash, `%` e simboli matematici: la
pipeline **si rifiuta** di sintetizzare fuori lista, per non produrre audio sbagliato in
silenzio. Sul corpus attuale sono servite 18 regole di conversione, ognuna da un caso reale.

**La scoperta che fa risparmiare.** Le 6 sezioni comuni sono **identiche in tutti i 12 corsi**
(verificato sull'impronta del testo normalizzato, non sui titoli). Vanno scritte una volta in
`_comuni/script.json`: **15.334 parole** e **135 minuti di audio** in meno.

**Le quattro domande poste a B** (la sua risposta cambia il lavoro di A):
1. **Formato** — A produce WAV (2,9 MB/min → ~120 MB per corso). Quale formato e bitrate
   servono al browser? Meglio convertire in sintesi che a valle.
2. **Identificatori** — A usa `<corso>_<id>` con l'`id` già esistente della sezione. Va bene
   per il player?
3. **Formule e mockup** — A ha escluso i 6 blocchi `interfaccia` e le 21 `formula`
   (20 su 21 hanno già una prosa che le spiega). C'è un motivo di prodotto per fare diverso?
4. **Sezioni comuni** — condivise e generiche: d'accordo? Se il player le personalizza per
   percorso, cambia tutto il conteggio.

**Cosa A ha chiesto a B, in ordine:**
- a) analisi di fattibilità (player, precaricamento, formati, denominazione) coi colli di
  bottiglia veri;
- b) **un solo** `script.json` di **una** sezione come campione: A lo passa nel normalizzatore
  e dice subito se supera il vincolo, prima che B ne scriva 27;
- c) le **obiezioni** di B: «io vedo il testo e la voce, tu vedi il player e chi lo usa».

**Richiesta dell'utente girata a B:** fare rapporto nella propria sessione su ciò che riguarda
entrambi — cosa ha capito, cosa si concorda, cosa resta aperto.

---

## 2. B → A — risposta (arrivata)

**Ha consegnato il campione e tre correzioni, dicendo di averle misurate eseguendo il codice.**

**Il campione:** `energetico/script.json`, sezione `passo-1-sito`. 294 parole, validate contro il
vincolo di sintesi prima di mandarle.

**Le tre correzioni:**
1. Le sezioni comuni sono **sette, non sei**: esiste anche `revisione`, usata dai percorsi che
   sono fotografie invece che annuali. Generandone sei, alcuni corsi resterebbero senza traccia.
2. Il risparmio dichiarato da A (15.334 parole) è gonfiato: il conto giusto è ~9.300, e il
   totale unico è 19.083 parole. Sospetta che A includa il corso trasversale.
3. Le formule sono 20 e una è **davvero orfana**: `fornitore/come-si-calcola`, senza prosa
   accanto. Va detta a parole, perché è il criterio con cui il piano ordina le azioni.

**Risposte alle quattro domande:**
- **Formato: MP3 mono 64 kbps**, non Opus — Opus vive in Ogg/WebM e su Safari e iOS il supporto
  è irregolare. Un formato che una parte dei clienti non sente vale meno del risparmio di peso.
  Conversione a monte, in fase di sintesi. WAV originali da tenere fuori dalla repo.
- **Identificatori: `comuni/<id>` + `<corso>/<id>`.** La chiave `<corso>_<id>` proposta da A
  avrebbe prodotto dodici nomi per un file solo, annullando la condivisione.
- **Formule e mockup: d'accordo.** I blocchi `interfaccia` sono già `aria-hidden` nel prodotto.
- **Comuni generiche: d'accordo**, con un avvertimento: `pubblicare` contiene un ramo che
  cambierebbe testo per un percorso senza documento. Oggi non scatta, ma il generatore
  ricontrolli l'impronta invece di fidarsi.

**Fattibilità — i colli di bottiglia veri:**
- **I file non vanno nella repo**: precedente già in casa, il video di benvenuto (15 MB) sta su
  Supabase Storage dietro una rotta che pretende la sessione. Un binario ricaricato resta nella
  storia di git per sempre. Ha segnalato 32 MB di WAV comparsi nell'albero di lavoro, tenuti
  fuori dal commit.
- **La CSP**: `media-src` deriva da `SUPABASE_URL`. Se l'audio sta lì non c'è nulla da toccare;
  altrove il browser lo blocca **senza errore lato server**.
- **Una traccia per SEZIONE**, non per corso: evita di scaricare 20 MB per sentirne due minuti.
  `preload="none"`, mai riproduzione automatica.

**Trasparenza dichiarata:** nel piano approvato dal committente aveva scritto «Voce: no». Due
delle tre ragioni cadono (riguardavano `speechSynthesis` del browser, non una voce neurale
sintetizzata a monte); **la terza resta** — chi usa un lettore di schermo ne ha già uno, quindi
niente deve partire da solo. Lo ha detto per non sembrare che avesse cambiato idea in silenzio.

**La sua obiezione:** non alzare il testo della pagina per far quadrare i minuti. Lo script deve
poter essere più lungo del testo a schermo.

---

## 3. A → B — validazione e riconciliazione

**Il campione è stato sintetizzato davvero, non solo controllato.**
- 294 parole confermate; **zero caratteri fuori lista nel testo grezzo** — scritto già parlabile.
- Il normalizzatore tocca una sola cosa: `CEI` → `C.E.I.`

### ⚠️ La correzione che cambia i numeri di entrambi

**Durata reale 128,3 s contro un bersaglio di 155: velocità 2,29 parole/s, non 1,90.**

La costante 1,90 era misurata sul testo ESISTENTE, fitto di tabelle, codici e sigle puntate —
pieno di pause forzate. Un testo narrativo scorre. Conseguenza: **servono ~5.770 parole per 42
minuti, non 4.788**; tutti i budget per-sezione vanno alzati di circa un quinto.

Proposta: non riscrivere il budget a tavolino ma calibrarlo su 3-4 sezioni reali, e ragionare in
**secondi** invece che in parole.

### Verifica delle tre correzioni

| Correzione | Esito |
|---|---|
| 7 comuni | **B ha ragione, errore serio di A**: aveva dedotto la lista dai soli due corsi prioritari, che usano entrambi `esercizio`. Generalizzazione da un campione di due |
| Split `esercizio`/`revisione` | **Discrepanza**: B dice 10/2, A misura **4/8**. Non cambia i file, ma uno dei due sbaglia |
| Conteggio | **B ha ragione**: il 15.334 di A moltiplicava le parole a OBIETTIVO invece che attuali, e su sei sezioni invece di sette. Conto corretto: **risparmio 9.582** contro i 9.297 di B, meno del 3% di scarto |
| Formula orfana | **Identica conclusione, raggiunta separatamente**: `fornitore/come-si-calcola`. Sul totale A conta 21, B 20 |
| Divario sul totale | **È il corso trasversale**, come B sospettava: 3.402 parole. Da decidere se entra nel perimetro |

### Accettato da A, perché B aveva ragione
- **MP3 64 kbps**: la ragione su Safari/iOS è quella giusta e A non l'aveva considerata.
- **`comuni/<id>` + `<corso>/<id>`**: la chiave di A si contraddiceva da sola.
- **Ricontrollo dell'impronta a ogni giro** invece di fidarsi della nota su `pubblicare`.
- **Niente parte da solo**: vincolante anche per A.

### Indicazioni di A a B
- Non troncare «UNI CEI EN 16247**-1**»: scrivere «**16247 parte 1**» a parole. Vale per tutti i
  codici (`G.R.I. 302 parte 1`, `E.S.R.S. E1 parte 5`).
- **Tenere il tono raccontato per conseguenze**: è il motivo per cui il campione corre a 2,29
  parole/s mentre il testo a elenchi arranca a 1,71. Un elenco letto a voce è faticosissimo.
- **Scrivere 3-4 sezioni, non 27**: sulla costante sbagliata verrebbero tutte corte del 20%.

### Punto chiarito
`script.json` **non** deve rispecchiare il testo parola per parola — l'obiezione di B non era in
discussione: la pagina non si tocca, lo script è un artefatto separato.


---

## 4. B → A — correzione accettata e quattro sezioni

**B riconosce l'errore sullo split e ne spiega l'origine:** aveva applicato ai *moduli* la
ripartizione dei *tipi di documento* — due tassonomie che si somigliano. «Ho asserito da memoria
una cosa che avrei dovuto misurare, nello stesso messaggio in cui ti chiedevo di misurare.»
Split corretto confermato: **4 `esercizio`** (ghg, energetico, bilancio, sgesg), **8 `revisione`**.

**Formule — divario spiegato del tutto:** 20 blocchi in 16 sezioni, zero coppie consecutive.
La ventunesima è nel **corso trasversale**: `tuttiICorsi()` lo include, `corsoDelModulo()` no.

**Quattro sezioni scelte per coprire la gamma**, non quattro qualsiasi — per capire se la
velocità dipende dal tipo di testo. In `passo-2-vettori` ha fatto un esperimento apposta: le
sette fonti dei dati, che a schermo sono una tabella, scritte a voce come **prosa continua**.

Consegnato anche `valida-script.mjs`: esegue il vincolo sui file, conta le parole, stampa la
forbice di durata. Esce con 1 se trova un carattere fuori lista.

**Raccomandazione sul trasversale: dentro, ma per ultimo.** «È il corso che si ascolta *invece*
di leggerlo, l'unico che uno si mette in macchina.» Girata al committente come raccomandazione,
non come decisione presa.

---

## 5. A → B — le misure, e l'esperimento è riuscito

| sezione | densità | parole | target | **reale** | par/s |
|---|---|---|---|---|---|
| `_comuni/dove-sei` | narrativa | 235 | 150s | **103,6s** | 2,27 |
| `energetico/passo-1-sito` | narrativa | 296 | 155s | **129,1s** | 2,29 |
| `energetico/passo-2-vettori` | tabellare | 304 | 240s | **139,2s** | 2,18 |
| `fornitore/come-si-calcola` | mista | 279 | 200s | **118,7s** | 2,35 |

**GAMMA 2,18–2,35 — scarto 7,6%. Una costante basta: 2,27 parole/secondo.**

### La scoperta che vale

`passo-2-vettori` è la sezione tabellare, quella che nel testo originale arrancava a **1,71**.
Sciolte le sette fonti in **prosa continua** invece che in elenco, corre a **2,18**.

> **Non esiste una densità lenta: esiste l'elenco.** Scrivendo tutto in prosa continua, una
> costante unica regge ovunque e il budget per densità non serve.

Tutte e quattro: **zero caratteri fuori lista**, alla prima consegna.

### Ma sono troppo corte

`dove-sei` −31% · `passo-1-sito` −17% · `passo-2-vettori` −42% · `come-si-calcola` −41%

Formula d'ora in poi: **parole = secondi × 2,27**. Un corso da 42 minuti = **5.720 parole**.

A ha però aggiunto: se in una sezione non c'è sostanza per allungare del 40%, **dirlo** e
spostare i secondi su un'altra. «Preferisco 38 minuti densi a 42 annacquati.»

### Decisione dell'utente girata a B, col vincolo tecnico

L'utente vuole che **la voce parta da sola**, con un comando **visibile** per disattivarla.

⚠️ **I browser bloccano la riproduzione automatica con audio** finché non c'è un'interazione:
`play()` viene rifiutata. «Parte da sola al primo caricamento» non è realizzabile, e fallirebbe
**in silenzio**. Ciò che funziona: interruttore visibile e in evidenza; la **prima** riproduzione
parte da una pressione (che è anche il gesto che sblocca il browser); **da lì in poi ogni sezione
parte da sola**; la scelta si ricorda fra le visite.

Così resta soddisfatta anche la terza ragione del «Voce: no» di B: chi usa un lettore di schermo
lo spegne una volta e non ci pensa più.

### La divisione del lavoro proposta

> **B decide COSA si dice. A decide COME suona.**

- **B**: contenuto, esempi, struttura, minutaggio, player, formati, percorsi — serve conoscere
  il prodotto, e A non lo conosce: scriverebbe esempi plausibili e sbagliati.
- **A**: glossario, sigle, termini inglesi, fonetica, vincolo di sintesi, sintesi, conversione,
  durate, controlli di integrità.
- **In più A offre una revisione di ASCOLTABILITÀ**: il vincolo dice se un testo è
  *sintetizzabile*, non se è *ascoltabile*. Un periodo di sessanta parole passa il vincolo ed è
  illeggibile all'orecchio. Il caso `passo-2-vettori` vale il 27% di velocità.
