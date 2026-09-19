"use client";

import { Headphones } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/page-loader";
import { useListeningData } from "@/hooks/useListeningData";
import { ListeningLinkComposer } from "./ListeningLinkComposer";

export function ListeningLinkEditorPage({ linkId }: { linkId?: string }) {
  const { links, isLoading } = useListeningData();
  if (isLoading) return <PageLoader />;

  const link = linkId ? links.find((candidate) => candidate.id === linkId) : null;
  if (linkId && !link) {
    return (
      <EmptyState
        icon={Headphones}
        title="Lien introuvable"
        description="Ce lien a peut-être été supprimé ou n'est plus accessible."
        action={{ label: "Retour aux liens", onClick: () => window.location.assign("/phono/liens-ecoute") }}
      />
    );
  }

  return <ListeningLinkComposer link={link ?? null} />;
}
