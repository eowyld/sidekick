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

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Connexion</Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/inscription">Inscription</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/dashboard">Accéder au dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
