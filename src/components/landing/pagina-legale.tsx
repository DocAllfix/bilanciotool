import Link from "next/link";
import { SiteHeader } from "./site-header";

export function PaginaLegale({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">{titolo}</h1>
        <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
        <p className="mt-10 text-sm">
          <Link href="/" className="font-medium text-primary hover:underline">← Torna alla home</Link>
        </p>
      </main>
    </div>
  );
}
