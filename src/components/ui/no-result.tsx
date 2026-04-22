import { SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NoResultProps {
  query?: string;
  hasFilters?: boolean;
  onReset?: () => void;
  className?: string;
}

function buildMessage(query?: string, hasFilters?: boolean): string {
  if (query && hasFilters) return `Aucun résultat pour « ${query} » avec ces filtres.`;
  if (query) return `Aucun résultat pour « ${query} ».`;
  if (hasFilters) return "Aucun résultat avec ces filtres.";
  return "Aucun résultat.";
}

export function NoResult({ query, hasFilters, onReset, className }: NoResultProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-center",
        className
      )}
    >
      <SearchX size={32} style={{ color: "rgba(245,245,245,0.4)" }} />
      <p className="text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
        {buildMessage(query, hasFilters)}
      </p>
      {onReset && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          Réinitialiser les filtres
        </Button>
      )}
    </div>
  );
}
