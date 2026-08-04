# Blog headless su EvalisDeck — dove divergiamo dal documento di Evalis Academy

Compagno di `blog-headless-wordpress.md`. Quel documento è il resoconto di **un altro progetto**:
va letto come ricetta, non come istruzioni da eseguire. Qui c'è cosa cambia da noi, verificato
sulla codebase il 2026-08-04, non supposto.

---

## 1. La differenza che conta più di tutte: qui c'è un prodotto che i clienti pagano

`evalisacademy.it` è un sito di corsi con una landing. **EvalisDeck è un SaaS**: la stessa
applicazione che serve il blog serve anche il portafoglio, i cinque percorsi e la generazione
dei documenti.

Il documento prescrive che **la compilazione fallisca di proposito** se il CMS non risponde o
se restituisce zero articoli (sezione 6). È giusto per un sito di contenuti. Da noi
significherebbe che **un WordPress spento blocca il rilascio di una correzione al prodotto**, o
peggio che un deploy urgente non parte perché una macchina che ospita un blog è in manutenzione.

**Regola nostra, opposta:** il blog non deve MAI poter bloccare il rilascio dell'applicazione.

- le pagine del blog si generano in modo isolato: se la fonte non risponde, `/blog` degrada
  (elenco vuoto con un messaggio) e **tutto il resto si compila**;
- la **sitemap** in quel caso mantiene le pagine del prodotto e omette gli articoli, invece di
  svuotarsi;
- il controllo «meno articoli dell'ultima volta» resta, ma **avvisa** invece di far fallire la
  compilazione dell'intera applicazione.

Il rischio che il documento voleva evitare — pubblicare un blog vuoto senza accorgersene —
si copre col controllo automatico e con la guardia sul conteggio, non fermando il deploy.

## 2. Non abbiamo articoli da migrare

L'Academy ne aveva sette, con URL indicizzati, e ha dovuto fare un cutover con i 410.

Noi partiamo da **zero articoli**. Quindi:

- `rimossi.ts` **nasce vuoto**;
- il controllo `vecchi-url` non ha nulla da provare all'inizio;
- il controllo `conflitto-rimossi` **serve lo stesso**, ed è quello che impedirà in futuro di
  coprire con un 410 un articolo ancora pubblicato;
- niente fotografia dello stato in Search Console prima della migrazione: non c'è un prima.

**Conseguenza pratica:** il blog nascerà vuoto e resterà vuoto finché il consulente non scrive.
`BLOG_CONSENTI_VUOTO` non è «solo il primo giorno» come dice il documento: da noi è la
condizione normale per un po'. Vedi il punto 1.

## 3. Il consenso e GA4: da noi NON esistono, ed è una scelta scritta

La sezione 9-bis del documento descrive un impianto di consenso completo con GA4.

Da noi:

- il banner è una **informativa breve con un solo pulsante**, non un consenso — perché usiamo
  soltanto cookie tecnici, per i quali l'art. 122 del Codice privacy chiede l'informativa e non
  il consenso;
- la **cookie policy dichiara testualmente** che «non abbiamo strumenti di analisi statistica di
  terze parti»;
- non c'è nessuna analitica installata (verificato: zero `gtag`, zero Plausible, zero
  `@vercel/analytics`).

**Quindi la sezione 9-bis non si applica**, oggi. Se un domani si vuole GA4, va rifatto tutto
quel capitolo *e* riscritta la cookie policy: il componente `informativa-cookie.tsx` è già
strutturato per diventare un consenso vero, ma il lavoro non è mezz'ora.

Search Console invece si può usare subito: non richiede consenso.

## 4. La presentazione va riscritta, non copiata

Il documento dice che «sul lato Next.js non c'è nulla da riscrivere». **Vale per la logica, non
per la presentazione.**

| Loro | Noi |
|---|---|
| `src/components/pages/Blog.jsx`, `BlogPost.jsx`, `AutoreBlog.jsx` | **JSX**: qui tutto è TypeScript |
| Il loro design system | Il nostro registro «Corporate Tech»: token, `font-display` Bricolage, i cinque colori di modulo, `Reveal` |

