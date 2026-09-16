"use client";

import { useState } from "react";
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
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <p
          className="text-sm uppercase tracking-wide"
          style={{ color: "rgba(245,245,245,0.7)" }}
        >
          {artistName}
        </p>
        <h1 className="text-xl font-medium">{title || "Écoute privée"}</h1>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Votre nom ou votre structure"
          autoFocus
        />
        <p
          className="text-xs leading-relaxed"
          style={{ color: "rgba(245,245,245,0.7)" }}
        >
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
        <Button
          className="w-full"
          onClick={() => onSubmit(name.trim().length > 0 ? name.trim() : null)}
        >
          Accéder à l&apos;écoute
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => onSubmit(null)}>
          Écouter sans m&apos;identifier
        </Button>
      </div>
    </main>
  );
}
