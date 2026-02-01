import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-6">
        <div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            Sidekick pour artistes indépendants
          </h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Centralise ton admin, édition, phono, live, tâches, contacts,
            calendrier, revenus et marketing dans un seul espace de travail.
          </p>
        </div>

        <Button asChild size="lg">
          <Link href="/dashboard">Accéder au dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
