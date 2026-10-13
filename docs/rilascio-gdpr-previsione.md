# Rilascio GDPR — previsione scritta PRIMA del seme

Scritta il 13 ottobre 2026 alle 01:30, prima di qualunque scrittura in produzione, come
chiede `docs/metodo-rilascio.md`. Dopo il seme, i conteggi letti **come `app_rls`** devono
coincidere con questi, uno per uno.

## Stato della produzione (sola lettura, `scripts/stato-produzione.mjs`)

- Migrazioni: 62 applicate, mancano esattamente `0062_gdpr`, `0063_gdpr_rls`,
  `0064_documenti_gdpr`.
- 147 tabelle pubbliche, 0 senza RLS. 1 abbonamento Stripe, 16 organizzazioni,
  5 entitlement attivi, 23 documenti pubblicati.
- Vincoli rivalidati: `document_snapshot_tipo_ck` (23 righe) e `content_set_dominio_ck`
  (13 righe), **nessuna riga fuori dominio**. `document_snapshot_anno_ck` non cambia per i
  tipi esistenti: ognuno resta nel proprio ramo.

## Previsione dopo il seme `gdpr-v1`

| Tabella | Righe |
|---|---|
| `content_set` | **14** (13 + `gdpr-v1`) |
| `gdpr_gruppo` | 12 |
| `gdpr_requisito` | 99 |
| `gdpr_criterio` | 9 |
| `gdpr_trattamento_tipo` | 11 |
| `gdpr_scala` | 10 |
| `gdpr_sezione` | 4 |
| `gdpr_indicatore` | 22 |
| `gdpr_documento_tipo` | 15 |
| `gdpr_attivita_tipo` | 15 |
| `gdpr_contenuto_politica` | 9 |
| `gdpr_testo` | 1 |
| tabelle tenant `gdpr_*` | 0 (nessuna azienda ha ancora avviato il percorso) |
| `document_snapshot` | invariato (23) |

## Ordine

1. Migrazioni `0062`÷`0064`, con la guardia vista **rifiutarsi** prima dell'override dichiarato.
2. Seme (`npm run db:seed` con `SO_CHE_E_PRODUZIONE=1`), dopo aver riletto che non contenga
   `delete` né `truncate` sulle tabelle esistenti.
3. Conteggi letti assumendo `app_rls`, confrontati con questa tabella.
4. Solo allora la fusione su `main` (la spinta la fa il committente).

⚠️ Fra il 2 e il 4 nessuna fusione: senza seme il percorso si apre su zero requisiti, senza
la `0064` nessun documento GDPR si pubblica.
