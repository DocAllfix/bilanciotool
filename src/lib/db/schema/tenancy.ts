import { pgTable, text, timestamp, boolean, integer, numeric, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organization, user } from "./auth";

// Aziende clienti del tenant (portafoglio dello studio). Tabella TENANT: RLS su organization_id.
export const company = pgTable(
  "company",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    piva: text("piva"),
    settore: text("settore"),
    ateco: text("ateco"),
    sede: text("sede"),
    // ─── anagrafica del cliente (da ESG Nexus, fase 2) ────────────────────────
    //
    // ⚠️ `dipendenti` e `fatturato` esistono GIA' dentro i profili JSONB dei moduli
    // (`ghg_inventory.profilo`, `supplier_assessment.profilo`), e NON sono la stessa
    // cosa: quelli sono i valori DELL'ESERCIZIO — l'organico del 2024 con cui si e'
    // calcolata l'intensita' di quell'anno — e restano dove sono. Questi sono i valori
    // CORRENTI, l'anagrafica dello studio sul proprio cliente.
    //
    // Unificarli sembrerebbe una pulizia e sarebbe una perdita: un inventario ripubblicato
    // l'anno dopo si vedrebbe cambiare sotto i piedi il denominatore di un indicatore gia'
    // consegnato. Chi ci mette mano dopo di me legga questa riga prima.
    nazione: text("nazione"),
    dipendenti: integer("dipendenti"),
    fatturato: numeric("fatturato", { precision: 14, scale: 2 }),
    sitoWeb: text("sito_web"),
    // active conta nei limiti anti-abuso; archived = sola lettura, non conta, mai cancellata.
    stato: text("stato", { enum: ["active", "archived"] }).default("active").notNull(),
    // Immagini del documento (chiavi Storage, mai dataURL in colonna).
    logoStorageKey: text("logo_storage_key"),
    coverStorageKey: text("cover_storage_key"),
    // Flag per l'azienda demo pre-compilata: esclusa dai limiti e dalle statistiche.
    isDemo: boolean("is_demo").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    archivedAt: timestamp("archived_at"),
  },
  (t) => [index("company_org_idx").on(t.organizationId)],
);

/**
 * Le PERSONE dentro l'azienda cliente: chi si chiama quando serve un dato.
 *
 * Da `contatti_cliente` di ESG Nexus, ri-ancorata all'organizzazione e non all'utente
 * (li' ogni tabella portava `user_id` perche' il prodotto era per un consulente solo;
 * qui il socio di studio deve vedere i contatti del collega).
 *
 * ⚠️ NON e' `company_referent`, che sta qui sotto e non c'entra: quello e' un UTENTE del
 * prodotto con una sessione e dei permessi, questo e' una rubrica. Il referente aziendale
 * ha una riga in `user`; il contatto no, e non deve averla — e' un nome su un foglio, non
 * qualcuno che entra.
 *
 * ⚠️ E sono PERSONE FISICHE che non sono utenti del prodotto: e' il primo posto del
 * prodotto in cui compaiono, e l'informativa privacy va estesa prima che questa tabella
 * riceva un dato vero (Fase 9 del piano).
 */
export const companyContact = pgTable(
  "company_contact",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    ruolo: text("ruolo"),
    email: text("email"),
    telefono: text("telefono"),
    /** Il primo da chiamare. Al piu' uno per azienda: lo impone un indice parziale. */
    principale: boolean("principale").default(false).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("company_contact_company_idx").on(t.companyId),
    index("company_contact_org_idx").on(t.organizationId),
  ],
);

// Fase 2 di prodotto (disattivata in V1): accesso del referente aziendale a UNA company.
export const companyReferent = pgTable(
  "company_referent",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["editor", "viewer"] }).default("editor").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("company_referent_uq").on(t.companyId, t.userId)],
);
