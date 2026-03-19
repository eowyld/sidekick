import { redirect } from "next/navigation";

export default function CalendrierEditorialPage() {
  // Redirection permanente vers le nouveau chemin pour éviter les liens cassés.
  redirect("/marketing/publications");
}
