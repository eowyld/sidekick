"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  Users,
  Music2,
  BookOpen,
  Mic2,
  Megaphone,
  DollarSign,
  Briefcase,
  FileText,
  ChevronDown,
  PanelLeft,
  PanelLeftClose,
  Settings,
  FolderKanban,
  Lock,
} from "lucide-react";
import { isComingSoon } from "@/lib/coming-soon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePreferencesData } from "@/hooks/usePreferencesData";
import { SidekickLogo } from "@/components/branding/SidekickLogo";

const SIDEBAR_COLLAPSED_KEY = "sidekick-sidebar-collapsed";

// ─── Données de navigation ───────────────────────────────────────────────────

const groupOrganisation = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendrier", icon: CalendarDays },
  { href: "/tasks", label: "Tâches", icon: CheckSquare },
  { href: "/contacts", label: "Contacts", icon: Users },
];

const groupMusique = [
  {
    label: "Live",
    icon: Mic2,
    key: "live",
    href: "/live",
    sub: [
      { href: "/live", label: "Vue d'ensemble" },
      { href: "/live/representations", label: "Représentations" },
      { href: "/live/repetitions", label: "Répétitions" },
      { href: "/live/prospection", label: "Prospection" },
      { href: "/live/materiel", label: "Matériel" },
    ],
  },
  {
    label: "Phono",
    icon: Music2,
    key: "phono",
    href: "/phono/catalogue",
    sub: [
      { href: "/phono/catalogue", label: "Catalogue" },
      { href: "/phono/sessions-studio", label: "Sessions Studio" },
      { href: "/phono/liens-ecoute", label: "Liens d'écoute" },
    ],
  },
  {
    label: "Édition",
    icon: BookOpen,
    key: "edition",
    href: "/edition",
    sub: [
      { href: "/edition", label: "Catalogue" },
      { href: "/edition/sync", label: "Synchronisation" },
    ],
  },
];

