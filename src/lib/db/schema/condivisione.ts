import { pgTable, text, timestamp, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organization, user } from "./auth";
import { company } from "./tenancy";

// I collegamenti con cui l'azienda cliente scarica i propri documenti.
//
// ⚠️ **Del token si conserva solo l'impronta.** La colonna si chiama `tokenHash` proprio
// perché nessuno sia tentato di scriverci il valore in chiaro: chi leggesse queste righe —
// un backup finito nel posto sbagliato, una query di assistenza — non deve poter aprire
// nessun collegamento.
//
// La riga NON si cancella mai alla revoca: si marca `revokedAt`. Serve a rispondere alla
// domanda che prima o poi arriva — «chi ha aperto cosa, e quando» — e a distinguere un
// collegamento revocato da uno che non è mai esistito.
export const companyShareLink = pgTable(
  "company_share_link",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    /** Etichetta libera dello studio: «al dott. Rossi», «commercialista». */
    nota: text("nota"),
    creatoDa: text("creato_da").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    /** Quante volte è stato aperto e quando l'ultima: lo studio deve poter vedere se il
     *  cliente l'ha usato, senza dover chiedere. */
    aperture: integer("aperture").default(0).notNull(),
    lastOpenedAt: timestamp("last_opened_at"),
  },
  (t) => [
    // L'impronta è il criterio di ricerca a ogni apertura: senza indice unico sarebbe una
    // scansione dell'intera tabella su una rotta pubblica.
    uniqueIndex("company_share_link_hash_uq").on(t.tokenHash),
    index("company_share_link_company_idx").on(t.companyId),
    index("company_share_link_org_idx").on(t.organizationId),
  ],
);
