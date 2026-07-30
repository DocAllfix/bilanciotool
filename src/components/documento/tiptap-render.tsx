import type { ReactNode } from "react";

// Render server-side del JSON Tiptap sanificato (whitelist di validation.ts):
// doc, paragraph, heading 2-4, liste, testo con bold/italic. Nient'altro esiste
// nel DB, quindi nient'altro si renderizza.

type Nodo = {
  type: string;
  attrs?: { level?: number };
  content?: Nodo[];
  marks?: { type: string }[];
  text?: string;
};

function renderNodo(n: Nodo, key: number): ReactNode {
  const figli = n.content?.map((c, i) => renderNodo(c, i));
  switch (n.type) {
    case "doc":
      return <>{figli}</>;
    case "paragraph":
      return <p key={key}>{figli}</p>;
    case "heading": {
      const level = n.attrs?.level ?? 3;
      if (level === 2) return <h3 key={key}>{figli}</h3>; // h2 del capitolo → h3 del documento
      return <h4 key={key}>{figli}</h4>;
    }
    case "bulletList":
      return <ul key={key}>{figli}</ul>;
    case "orderedList":
      return <ol key={key}>{figli}</ol>;
    case "listItem":
      return <li key={key}>{figli}</li>;
    case "hardBreak":
      return <br key={key} />;
    case "text": {
      let out: ReactNode = n.text;
      for (const m of n.marks ?? []) {
        if (m.type === "bold") out = <strong>{out}</strong>;
        if (m.type === "italic") out = <em>{out}</em>;
      }
      return <span key={key}>{out}</span>;
    }
    default:
      return null;
  }
}

export function TiptapRender({ doc }: { doc: unknown }) {
  if (!doc || typeof doc !== "object") return null;
  return <>{renderNodo(doc as Nodo, 0)}</>;
}

export function tiptapVuoto(doc: unknown): boolean {
  const visita = (n: Nodo): boolean => Boolean(n.text?.trim()) || (n.content ?? []).some(visita);
  return !doc || typeof doc !== "object" || !visita(doc as Nodo);
}