const groupBusiness = [
  {
    label: "Revenus",
    icon: DollarSign,
    key: "revenus",
    href: "/incomes",
    sub: [
      { href: "/incomes", label: "Vue d'ensemble" },
      { href: "/incomes/facturation", label: "Facturation" },
      { href: "/incomes/royalties", label: "Royalties" },
      { href: "/incomes/droits-auteur", label: "Droits d'auteur" },
      { href: "/incomes/intermittence", label: "Intermittence" },
    ],
  },
  {
    label: "Admin",
    icon: Briefcase,
    key: "admin",
    href: "/admin",
    sub: [
      { href: "/admin", label: "Mes statuts" },
      { href: "/admin/demarches", label: "Mes démarches" },
      { href: "/admin/comptabilite", label: "Ma comptabilité" },
      { href: "/admin/contrats", label: "Mes contrats" },
    ],
  },
  {
    label: "Marketing",
    icon: Megaphone,
    key: "marketing",
    href: "/marketing",
    sub: [
      { href: "/marketing", label: "Vue d'ensemble" },
      { href: "/marketing/publications", label: "Publications" },
      { href: "/marketing/mailing", label: "Mailing" },
      { href: "/marketing/presskit", label: "Presskit" },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

// ─── Composants internes ─────────────────────────────────────────────────────

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  pathname: string;
}) {
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-2 py-1.5 text-[15px] transition-colors duration-150 ${
        active
          ? "border-l-2 border-[#F0FF00] bg-[#F0FF00]/10 pl-[6px] text-[#F0FF00] font-medium"
          : "border-l-2 border-transparent text-[#F5F5F5]/65 hover:bg-[rgba(245,245,245,0.05)] hover:text-[#F5F5F5]"
      }`}
    >
      <Icon size={16} className="shrink-0" />
      {label}
    </Link>
  );
}

/** Infobulle des entrées fermées pour l'alpha. */
function ComingSoonTooltip({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="right">Disponible prochainement</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function NavGroup({
  label,
  icon: Icon,
  moduleKey,
  href,
  sub,
  enabled,
  pathname,
  open,
  onToggle,
}: {
  label: string;
  icon: React.ElementType;
  moduleKey: string;
  href: string;
  sub: { href: string; label: string }[];
  enabled: boolean;
  pathname: string;
  open: boolean;
  onToggle: () => void;
}) {
  const groupActive = pathname === href || pathname.startsWith(href + "/");

  // Module désactivé : retiré de la navigation, conformément à la promesse de
  // la page Personnalisation ("les éléments désactivés disparaissent des menus").
  // L'accès direct à l'URL reste possible — c'est la garde de route qui s'en charge.
  if (!enabled) return null;

  // Fermé pour l'alpha : l'entrée reste visible — elle annonce ce qui arrive —
  // mais devient inerte. Le cadenas porte le message, un clic vers une impasse
  // serait moins clair.
  if (isComingSoon(href)) {
    return (
      <ComingSoonTooltip>
        <div className="flex cursor-default items-center gap-2.5 border-l-2 border-transparent px-2 py-1.5 text-[15px] text-[#F5F5F5]/35">
          <Icon size={16} className="shrink-0" />
          <span className="flex-1">{label}</span>
          <Lock size={12} className="shrink-0" />
        </div>
      </ComingSoonTooltip>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center gap-2.5 px-2 py-1.5 text-[15px] text-left transition-colors duration-150 ${
          groupActive && !open
            ? "border-l-2 border-[#F0FF00] bg-[#F0FF00]/10 pl-[6px] text-[#F0FF00] font-medium"
            : "border-l-2 border-transparent text-[#F5F5F5]/65 hover:bg-[rgba(245,245,245,0.05)] hover:text-[#F5F5F5]"
        }`}
      >
        <Icon size={16} className="shrink-0" />
        <span className="flex-1">{label}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="ml-[18px] mt-0.5 mb-1 space-y-0.5 border-l border-[rgba(245,245,245,0.08)] pl-3">
          {sub.map((item) => {
            if (isComingSoon(item.href)) {
              return (
                <ComingSoonTooltip key={item.href}>
                  <div className="flex w-fit cursor-default items-center gap-1.5 py-1 text-[13px] text-[#F5F5F5]/30">
                    {item.label}
                    <Lock size={10} className="shrink-0" />
                  </div>
                </ComingSoonTooltip>
              );
            }
            const subActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block py-1 text-[13px] transition-colors duration-150 ${
                  subActive
                    ? "text-[#F0FF00] font-medium"
                    : "text-[#F5F5F5]/50 hover:text-[#F5F5F5]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 mt-4 px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/30 first:mt-0">
      {children}
    </p>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { enabledModules, preferencesReady } = usePreferencesData();
  const pathname = usePathname();

  const enabled = preferencesReady
    ? enabledModules
    : { live: false, phono: false, admin: false, marketing: false, edition: false, revenus: false };

  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    setCollapsed(stored === "true");
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      }
      return next;
    });
  };

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside
      className={`flex h-screen flex-col border-r border-[rgba(245,245,245,0.08)] bg-[#101010] transition-[width] duration-200 ${
        collapsed ? "w-16 px-2" : "w-64 px-3"
      } py-5 text-[#F5F5F5]`}
    >
      {/* Header */}
      <div
        className={`mb-6 flex items-center ${
          collapsed ? "justify-center" : "justify-between px-1"
        }`}
      >
        {!collapsed && (
          <Link href="/" className="mr-3 block flex-1">
            <SidekickLogo className="h-10 w-auto" />
          </Link>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
          className="flex h-7 w-7 shrink-0 items-center justify-center text-[#F5F5F5]/40 transition-colors hover:text-[#F5F5F5]"
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Nav */}
      {!collapsed && (
        <nav className="flex flex-1 flex-col overflow-y-auto">
          {/* ORGANISATION */}
          <SectionLabel>Organisation</SectionLabel>
          <div className="space-y-0.5">
            {groupOrganisation.map((item) => (
              <NavLink key={item.href} {...item} pathname={pathname} />
            ))}
          </div>

          {/* PROJETS — pivot central */}
          <Link
            href="/projects"
            className={`my-3 flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[15px] font-semibold transition-colors ${
              pathname.startsWith("/projects")
                ? "border-[#F0FF00]/40 bg-[#F0FF00]/10 text-[#F0FF00]"
                : "border-[#F0FF00]/20 bg-[#F0FF00]/5 text-[#F5F5F5] hover:bg-[#F0FF00]/10 hover:text-[#F0FF00]"
            }`}
          >
            <FolderKanban size={18} />
            Projets
          </Link>

          {/* ARTISTIQUE */}
          <SectionLabel>Artistique</SectionLabel>
          <div className="space-y-0.5">
            {groupMusique.map((item) => (
              <NavGroup
                key={item.key}
                label={item.label}
                icon={item.icon}
                moduleKey={item.key}
                href={item.href}
                sub={item.sub}
                enabled={!!enabled?.[item.key as keyof typeof enabled]}
                pathname={pathname}
                open={!!openGroups[item.key]}
                onToggle={() => toggleGroup(item.key)}
              />
            ))}
          </div>

          {/* BUSINESS */}
          <SectionLabel>Business</SectionLabel>
          <div className="space-y-0.5">
            {groupBusiness.map((item) => (
              <NavGroup
                key={item.key}
                label={item.label}
                icon={item.icon}
                moduleKey={item.key}
                href={item.href}
                sub={item.sub}
                enabled={!!enabled?.[item.key as keyof typeof enabled]}
                pathname={pathname}
                open={!!openGroups[item.key]}
                onToggle={() => toggleGroup(item.key)}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="mt-auto border-t border-[rgba(245,245,245,0.08)] pt-4 space-y-0.5">
            <Link
              href="/drive"
              className={`flex items-center gap-2.5 px-2 py-1.5 text-[15px] transition-colors duration-150 ${
                isActive(pathname, "/drive")
                  ? "border-l-2 border-[#F0FF00] bg-[#F0FF00]/10 pl-[6px] text-[#F0FF00] font-medium"
                  : "border-l-2 border-transparent text-[#F5F5F5]/65 hover:bg-[rgba(245,245,245,0.05)] hover:text-[#F5F5F5]"
              }`}
            >
              <FileText size={16} className="shrink-0" />
              Drive
            </Link>
            <Link
              href="/settings"
              className={`flex items-center gap-2.5 px-2 py-1.5 text-[15px] transition-colors duration-150 ${
                isActive(pathname, "/settings")
                  ? "border-l-2 border-[#F0FF00] bg-[#F0FF00]/10 pl-[6px] text-[#F0FF00] font-medium"
                  : "border-l-2 border-transparent text-[#F5F5F5]/65 hover:bg-[rgba(245,245,245,0.05)] hover:text-[#F5F5F5]"
              }`}
            >
              <Settings size={16} className="shrink-0" />
              Paramètres
            </Link>
          </div>
        </nav>
      )}
    </aside>
  );
}
