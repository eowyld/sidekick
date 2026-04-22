import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 text-center"
      style={{ backgroundColor: "#101010" }}
    >
      <p
        className="text-8xl font-bold tracking-tight"
        style={{ color: "rgba(245,245,245,0.15)" }}
      >
        404
      </p>
      <Compass size={64} style={{ color: "#F0FF00" }} />
      <div className="flex flex-col gap-2">
        <p className="text-lg font-medium" style={{ color: "rgba(245,245,245,0.9)" }}>
          Cette page n&apos;existe pas
        </p>
        <p className="text-sm" style={{ color: "rgba(245,245,245,0.5)" }}>
          Le lien que tu as suivi est invalide ou la page a été déplacée.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Retour au Dashboard</Link>
      </Button>
    </div>
  );
}
