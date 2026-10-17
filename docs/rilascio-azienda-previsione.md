# Rilascio fascia «Azienda» e voci automatiche — previsione scritta PRIMA del seme

Scritta il 17 ottobre 2026, prima di qualunque scrittura sul database di produzione, come chiede
`docs/metodo-rilascio.md`. Dopo il seme, i conteggi letti **come `app_rls`** devono coincidere
con questi, uno per uno.

## Già fatto

- Prezzi vivi `evalisdeck_azienda_anno1_v1` (490 €) e `evalisdeck_azienda_rinnovo_v1` (392 €),
  annuali, in euro, attivi, sull'account `acct_1U3GxSAOnVDvjrbP` verificato prima di scrivere.
  Gli altri 12 prezzi del listino invariati.

## Stato della produzione (sola lettura, 17 ottobre)

- Migrazioni: 68 applicate, mancano esattamente `0068_fascia_azienda` e `0069_ateco_proposte`.
- 198 tabelle pubbliche, 0 senza RLS. 1 abbonamento Stripe, 16 organizzazioni, 5 entitlement
  attivi, 23 documenti pubblicati.
- Vincoli rivalidati: `org_entitlement_piano_ck` (piani presenti: nessuno 12, enterprise 1,
  singola 1, studio 1, studio_plus 1, tutti dentro l'elenco nuovo), `content_set_dominio_ck`
  (15 righe), `document_snapshot_tipo_ck` (23), `corpus_block_tipo_ck` (7039),
  `corpus_register_column_tipo_ck` (939): **nessuna riga fuori dominio**.
- Nessuna colonna che la `0069` aggiunge esiste già: dove c'è `tipo_key` (tabelle GDPR e PAS)
  la `0069` aggiunge solo `proposta_motivo`, e solo a `gdpr_trattamento`.

## Previsione dopo le migrazioni e il seme `ateco-v1`

| Che cosa | Valore atteso |
|---|---|
| migrazioni applicate | **70** |
| tabelle pubbliche | **200** (198 + `assegnazione_percorso` + `ateco_proposta`), 0 senza RLS |
| `content_set` | **16** (15 + `ateco-v1`) |
| `ateco_proposta` | **948** (780 di GHG, energetico, 231 e GDPR + 168 del sistema integrato QAS) |
| `assegnazione_percorso` | 0 |
| colonne nuove | `ghg_activity_row.tipo_key`, `ghg_activity_row.proposta_motivo`, `materiality_assessment.proposta_motivo`, `mog_crime_applicability.proposta_motivo`, `gdpr_trattamento.proposta_motivo`, `corpus_register_row.tipo_key`, `corpus_register_row.proposta_motivo` |
| righe con `proposta_motivo` pieno | 0 (le proposte entrano solo all'avvio di un percorso nuovo) |
| `document_snapshot` | invariato (23) |
| `org_entitlement` | invariato; il piano `azienda` si scrive e un piano inventato è respinto (provato in transazione annullata) |

Gli altri cataloghi non cambiano: il seme è idempotente (`on conflict (id) do update`, nessun
`delete`), quindi i conteggi dei quindici content set esistenti restano quelli di prima.

## Ordine

1. Guardia vista **rifiutarsi** sulla produzione senza override.
2. `SO_CHE_E_PRODUZIONE=1 npm run db:migrate` con la stringa di produzione.
3. `SO_CHE_E_PRODUZIONE=1 npm run db:seed` con la stringa di produzione.
4. Conteggi letti come `app_rls`, in sola lettura, contro questa tabella.
5. Fusione su `main` come un commit solo.
