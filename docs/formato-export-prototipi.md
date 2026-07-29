# Formato export JSON dei prototipi (base per l'import di migrazione)

Fonte: lettura diretta del sorgente dei due prototipi in `archivio/`. Questo documento è il contratto per il parser zod di Fase 2C (`src/features/import/`).

## 1. Prototipo GHG — `gestionale-ghg-14064.html`

Chiave storage: `inventario-ghg-14064-v1`. Due varianti di export (pulsanti "Esporta archivio" / "Esporta questa organizzazione"):

- **Archivio completo**: `{ "org": Organizzazione[], "current": string|null }`
- **Singola organizzazione**: oggetto `Organizzazione` nudo.

L'import del prototipo riconosce entrambe (`d.org && Array.isArray(d.org)` oppure `d.nome && d.voci`) e rigenera gli `id`.

### Organizzazione

```jsonc
{
  "id": "O______",            // uid, da rigenerare in import
  "nome": "string",
  "anno": 2025,                // periodo di rendicontazione predefinito
  "annoBase": 2025,
  "profilo": {
    "forma": "", "piva": "", "sede": "", "settore": "", "ateco": "",
    "siti": "", "dipendenti": "", "contatto": "", "responsabile": "",
    "consolidamento": "Controllo operativo|Controllo finanziario|Quota di partecipazione",
    "perimetroOrg": "", "perimetroOp": "",
    "periodo": "1 gennaio – 31 dicembre",
    "standard": "ISO 14064-1:2018",
    "gwp": "AR6|AR5|AR4",
    "significativita": "", "metodologia": "",
    "verifica": "Nessuna verifica di parte terza|Verifica in corso|Verificato con livello di garanzia limitato|Verificato con livello di garanzia ragionevole",
    "motivoBase": "", "regolaRicalcolo": ""
  },
  "fe": [FattoreEmissione],    // copia per-org della libreria (~60 voci + custom)
  "voci": [Voce],
  "sorgenti": { "<srcId>": { "st": "in|out|na", "note": "string" } },  // 26 chiavi possibili: 1a..6c
  "anni": { "<anno>": { "ricavi": "", "fte": "", "prod": "", "umProd": "", "superficie": "", "note": "" } },
  "obiettivi": [ { "id": "B_____", "n": "string", "ambito": "1|2|12|3|tot", "anno": "2030", "rid": "30", "note": "" } ],
  "verifica": { "<verId v1..v15>": { "st": "ok|par|no", "note": "" } },
  "note": {},
  "created": "ISO-8601"
}
```

### FattoreEmissione

```jsonc
{ "id": "gas_smc", "g": "Combustione fissa",  // gruppo
  "n": "Gas naturale", "um": "Smc",
  "fe": 1.9755,          // kgCO2e/unità (number, float nel prototipo → in import diventa string/NUMERIC)
  "mkt": 0.457,          // opzionale, solo cat 2 (market-based)
  "bio": 1.83,           // opzionale, quota biogenica kg/unità
  "cat": "1".."6", "src": "1a".."6c", "f": "fonte e anno" }
```

### Voce (dato di attività)

```jsonc
{ "id": "V_____", "anno": 2025, "cat": "1".."6", "src": "1a".."6c",
  "sede": "", "desc": "",
  "feId": "gas_smc" | "custom",
  "um": "Smc", "q": "12345",     // quantità come stringa (input libero, virgola decimale accettata)
  "fe": 1.9755,                   // fattore applicato alla voce (congelato al salvataggio)
  "feM": "" | number,             // fattore market-based (solo cat 2; "" = usa fe)
  "qGO": "" | number,             // quota coperta da GO/PPA (solo cat 2)
  "feB": "" | number,             // CO2 biogenica kg/unità (non-cat-2)
  "dq": "M|F|C|E|S",             // qualità del dato
  "inc": "" | number,             // incertezza % (override; "" = default della qualità: 2/5/10/20/30)
  "ev": "", "note": "" }
```

Semantica di calcolo (contratto per i golden test): `t = q*fe/1000`; cat 2: `tM = max(0, q−qGO)*feM/1000`; `bio = q*feB/1000`; parsing numerico con virgola→punto, non-finiti→0.

## 2. Prototipo Bilancio — `percorso-bilancio-v4.html`

Chiave storage: `bilancio-sostenibilita-v2`. Export archivio: `{ "aziende": Azienda[], "current": string|null }` (+ export dati singola azienda dal passo 7).

### Azienda

```jsonc
{
  "id": "O_____", "nome": "string", "anno": 2025,
  "profilo": {
    "forma": "", "piva": "", "sede": "", "settore": "", "ateco": "",
    "sitiop": "", "mercati": "", "contatto": "",
    "logo": "data:image/...",      // dataURL ridimensionato client-side (può essere grande)
    "copertina": "data:image/...",
    "standard": "GRI 2021 — opzione con riferimento|GRI 2021 — in conformità|ESRS (VSME) volontario|GRI 2021 + ESRS",
    "perimetro": "string"
  },
  "fattori": { "gas": 1.9755, "gasolio": 2.687, "benzina": 2.313, "gpl": 2.984,
               "ele_loc": 0.2565, "ele_mkt": 0.457,
               "kwh_smc": 10.55, "kwh_l_gasolio": 9.96, "kwh_l_benzina": 8.78, "kwh_kg_gpl": 12.79 },
  "dati": { "<anno>": { "<kpiKey>": "valore" } },   // ~50 chiavi (en_ele, en_gas, hr_tot, si_ore, ec_ric, go_cda, ...)
  "materialita": { "T01".."T18": { "imp": "1".."5", "fin": "1".."5" } },
  "soglia": 2 | 3 | 3.5 | 4,
  "gestione": { "T__": { "politica": "", "azioni": "", "target": "", "base": "", "anno": "", "resp": "" } },
  "narrativa": { "<sezId>": { "testo": "string", "media": [Media] } },
  // sezId ∈ lettera|identita|business|catena|stake|metodo|impegni
  // retro-compat: il prototipo accetta anche narrativa[sezId] = "string" (solo testo)
  "created": "ISO-8601"
}
```

### Media (elemento visivo di un capitolo)

```jsonc
{ "t": "img" | "ch",
  "src": "data:image/...",   // solo t=img
  "ch": "emissioni|energia|persone|sicurezza|rifiuti|fornitori|materialita",  // solo t=ch (diagramma dai dati)
  "cap": "didascalia", "cred": "credito", "w": "full" | "half" }
```

Semantica derivati (contratto golden): Scope1 = Σ(consumi×fattori)/1000; Scope2 loc = en_ele×ele_loc/1000; Scope2 mkt = max(0, en_ele−en_ele_go)×ele_mkt/1000; energia totale in kWh via fattori kwh_*; ~30 indicatori derivati (quote %, turnover, IF per 10⁶ ore, IG per 10³ ore, pay gap, ecc.) — formule complete nel sorgente, funzione `derive()`.

## Note per l'import SaaS

1. Numeri come float nei JSON del prototipo → convertire a string decimale al parsing; confronti nei golden test con tolleranza documentata (`docs/politica-arrotondamento.md`, Fase 2).
2. `logo`/`copertina`/media `src` sono dataURL: in import vanno decodificati e caricati su Storage, mai persistiti in colonna.
3. Gli `id` del prototipo non sono stabili né univoci tra archivi: rigenerare sempre, mantenendo le referenze interne (voce→feId per-org).
4. La libreria `fe` per-org del prototipo può divergere dalla libreria seed: in import si mappano i fattori identici alla libreria piattaforma e si creano override per-org per i valori modificati/custom.
