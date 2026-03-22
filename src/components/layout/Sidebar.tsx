"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidekickData } from "@/hooks/useSidekickData";

const SIDEBAR_COLLAPSED_KEY = "sidekick-sidebar-collapsed";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/calendar", label: "Calendrier" },
  { href: "/tasks", label: "Tâches" },
  { href: "/contacts", label: "Contacts" },
  { href: "/phono", label: "Phono" },
  { href: "/edition", label: "Edition" },
  { href: "/marketing", label: "Marketing" },
  { href: "/incomes", label: "Revenus" }
];

const adminSubItems = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/statuts", label: "Mes statuts" },
  { href: "/admin/demarches", label: "Mes démarches" },
  { href: "/admin/contrats", label: "Mes contrats" }
];

const beforeLive = ["/dashboard", "/calendar", "/tasks", "/contacts"];

const liveSubItems = [
  { href: "/live", label: "Vue d'ensemble" },
  { href: "/live/representations", label: "Représentations" },
  { href: "/live/repetitions", label: "Répétitions" },
  { href: "/live/prospection", label: "Prospection" },
  { href: "/live/materiel", label: "Matériel" }
];

const incomesSubItems = [
  { href: "/incomes", label: "Vue d'ensemble" },
  { href: "/incomes/facturation", label: "Facturation" },
  { href: "/incomes/royalties", label: "Royalties" },
  { href: "/incomes/droits-auteur", label: "Droits d'auteur" },
  { href: "/incomes/droits-voisins", label: "Droits voisins" },
  { href: "/incomes/intermittence", label: "Intermittence" }
];

const phonoSubItems = [
  { href: "/phono", label: "Vue d'ensemble" },
  { href: "/phono/catalogue", label: "Catalogue" },
  { href: "/phono/sessions-studio", label: "Sessions Studio" }
];

const marketingSubItems = [
  { href: "/marketing", label: "Vue d'ensemble" },
  { href: "/marketing/publications", label: "Publications" },
  { href: "/marketing/mailing", label: "Mailing" },
  { href: "/marketing/presskit", label: "Presskit" }
];

export function Sidebar() {
  const { data, preferencesReady } = useSidekickData();
  const enabled = preferencesReady
    ? data.preferences?.enabledModules
    : {
        live: false,
        phono: false,
        admin: false,
        marketing: false,
        edition: false,
        revenus: false
      };
  const [collapsed, setCollapsed] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const [incomesOpen, setIncomesOpen] = useState(false);
  const [phonoOpen, setPhonoOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(false);

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

  return (
    <aside
      className={`flex h-screen flex-col border-r border-[rgba(245,245,245,0.12)] bg-[#101010] transition-[width] duration-200 ${
        collapsed ? "w-16 px-2" : "w-64 px-4"
      } py-6 text-[#F5F5F5] shadow-[inset_-1px_0_0_rgba(245,245,245,0.08)]`}
    >
      <div
        className={`mb-6 flex items-center gap-2 ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!collapsed && (
          <span className="text-xl font-semibold tracking-tight">Sidekick</span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleCollapsed}
          className="shrink-0"
          title={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>
      {!collapsed && (
      <nav className="flex flex-1 flex-col space-y-1 text-sm text-[#F5F5F5]/75">
        <div className="space-y-1">
        {navItems
          .filter((item) => beforeLive.includes(item.href))
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-2 py-1.5 hover:bg-[rgba(245,245,245,0.08)] hover:text-[#F5F5F5]"
            >
              {item.label}
            </Link>
          ))}

        {/* Live avec sous-menu */}
        {enabled.live && (
          <>
            <button
              type="button"
              onClick={() => setLiveOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-[rgba(245,245,245,0.08)] hover:text-[#F5F5F5]"
            >
              <span>Live</span>
              <span className="text-xs">{liveOpen ? "▾" : "▸"}</span>
            </button>
            {liveOpen && (
              <div className="mb-1 space-y-0.5 pl-4">
                {liveSubItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-md px-2 py-1 hover:bg-[rgba(245,245,245,0.08)] hover:text-[#F5F5F5]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Phono avec sous-menu */}
        {enabled.phono && (
          <>
            <button
              type="button"
              onClick={() => setPhonoOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-[rgba(245,245,245,0.08)] hover:text-[#F5F5F5]"
            >
              <span>Phono</span>
              <span className="text-xs">{phonoOpen ? "▾" : "▸"}</span>
            </button>
            {phonoOpen && (
              <div className="mb-1 space-y-0.5 pl-4">
                {phonoSubItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-md px-2 py-1 hover:bg-[rgba(245,245,245,0.08)] hover:text-[#F5F5F5]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Admin avec sous-menu */}
        {enabled.admin && (
          <>
            <button
              type="button"
              onClick={() => setAdminOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-[rgba(245,245,245,0.08)] hover:text-[#F5F5F5]"
            >
              <span>Admin</span>
              <span className="text-xs">{adminOpen ? "▾" : "▸"}</span>
            </button>
            {adminOpen && (
              <div className="mb-1 space-y-0.5 pl-4">
                {adminSubItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-md px-2 py-1 hover:bg-[rgba(245,245,245,0.08)] hover:text-[#F5F5F5]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Marketing avec sous-menu */}
        {enabled.marketing && (
          <>
            <button
              type="button"
              onClick={() => setMarketingOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-[rgba(245,245,245,0.08)] hover:text-[#F5F5F5]"
            >
              <span>Marketing</span>
              <span className="text-xs">{marketingOpen ? "▾" : "▸"}</span>
            </button>
            {marketingOpen && (
              <div className="mb-1 space-y-0.5 pl-4">
                {marketingSubItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-md px-2 py-1 hover:bg-[rgba(245,245,245,0.08)] hover:text-[#F5F5F5]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Liens entre Phono et Revenus (Edition) */}
        {navItems
          .filter(
            (item) =>
              !beforeLive.includes(item.href) &&
              item.href !== "/incomes" &&
              item.href !== "/phono" &&
              item.href !== "/marketing"
          )
          .filter((item) => !(item.href === "/phono" && !enabled.phono))
          .filter((item) => !(item.href === "/edition" && !enabled.edition))
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-2 py-1.5 hover:bg-[rgba(245,245,245,0.08)] hover:text-[#F5F5F5]"
            >
              {item.label}
            </Link>
          ))}

        {/* Revenus avec sous-menu */}
        {enabled.revenus && (
          <>
            <button
              type="button"
              onClick={() => setIncomesOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-[rgba(245,245,245,0.08)] hover:text-[#F5F5F5]"
            >
              <span>Revenus</span>
              <span className="text-xs">{incomesOpen ? "▾" : "▸"}</span>
            </button>
            {incomesOpen && (
              <div className="mb-1 space-y-0.5 pl-4">
                {incomesSubItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-md px-2 py-1 hover:bg-[rgba(245,245,245,0.08)] hover:text-[#F5F5F5]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
        </div>
        <div className="mt-auto border-t border-[rgba(245,245,245,0.12)] pt-4">
          <Link
            href="/admin/documents"
            className="block rounded-md px-2 py-1.5 hover:bg-[rgba(245,245,245,0.08)] hover:text-[#F5F5F5]"
          >
            Documents
          </Link>
        </div>
      </nav>
      )}
    </aside>
  );
}
