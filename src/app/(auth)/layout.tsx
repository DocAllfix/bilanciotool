import { Leaf } from "lucide-react";
import Link from "next/link";

// Registro auth: pagina silenziosa e centrata, brand sobrio, zero distrazioni.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2.5" aria-label="EvalisDeck">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Leaf className="size-4.5" strokeWidth={2} />
        </span>
        <span className="text-lg font-semibold tracking-tight">EvalisDeck</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
      <p className="mt-10 max-w-sm text-center text-xs leading-relaxed text-muted-foreground">
        Bilanci di sostenibilità e inventari GHG per le PMI, con il metodo incorporato.
      </p>
    </div>
  );
}
