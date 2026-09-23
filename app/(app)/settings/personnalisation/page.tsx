import { Suspense } from "react";
import { PersonalizationPage } from "@/modules/settings/components/PersonalizationPage";

// Rubrique « Personnalisation » depuis le 22/09 (factures + fiche technique).
// L'adresse redirigeait jusque-là vers Modules, pour d'anciens mails de rappel
// que seul le compte du fondateur a reçus.
export default function SettingsPersonalizationRoute() {
  return (
    <Suspense>
      <PersonalizationPage />
    </Suspense>
  );
}
