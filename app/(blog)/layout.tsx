"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { DM_Sans } from "next/font/google";
import type { ReactNode } from "react";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

export default function BlogLayout({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setConnected(!!data.session);
      setLoaded(true);
    });
  }, []);

  return (
    <div className={`min-h-screen bg-[#101010] text-[#f5f5f5] ${dmSans.variable}`}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#101010]/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg tracking-wider text-white hover:text-[#F0FF00] transition-colors" style={{ fontStretch: "125%", letterSpacing: "-0.015em" }}>
            SIDEKICK
          </Link>

          <nav className="flex items-center gap-6">
            <Link href="/blog" className="text-sm text-white/60 hover:text-white transition-colors">
              Blog
            </Link>
            <Link href="/blog/categorie/edition" className="hidden sm:block text-sm text-white/60 hover:text-white transition-colors">
              Édition
            </Link>
            <Link href="/blog/categorie/phono" className="hidden sm:block text-sm text-white/60 hover:text-white transition-colors">
              Phono
            </Link>
            <Link href="/blog/categorie/live" className="hidden sm:block text-sm text-white/60 hover:text-white transition-colors">
              Live
            </Link>
          </nav>

          {loaded && (
            <div>
              {connected ? (
                <Link
                  href="/dashboard"
                  className="text-sm px-3 py-1.5 rounded-[2px] border border-white/20 text-white/70 hover:border-[#F0FF00]/50 hover:text-[#F0FF00] transition-colors"
                >
                  Retour à l'app
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="text-sm px-3 py-1.5 rounded-[2px] bg-[#F0FF00] text-[#101010] font-semibold hover:shadow-[0_0_12px_rgba(240,255,0,0.4)] transition-shadow"
                >
                  Créer un compte
                </Link>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Contenu */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/10 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between gap-6">
          <div>
            <p className="font-bold text-white" style={{ fontStretch: "125%", letterSpacing: "-0.015em" }}>
              SIDEKICK
            </p>
            <p className="text-sm text-white/40 mt-1">
              L'outil tout-en-un pour les artistes indépendants.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-white/50">
            <Link href="/blog" className="hover:text-white/80 transition-colors">Blog</Link>
            <Link href="/blog/categorie/phono" className="hover:text-white/80 transition-colors">Phonographie</Link>
            <Link href="/blog/categorie/edition" className="hover:text-white/80 transition-colors">Édition</Link>
            <Link href="/blog/categorie/live" className="hover:text-white/80 transition-colors">Live</Link>
            <Link href="/blog/categorie/revenus" className="hover:text-white/80 transition-colors">Revenus</Link>
            <Link href="/blog/categorie/admin" className="hover:text-white/80 transition-colors">Admin</Link>
            <Link href="/blog/categorie/marketing" className="hover:text-white/80 transition-colors">Marketing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
