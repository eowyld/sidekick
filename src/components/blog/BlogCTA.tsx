"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Props = {
  module: string;
  moduleLabel: string;
  variant?: "mid" | "end";
};

export function BlogCTA({ module, moduleLabel, variant = "mid" }: Props) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setConnected(!!data.session);
    });
  }, []);

  if (variant === "mid") {
    return (
      <div className="my-8 rounded-[2px] border border-[#F0FF00]/30 bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">
            Tu gères {moduleLabel} ?
          </p>
          <p className="text-sm text-white/60 mt-0.5">
            SIDEKICK centralise tout ça pour toi.
          </p>
        </div>
        {connected ? (
          <Link
            href={`/${module}`}
            className="shrink-0 px-4 py-2 rounded-[2px] bg-[#F0FF00] text-[#101010] text-sm font-semibold hover:shadow-[0_0_12px_rgba(240,255,0,0.4)] transition-shadow"
          >
            Voir dans SIDEKICK →
          </Link>
        ) : (
          <Link
            href="/register"
            className="shrink-0 px-4 py-2 rounded-[2px] bg-[#F0FF00] text-[#101010] text-sm font-semibold hover:shadow-[0_0_12px_rgba(240,255,0,0.4)] transition-shadow"
          >
            Créer mon compte gratuit →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="mt-12 rounded-[2px] border border-[#F0FF00]/40 bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-8 flex flex-col items-center text-center gap-5">
      <p
        className="text-3xl text-white"
        style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.03em" }}
      >
        Gérer {moduleLabel} directement dans SIDEKICK
      </p>
      <p className="text-white/60 max-w-lg">
        SIDEKICK est l'outil tout-en-un pour les artistes indépendants français.
        Phono, édition, live, revenus, admin — tout au même endroit.
      </p>
      {connected ? (
        <Link
          href={`/${module}`}
          className="px-6 py-3 rounded-[2px] bg-[#F0FF00] text-[#101010] font-semibold hover:shadow-[0_0_20px_rgba(240,255,0,0.5)] transition-shadow"
        >
          Ouvrir le module {moduleLabel} →
        </Link>
      ) : (
        <Link
          href="/register"
          className="px-6 py-3 rounded-[2px] bg-[#F0FF00] text-[#101010] font-semibold hover:shadow-[0_0_20px_rgba(240,255,0,0.5)] transition-shadow"
        >
          Créer mon compte gratuit →
        </Link>
      )}
    </div>
  );
}
