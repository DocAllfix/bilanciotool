// Il corpo di un articolo.
//
// L'HTML arriva dall'editor di WordPress ed è GIÀ passato dalla lista bianca di
// `sanitize.ts`: qui si occupa solo dell'aspetto. Le classi stanno su un contenitore
// con varianti discendenti (`[&_h2]:…`) invece che sul plugin typography di Tailwind,
// perché il registro tipografico è nostro e vogliamo controllarlo voce per voce —
// stessa scelta già fatta per le pagine legali.
//
// `dangerouslySetInnerHTML` è inevitabile con un CMS che produce HTML, ed è il motivo
// per cui la sanificazione è a lista bianca stretta e non a lista nera: quello che non
// è esplicitamente permesso non passa.

export function ContenutoArticolo({ html }: { html: string }) {
  return (
    <div
      className={[
        "text-[16.5px] leading-[1.75] text-foreground/85",
        // titoli
        // `scroll-mt`: l'intestazione e' fissa in alto, e senza questo margine il titolo
        // raggiunto da un'ancora finisce NASCOSTO dietro di essa. L'indice sembrerebbe
        // rotto pur funzionando.
        "[&_h2]:scroll-mt-24 [&_h3]:scroll-mt-24",
        "[&_h2]:font-display [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-[26px] [&_h2]:font-semibold [&_h2]:leading-[1.2] [&_h2]:tracking-[-0.01em] [&_h2]:text-foreground",
        "[&_h3]:font-display [&_h3]:mt-9 [&_h3]:mb-3 [&_h3]:text-[20px] [&_h3]:font-semibold [&_h3]:tracking-[-0.01em] [&_h3]:text-foreground",
        "[&_h4]:mt-7 [&_h4]:mb-2 [&_h4]:text-[17px] [&_h4]:font-semibold [&_h4]:text-foreground",
        // corpo
        "[&_p]:my-5",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:no-underline",
        // elenchi
        "[&_ul]:my-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6",
        "[&_ol]:my-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6",
        "[&_li]:leading-[1.7]",
        // citazioni e codice
        "[&_blockquote]:my-7 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-5 [&_blockquote]:text-[17px] [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[14px]",
        "[&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:text-[13.5px]",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
        // media
        "[&_img]:my-7 [&_img]:w-full [&_img]:rounded-lg [&_img]:border",
        "[&_figure]:my-7",
        "[&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-[13px] [&_figcaption]:text-muted-foreground",
        // tabelle: devono scorrere da sole, la pagina non deve mai scorrere in orizzontale
        "[&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[14.5px]",
        "[&_th]:border-b [&_th]:py-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-medium [&_th]:text-foreground",
        "[&_td]:border-b [&_td]:py-2.5 [&_td]:pr-4 [&_td]:align-top",
        "[&_hr]:my-10 [&_hr]:border-border",
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
