import type { Metadata } from "next";
import { AgreementClient } from "./AgreementClient";

// Un accord de répartition est privé : rien à faire dans un moteur de recherche.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Répartition d'une œuvre",
};

export default async function AgreementPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AgreementClient token={token} />;
}
