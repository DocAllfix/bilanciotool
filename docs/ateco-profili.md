# Proposte per codice ATECO — da rivedere

Documento generato da `scripts/genera-ateco-profili.mjs` a partire dal catalogo
`src/lib/db/seeds/data/ateco-proposte.json`. **Non si modifica a mano**: le correzioni vanno nel
catalogo, poi si rigenera.

## Come funziona

- Il codice ATECO si legge per **divisione** (le prime due cifre), non per lettera: dal 2025 le
  lettere delle sezioni sono cambiate, le divisioni no.
- Ogni voce entra nel percorso **a quantità zero**, marcata «proposta» col motivo qui sotto. Il
  totale non cambia finché il consulente non scrive un numero.
- Una voce modificata o confermata non si tocca più, nemmeno se l'ATECO cambia.
- Se esiste l'esercizio precedente, si riprendono le sue voci e il codice ATECO non si usa.

## Inventario GHG: voci tipiche per profilo

### Agricoltura, silvicoltura e pesca (divisioni 01–03)

1. **Gasolio per autotrazione** (Combustione mobile, litri)
2. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
3. **GPL (massa)** (Combustione fissa, kg)
4. **Gas naturale** (Combustione fissa, Smc)
5. **Refrigerante R404A** (Emissioni fuggitive, kg)
6. **Trasporto su gomma — articolato >17 t** (Trasporto e distribuzione a monte, t·km)
7. **Materie plastiche (media)** (Beni e materiali acquistati, kg)
8. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)
9. **Rifiuti a riciclo** (Rifiuti generati, t)
10. **Rifiuti a discarica** (Rifiuti generati, t)
11. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
12. **Gasolio — WTT** (Emissioni upstream dell'energia, litri)
13. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)
14. **Acquisti per spesa monetaria (metodo spend-based)** (Servizi acquistati, €)
15. **Carta e cartone** (Beni e materiali acquistati, kg)

### Estrazione di minerali (divisioni 05–09)

1. **Gasolio per autotrazione** (Combustione mobile, litri)
2. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
3. **Olio combustibile** (Combustione fissa, kg)
4. **Gas naturale** (Combustione fissa, Smc)
5. **Trasporto su gomma — articolato >17 t** (Trasporto e distribuzione a monte, t·km)
6. **Acciaio** (Beni e materiali acquistati, kg)
7. **Rifiuti a discarica** (Rifiuti generati, t)
8. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)
9. **Acque reflue trattate** (Acqua e scarichi idrici, m³)
10. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
11. **Gasolio — WTT** (Emissioni upstream dell'energia, litri)
12. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)
13. **Refrigerante R410A** (Emissioni fuggitive, kg)
14. **Acquisti per spesa monetaria (metodo spend-based)** (Servizi acquistati, €)
15. **GPL (massa)** (Combustione fissa, kg)

### Industria alimentare e delle bevande (divisioni 10–12)

1. **Gas naturale** (Combustione fissa, Smc)
2. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
3. **Refrigerante R404A** (Emissioni fuggitive, kg)
4. **Refrigerante R134a** (Emissioni fuggitive, kg)
5. **Gasolio per autotrazione** (Combustione mobile, litri)
6. **Trasporto su gomma — articolato >17 t** (Trasporto e distribuzione a monte, t·km)
7. **Materie plastiche (media)** (Beni e materiali acquistati, kg)
8. **Carta e cartone** (Beni e materiali acquistati, kg)
9. **Vetro** (Beni e materiali acquistati, kg)
10. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)
11. **Acque reflue trattate** (Acqua e scarichi idrici, m³)
12. **Rifiuti a riciclo** (Rifiuti generati, t)
13. **Rifiuti a discarica** (Rifiuti generati, t)
14. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
15. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)

### Tessile, abbigliamento e pelle (divisioni 13–15)

1. **Gas naturale** (Combustione fissa, Smc)
2. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
3. **Vapore acquistato** (Calore, vapore e freddo acquistati, kWh)
4. **Refrigerante R410A** (Emissioni fuggitive, kg)
5. **Gasolio per autotrazione** (Combustione mobile, litri)
6. **Trasporto su gomma — articolato >17 t** (Trasporto e distribuzione a monte, t·km)
7. **Trasporto marittimo — container** (Trasporto e distribuzione a monte, t·km)
8. **Materie plastiche (media)** (Beni e materiali acquistati, kg)
9. **Carta e cartone** (Beni e materiali acquistati, kg)
10. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)
11. **Acque reflue trattate** (Acqua e scarichi idrici, m³)
12. **Rifiuti a riciclo** (Rifiuti generati, t)
13. **Rifiuti a discarica** (Rifiuti generati, t)
14. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
15. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)

### Legno, carta e stampa (divisioni 16–18)

1. **Gas naturale** (Combustione fissa, Smc)
2. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
3. **Cippato di legno (quota non biogenica)** (Combustione fissa, kg)
4. **Gasolio per autotrazione** (Combustione mobile, litri)
5. **GPL (massa)** (Combustione fissa, kg)
6. **Legno e derivati** (Beni e materiali acquistati, kg)
7. **Carta e cartone** (Beni e materiali acquistati, kg)
8. **Trasporto su gomma — articolato >17 t** (Trasporto e distribuzione a monte, t·km)
9. **Corriere espresso** (Trasporto e distribuzione a valle, t·km)
10. **Refrigerante R410A** (Emissioni fuggitive, kg)
11. **Rifiuti a riciclo** (Rifiuti generati, t)
12. **Rifiuti a discarica** (Rifiuti generati, t)
13. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
14. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)
15. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)

### Chimica, farmaceutica, gomma e plastica (divisioni 19–22)

1. **Gas naturale** (Combustione fissa, Smc)
2. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
3. **Vapore acquistato** (Calore, vapore e freddo acquistati, kWh)
4. **Refrigerante R134a** (Emissioni fuggitive, kg)
5. **Gasolio per autotrazione** (Combustione mobile, litri)
6. **Materie plastiche (media)** (Beni e materiali acquistati, kg)
7. **Trasporto su gomma — articolato >17 t** (Trasporto e distribuzione a monte, t·km)
8. **Trasporto marittimo — container** (Trasporto e distribuzione a monte, t·km)
9. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)
10. **Acque reflue trattate** (Acqua e scarichi idrici, m³)
11. **Rifiuti a incenerimento** (Rifiuti generati, t)
12. **Rifiuti a discarica** (Rifiuti generati, t)
13. **Rifiuti a riciclo** (Rifiuti generati, t)
14. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
15. **Gas naturale — WTT** (Emissioni upstream dell'energia, Smc)

### Vetro, ceramica, cemento e laterizi (divisioni 23)

1. **Gas naturale** (Combustione fissa, Smc)
2. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
3. **Olio combustibile** (Combustione fissa, kg)
4. **Gasolio per autotrazione** (Combustione mobile, litri)
5. **Cemento** (Beni e materiali acquistati, kg)
6. **Vetro** (Beni e materiali acquistati, kg)
7. **Trasporto su gomma — articolato >17 t** (Trasporto e distribuzione a monte, t·km)
8. **Refrigerante R410A** (Emissioni fuggitive, kg)
9. **Rifiuti a discarica** (Rifiuti generati, t)
10. **Rifiuti a riciclo** (Rifiuti generati, t)
11. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)
12. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
13. **Gas naturale — WTT** (Emissioni upstream dell'energia, Smc)
14. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)
15. **GPL (massa)** (Combustione fissa, kg)

