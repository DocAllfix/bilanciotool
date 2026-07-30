import type { Metadata } from "next";

export const metadata: Metadata = { title: "Impostazioni" };

export default function ImpostazioniPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">Impostazioni</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Studio, membri e abbonamento arrivano nelle prossime fasi.
      </p>
    </div>
  );
}
