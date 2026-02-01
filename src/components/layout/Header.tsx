"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

function getInitials(user: User | null): string {
  if (!user) return "—";
  const name = user.user_metadata?.full_name ?? user.user_metadata?.name;
  if (name && typeof name === "string") {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const email = user.email ?? "";
  const local = email.split("@")[0];
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  return local.toUpperCase() || "—";
}

function getFirstName(user: User | null): string {
  if (!user) return "—";
  const name = user.user_metadata?.full_name ?? user.user_metadata?.name;
  if (name && typeof name === "string") {
    const parts = name.trim().split(/\s+/);
    return parts[0] ?? "—";
  }
  return "—";
}

function getLastName(user: User | null): string {
  if (!user) return "—";
  const name = user.user_metadata?.full_name ?? user.user_metadata?.name;
  if (name && typeof name === "string") {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return parts.slice(1).join(" ");
    return "—";
  }
  return "—";
}

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
  }

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  const initials = getInitials(user);
  const firstName = getFirstName(user);
  const lastName = getLastName(user);
  const email = user?.email ?? "—";

  return (
    <header className="flex items-center justify-end border-b bg-background/80 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>Connecté</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
              title="Mon compte"
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 !bg-white dark:!bg-zinc-900 border shadow-xl"
          >
            <div className="space-y-3 p-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Prénom
                </p>
                <p className="text-sm">{firstName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Nom</p>
                <p className="text-sm">{lastName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Email
                </p>
                <p className="text-sm break-all">{email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleSignOut}
              >
                Déconnexion
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
