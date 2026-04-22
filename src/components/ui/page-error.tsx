import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageErrorProps {
  title: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function PageError({ title, description, onRetry, className }: PageErrorProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center flex-1 gap-4 py-24 text-center", className)}>
      <AlertCircle size={48} style={{ color: "rgba(245,245,245,0.4)" }} />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium" style={{ color: "rgba(245,245,245,0.9)" }}>
          {title}
        </p>
        {description && (
          <p className="text-sm" style={{ color: "rgba(245,245,245,0.5)" }}>
            {description}
          </p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}
