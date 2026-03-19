"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { LogOut, Settings } from "lucide-react";

type HeaderUser = {
  firstName: string | null;
  initials: string;
};

export function Header() {
  const [user, setUser] = useState<HeaderUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (!user) {
          setUser(null);
          return;
        }

        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

        // Essayer de récupérer un prénom depuis les métadonnées ou l'email
        let firstName: string | null =
          (meta.first_name as string | undefined) ??
          (meta.firstname as string | undefined) ??
          (meta.prenom as string | undefined) ??
          null;

        if (!firstName && typeof meta.full_name === "string") {
          firstName = meta.full_name.split(" ")[0] || null;
        }

        if (!firstName && user.email) {
          const local = user.email.split("@")[0];
          firstName = local.split(/[._-]/)[0] || local;
        }

        if (firstName) {
          firstName =
            firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        }

        // Initiales : prénom + nom s'ils existent, sinon première lettre de l'email
        let initials = "";
        const rawFirst = (meta.first_name as string | undefined) ?? "";
        const rawLast = (meta.last_name as string | undefined) ?? "";

        if (rawFirst || rawLast) {
          initials =
            (rawFirst.trim()[0] || "").toUpperCase() +
            (rawLast.trim()[0] || "").toUpperCase();
        } else if (user.email) {
          initials = user.email[0]?.toUpperCase() ?? "S";
        } else {
          initials = "SK";
        }

        setUser({
          firstName,
          initials
        });
      })
      .catch(() => {
        // Réseau ou Supabase indisponible : on affiche quand même les initiales par défaut
        setUser({ firstName: null, initials: "?" });
      });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleOpenSettings = () => {
    router.push("/settings");
  };

  return (
    <header className="flex items-center justify-between border-b border-[rgba(245,245,245,0.12)] bg-[rgba(16,16,16,0.78)] px-4 py-3 backdrop-blur-xl md:px-6">
      <div>
        <h1 className="text-lg font-semibold leading-tight tracking-tight text-[#F5F5F5]">
          Sidekick
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex h-8 w-8 items-center justify-center rounded-full border-[rgba(245,245,245,0.25)] bg-[#F0FF00] p-0 text-xs font-semibold text-[#101010] hover:bg-[#F0FF00]/90"
              aria-label="Menu utilisateur"
            >
              {user?.initials ?? "?"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 border-[rgba(245,245,245,0.2)] bg-[rgba(15,23,42,0.96)] text-[#F5F5F5]">
            <div className="px-3 py-2 text-sm">
              <p className="text-xs text-[#F5F5F5]/65">Bonjour</p>
              <p className="font-medium">
                {user?.firstName ?? "utilisateur"}
              </p>
            </div>
            <DropdownMenuItem
              onClick={handleOpenSettings}
              className="cursor-pointer flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              <span>Paramètres</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer flex items-center gap-2 text-rose-300 focus:text-rose-300"
            >
              <LogOut className="h-4 w-4" />
              <span>Se déconnecter</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}