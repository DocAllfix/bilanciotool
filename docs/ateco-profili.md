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
