// Le pagine su cui lo script di misurazione NON gira, nemmeno con il consenso.
//
// Modulo puro, separato dal componente: lo legge `analytics.tsx` e lo prova un test senza
// montare niente.
//
// ⚠️ GA4 manda a Google l'indirizzo INTERO della pagina (`page_location`), parametri
// compresi. Su queste pagine l'indirizzo porta una credenziale o un riferimento personale:
//
// - `/reimposta-password?token=…`: il token vale un'ora e reimposta la password di chi
//   lo possiede. Finiva nei rapporti di GA4, leggibili da chiunque abbia accesso alla
//   proprietà (audit di sicurezza, ottobre 2026).
// - `/documenti-cliente/<token>`: il collegamento del portale cliente è un token
//   portatore, e chi lo ha scarica i documenti di un'azienda senza account.
// - `/accept-invitation/<id>`: l'id da solo non basta ad accettare (serve la sessione con
//   lo stesso indirizzo), ma è un dato di una persona invitata e non serve a nessuna misura.
// - `/documento/`: è la pagina che Chromium trasforma in PDF, e nessuno script di
//   misurazione deve girare dentro un documento consegnato a un cliente.
//
// Si esclude la pagina invece di ripulire l'indirizzo: togliere il token con
// `history.replaceState` romperebbe `useSearchParams` della pagina di reimpostazione, che il
// token lo legge proprio da lì.
const PREFISSI_ESCLUSI = ["/documento/", "/reimposta-password", "/documenti-cliente/", "/accept-invitation/"];

export function percorsoEscluso(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return PREFISSI_ESCLUSI.some((p) => pathname === p.replace(/\/$/, "") || pathname.startsWith(p));
}
