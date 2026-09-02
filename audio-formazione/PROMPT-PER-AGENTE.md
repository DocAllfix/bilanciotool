# Prompt da dare all'agente di Bilanciotool

Copia da qui in giù.

---

Dobbiamo aggiungere una traccia audio a ogni sezione dei corsi della formazione, partendo
dai due prioritari: **Bilancio energetico** (`energetico`) e **Bilancio di sostenibilità**
(`bilancio`). L'audio lo genera un agente esterno su Azure TTS, con voce, regole fonetiche e
dizionario già collaudati: **tu non generi audio**, prepari l'infrastruttura e gli script.

## Numeri di partenza (già misurati, non ristimarli)

I corsi sono dati in `src/features/formazione`: 13 corsi, 168 sezioni, blocchi tipizzati
(`prosa`, `elenco`, `avviso`, `tabella`, `formula`, `interfaccia`). Per i due corsi prioritari:

| Corso | Sezioni | Audio del testo ATTUALE | Obiettivo | Fattore |
|---|---|---|---|---|
| `energetico` | 14 | **27 min** (3.049 parole) | **42 min** (4.788 parole) | ×1,57 |
| `bilancio` | 13 | **24 min** (2.753 parole) | **42 min** (4.788 parole) | ×1,74 |

Misura fatta sulla voce reale: **1,90 parole/secondo**. Un minuto di audio ≈ **114 parole**.

⚠️ **Leggere il testo a schermo copre poco più della metà del minutaggio.** Serve circa
**metà contenuto in più**: esempi concreti, il perché di una scelta, l'errore tipico, cosa
succede se si sbaglia. Non riempitivo — se una sezione non ha altra sostanza da dare,
**dillo** invece di allungare: si riequilibra il budget su un'altra.

### Budget per sezione (proporzionale ai minuti a schermo)

`energetico` — parole oggi → target:

```
dove-sei             130 → 220     passo-1-sito         171 → 294
come-si-salva        203 → 220     passo-2-vettori      355 → 515
esercizio             96 → 220     passo-3-usi          461 → 662
la-verifica          102 → 220     passo-4-indicatori   246 → 441
pubblicare           218 → 294     passo-5-interventi   202 → 441
errori-comuni        141 → 220     passo-6-racconto     192 → 294
                                   verifica-e-documento 200 → 368
                                   fattori-energia      332 → 368
```

`bilancio` — parole oggi → target:

```
dove-sei             130 → 247     passo-1-organizzazione  128 → 330
come-si-salva        203 → 247     passo-2-materialita     443 → 742
esercizio             96 → 247     passo-3-indicatori      516 → 742
la-verifica          102 → 247     passo-4-politiche       243 → 330
pubblicare           218 → 330     passo-5-racconto        208 → 495
errori-comuni        141 → 247     verifica-bilancio       145 → 330
                                   errori-bilancio         180 → 247
```

### ⚠️ Le 6 sezioni comuni si scrivono UNA VOLTA SOLA

`dove-sei`, `come-si-salva`, `esercizio`, `la-verifica`, `pubblicare`, `errori-comuni` sono
**identiche in tutti i 12 corsi** — verificato confrontando il testo, non i titoli.

Scrivile una volta in `audio-formazione/_comuni/script.json` e **non ripeterle** dentro i due
corsi: l'audio si sintetizza una volta e si riusa ovunque. Sono circa 890 parole oggi, 1.394 a
target: ripeterle per 12 corsi significherebbe farle scrivere 12 volte e sintetizzare 12 volte
lo stesso audio.

Tienile **generiche**: parlano del prodotto, non del singolo percorso. Se le personalizzi per
corso smettono di essere condivise e il lavoro si moltiplica per dodici — se pensi che vada
fatto, proponilo prima invece di deciderlo.

## 1. Fattibilità tecnica

