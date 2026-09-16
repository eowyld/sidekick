import type { Metadata } from "next";
import { ListeningRoomClient } from "./ListeningRoomClient";

// Une page d'écoute privée n'a rien à faire dans un moteur de recherche.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Écoute privée",
};

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ i?: string }>;
};

export default async function ListeningRoomPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { i } = await searchParams;
  return <ListeningRoomClient slug={slug} inviteId={i ?? null} />;
}
