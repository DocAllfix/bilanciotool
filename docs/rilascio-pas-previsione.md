# Rilascio PAS 24000 — previsione scritta PRIMA del seme

Scritta il 16 ottobre 2026, prima di qualunque scrittura in produzione, come chiede
`docs/metodo-rilascio.md`. Dopo il seme, i conteggi letti **come `app_rls`** devono
coincidere con questi, uno per uno.

## Stato della produzione (sola lettura, `scripts/stato-produzione.mjs`, 16 ottobre)

- Migrazioni: 65 applicate, mancano esattamente `0065_pas`, `0066_pas_rls`,
  `0067_documenti_pas`.
- 171 tabelle pubbliche, 0 senza RLS. 1 abbonamento Stripe, 16 organizzazioni,
  5 entitlement attivi, 23 documenti pubblicati.
- Vincoli rivalidati: `document_snapshot_tipo_ck` (23 righe) e `content_set_dominio_ck`
  (14 righe), **nessuna riga fuori dominio**. I CHECK del corpus non cambiano.

⚠️ Da rileggere il giorno del rilascio: se nel frattempo qualcuno pubblica, i conteggi dei
documenti salgono, e la previsione va aggiornata PRIMA di scrivere, non dopo.

## Previsione dopo le migrazioni e il seme `pas-v1`

| Tabella | Righe |
|---|---|
| tabelle pubbliche | **198** (171 + 27 `pas_*`), 0 senza RLS |
| `content_set` | **15** (14 + `pas-v1`) |
| `pas_gruppo` | 18 |
| `pas_requisito` | 98 |
| `pas_parte_tipo` | 8 |
| `pas_rischio_tipo` | 20 |
| `pas_scala` | 10 |
| `pas_sezione` | 6 |
| `pas_indicatore` | 35 |
| `pas_attivita_tipo` | 16 |
| `pas_contenuto_politica` | 9 |
| `pas_testo` | 1 |
| tabelle tenant `pas_*` (17) | 0 (nessuna azienda ha ancora avviato il percorso) |
| `document_snapshot` | invariato (23) |

I conteggi dei cataloghi sono quelli di `seed-counts.db.test.ts`, verde sullo sviluppo.

## Ordine

1. Migrazioni `0065`÷`0067`, con la guardia vista **rifiutarsi** prima dell'override dichiarato.
2. Seme (`npm run db:seed` con `SO_CHE_E_PRODUZIONE=1`), dopo aver riletto che non contenga
   `delete` né `truncate` sulle tabelle esistenti.
3. Conteggi letti assumendo `app_rls`, confrontati con questa tabella.
4. I due PDF d'esempio di `public/esempi/` pubblicati sulla dimostrativa dello studio Evalis
   **in produzione** (il colophon deve rimandare a `evalisdeck.it/verifica` con un codice che
   lì si verifica), poi committati nel ramo prima della fusione. Richiede l'autorizzazione del
   committente: è una pubblicazione nel database che incassa.
5. Solo allora la fusione su `main` (la spinta la fa il committente).

⚠️ Fra il 2 e il 5 nessuna fusione: senza seme il percorso si apre su zero requisiti, senza
la `0067` nessun documento PAS si pubblica.
