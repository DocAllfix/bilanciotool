"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";

const iniziali = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "?";

export function UserMenu({ nome, email, compatto = false }: { nome: string; email: string; compatto?: boolean }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          compatto
            ? "flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-sidebar-accent"
            : "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-sidebar-accent"
        }
        aria-label="Menu utente"
      >
        <Avatar className="size-7">
          <AvatarFallback className="bg-sidebar-primary/20 text-[11px] font-semibold text-sidebar-primary-foreground">
            {iniziali(nome)}
          </AvatarFallback>
        </Avatar>
        {!compatto && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-sidebar-accent-foreground">{nome}</span>
            <span className="block truncate text-[11px] text-sidebar-foreground/70">{email}</span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await authClient.signOut();
            router.push("/login");
            router.refresh();
          }}
        >
          <LogOut className="size-4" /> Esci
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
