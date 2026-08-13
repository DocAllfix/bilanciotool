"use client";

import { ModuloIscrizione } from "../registrati/modulo";

// `/attiva` è la porta di chi ha già deciso: stesso modulo di iscrizione, ma il
// collegamento che arriva per posta lo fa entrare sulla pagina dei piani invece che sul
// portafoglio con il video. È anche un indirizzo che si detta al telefono.

export default function AttivaPage() {
  return <ModuloIscrizione destinazione="/impostazioni/abbonamento" perAcquisto />;
}