Si copia `src/features/blog/` (logica pura, nessun disegno). Le pagine e i componenti si
scrivono nuovi, dentro `src/app/(marketing)/blog/`, con l'intestazione, il piede e i token che
abbiamo già.

## 5. Cose che da noi mancano e vanno create

| Cosa serve | Stato da noi |
|---|---|
| `src/proxy.ts` (o middleware) per i 410 | **assente**: non abbiamo né `proxy.ts` né `middleware.ts` |
| Sanificatore **HTML** a lista bianca | assente: il nostro `sanificaTiptap` lavora su **JSON Tiptap**, non su HTML. Non è riusabile |
| `crons` in `vercel.json` | assente: c'è solo `regions` |
| `tsx` fra le dipendenze | assente: i nostri script di collaudo sono `.mjs`. Il verificatore va scritto così, non in `.ts` |
| `images.remotePatterns` in `next.config.ts` | assente |
| Sitemap dinamica | oggi è **statica a quattro voci** |

> **Attenzione sul proxy.** Da noi un middleware gira su OGNI richiesta, comprese quelle
> dell'applicazione con i suoi guard di sessione. Va scritto per uscire immediatamente su tutto
> ciò che non è `/blog/`, altrimenti si aggiunge lavoro a ogni pagina del prodotto.

## 6. Cose che da noi NON sono un problema

- **Trappola 13** (`ScrollReveal` senza `"use client"`): il nostro `scroll-reveal.tsx` ce l'ha
  già. Verificato.
- **Trappola 12** (lo scatto a pagina intera non attiva le animazioni): ci riguarda, e l'abbiamo
  già incontrata nei collaudi visivi. Gli script scorrono la pagina prima di scattare.
- `/api/` è già escluso dai crawler nel nostro `robots.ts`, quindi il webhook nasce protetto.

## 7. Nomi e valori, aggiornati al nostro dominio

Il documento usa ancora `bilanciotool.it`, che era il nome di lavorazione. Il dominio è
**`evalisdeck.it`** dal 2026-08-04.

```
CMS                 cms.evalisdeck.it
SITO_PUBBLICO       https://evalisdeck.it
schema database     wp_evalisdeck
utente database     wpuser_evalisdeck
rete Docker         rete-evalisdeck
servizio            wp-evalisdeck
volume              wp-evalisdeck-data
```

**Da NON cambiare:** lo spazio dei nomi REST resta `evalis/v1` (trappola documentata nella
sezione 4 del documento: `wp.ts` lo chiama con l'indirizzo scritto nel codice, e rinominarlo
romperebbe i 301 sugli slug **in silenzio**).

## 8. Le variabili d'ambiente vanno dentro `env.ts`

Da loro sono variabili di Vercel e basta. Da noi c'è `src/lib/env.ts` con validazione zod e
l'elenco `REQUIRED_IN_PROD`.

Le sei variabili del blog vanno aggiunte allo schema, ma **nessuna in `REQUIRED_IN_PROD`**:
altrimenti il deploy dell'applicazione fallirebbe finché il CMS non esiste — di nuovo il
punto 1.

## 9. Le immagini: qui c'è una scelta ancora aperta

Il documento le lascia **ospitate dal CMS**, con un rewrite di Next che le serve dal dominio
pubblico e la cache di Vercel davanti.

Il committente ha invece chiesto che le immagini vengano **portate dentro al sito**, con tutti i
campi che il consulente compila (testo alternativo, didascalia, titolo).

Sono due strade diverse e **vanno riconciliate prima di scrivere codice**:

| | Rewrite dal CMS (documento) | Copia dentro (richiesta) |
|---|---|---|
| Lavoro | nessuno, funziona subito | copia alla pubblicazione, con impronta per non duplicare |
| Dipendenza dal CMS | il CMS resta nel percorso, mitigato dalla cache | nessuna: il CMS può stare spento |
| Dove vivono | sul server del CMS | Supabase Storage (già nostro, stessa regione UE) |
| Indirizzo pubblico | nostro dominio in entrambi i casi | nostro dominio |

