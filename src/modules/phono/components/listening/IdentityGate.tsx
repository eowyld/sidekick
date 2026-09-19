"use client";

import { useState } from "react";
import { Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface IdentityGateProps {
  title: string;
  artistName: string;
  prefilledName: string;
  onSubmit: (visitorName: string | null) => void;
}

/**
 * Le champ est pré-rempli quand le lien vient d'un envoi mail. Le passage sans
 * identification est un vrai bouton lisible, jamais un lien caché : cette porte
 * ne doit jamais bloquer l'accès à la musique.
 */
export function IdentityGate({
  title,
  artistName,
  prefilledName,
  onSubmit,
}: IdentityGateProps) {
  const [name, setName] = useState(prefilledName);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_50%_0%,rgba(240,255,0,0.09),transparent_36%),#101010] p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.09] bg-[rgba(44,44,46,0.55)] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-full border border-[#F0FF00]/25 bg-[#F0FF00]/10"><Headphones className="h-5 w-5 text-[#F0FF00]" /></div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#F0FF00]">Invitation de {artistName}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{title || "Écoute privée"}</h1>
        <p className="mb-5 mt-2 text-sm text-[#F5F5F5]/50">Identifie-toi pour que l&apos;artiste sache que tu as reçu son écoute.</p>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Votre nom ou votre structure"
          aria-label="Votre nom ou votre structure"
          autoFocus
        />
        <p className="mt-3 text-xs leading-relaxed text-[#F5F5F5]/40">
          Votre nom permet à l&apos;artiste de savoir qui a écouté. L&apos;écoute
          des titres est mesurée dans tous les cas, de façon anonyme si vous ne
          vous identifiez pas.{" "}
          <a
            href="/confidentialite#ecoute"
            target="_blank"
            rel="noopener"
            className="underline underline-offset-2"
          >
            En savoir plus
          </a>
        </p>
        <Button className="mt-5 w-full"
          onClick={() => onSubmit(name.trim().length > 0 ? name.trim() : null)}
        >
          Accéder à l&apos;écoute
        </Button>
        <Button variant="ghost" className="mt-2 w-full text-[#F5F5F5]/50" onClick={() => onSubmit(null)}>
          Écouter sans m&apos;identifier
        </Button>
      </div>
    </main>
  );
}
