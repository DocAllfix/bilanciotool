import type { Metadata } from "next";

export const metadata: Metadata = { title: "Guida" };

export default function GuidaPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">Guida all&apos;uso</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        La guida completa e i tour guidati arrivano con i moduli.
      </p>
    </div>
  );
}