Il documento avverte che con due blog sulla stessa macchina **un guasto lungo del CMS
degraderebbe entrambi**. La copia dentro elimina quel legame.

## 10. Il secondo WordPress va sulla macchina che esiste già

Il documento è esplicito: stesso server, schema separato, utente di database separato, rete
Docker separata, blocco Caddy separato, token nuovi. È già progettato per due siti, e i margini
misurati dicono che ci sta (un secondo WordPress aggiunge ~115 MB su 3 GB liberi).

Le trappole della procedura da tenere sott'occhio, perché mordono in silenzio:

1. **`db-init/` non viene rieseguito** su un database esistente: lo schema del secondo sito si
   crea a mano.
2. **I backup salvano `wp-content` per servizio**: senza aggiungere il nostro nome alla
   variabile `SITI=` del cron, si salverebbero gli articoli e **non le immagini**.
3. **Validare il Caddyfile prima di ricaricarlo**: un errore di sintassi spegne **entrambi** i
   blog.
4. **Un utente di database suo**, non quello di Evalis.

## 11. I rischi editoriali, che valgono anche per noi

Se il **consulente SEO è lo stesso** per i due blog, i due rischi della sezione 4 del documento
sono reali e non si risolvono con l'infrastruttura:

- **contenuti troppo simili** fra i due siti — duplicazione e cannibalizzazione;
- **link incrociati** senza una ragione redazionale vera.

Serve una regola editoriale scritta, non una configurazione.

## 12. Quello che abbiamo scoperto montandolo (04/08/2026)

Cose che il documento di riferimento non dice, trovate provando la catena dal vivo.

### Il webhook non parte da riga di comando

`wp post update` da `wp-cli` **non fa partire il webhook**, anche se l'aggancio
(`transition_post_status`) scatta regolarmente. Il motivo: la chiamata è `blocking => false`,
e sotto CLI il processo finisce prima che la richiesta esca. Da una richiesta web (la
dashboard, o le API REST) parte e funziona: l'articolo si aggiorna in produzione in una
quindicina di secondi.

Conseguenza pratica: **le prove della catena vanno fatte via dashboard o via REST, mai con
`wp-cli`**, altrimenti si conclude che il webhook è rotto quando non lo è. Per lo stesso
motivo, se un giorno servisse una pubblicazione in blocco da riga di comando, andrà seguita
da una chiamata esplicita al webhook.

### `wp post create` non assegna un autore

Un articolo creato da riga di comando resta con `post_author = 0`. Le conseguenze sono
invisibili nella dashboard e visibili a Google: lo schema JSON-LD dichiara un autore con nome
vuoto, e `/wp-json/wp/v2/users` non elenca **nessun** utente (WordPress mostra pubblicamente
solo gli autori con articoli pubblicati). Anche qui: gli articoli veri nascono dalla
dashboard, quindi il problema riguarda solo le prove — ma il controllo automatico ora se ne
accorge da solo.

### Il marchio in coda al titolo, due volte

Yoast accoda il nome del sito a ogni titolo, e il nostro layout ne accoda un altro. Il
suffisso lo toglie il frontend leggendo `og_site_name` dallo stesso payload, non
un'impostazione nel pannello: le impostazioni si riattivano con un aggiornamento e nessuno
se ne accorge. Stessa regola degli indirizzi, estesa alla presentazione: **il CMS fornisce i
valori, il sito decide come si vedono.**

### Il redirect sullo slug rinominato è un 308, non un 301

Next risponde con `permanentRedirect()`, cioè 308. Google lo tratta come un permanente
equivalente al 301; la differenza (il 308 conserva il metodo HTTP) qui non ha effetto.

### L'interruttore di visibilità va passato ai controlli

A blog spento la sitemap non elenca gli articoli **per scelta**. Se i controlli non lo
sapessero, il conteggio sarebbe rosso ogni mattina fino all'apertura: un allarme quotidiano
che si impara a ignorare, cioè il modo migliore per non vedere quello vero. I controlli
ricevono lo stato dichiarato e difendono **entrambe** le configurazioni — restare `noindex`
dopo l'apertura è il guasto che si scopre dopo mesi di zero visite.
