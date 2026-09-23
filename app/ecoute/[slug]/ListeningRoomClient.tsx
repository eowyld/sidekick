"use client";

import { useState } from "react";
import useSWR from "swr";
import type { PublicListeningLink } from "@/lib/listening-types";
import { IdentityGate } from "@/modules/phono/components/listening/IdentityGate";
import { PasswordGate } from "@/modules/phono/components/listening/PasswordGate";
import { ListeningPlayer } from "@/modules/phono/components/listening/ListeningPlayer";

interface Props {
  slug: string;
  inviteId: string | null;
}

type LinkResponse = {
  state: "ok" | "gone" | "expired" | "locked";
  link?: PublicListeningLink;
  title?: string;
  inviteName?: string;
};

export function ListeningRoomClient({ slug, inviteId }: Props) {
  // SWR plutôt qu'un effet de chargement : le déverrouillage n'a qu'à
  // revalider la même clé pour que la tracklist apparaisse.
  const { data, isLoading, mutate } = useSWR<LinkResponse>(
    `/api/listening/${slug}${inviteId ? `?i=${encodeURIComponent(inviteId)}` : ""}`,
    async (url: string) => {
      const res = await fetch(url);
      return (await res.json()) as LinkResponse;
    },
    { revalidateOnFocus: false }
  );

  /**
   * Identité retenue pour la mesure d'écoute.
   *
   * Lien nominatif : le nom est déjà connu, c'est tout l'intérêt de l'envoi
   * personnalisé — on ouvre directement l'écoute, attribuée à ce nom, sans
   * redemander au destinataire de le retaper. Sinon, c'est la porte
   * d'identification qui le fournit (ou `null` s'il la passe anonymement).
   */
  const [declared, setDeclared] = useState<{ name: string | null } | null>(null);
  const identity = data?.inviteName ? { name: data.inviteName } : declared;

  // La session passe par SWR plutôt que par un effet : c'est un appel au
  // serveur déclenché par l'identité retenue, pas une synchronisation d'état.
  // L'écoute n'attend pas sa réponse — une session absente rend la mesure
  // anonyme, elle n'empêche jamais d'écouter.
  const { data: sessionId = null } = useSWR<string | null>(
    identity && data?.state === "ok"
      ? ["listening-session", slug, inviteId, identity.name]
      : null,
    async () => {
      try {
        const res = await fetch(`/api/listening/${slug}/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorName: identity?.name ?? null, inviteId }),
        });
        if (!res.ok) return null;
        return ((await res.json()) as { sessionId: string }).sessionId;
      } catch {
        return null;
      }
    },
    { revalidateOnFocus: false, revalidateOnReconnect: false, shouldRetryOnError: false }
  );

  if (isLoading || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#101010] p-6">
        <div className="flex flex-col items-center gap-3"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F0FF00] border-t-transparent" /><p className="text-sm text-[#F5F5F5]/45">Préparation de l&apos;écoute…</p></div>
      </main>
    );
  }

  if (data.state === "locked") {
    return (
      <PasswordGate
        slug={slug}
        title={data.title ?? ""}
        onUnlocked={() => void mutate()}
      />
    );
  }

  // Un `state: "ok"` sans charge utile est une réponse incohérente : on la
  // traite comme un lien mort plutôt que d'afficher une page vide.
  if (data.state !== "ok" || !data.link) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_50%_0%,rgba(240,255,0,0.08),transparent_35%),#101010] p-6 text-center">
        <div className="max-w-sm rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#F0FF00]">Écoute privée</p>
          <h1 className="text-xl font-semibold">
            Ce lien d&apos;écoute n&apos;est plus actif.
          </h1>
          <p className="mt-2 text-sm text-[#F5F5F5]/50">
            Contactez l&apos;artiste pour en obtenir un nouveau.
          </p>
        </div>
      </main>
    );
  }

  if (!identity) {
    return (
      <IdentityGate
        title={data.link.title}
        artistName={data.link.artistName}
        onSubmit={(name) => setDeclared({ name })}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_-10%,rgba(240,255,0,0.06),transparent_32%),#101010] px-5 py-8 sm:px-8 sm:py-12">
      <ListeningPlayer link={data.link} sessionId={sessionId} />
    </main>
  );
}
