"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Props = {
  module: string;
  label: string;
};

export function BlogInternalLink({ module, label }: Props) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setConnected(!!data.session);
    });
  }, []);

  return (
    <span className="inline-flex">
      {connected ? (
        <Link
          href={`/${module}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] border border-[#F0FF00]/50 text-[#F0FF00] text-sm font-medium hover:bg-[#F0FF00]/10 transition-colors"
        >
          {label} dans SIDEKICK →
        </Link>
      ) : (
        <Link
          href="/register"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] border border-white/20 text-white/70 text-sm font-medium hover:border-[#F0FF00]/50 hover:text-[#F0FF00] transition-colors"
        >
          Créer mon compte pour accéder →
        </Link>
      )}
    </span>
  );
}
