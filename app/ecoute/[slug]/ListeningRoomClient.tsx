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

  // Seules les transitions décidées par le visiteur sont en état local.
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [identified, setIdentified] = useState(false);

  async function startSession(visitorName: string | null) {
    try {
      const res = await fetch(`/api/listening/${slug}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorName, inviteId }),
      });
      if (res.ok) {
        const { sessionId: id } = (await res.json()) as { sessionId: string };
        setSessionId(id);
      }
    } catch {
      // Une session non créée ne doit jamais empêcher d'écouter : la mesure
      // est secondaire par rapport à l'écoute elle-même.
    }
    setIdentified(true);
  }

  if (isLoading || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p style={{ color: "rgba(245,245,245,0.7)" }}>Chargement…</p>
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
      <main className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-xl font-medium">
            Ce lien d&apos;écoute n&apos;est plus actif.
          </h1>
          <p className="mt-2 text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
            Contactez l&apos;artiste pour en obtenir un nouveau.
          </p>
        </div>
      </main>
    );
  }

  if (!identified) {
    return (
      <IdentityGate
        title={data.link.title}
        artistName={data.link.artistName}
        prefilledName={data.inviteName ?? ""}
        onSubmit={(name) => void startSession(name)}
      />
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <ListeningPlayer link={data.link} sessionId={sessionId} />
    </main>
  );
}
