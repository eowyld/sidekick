import { redirect } from "next/navigation";

// Fusionnée dans Personnalisation le 22/09.
export default function SettingsInvoiceTemplateRoute() {
  redirect("/settings/personnalisation?doc=factures");
}
