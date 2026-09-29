# Il blocco «prova il percorso» da mettere negli articoli

Per il consulente SEO. Si incolla in WordPress, si vede sul sito.

## Che cosa si incolla

Nell'editor dell'articolo: **blocco HTML personalizzato** (Aggiungi blocco → cerca «HTML»),
e dentro questa riga, da sola:

```html
<div class="evalis-percorso" id="bilancio-energetico"></div>
```

Niente altro: nessun testo, nessuno stile, nessuna classe in più. Il riquadro lo disegna il
sito.

Va messo **dove si vuole che compaia**: in coda all'articolo è la posizione naturale, ma
funziona anche a metà, dopo il paragrafo che tratta l'argomento. Se ne possono mettere più
d'uno nello stesso articolo.

## Che cosa si vede

Sul sito, al posto di quella riga, compare il richiamo al percorso: nome, una riga che dice
che cosa si può provare, e il pulsante che porta alla pagina pubblica dove il modulo si prova
**senza registrarsi**.

Il riquadro segue il tema del sito (chiaro e scuro), si stringe sul telefono, ed è costruito
con i nostri stessi elementi: non è un'immagine e non è HTML congelato dentro il CMS. Se un
giorno cambia il nome del percorso o il testo del pulsante, cambia **in tutti gli articoli
insieme**, senza toccarli.

## I percorsi disponibili

L'`id` è lo slug del percorso. Oggi ce n'è uno:

| `id` | dove porta |
|---|---|
| `bilancio-energetico` | `/percorsi/bilancio-energetico` |

Gli altri arrivano con la stessa forma. Per sapere se uno è già attivo basta aprire
`evalisdeck.it/percorsi/<id>`: se risponde, il blocco funziona.

## Se si sbaglia l'`id`

**Non succede niente di male.** Un `id` che non corrisponde a nessun percorso non produce
errori e non rompe l'articolo: semplicemente non compare niente in quel punto. Stessa cosa
se il blocco viene incollato prima che quel percorso sia online.

## Il collegamento sotto una parola

Resta la strada più diretta e non richiede questo blocco: un normale collegamento a
`https://evalisdeck.it/percorsi/bilancio-energetico` sotto la parola che si vuole, scritto
nell'editor come qualunque altro link. Il blocco serve per il richiamo in evidenza, non lo
sostituisce.

## Perché un segnaposto e non HTML vero

Tre ragioni, per chi si chiedesse perché non gli è stato dato un blocco già colorato.

1. **Gli articoli passano da una sanificazione stretta.** Dal CMS sopravvivono `div` e `span`
   coi soli attributi `class` e `id`; uno `style`, un `data-*` o un `onclick` vengono tolti.
   È la difesa che impedisce a chi ha accesso al CMS di infilare codice nelle pagine del
   sito, e non si allenta per un riquadro.
2. **Il CSS del sito viene generato leggendo il codice del sito**, non i contenuti di
   WordPress: un riquadro incollato con le nostre classi uscirebbe **senza stile**, perché
   quelle classi non verrebbero mai generate.
3. **L'HTML incollato invecchia dentro gli articoli.** Non segue il tema scuro, non si
   adatta al telefono, e il giorno in cui cambia un nome resta sbagliato in ogni articolo in
   cui è stato incollato.