### Metallurgia e prodotti in metallo (divisioni 24–25)

1. **Gas naturale** (Combustione fissa, Smc)
2. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
3. **GPL (massa)** (Combustione fissa, kg)
4. **CO2 estintori e saldatura** (Emissioni fuggitive, kg)
5. **Gasolio per autotrazione** (Combustione mobile, litri)
6. **Refrigerante R410A** (Emissioni fuggitive, kg)
7. **Acciaio** (Beni e materiali acquistati, kg)
8. **Alluminio primario** (Beni e materiali acquistati, kg)
9. **Trasporto su gomma — articolato >17 t** (Trasporto e distribuzione a monte, t·km)
10. **Corriere espresso** (Trasporto e distribuzione a valle, t·km)
11. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
12. **Rifiuti a riciclo** (Rifiuti generati, t)
13. **Rifiuti a discarica** (Rifiuti generati, t)
14. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)
15. **Gas naturale — WTT** (Emissioni upstream dell'energia, Smc)

### Elettronica, apparecchi elettrici, macchine e mezzi di trasporto (divisioni 26–30)

1. **Gas naturale** (Combustione fissa, Smc)
2. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
3. **SF6 (quadri elettrici)** (Emissioni fuggitive, kg)
4. **Refrigerante R410A** (Emissioni fuggitive, kg)
5. **Gasolio per autotrazione** (Combustione mobile, litri)
6. **Acciaio** (Beni e materiali acquistati, kg)
7. **Materie plastiche (media)** (Beni e materiali acquistati, kg)
8. **Alluminio primario** (Beni e materiali acquistati, kg)
9. **Trasporto su gomma — articolato >17 t** (Trasporto e distribuzione a monte, t·km)
10. **Trasporto aereo merci** (Trasporto e distribuzione a monte, t·km)
11. **Corriere espresso** (Trasporto e distribuzione a valle, t·km)
12. **Rifiuti a riciclo** (Rifiuti generati, t)
13. **Rifiuti a discarica** (Rifiuti generati, t)
14. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
15. **Aereo — tratta breve (<3.700 km)** (Trasferte di lavoro, pax·km)

### Mobili, altre manifatture, riparazione e installazione (divisioni 31–33)

1. **Gas naturale** (Combustione fissa, Smc)
2. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
3. **Legno e derivati** (Beni e materiali acquistati, kg)
4. **Gasolio per autotrazione** (Combustione mobile, litri)
5. **Refrigerante R410A** (Emissioni fuggitive, kg)
6. **Materie plastiche (media)** (Beni e materiali acquistati, kg)
7. **Acciaio** (Beni e materiali acquistati, kg)
8. **Trasporto su gomma — articolato >17 t** (Trasporto e distribuzione a monte, t·km)
9. **Corriere espresso** (Trasporto e distribuzione a valle, t·km)
10. **Rifiuti a riciclo** (Rifiuti generati, t)
11. **Rifiuti a discarica** (Rifiuti generati, t)
12. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
13. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)
14. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)
15. **Gas naturale — WTT** (Emissioni upstream dell'energia, Smc)

### Energia elettrica, gas e vapore (divisioni 35)

1. **Gas naturale** (Combustione fissa, Smc)
2. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
3. **SF6 (quadri elettrici)** (Emissioni fuggitive, kg)
4. **Gasolio per autotrazione** (Combustione mobile, litri)
5. **Refrigerante R410A** (Emissioni fuggitive, kg)
6. **Gas naturale — WTT** (Emissioni upstream dell'energia, Smc)
7. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)
8. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)
9. **Rifiuti a discarica** (Rifiuti generati, t)
10. **Rifiuti a riciclo** (Rifiuti generati, t)
11. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
12. **Aereo — tratta breve (<3.700 km)** (Trasferte di lavoro, pax·km)
13. **Pernottamento in albergo (Italia)** (Trasferte di lavoro, notti)
14. **Acquisti per spesa monetaria (metodo spend-based)** (Servizi acquistati, €)
15. **Acciaio** (Beni e materiali acquistati, kg)

### Acqua, reti fognarie e gestione dei rifiuti (divisioni 36–39)

1. **Gasolio per autotrazione** (Combustione mobile, litri)
2. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
3. **Gas naturale** (Combustione fissa, Smc)
4. **Metano per autotrazione** (Combustione mobile, kg)
5. **Refrigerante R410A** (Emissioni fuggitive, kg)
6. **Rifiuti a discarica** (Rifiuti generati, t)
7. **Rifiuti a incenerimento** (Rifiuti generati, t)
8. **Rifiuti a riciclo** (Rifiuti generati, t)
9. **Acque reflue trattate** (Acqua e scarichi idrici, m³)
10. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)
11. **Gasolio — WTT** (Emissioni upstream dell'energia, litri)
12. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)
13. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
14. **Acquisti per spesa monetaria (metodo spend-based)** (Servizi acquistati, €)
15. **Trasporto su gomma — articolato >17 t** (Trasporto e distribuzione a monte, t·km)

### Costruzioni (divisioni 41–43)

1. **Gasolio per autotrazione** (Combustione mobile, litri)
2. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
3. **Gas naturale** (Combustione fissa, Smc)
4. **Cemento** (Beni e materiali acquistati, kg)
5. **Calcestruzzo preconfezionato** (Beni e materiali acquistati, kg)
6. **Acciaio** (Beni e materiali acquistati, kg)
7. **Legno e derivati** (Beni e materiali acquistati, kg)
8. **Trasporto su gomma — articolato >17 t** (Trasporto e distribuzione a monte, t·km)
9. **Rifiuti a discarica** (Rifiuti generati, t)
10. **Rifiuti a riciclo** (Rifiuti generati, t)
11. **GPL (massa)** (Combustione fissa, kg)
12. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
13. **Auto aziendale diesel (percorrenza)** (Combustione mobile, km)
14. **Gasolio — WTT** (Emissioni upstream dell'energia, litri)
15. **Refrigerante R410A** (Emissioni fuggitive, kg)

### Commercio all'ingrosso e al dettaglio (divisioni 45–47)

1. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
2. **Gas naturale** (Combustione fissa, Smc)
3. **Refrigerante R404A** (Emissioni fuggitive, kg)
4. **Refrigerante R410A** (Emissioni fuggitive, kg)
5. **Gasolio per autotrazione** (Combustione mobile, litri)
6. **Trasporto su gomma — articolato >17 t** (Trasporto e distribuzione a monte, t·km)
7. **Corriere espresso** (Trasporto e distribuzione a valle, t·km)
8. **Materie plastiche (media)** (Beni e materiali acquistati, kg)
9. **Carta e cartone** (Beni e materiali acquistati, kg)
10. **Rifiuti a riciclo** (Rifiuti generati, t)
11. **Rifiuti a discarica** (Rifiuti generati, t)
12. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
13. **Auto aziendale diesel (percorrenza)** (Combustione mobile, km)
14. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)
15. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)