Analizza e riporta:
- come associare un file audio a ogni sezione (le sezioni hanno già un `id` stabile che
  finisce nell'indirizzo: **riusa quello**, non inventare identificatori nuovi);
- player: comandi, ripresa da dove si era rimasti, comportamento al cambio sezione;
- precaricamento e peso: sono WAV 24 kHz mono, circa **2,9 MB al minuto**. Valuta se servono
  MP3/Opus per la consegna al browser e dillo, con il formato che preferisci;
- cosa succede a chi non attiva l'audio: il corso deve restare completo da leggere.

## 2. Come deve essere scritto lo script

- **Parla a chi non guarda lo schermo.** L'audio non legge il testo: lo spiega. Dove il testo
  mostra una tabella o una schermata, l'audio deve dire a parole cosa ci si vede e perché conta.
- **Niente formule parlate.** Le formule restano a schermo: a voce si dice cosa calcolano e
  quando servono, mai il formalismo.
- **Tono**: quello già in uso nei corsi — diretto, concreto, senza enfasi commerciale.
- **Lunghezza**: `parole ≈ minuti_obiettivo × 114`. Dichiara il conteggio parole di ogni script.

### Vincolo di sintesi — questo è bloccante

Lo script deve contenere SOLO: lettere (accentate comprese), cifre, spazi e `. , ; : ! ? '`.

**Vietati** perché la sintesi si rifiuta di procedere: `**grassetto**`, `«virgolette»`,
`—` lineetta, `·`, parentesi, `/`, `%`, `×`, `÷`, `√`, `Σ`, `±`, `²`, `₂`, `§`, emoji.
Scrivili a parole: `per cento`, `per`, `diviso`, `CO due`, `paragrafo 7.2`.

Sigle e termini inglesi: **non inventarne le rese**. Se ne introduci di nuovi rispetto al testo
attuale, elencali a parte nel campo `termini_nuovi`: la pronuncia la configura l'agente audio.

## 3. Il pacchetto da consegnare

Un file JSON per corso, in `audio-formazione/<corso>/script.json`:

```json
{
  "corso": "energetico",
  "nome": "Bilancio energetico",
  "minuti_obiettivo": 42,
  "termini_nuovi": ["nome di sigla o parola inglese introdotta ex novo"],
  "sezioni": [
    {
      "id": "passo-1-sito",
      "ordine": 1,
      "titolo": "Passo 1 - Sito e perimetro",
      "minuti_schermo": 5,
      "durata_obiettivo_s": 270,
      "riferimento_visivo": "Che cosa vede sullo schermo chi ascolta: la tabella dei vettori, i due selettori in cima, il riquadro del perimetro.",
      "script": "Testo narrativo completo, gia' parlabile secondo il vincolo qui sopra.",
      "parole": 513
    }
  ]
}
```

Regole del pacchetto:
- `id` = **quello già esistente** nella sezione (`Sezione.id`), non uno nuovo;
- `ordine` = posizione di lettura, comuni prima e proprie dopo, come `sezioniDelCorso`;
- somma dei `durata_obiettivo_s` = `minuti_obiettivo × 60`, con scarto massimo del 5%
  (le 6 comuni contano a parte: stanno in `_comuni/script.json`, non nei due corsi);
- `riferimento_visivo` serve a chi scrive e a chi controlla: dice cosa c'è a schermo in quel punto.

## 4. Cosa torna indietro

L'agente audio restituisce, per ogni sezione:
`audio-formazione/<corso>/<corso>_<id>.wav` (24 kHz mono) più un `audio-map.json` con durata
reale e impronta del testo. **L'impronta serve**: se poi cambi uno script, si rigenera solo
quella traccia e non tutto il corso.

Predisponi tu i percorsi e la convenzione di denominazione, e dimmi se preferisci nomi diversi.

## 5. Che cosa voglio da te prima di scrivere gli script

1. L'analisi di fattibilità del punto 1, con i colli di bottiglia veri.
2. Lo `script.json` di **UNA sola sezione** come campione, così verifichiamo insieme tono,
   densità e rispetto del vincolo di sintesi **prima** di scriverne 27.
3. Le domande aperte: se una sezione non ha abbastanza sostanza per il minutaggio, dillo
   invece di allungare con riempitivo.
