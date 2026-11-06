import { MODULI_PER_AREA, type ModuloAzienda } from "@/features/companies/moduli";
import { contenutiPubblicati, type ContenutoPercorso } from "@/features/vetrina/contenuti";

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
// Le pagine arrivano a gruppi: prima un campione per approvare tono e struttura, poi le
// altre. Il modello è uno solo, e riceve tutte quelle che `contenuti.ts` dichiara.

// ⚠️ Dal 6 novembre 2026 le vetrine si RICAVANO dai contenuti delle pagine dei percorsi
// (`contenuti.ts`): una pagina nuova compare da sola in sitemap, nel blocco del blog e
// nell'indice `/percorsi`, senza un secondo elenco da tenere allineato.
export type Vetrina = ContenutoPercorso;

export const VETRINE: Vetrina[] = contenutiPubblicati();

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

/** La pagina pubblica di un modulo, se c'è: la home e il blog ci collegano le schede. */
export function vetrinaDelModulo(modulo: ModuloAzienda): Vetrina | null {
  return VETRINE.find((v) => v.modulo === modulo) ?? null;
}
