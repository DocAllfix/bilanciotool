"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bold, Italic, List, ListOrdered } from "lucide-react";

// Editor dei capitoli: StarterKit ridotto ALL'ESATTA whitelist del server
// (paragraph, heading 2-4, liste, bold, italic). Tutto il resto è disattivato:
// ciò che l'editor non può produrre, il server comunque scarterebbe.

export function TiptapEditor({
  contenuto,
  onSave,
  placeholder,
}: {
  contenuto: unknown;
  onSave: (doc: unknown) => void;
  placeholder?: string;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    immediatelyRender: false, // SSR Next: si monta solo sul client
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        blockquote: false,
        codeBlock: false,
        code: false,
        strike: false,
        horizontalRule: false,
        link: false,
        underline: false,
      }),
    ],
    content: (contenuto as object) ?? { type: "doc", content: [] },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-32 rounded-md border bg-card px-3 py-2 focus:outline-2 focus:outline-ring/60 dark:prose-invert",
        "aria-label": placeholder ?? "Testo del capitolo",
      },
    },
    onUpdate: ({ editor }) => {
      // Autosave con debounce: mai perdere il lavoro (principio PRODUCT.md #4).
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => onSave(editor.getJSON()), 1200);
    },
  });

  // Salvataggio immediato quando si smonta (cambio passo/capitolo).
  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        if (editor) onSave(editor.getJSON());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return <div className="min-h-32 animate-pulse rounded-md border bg-muted/40" />;

  const bottone = (attivo: boolean, onClick: () => void, label: string, icona: React.ReactNode) => (
    <Button
      type="button"
      variant={attivo ? "default" : "ghost"}
      size="icon"
      className={cn("size-7", !attivo && "text-muted-foreground")}
      aria-label={label}
      aria-pressed={attivo}
      onClick={onClick}
    >
      {icona}
    </Button>
  );

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-0.5">
        {bottone(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Grassetto", <Bold className="size-3.5" />)}
        {bottone(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "Corsivo", <Italic className="size-3.5" />)}
        {bottone(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "Elenco puntato", <List className="size-3.5" />)}
        {bottone(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "Elenco numerato", <ListOrdered className="size-3.5" />)}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
