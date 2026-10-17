import { guardiaPercorso } from "../guardia-percorso";

// Il percorso esiste solo per chi lo ha (fascia «Azienda»): vedi `guardia-percorso.ts`.
export default async function Layout({ children }: { children: React.ReactNode }) {
  await guardiaPercorso("bilancio");
  return children;
}
