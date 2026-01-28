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

const beforeLive = ["/dashboard", "/calendar", "/tasks"];

const liveSubItems = [
  { href: "/live", label: "Vue d'ensemble" },
  { href: "/live/dates-de-tournee", label: "Dates de tournées" },
  { href: "/live/repetitions", label: "Répétitions" },
  { href: "/live/prospection", label: "Prospection" },
  { href: "/live/materiel", label: "Matériel" }
];

export function Sidebar() {
  const [liveOpen, setLiveOpen] = useState(false);

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

        {/* Liens après Live */}
        {navItems
          .filter((item) => !beforeLive.includes(item.href))
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-2 py-1.5 hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
      </nav>
    </aside>
  );
}

