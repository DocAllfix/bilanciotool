import { z } from "zod";
import { companyIdSchema, annoSchema } from "@/features/campi";

// Validazioni del modulo Bilancio. La sanificazione del rich text è QUI, server
// side: il client manda JSON Tiptap, il server tiene solo la whitelist.

export const progettoSchema = z.object({
  companyId: companyIdSchema,
  anno: annoSchema,
  standard: z
    .enum([
      "GRI 2021 — opzione con riferimento",
      "GRI 2021 — in conformità",
      "ESRS (VSME) volontario",
      "GRI 2021 + ESRS",
    ])
    .optional(),
});

export const profiloSchema = z
  .object({
    forma: z.string(),
    piva: z.string(),
    sede: z.string(),
    settore: z.string(),
    ateco: z.string(),
    sitiop: z.string(),
    mercati: z.string(),
    contatto: z.string(),
  })
  .partial();

export const sogliaSchema = z.coerce.number().min(1).max(5);

export const punteggioMaterialitaSchema = z.object({
  topicKey: z.string().regex(/^T\d{2}$/),
  scoreImpact: z.coerce.number().int().min(1).max(5).nullable(),
  scoreFinancial: z.coerce.number().int().min(1).max(5).nullable(),
  nota: z.string().optional().default(""),
});

export const kpiValoreSchema = z.object({
  kpiKey: z.string().regex(/^[a-z_]+$/),
  anno: annoSchema,
  valore: z.union([z.string(), z.number(), z.null()]), // null/"" = cancella il valore
});

export const gestioneTemaSchema = z.object({
  topicKey: z.string().regex(/^T\d{2}$/),
  politica: z.string().optional().default(""),
  azioni: z.string().optional().default(""),
  target: z.string().optional().default(""),
  annoBase: z.string().optional().default(""),
  annoTarget: z.string().optional().default(""),
  responsabile: z.string().optional().default(""),
});

export const mediaSchema = z.object({
  tipo: z.enum(["img", "chart"]),
  chartKey: z.enum(["emissioni", "energia", "persone", "sicurezza", "rifiuti", "fornitori", "materialita"]).optional(),
  didascalia: z.string().optional().default(""),
  credito: z.string().optional().default(""),
  larghezza: z.enum(["full", "half"]).default("full"),
});

// ---------------------------------------------------------------- Tiptap
// Whitelist rigida: tutto ciò che non è elencato viene SCARTATO (non escapato):
// il documento pubblicato renderizza questo JSON, quindi qui si decide cosa può
// esistere. Niente HTML raw, niente attributi liberi, niente link (V1).
type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: { type: string }[];
  text?: string;
};

const NODI = new Set(["doc", "paragraph", "heading", "bulletList", "orderedList", "listItem", "text", "hardBreak"]);
const MARKS = new Set(["bold", "italic"]);

function sanificaNodo(n: unknown): TiptapNode | null {
  if (typeof n !== "object" || n === null) return null;
  const node = n as TiptapNode;
  if (typeof node.type !== "string" || !NODI.has(node.type)) return null;
  const out: TiptapNode = { type: node.type };
  if (node.type === "heading") {
    const level = Number((node.attrs as { level?: unknown })?.level);
    out.attrs = { level: level >= 2 && level <= 4 ? level : 3 };
  }
  if (node.type === "text") {
    if (typeof node.text !== "string" || !node.text) return null;
    out.text = node.text;
    const marks = (Array.isArray(node.marks) ? node.marks : [])
      .filter((m) => m && typeof m.type === "string" && MARKS.has(m.type))
      .map((m) => ({ type: m.type }));
    if (marks.length) out.marks = marks;
    return out;
  }
  const figli = (Array.isArray(node.content) ? node.content : [])
    .map(sanificaNodo)
    .filter((x): x is TiptapNode => x !== null);
  if (figli.length) out.content = figli;
  return out;
}

export function sanificaTiptap(doc: unknown): TiptapNode {
  const pulito = sanificaNodo(doc);
  if (!pulito || pulito.type !== "doc") return { type: "doc", content: [] };
  return pulito;
}

// Conteggio parole del testo (per gap-analysis e contatore capitoli).
export function conteggioParole(doc: unknown): number {
  let parole = 0;
  const visita = (n: TiptapNode) => {
    if (n.text) parole += n.text.split(/\s+/).filter(Boolean).length;
    n.content?.forEach(visita);
  };
  visita(sanificaTiptap(doc));
  return parole;
}
