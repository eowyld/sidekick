"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn, focusRing } from "@/lib/utils";

interface TrackSectionProps {
  title: string;
  /** Une ligne qui dit à quoi sert le bloc. C'est elle qui manquait. */
  description: string;
  /**
   * Ouvre le bloc au montage. On ne replie jamais une donnée déjà saisie :
   * l'artiste la chercherait sans savoir qu'elle est là.
   */
  defaultOpen: boolean;
  children: React.ReactNode;
}

export function TrackSection({
  title,
  description,
  defaultOpen,
  children,
}: TrackSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-start justify-between gap-4 rounded-xl p-5 text-left transition-colors hover:bg-[rgba(245,245,245,0.03)]",
          focusRing
        )}
      >
        <span>
          <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F0FF00]">
            {title}
          </span>
          <span className="mt-1 block text-xs text-[#F5F5F5]/55">
            {description}
          </span>
        </span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn(
            "mt-0.5 shrink-0 text-[#F5F5F5]/45 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && <div className="space-y-4 px-5 pb-5">{children}</div>}
    </section>
  );
}
