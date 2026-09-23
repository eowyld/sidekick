"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  LayoutGrid,
  Palette,
  Plug,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const settingsItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/settings", label: "Compte", icon: UserRound },
  { href: "/settings/modules", label: "Modules", icon: LayoutGrid },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/mail", label: "Intégrations", icon: Plug },
  { href: "/settings/personnalisation", label: "Personnalisation", icon: Palette },
  { href: "/settings/donnees", label: "Données et confidentialité", icon: ShieldCheck },
];

/** `/settings` est la racine : elle ne doit être active que pour elle-même. */
function isActive(pathname: string, href: string) {
  if (href === "/settings") return pathname === "/settings";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-[rgba(245,245,245,0.12)] bg-[rgba(16,16,16,0.9)] px-3 py-6 text-[#F5F5F5]">
      <div className="mb-5 flex items-center gap-2 px-1">
        <Button variant="ghost" size="icon" className="-ml-1 shrink-0" asChild>
          <Link href="/dashboard" title="Retour au tableau de bord">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-base font-semibold tracking-tight text-[#F5F5F5]/80">Paramètres</h2>
      </div>
      <nav className="space-y-0.5">
        {settingsItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(pathname, href) ? "page" : undefined}
            className={`flex items-center gap-3 px-2 py-2 text-[16px] transition-colors duration-150 ${
              isActive(pathname, href)
                ? "border-l-2 border-[#F0FF00] bg-[#F0FF00]/10 pl-[6px] font-medium text-[#F0FF00]"
                : "border-l-2 border-transparent text-[#F5F5F5]/65 hover:bg-[rgba(245,245,245,0.05)] hover:text-[#F5F5F5]"
            }`}
          >
            <Icon size={18} className="shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
