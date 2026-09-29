import { MODULI_PER_AREA, type ModuloAzienda } from "@/features/companies/moduli";

// Quali percorsi hanno una vetrina pubblica, e con che indirizzo.
//
// ⚠️ LO SLUG NON È LA CHIAVE DEL MODULO, ed è voluto. La chiave interna è `energetico`
// perché così si chiama la rotta dentro l'applicazione; l'indirizzo pubblico è
// `/percorsi/bilancio-energetico` perché è quello che il consulente SEO incolla sotto una
// parola in un articolo, e «energetico» da solo non dice niente a chi lo legge in una
// ricerca. Le due cose vivono separate, e questa tabella è il punto in cui si incontrano.
//
// ⚠️ E lo slug, una volta pubblicato, non si cambia: finisce dentro articoli che non
// controlliamo noi. Cambiarlo dopo costa un rinvio permanente e i collegamenti che nessuno
// aggiorna.
//
// Oggi ce n'è una sola. La forma è al plurale perché le altre tredici arriveranno se questa
// converte, e allora la pagina è già scritta per riceverle.

export type Vetrina = {
  /** L'indirizzo pubblico: `/percorsi/<slug>`. */
  slug: string;
  modulo: ModuloAzienda;
  /** Il titolo della pagina: dice al lettore che cosa risolve, non come si chiama il modulo. */
  titolo: string;
  /** Per il `<title>` e la condivisione. */
  descrizione: string;
  /** Che cosa si può toccare davvero nella vetrina: si dichiara, non si lascia scoprire. */
  provi: string[];
  /** Che cosa NON c'è, perché vive solo nell'account. */
  nonCiSono: string[];
};

export const VETRINE: Vetrina[] = [
  {
    slug: "bilancio-energetico",
    modulo: "energetico",
    titolo: "Bilancio energetico: vettori, usi finali e diagnosi",
    descrizione:
      "Prova il percorso della diagnosi energetica senza registrarti: metti i consumi dei tuoi " +
      "vettori, ripartiscili sugli usi finali e guarda dove va l'energia, con i fattori di " +
      "conversione della norma.",
    provi: [
      "I consumi dell'anno per ciascun vettore, con costi e conversione in kWh, tep e tonnellate di CO₂e",
      "La ripartizione sugli usi finali, con la quadratura che segnala subito ciò che non torna",
      "Dove va l'energia: diagramma di flusso e graduatoria degli usi che pesano di più",
    ],
    nonCiSono: [
      "Il documento impaginato e il PDF da consegnare",
      "Il salvataggio: qui non si registra niente, i numeri restano nel tuo browser",
      "Indicatori su due anni, interventi con il ritorno dell'investimento, racconto e verifica",
    ],
  },
];

export function vetrinaPerSlug(slug: string): Vetrina | null {
  return VETRINE.find((v) => v.slug === slug) ?? null;
}

/** Il modulo del registro, per nome, norma, icona e colore dell'area: la vetrina non
 *  ridichiara niente di ciò che il registro sa già. */
export function moduloDellaVetrina(v: Vetrina) {
  const m = MODULI_PER_AREA.flatMap((g) => g.moduli).find((x) => x.href === v.modulo);
  if (!m) throw new Error(`Vetrina «${v.slug}»: il modulo «${v.modulo}» non è nel registro.`);
  return m;
}
