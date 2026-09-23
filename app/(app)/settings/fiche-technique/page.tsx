import { redirect } from "next/navigation";

// Fusionnée dans Personnalisation le 22/09.
export default function SettingsTechnicalTemplateRoute() {
  redirect("/settings/personnalisation?doc=fiche-technique");
}
