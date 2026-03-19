"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const settingsItems = [
  { href: "/settings", label: "Informations personnelles" },
  { href: "/settings/mail", label: "Configuration mail" },
  { href: "/settings/personnalisation", label: "Personnalisation" }
];

export function SettingsSidebar() {
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-[rgba(245,245,245,0.12)] bg-[rgba(16,16,16,0.9)] px-4 py-6 text-[#F5F5F5]">
      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 shrink-0"
          asChild
        >
          <Link href="/dashboard" title="Retour au tableau de bord">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-sm font-semibold tracking-tight text-[#F5F5F5]/70">
          Paramètres
        </h2>
      </div>
      <nav className="space-y-1 text-sm text-[#F5F5F5]/72">
        {settingsItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-2 py-1.5 hover:bg-[rgba(245,245,245,0.08)] hover:text-[#F5F5F5]"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

