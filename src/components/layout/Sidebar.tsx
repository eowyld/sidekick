"use client";

import { useState } from "react";
import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/calendar", label: "Calendrier" },
  { href: "/tasks", label: "Tâches" },
  { href: "/contacts", label: "Contacts" },
  { href: "/phono", label: "Phono" },
  { href: "/edition", label: "Edition" },
  { href: "/marketing", label: "Marketing" },
  { href: "/incomes", label: "Revenus" },
  { href: "/admin", label: "Admin" }
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

export function Sidebar() {
  const [liveOpen, setLiveOpen] = useState(false);
  const [incomesOpen, setIncomesOpen] = useState(false);
  const [phonoOpen, setPhonoOpen] = useState(false);

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card px-4 py-6">
      <div className="mb-6 text-xl font-semibold tracking-tight">Sidekick</div>
      <nav className="space-y-1 text-sm text-muted-foreground">
        {/* Liens avant Live */}
        {navItems
          .filter((item) => beforeLive.includes(item.href))
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-2 py-1.5 hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}

        {/* Live avec sous-menu */}
        <button
          type="button"
          onClick={() => setLiveOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-accent hover:text-accent-foreground"
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
                className="block rounded-md px-2 py-1 hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}

        {/* Phono avec sous-menu */}
        <button
          type="button"
          onClick={() => setPhonoOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-accent hover:text-accent-foreground"
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
                className="block rounded-md px-2 py-1 hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}

        {/* Liens entre Phono et Revenus */}
        {navItems
          .filter(
            (item) =>
              !beforeLive.includes(item.href) &&
              item.href !== "/incomes" &&
              item.href !== "/phono"
          )
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-2 py-1.5 hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}

        {/* Revenus avec sous-menu */}
        <button
          type="button"
          onClick={() => setIncomesOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-accent hover:text-accent-foreground"
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
                className="block rounded-md px-2 py-1 hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </aside>
  );
}