### Trasporto e magazzinaggio (divisioni 49–53)

1. **Gasolio per autotrazione** (Combustione mobile, litri)
2. **Metano per autotrazione** (Combustione mobile, kg)
3. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
4. **Gas naturale** (Combustione fissa, Smc)
5. **Refrigerante R134a** (Emissioni fuggitive, kg)
6. **Refrigerante R410A** (Emissioni fuggitive, kg)
7. **Trasporto su gomma — articolato >17 t** (Trasporto e distribuzione a monte, t·km)
8. **GPL (massa)** (Combustione fissa, kg)
9. **Rifiuti a riciclo** (Rifiuti generati, t)
10. **Rifiuti a discarica** (Rifiuti generati, t)
11. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
12. **Gasolio — WTT** (Emissioni upstream dell'energia, litri)
13. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)
14. **Acquisti per spesa monetaria (metodo spend-based)** (Servizi acquistati, €)
15. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)

### Alloggio e ristorazione (divisioni 55–56)

1. **Gas naturale** (Combustione fissa, Smc)
2. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
3. **GPL (massa)** (Combustione fissa, kg)
4. **Refrigerante R404A** (Emissioni fuggitive, kg)
5. **Refrigerante R410A** (Emissioni fuggitive, kg)
6. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)
7. **Acque reflue trattate** (Acqua e scarichi idrici, m³)
8. **Rifiuti a riciclo** (Rifiuti generati, t)
9. **Rifiuti a discarica** (Rifiuti generati, t)
10. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
11. **Carta e cartone** (Beni e materiali acquistati, kg)
12. **Materie plastiche (media)** (Beni e materiali acquistati, kg)
13. **Acquisti per spesa monetaria (metodo spend-based)** (Servizi acquistati, €)
14. **Gas naturale — WTT** (Emissioni upstream dell'energia, Smc)
15. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)

### Editoria, telecomunicazioni e servizi informatici (divisioni 58–63)

1. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
2. **Refrigerante R410A** (Emissioni fuggitive, kg)
3. **Gas naturale** (Combustione fissa, Smc)
4. **Teleriscaldamento** (Calore, vapore e freddo acquistati, kWh)
5. **Auto aziendale diesel (percorrenza)** (Combustione mobile, km)
6. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
7. **Aereo — tratta breve (<3.700 km)** (Trasferte di lavoro, pax·km)
8. **Aereo — tratta lunga (>3.700 km)** (Trasferte di lavoro, pax·km)
9. **Pernottamento in albergo (Italia)** (Trasferte di lavoro, notti)
10. **Carta e cartone** (Beni e materiali acquistati, kg)
11. **Acquisti per spesa monetaria (metodo spend-based)** (Servizi acquistati, €)
12. **Rifiuti a riciclo** (Rifiuti generati, t)
13. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)
14. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)
15. **Treno regionale o nazionale** (Spostamenti casa-lavoro, km)

### Servizi finanziari e assicurativi (divisioni 64–66)

1. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
2. **Gas naturale** (Combustione fissa, Smc)
3. **Refrigerante R410A** (Emissioni fuggitive, kg)
4. **Investimenti (quota emissioni partecipate)** (Investimenti, tCO2e)
5. **Auto aziendale diesel (percorrenza)** (Combustione mobile, km)
6. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
7. **Treno regionale o nazionale** (Spostamenti casa-lavoro, km)
8. **Aereo — tratta breve (<3.700 km)** (Trasferte di lavoro, pax·km)
9. **Pernottamento in albergo (Italia)** (Trasferte di lavoro, notti)
10. **Carta e cartone** (Beni e materiali acquistati, kg)
11. **Acquisti per spesa monetaria (metodo spend-based)** (Servizi acquistati, €)
12. **Rifiuti a riciclo** (Rifiuti generati, t)
13. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)
14. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)
15. **Teleriscaldamento** (Calore, vapore e freddo acquistati, kWh)

### Attività immobiliari (divisioni 68)

1. **Gas naturale** (Combustione fissa, Smc)
2. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
3. **Refrigerante R410A** (Emissioni fuggitive, kg)
4. **Gasolio da riscaldamento** (Combustione fissa, litri)
5. **Teleriscaldamento** (Calore, vapore e freddo acquistati, kWh)
6. **Auto aziendale diesel (percorrenza)** (Combustione mobile, km)
7. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
8. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)
9. **Rifiuti a riciclo** (Rifiuti generati, t)
10. **Acquisti per spesa monetaria (metodo spend-based)** (Servizi acquistati, €)
11. **Carta e cartone** (Beni e materiali acquistati, kg)
12. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)
13. **Gas naturale — WTT** (Emissioni upstream dell'energia, Smc)
14. **Pernottamento in albergo (Italia)** (Trasferte di lavoro, notti)
15. **Aereo — tratta breve (<3.700 km)** (Trasferte di lavoro, pax·km)

### Attività professionali, scientifiche e tecniche (divisioni 69–75)

1. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
2. **Gas naturale** (Combustione fissa, Smc)
3. **Refrigerante R410A** (Emissioni fuggitive, kg)
4. **Auto aziendale diesel (percorrenza)** (Combustione mobile, km)
5. **Auto aziendale benzina (percorrenza)** (Combustione mobile, km)
6. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
7. **Treno regionale o nazionale** (Spostamenti casa-lavoro, km)
8. **Aereo — tratta breve (<3.700 km)** (Trasferte di lavoro, pax·km)
9. **Pernottamento in albergo (Italia)** (Trasferte di lavoro, notti)
10. **Carta e cartone** (Beni e materiali acquistati, kg)
11. **Acquisti per spesa monetaria (metodo spend-based)** (Servizi acquistati, €)
12. **Rifiuti a riciclo** (Rifiuti generati, t)
13. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)
14. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)
15. **Teleriscaldamento** (Calore, vapore e freddo acquistati, kWh)

### Noleggio, agenzie e servizi di supporto alle imprese (divisioni 77–82)

1. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
2. **Gas naturale** (Combustione fissa, Smc)
3. **Gasolio per autotrazione** (Combustione mobile, litri)
4. **Auto aziendale diesel (percorrenza)** (Combustione mobile, km)
5. **Refrigerante R410A** (Emissioni fuggitive, kg)
6. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
7. **Autobus urbano** (Spostamenti casa-lavoro, km)
8. **Carta e cartone** (Beni e materiali acquistati, kg)
9. **Acquisti per spesa monetaria (metodo spend-based)** (Servizi acquistati, €)
10. **Rifiuti a riciclo** (Rifiuti generati, t)
11. **Rifiuti a discarica** (Rifiuti generati, t)
12. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)
13. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)
14. **Aereo — tratta breve (<3.700 km)** (Trasferte di lavoro, pax·km)
15. **Pernottamento in albergo (Italia)** (Trasferte di lavoro, notti)

### Pubblica amministrazione (divisioni 84)

1. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
2. **Gas naturale** (Combustione fissa, Smc)
3. **Gasolio da riscaldamento** (Combustione fissa, litri)
4. **Refrigerante R410A** (Emissioni fuggitive, kg)
5. **Auto aziendale benzina (percorrenza)** (Combustione mobile, km)
6. **Auto aziendale diesel (percorrenza)** (Combustione mobile, km)
7. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
8. **Autobus urbano** (Spostamenti casa-lavoro, km)
9. **Carta e cartone** (Beni e materiali acquistati, kg)
10. **Acquisti per spesa monetaria (metodo spend-based)** (Servizi acquistati, €)
11. **Rifiuti a riciclo** (Rifiuti generati, t)
12. **Rifiuti a discarica** (Rifiuti generati, t)
13. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)
14. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)
15. **Teleriscaldamento** (Calore, vapore e freddo acquistati, kWh)

### Istruzione (divisioni 85)

1. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
2. **Gas naturale** (Combustione fissa, Smc)
3. **Gasolio da riscaldamento** (Combustione fissa, litri)
4. **Refrigerante R410A** (Emissioni fuggitive, kg)
5. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
6. **Autobus urbano** (Spostamenti casa-lavoro, km)
7. **Carta e cartone** (Beni e materiali acquistati, kg)
8. **Acquisti per spesa monetaria (metodo spend-based)** (Servizi acquistati, €)
9. **Rifiuti a riciclo** (Rifiuti generati, t)
10. **Rifiuti a discarica** (Rifiuti generati, t)
11. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)
12. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)
13. **Gas naturale — WTT** (Emissioni upstream dell'energia, Smc)
14. **Teleriscaldamento** (Calore, vapore e freddo acquistati, kWh)
15. **Auto aziendale diesel (percorrenza)** (Combustione mobile, km)

### Sanità e assistenza sociale (divisioni 86–88)

1. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
2. **Gas naturale** (Combustione fissa, Smc)
3. **Vapore acquistato** (Calore, vapore e freddo acquistati, kWh)
4. **Refrigerante R410A** (Emissioni fuggitive, kg)
5. **Refrigerante R134a** (Emissioni fuggitive, kg)
6. **Gasolio per autotrazione** (Combustione mobile, litri)
7. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
8. **Rifiuti a incenerimento** (Rifiuti generati, t)
9. **Rifiuti a discarica** (Rifiuti generati, t)
10. **Rifiuti a riciclo** (Rifiuti generati, t)
11. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)
12. **Acque reflue trattate** (Acqua e scarichi idrici, m³)
13. **Materie plastiche (media)** (Beni e materiali acquistati, kg)
14. **Acquisti per spesa monetaria (metodo spend-based)** (Servizi acquistati, €)
15. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)

### Attività artistiche, sportive e di intrattenimento (divisioni 90–93)

1. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
2. **Gas naturale** (Combustione fissa, Smc)
3. **Refrigerante R410A** (Emissioni fuggitive, kg)
4. **Gasolio per autotrazione** (Combustione mobile, litri)
5. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
6. **Aereo — tratta breve (<3.700 km)** (Trasferte di lavoro, pax·km)
7. **Pernottamento in albergo (Italia)** (Trasferte di lavoro, notti)
8. **Rifiuti a riciclo** (Rifiuti generati, t)
9. **Rifiuti a discarica** (Rifiuti generati, t)
10. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)
11. **Carta e cartone** (Beni e materiali acquistati, kg)
12. **Materie plastiche (media)** (Beni e materiali acquistati, kg)
13. **Acquisti per spesa monetaria (metodo spend-based)** (Servizi acquistati, €)
14. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)
15. **Gas naturale — WTT** (Emissioni upstream dell'energia, Smc)

### Altre attività di servizi (divisioni 94–96)

1. **Energia elettrica — location-based Italia** (Energia elettrica acquistata, kWh)
2. **Gas naturale** (Combustione fissa, Smc)
3. **Refrigerante R410A** (Emissioni fuggitive, kg)
4. **Gasolio per autotrazione** (Combustione mobile, litri)
5. **Auto aziendale diesel (percorrenza)** (Combustione mobile, km)
6. **Auto privata — media parco** (Spostamenti casa-lavoro, km)
7. **Carta e cartone** (Beni e materiali acquistati, kg)
8. **Materie plastiche (media)** (Beni e materiali acquistati, kg)
9. **Acqua potabile prelevata** (Acqua e scarichi idrici, m³)
10. **Acque reflue trattate** (Acqua e scarichi idrici, m³)
11. **Rifiuti a riciclo** (Rifiuti generati, t)
12. **Rifiuti a discarica** (Rifiuti generati, t)
13. **Acquisti per spesa monetaria (metodo spend-based)** (Servizi acquistati, €)
14. **Elettricità — WTT e perdite di rete** (Emissioni upstream dell'energia, kWh)
15. **Gas naturale — WTT** (Emissioni upstream dell'energia, Smc)

## I motivi

Ogni voce porta questo testo accanto, nel percorso.

- **Acciaio**: L'acciaio è la materia prima principale di chi lavora il metallo.
- **Acqua potabile prelevata**: L'acqua prelevata dall'acquedotto ha un'impronta di trattamento e pompaggio.
- **Acque reflue trattate**: Le acque reflue si contano quando i processi ne producono molte.
- **Aereo — tratta breve (<3.700 km)**: Trasferte di lavoro in aereo, anche brevi, pesano più di quanto si pensi.
- **Aereo — tratta lunga (>3.700 km)**: Clienti e fornitori lontani portano trasferte intercontinentali.
- **Alluminio primario**: L'alluminio ha un'impronta molto alta per chilogrammo: va contato a parte.
- **Calcestruzzo preconfezionato**: Il calcestruzzo preconfezionato è il materiale di maggior volume nei cantieri.
- **Carta e cartone**: Carta, cartone e imballaggi in carta sono acquisti di ogni attività.
- **Cemento**: Il cemento è fra i materiali con l'impronta più alta per chilogrammo.
- **Cippato di legno (quota non biogenica)**: Chi lavora il legno brucia spesso i propri scarti in caldaia.
- **CO2 estintori e saldatura**: Saldatura ed estintori rilasciano CO2 da contare fra le emissioni dirette.
- **Corriere espresso**: Le spedizioni ai clienti passano di solito da un corriere.
- **Energia elettrica — location-based Italia**: Ogni sede consuma energia elettrica: è la voce di Scope 2 più comune.
- **Gas naturale**: Il riscaldamento degli ambienti e i processi termici usano quasi sempre gas naturale.
- **Gasolio per autotrazione**: Mezzi aziendali, furgoni e macchine operatrici vanno quasi sempre a gasolio.
- **Gasolio da riscaldamento**: Gli edifici più datati si riscaldano ancora a gasolio.
- **GPL (massa)**: Il GPL alimenta carrelli elevatori, forni o riscaldamento dove non arriva la rete del gas.
- **Pernottamento in albergo (Italia)**: Le trasferte portano pernottamenti da contare.
- **Investimenti (quota emissioni partecipate)**: Per chi gestisce investimenti, le emissioni finanziate sono la voce principale (categoria 6).
- **Auto aziendale benzina (percorrenza)**: Le auto aziendali a benzina si rendicontano a chilometri, quando manca il dato dei litri.
- **Auto aziendale diesel (percorrenza)**: Le auto aziendali si rendicontano anche a chilometri, quando manca il dato dei litri.
- **Legno e derivati**: Il legno e i suoi derivati sono la materia prima di chi produce mobili o imballaggi.
- **Metano per autotrazione**: Le flotte urbane di servizio usano spesso il metano.
- **Olio combustibile**: I forni ad alta temperatura usano spesso olio combustibile.
- **Auto privata — media parco**: Gli spostamenti casa-lavoro dei dipendenti sono una voce di categoria 3 sempre presente.
- **Autobus urbano**: Dove il personale è numeroso, una parte arriva coi mezzi pubblici.
- **Treno regionale o nazionale**: Chi lavora in città arriva spesso in treno.
- **Materie plastiche (media)**: Imballaggi e componenti in plastica sono acquisti presenti quasi ovunque.
- **Refrigerante R134a**: Il R134a è il refrigerante tipico dei gruppi frigo e dei veicoli.
- **Refrigerante R404A**: Celle e banchi frigoriferi usano spesso R404A, un gas a potenziale climalterante molto alto.
- **Refrigerante R410A**: Ogni impianto di climatizzazione può perdere refrigerante: le ricariche vanno contate.
- **Rifiuti a discarica**: I rifiuti avviati a discarica generano metano: vanno contati.
- **Rifiuti a incenerimento**: Rifiuti pericolosi e sanitari finiscono spesso a incenerimento.
- **Rifiuti a riciclo**: I rifiuti avviati a riciclo si rendicontano con un fattore basso ma non nullo.
- **SF6 (quadri elettrici)**: I quadri elettrici di media tensione contengono SF6, il gas serra più potente.
- **Acquisti per spesa monetaria (metodo spend-based)**: Gli altri servizi acquistati si stimano dalla spesa, quando mancano dati fisici.
- **Teleriscaldamento**: Gli uffici nei centri urbani sono spesso serviti dal teleriscaldamento.
- **Trasporto aereo merci**: Componenti urgenti o di valore viaggiano spesso via aerea.
- **Trasporto su gomma — articolato >17 t**: Le materie prime e le merci arrivano su gomma: è la voce più pesante del trasporto a monte.
- **Trasporto marittimo — container**: Le forniture dall'estero viaggiano spesso via mare.
- **Vapore acquistato**: Processi e sterilizzazione usano vapore, a volte acquistato da terzi.
- **Vetro**: Bottiglie e contenitori in vetro hanno un'impronta di produzione rilevante.
- **Elettricità — WTT e perdite di rete**: Produrre e trasportare l'elettricità che si consuma genera emissioni a monte (categoria 4).
- **Gas naturale — WTT**: Estrarre e trasportare il gas che si brucia genera emissioni a monte (categoria 4).
- **Gasolio — WTT**: Raffinare e distribuire il gasolio genera emissioni a monte (categoria 4).

## Bilancio energetico: usi finali accesi per profilo

Se esiste l'esercizio precedente si riprendono i suoi usi finali; altrimenti questi.

### Agricoltura, silvicoltura e pesca (divisioni 01–03)

- Produzione del freddo e raffreddamento di processo
- Pompaggi e circolazione fluidi
- Riscaldamento degli ambienti
- Illuminazione
- Movimentazione interna (carrelli e mezzi di piazzale)
- Flotta aziendale su strada

### Estrazione di minerali (divisioni 05–09)

- Macchine di formatura e lavorazione
- Altre lavorazioni di processo
- Aria compressa
- Pompaggi e circolazione fluidi
- Ventilazione e aspirazione fumi
- Illuminazione
- Movimentazione interna (carrelli e mezzi di piazzale)
- Flotta aziendale su strada

### Industria alimentare e delle bevande (divisioni 10–12)

- Forni di mantenimento e trattamento termico
- Essiccazione, preriscaldo, verniciatura
- Altre lavorazioni di processo
- Aria compressa
- Produzione del freddo e raffreddamento di processo
- Pompaggi e circolazione fluidi
- Trattamento acque e reflui
- Generazione di vapore e acqua calda di processo
- Riscaldamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Movimentazione interna (carrelli e mezzi di piazzale)
- Flotta aziendale su strada

### Tessile, abbigliamento e pelle (divisioni 13–15)

- Macchine di formatura e lavorazione
- Essiccazione, preriscaldo, verniciatura
- Altre lavorazioni di processo
- Aria compressa
- Pompaggi e circolazione fluidi
- Trattamento acque e reflui
- Generazione di vapore e acqua calda di processo
- Riscaldamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server

### Legno, carta e stampa (divisioni 16–18)

- Macchine di formatura e lavorazione
- Essiccazione, preriscaldo, verniciatura
- Altre lavorazioni di processo
- Aria compressa
- Ventilazione e aspirazione fumi
- Generazione di vapore e acqua calda di processo
- Riscaldamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Movimentazione interna (carrelli e mezzi di piazzale)

### Chimica, farmaceutica, gomma e plastica (divisioni 19–22)

- Macchine di formatura e lavorazione
- Essiccazione, preriscaldo, verniciatura
- Altre lavorazioni di processo
- Aria compressa
- Produzione del freddo e raffreddamento di processo
- Pompaggi e circolazione fluidi
- Trattamento acque e reflui
- Generazione di vapore e acqua calda di processo
- Riscaldamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Movimentazione interna (carrelli e mezzi di piazzale)

### Vetro, ceramica, cemento e laterizi (divisioni 23)

- Forni fusori e processi termici primari
- Forni di mantenimento e trattamento termico
- Macchine di formatura e lavorazione
- Essiccazione, preriscaldo, verniciatura
- Aria compressa
- Ventilazione e aspirazione fumi
- Riscaldamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Movimentazione interna (carrelli e mezzi di piazzale)

### Metallurgia e prodotti in metallo (divisioni 24–25)

- Forni fusori e processi termici primari
- Forni di mantenimento e trattamento termico
- Macchine di formatura e lavorazione
- Finitura, sbavatura, granigliatura
- Essiccazione, preriscaldo, verniciatura
- Aria compressa
- Ventilazione e aspirazione fumi
- Riscaldamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Movimentazione interna (carrelli e mezzi di piazzale)
- Produzione del freddo e raffreddamento di processo
- Flotta aziendale su strada

### Elettronica, apparecchi elettrici, macchine e mezzi di trasporto (divisioni 26–30)

- Macchine di formatura e lavorazione
- Finitura, sbavatura, granigliatura
- Essiccazione, preriscaldo, verniciatura
- Aria compressa
- Ventilazione e aspirazione fumi
- Riscaldamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Movimentazione interna (carrelli e mezzi di piazzale)
- Produzione del freddo e raffreddamento di processo
- Raffrescamento degli ambienti

### Mobili, altre manifatture, riparazione e installazione (divisioni 31–33)

- Macchine di formatura e lavorazione
- Finitura, sbavatura, granigliatura
- Essiccazione, preriscaldo, verniciatura
- Aria compressa
- Ventilazione e aspirazione fumi
- Riscaldamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Movimentazione interna (carrelli e mezzi di piazzale)
- Flotta aziendale su strada

### Energia elettrica, gas e vapore (divisioni 35)

- Altre lavorazioni di processo
- Pompaggi e circolazione fluidi
- Generazione di vapore e acqua calda di processo
- Riscaldamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Flotta aziendale su strada

### Acqua, reti fognarie e gestione dei rifiuti (divisioni 36–39)

- Pompaggi e circolazione fluidi
- Ventilazione e aspirazione fumi
- Trattamento acque e reflui
- Riscaldamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Movimentazione interna (carrelli e mezzi di piazzale)
- Flotta aziendale su strada

### Costruzioni (divisioni 41–43)

- Aria compressa
- Riscaldamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Movimentazione interna (carrelli e mezzi di piazzale)
- Flotta aziendale su strada

### Commercio all'ingrosso e al dettaglio (divisioni 45–47)

- Produzione del freddo e raffreddamento di processo
- Riscaldamento degli ambienti
- Raffrescamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Movimentazione interna (carrelli e mezzi di piazzale)
- Flotta aziendale su strada

### Trasporto e magazzinaggio (divisioni 49–53)

- Aria compressa
- Riscaldamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Movimentazione interna (carrelli e mezzi di piazzale)
- Flotta aziendale su strada

### Alloggio e ristorazione (divisioni 55–56)

- Produzione del freddo e raffreddamento di processo
- Generazione di vapore e acqua calda di processo
- Riscaldamento degli ambienti
- Raffrescamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Acqua calda sanitaria, spogliatoi e mensa

### Editoria, telecomunicazioni e servizi informatici (divisioni 58–63)

- Riscaldamento degli ambienti
- Raffrescamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Altri servizi generali

### Servizi finanziari e assicurativi (divisioni 64–66)

- Riscaldamento degli ambienti
- Raffrescamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Altri servizi generali
- Flotta aziendale su strada

### Attività immobiliari (divisioni 68)

- Riscaldamento degli ambienti
- Raffrescamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Altri servizi generali

### Attività professionali, scientifiche e tecniche (divisioni 69–75)

- Riscaldamento degli ambienti
- Raffrescamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Altri servizi generali
- Flotta aziendale su strada

### Noleggio, agenzie e servizi di supporto alle imprese (divisioni 77–82)

- Riscaldamento degli ambienti
- Raffrescamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Acqua calda sanitaria, spogliatoi e mensa
- Flotta aziendale su strada

### Pubblica amministrazione (divisioni 84)

- Riscaldamento degli ambienti
- Raffrescamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Acqua calda sanitaria, spogliatoi e mensa
- Altri servizi generali
- Flotta aziendale su strada

### Istruzione (divisioni 85)

- Riscaldamento degli ambienti
- Raffrescamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Acqua calda sanitaria, spogliatoi e mensa
- Altri servizi generali

### Sanità e assistenza sociale (divisioni 86–88)

- Produzione del freddo e raffreddamento di processo
- Pompaggi e circolazione fluidi
- Generazione di vapore e acqua calda di processo
- Riscaldamento degli ambienti
- Raffrescamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Acqua calda sanitaria, spogliatoi e mensa

### Attività artistiche, sportive e di intrattenimento (divisioni 90–93)

- Generazione di vapore e acqua calda di processo
- Riscaldamento degli ambienti
- Raffrescamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Acqua calda sanitaria, spogliatoi e mensa

### Altre attività di servizi (divisioni 94–96)

- Riscaldamento degli ambienti
- Raffrescamento degli ambienti
- Illuminazione
- Uffici, ICT e sala server
- Acqua calda sanitaria, spogliatoi e mensa
- Flotta aziendale su strada

## Modello 231: reati proposti come applicabili

Entrano come «Sì» col motivo e la motivazione vuota: la scrive il consulente. Mai «No»: un
reato escluso in silenzio è il difetto peggiore di una mappatura.

**Per ogni impresa:**

- 25-ter · Reati societari
- 25-quinquiesdecies · Reati tributari
- 24-bis · Delitti informatici e trattamento illecito di dati
- 25-octies · Ricettazione, riciclaggio, impiego di denaro di provenienza illecita e autoriciclaggio

**Per chi ha dipendenti:** 25-septies · Omicidio colposo e lesioni personali gravi o gravissime commessi con violazione delle norme antinfortunistiche

### Agricoltura, silvicoltura e pesca (divisioni 01–03)

- 25-undecies · Reati ambientali
- 25-duodecies · Impiego di cittadini di paesi terzi il cui soggiorno è irregolare
- 25-quinquies · Delitti contro la personalità individuale
- 24 · Indebita percezione di erogazioni, truffa in danno dello Stato o di un ente pubblico e frode informatica

### Estrazione di minerali (divisioni 05–09)

- 25-undecies · Reati ambientali

### Industria alimentare e delle bevande (divisioni 10–12)

- 25-undecies · Reati ambientali
- 25-bis.1 · Delitti contro l'industria e il commercio
- 25-duodecies · Impiego di cittadini di paesi terzi il cui soggiorno è irregolare

### Tessile, abbigliamento e pelle (divisioni 13–15)

- 25-undecies · Reati ambientali
- 25-bis.1 · Delitti contro l'industria e il commercio

### Legno, carta e stampa (divisioni 16–18)

- 25-undecies · Reati ambientali
- 25-bis.1 · Delitti contro l'industria e il commercio

### Chimica, farmaceutica, gomma e plastica (divisioni 19–22)

- 25-undecies · Reati ambientali
- 25-bis.1 · Delitti contro l'industria e il commercio

### Vetro, ceramica, cemento e laterizi (divisioni 23)

- 25-undecies · Reati ambientali
- 25-bis.1 · Delitti contro l'industria e il commercio

### Metallurgia e prodotti in metallo (divisioni 24–25)

- 25-undecies · Reati ambientali
- 25-bis.1 · Delitti contro l'industria e il commercio

### Elettronica, apparecchi elettrici, macchine e mezzi di trasporto (divisioni 26–30)

- 25-undecies · Reati ambientali
- 25-bis.1 · Delitti contro l'industria e il commercio

### Mobili, altre manifatture, riparazione e installazione (divisioni 31–33)

- 25-undecies · Reati ambientali
- 25-bis.1 · Delitti contro l'industria e il commercio

### Energia elettrica, gas e vapore (divisioni 35)

- 25-undecies · Reati ambientali
- 25 · Delitti contro la pubblica amministrazione

### Acqua, reti fognarie e gestione dei rifiuti (divisioni 36–39)

- 25-undecies · Reati ambientali
- 25 · Delitti contro la pubblica amministrazione
- 24 · Indebita percezione di erogazioni, truffa in danno dello Stato o di un ente pubblico e frode informatica

### Costruzioni (divisioni 41–43)

- 25-undecies · Reati ambientali
- 25-duodecies · Impiego di cittadini di paesi terzi il cui soggiorno è irregolare
- 25-quinquies · Delitti contro la personalità individuale
- 25 · Delitti contro la pubblica amministrazione

### Commercio all'ingrosso e al dettaglio (divisioni 45–47)

- 25-bis.1 · Delitti contro l'industria e il commercio
- 25-sexiesdecies · Contrabbando

### Trasporto e magazzinaggio (divisioni 49–53)

- 25-undecies · Reati ambientali
- 25-duodecies · Impiego di cittadini di paesi terzi il cui soggiorno è irregolare
- 25-sexiesdecies · Contrabbando

### Alloggio e ristorazione (divisioni 55–56)

- 25-duodecies · Impiego di cittadini di paesi terzi il cui soggiorno è irregolare
- 25-bis.1 · Delitti contro l'industria e il commercio

### Editoria, telecomunicazioni e servizi informatici (divisioni 58–63)

- 25-novies · Delitti in materia di violazione del diritto d'autore

### Noleggio, agenzie e servizi di supporto alle imprese (divisioni 77–82)

- 25-duodecies · Impiego di cittadini di paesi terzi il cui soggiorno è irregolare

### Pubblica amministrazione (divisioni 84)

- 25 · Delitti contro la pubblica amministrazione
- 24 · Indebita percezione di erogazioni, truffa in danno dello Stato o di un ente pubblico e frode informatica

### Istruzione (divisioni 85)

- 24 · Indebita percezione di erogazioni, truffa in danno dello Stato o di un ente pubblico e frode informatica

### Sanità e assistenza sociale (divisioni 86–88)

- 25 · Delitti contro la pubblica amministrazione
- 24 · Indebita percezione di erogazioni, truffa in danno dello Stato o di un ente pubblico e frode informatica
- 25-undecies · Reati ambientali

### Attività artistiche, sportive e di intrattenimento (divisioni 90–93)

- 25-novies · Delitti in materia di violazione del diritto d'autore

## Protezione dei dati: trattamenti proposti

Entrano nel registro marcati «proposto»: finché nessuno li tocca non sono censiti, e il
registro consegnato non li porta.

**Per ogni azienda:**

- Clienti: contratti, ordini e fatturazione
- Fornitori: contratti e pagamenti
- Posta elettronica e strumenti informatici

**Per chi ha dipendenti:**

- Gestione del rapporto di lavoro
- Salute e sicurezza sul lavoro
- Selezione del personale

**Per chi ha un sito web:**

- Sito web e cookie

**Da 50 addetti:**

- Segnalazioni di illeciti

### Agricoltura, silvicoltura e pesca (divisioni 01–03)

- Geolocalizzazione dei veicoli aziendali

### Industria alimentare e delle bevande (divisioni 10–12)

- Videosorveglianza

### Chimica, farmaceutica, gomma e plastica (divisioni 19–22)

- Videosorveglianza

### Metallurgia e prodotti in metallo (divisioni 24–25)

- Videosorveglianza

### Elettronica, apparecchi elettrici, macchine e mezzi di trasporto (divisioni 26–30)

- Videosorveglianza

### Energia elettrica, gas e vapore (divisioni 35)

- Geolocalizzazione dei veicoli aziendali

### Acqua, reti fognarie e gestione dei rifiuti (divisioni 36–39)

- Videosorveglianza
- Geolocalizzazione dei veicoli aziendali

### Costruzioni (divisioni 41–43)

- Geolocalizzazione dei veicoli aziendali

### Commercio all'ingrosso e al dettaglio (divisioni 45–47)

- Videosorveglianza
- Marketing e newsletter

### Trasporto e magazzinaggio (divisioni 49–53)

- Videosorveglianza
- Geolocalizzazione dei veicoli aziendali

### Alloggio e ristorazione (divisioni 55–56)

- Videosorveglianza
- Marketing e newsletter

### Editoria, telecomunicazioni e servizi informatici (divisioni 58–63)

- Marketing e newsletter

### Servizi finanziari e assicurativi (divisioni 64–66)

- Videosorveglianza
- Marketing e newsletter

### Attività immobiliari (divisioni 68)

- Marketing e newsletter

### Noleggio, agenzie e servizi di supporto alle imprese (divisioni 77–82)

- Geolocalizzazione dei veicoli aziendali

### Istruzione (divisioni 85)

- Videosorveglianza

### Sanità e assistenza sociale (divisioni 86–88)

- Videosorveglianza

### Attività artistiche, sportive e di intrattenimento (divisioni 90–93)

- Videosorveglianza
- Marketing e newsletter

### Altre attività di servizi (divisioni 94–96)

- Marketing e newsletter

## Sistema integrato: aspetti ambientali e pericoli

Righe proposte nei registri MOD-04.01 e MOD-05.01, con la sola descrizione: gravità,
frequenza e probabilità restano vuote. I profili si raggruppano per settore.

### Per ogni sede

Aspetti ambientali:

- Uffici e servizi generali · Consumo energetico ed emissioni di gas serra: Emissioni indirette da elettricità e riscaldamento
- Uffici e servizi generali · Produzione di rifiuti: Rifiuti assimilabili, carta, toner e RAEE da avviare a recupero

Pericoli:

- Uffici · Lavoro al videoterminale: Postura e affaticamento visivo (Disturbi muscolo-scheletrici e visivi)
- Tutti i locali · Presenza nei luoghi di lavoro: Incendio (Ustioni e intossicazione da fumi)

### Lavorazioni manifatturiere — Tessile, abbigliamento e pelle, Legno, carta e stampa, Chimica, farmaceutica, gomma e plastica, Vetro, ceramica, cemento e laterizi, Metallurgia e prodotti in metallo, Elettronica, apparecchi elettrici, macchine e mezzi di trasporto, Mobili, altre manifatture, riparazione e installazione

Aspetti ambientali:

- Lavorazioni di reparto · Consumo energetico ed emissioni di gas serra: Consumi elettrici e termici dei macchinari
- Lavorazioni di reparto · Produzione di rifiuti: Scarti di lavorazione, imballaggi e oli esausti
- Lavorazioni di reparto · Emissioni in atmosfera: Polveri e fumi dalle lavorazioni, se convogliati soggetti ad autorizzazione
- Lavorazioni di reparto · Rumore e vibrazioni: Rumore verso l'esterno dello stabilimento
- Magazzino prodotti chimici · Sostanze pericolose: Sversamenti di oli, solventi o vernici
- Ricevimento merci · Consumo di risorse: Materie prime e imballaggi in ingresso

Pericoli:

- Reparto produttivo · Uso di macchine e attrezzature: Organi in movimento, taglio, schiacciamento (Lesioni, amputazioni)
- Reparto produttivo · Lavorazioni rumorose: Rumore (Ipoacusia)
- Magazzino · Movimentazione con carrelli elevatori: Investimento e ribaltamento (Traumi gravi)
- Reparto produttivo · Movimentazione manuale dei carichi: Sovraccarico biomeccanico (Lombalgie e disturbi muscolo-scheletrici)
- Reparto produttivo · Uso di prodotti chimici: Agenti chimici (Irritazioni, intossicazioni)

### Tipico dell'industria alimentare — Industria alimentare e delle bevande

Aspetti ambientali:

- Produzione · Scarichi idrici: Acque di lavaggio con carico organico
- Produzione · Produzione di rifiuti: Scarti alimentari e sottoprodotti
- Celle frigorifere · Consumo energetico ed emissioni di gas serra: Consumi del freddo e perdite di gas refrigeranti
- Produzione · Odori e polveri: Odori dalle lavorazioni
- Confezionamento · Consumo di risorse: Imballaggi primari e secondari

Pericoli:

- Produzione · Lavorazioni con coltelli e affettatrici: Taglio (Ferite da taglio)
- Celle frigorifere · Ingresso in celle e ambienti freddi: Microclima freddo, chiusura accidentale (Ipotermia)
- Produzione · Lavaggio e pavimenti bagnati: Scivolamento (Cadute e traumi)
- Produzione · Cottura e sterilizzazione: Superfici calde e vapore (Ustioni)

### Cantieri edili — Costruzioni

Aspetti ambientali:

- Cantiere · Produzione di rifiuti: Rifiuti da costruzione e demolizione
- Cantiere · Odori e polveri: Polveri da demolizioni e movimento terra
- Cantiere · Rumore e vibrazioni: Rumore e vibrazioni verso i residenti
- Mezzi d'opera · Consumo energetico ed emissioni di gas serra: Gasolio dei mezzi di cantiere
- Cantiere · Contaminazione del suolo: Sversamenti di carburanti e oli

Pericoli:

- Cantiere · Lavori in quota: Caduta dall'alto (Traumi gravi o mortali)
- Cantiere · Scavi: Seppellimento, caduta nello scavo (Traumi gravi)
- Cantiere · Uso di macchine movimento terra: Investimento (Traumi gravi)
- Cantiere · Lavori in prossimità di linee elettriche: Elettrocuzione (Folgorazione)
- Cantiere · Demolizioni e tagli: Polveri e silice cristallina (Malattie respiratorie)

### Trasporto e della logistica — Trasporto e magazzinaggio

Aspetti ambientali:

- Flotta · Consumo energetico ed emissioni di gas serra: Carburante dei mezzi
- Flotta · Emissioni in atmosfera: Gas di scarico e particolato
- Officina e piazzale · Produzione di rifiuti: Pneumatici, oli esausti, batterie
- Piazzale · Scarichi idrici: Acque di prima pioggia e di lavaggio mezzi

Pericoli:

- Strada · Guida dei mezzi: Incidente stradale (Traumi gravi o mortali)
- Magazzino · Carico e scarico: Movimentazione manuale dei carichi (Disturbi muscolo-scheletrici)
- Piazzale · Manovre dei mezzi: Investimento (Traumi gravi)
- Strada · Turni di guida: Stress e fatica (Calo dell'attenzione)

### Commercio — Commercio all'ingrosso e al dettaglio

Aspetti ambientali:

- Punto vendita · Consumo energetico ed emissioni di gas serra: Illuminazione, climatizzazione e banchi frigo
- Punto vendita · Produzione di rifiuti: Imballaggi da avviare a recupero
- Banchi frigoriferi · Emissioni in atmosfera: Perdite di gas refrigeranti

Pericoli:

- Magazzino · Movimentazione delle merci: Movimentazione manuale dei carichi (Disturbi muscolo-scheletrici)
- Punto vendita · Lavoro al pubblico: Aggressione e rapina (Traumi e stress)
- Magazzino · Scaffalature: Caduta di oggetti dall'alto (Traumi)

### Attività d'ufficio e dei servizi — Editoria, telecomunicazioni e servizi informatici, Servizi finanziari e assicurativi, Attività immobiliari, Attività professionali, scientifiche e tecniche, Noleggio, agenzie e servizi di supporto alle imprese, Pubblica amministrazione, Istruzione, Attività artistiche, sportive e di intrattenimento, Altre attività di servizi

Pericoli:

- Uffici · Spostamenti per lavoro: Incidente stradale (Traumi)
- Uffici · Organizzazione del lavoro: Stress lavoro-correlato (Disturbi psicofisici)

### Strutture sanitarie — Sanità e assistenza sociale

Aspetti ambientali:

- Reparti · Produzione di rifiuti: Rifiuti sanitari pericolosi a rischio infettivo
- Centrale termica · Consumo energetico ed emissioni di gas serra: Riscaldamento, vapore e climatizzazione continui
- Laboratori · Sostanze pericolose: Reagenti, farmaci e gas medicali

Pericoli:

- Reparti · Assistenza ai pazienti: Agenti biologici (Infezioni)
- Reparti · Movimentazione dei pazienti: Sovraccarico biomeccanico (Lombalgie)
- Reparti · Uso di aghi e taglienti: Puntura accidentale (Infezioni trasmesse col sangue)
- Reparti · Turni notturni: Lavoro notturno e stress (Disturbi del sonno e stress)

### Alloggio e ristorazione — Alloggio e ristorazione

Aspetti ambientali:

- Cucina · Produzione di rifiuti: Rifiuti organici e oli di frittura esausti
- Cucina · Scarichi idrici: Acque grasse da cucina
- Struttura · Consumo di risorse: Acqua per lavanderia, docce e piscina

Pericoli:

- Cucina · Cottura e frittura: Superfici calde e oli bollenti (Ustioni)
- Cucina · Uso di coltelli e affettatrici: Taglio (Ferite da taglio)
- Sala e cucina · Pavimenti bagnati: Scivolamento (Cadute)
- Lavanderia e pulizie · Uso di detergenti: Agenti chimici (Irritazioni)

### Attività agricole — Agricoltura, silvicoltura e pesca

Aspetti ambientali:

- Campi · Sostanze pericolose: Uso di fitofarmaci e fertilizzanti
- Campi · Consumo di risorse: Prelievi irrigui
- Mezzi agricoli · Consumo energetico ed emissioni di gas serra: Gasolio agricolo

Pericoli:

- Campi · Uso del trattore: Ribaltamento (Traumi gravi o mortali)
- Campi · Trattamenti fitosanitari: Agenti chimici (Intossicazioni)
- Campi · Lavoro all'aperto: Microclima caldo e radiazione solare (Colpo di calore)

### Gestione di acque e rifiuti — Acqua, reti fognarie e gestione dei rifiuti

Aspetti ambientali:

- Impianto · Odori e polveri: Odori dagli impianti di trattamento
- Impianto · Scarichi idrici: Scarichi trattati e percolati
- Raccolta · Consumo energetico ed emissioni di gas serra: Carburante dei mezzi di raccolta

Pericoli:

- Impianto · Ingresso in spazi confinati: Atmosfere asfittiche o tossiche (Asfissia)
- Raccolta · Lavoro su strada: Investimento (Traumi gravi)
- Impianto · Contatto con rifiuti: Agenti biologici (Infezioni)

### Produzione e distribuzione di energia — Energia elettrica, gas e vapore

Aspetti ambientali:

- Impianti · Emissioni in atmosfera: Emissioni di combustione
- Impianti · Sostanze pericolose: Oli dielettrici e gas isolanti (SF6)

Pericoli:

- Impianti · Lavori elettrici: Elettrocuzione (Folgorazione)
- Impianti · Lavori in quota: Caduta dall'alto (Traumi gravi)

### Attività estrattive — Estrazione di minerali

Aspetti ambientali:

- Cava · Uso del suolo e impatto visivo: Modifica del paesaggio e recupero ambientale
- Cava · Odori e polveri: Polveri da abbattimento e frantumazione
- Cava · Rumore e vibrazioni: Vibrazioni da esplosivi e mezzi

Pericoli:

- Cava · Uso di esplosivi: Esplosione (Traumi gravi o mortali)
- Cava · Fronte di scavo: Caduta di materiale (Seppellimento e traumi)
- Cava · Frantumazione: Polveri e silice cristallina (Malattie respiratorie)
