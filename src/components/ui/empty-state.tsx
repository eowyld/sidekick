// src/components/ui/empty-state.tsx
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center flex-1 gap-4 py-24 text-center",
        className
      )}
    >
      <Icon size={48} style={{ color: "rgba(245,245,245,0.4)" }} />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium" style={{ color: "rgba(245,245,245,0.9)" }}>
          {title}
        </p>
        <p
          className="text-sm max-w-md"
          style={{ color: "rgba(245,245,245,0.7)" }}
        >
          {description}
        </p>
      </div>
      {action && (
        <Button variant="default" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {secondaryAction && (
        <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>
          {secondaryAction.label}
        </Button>
      )}
    </div>
  );
}
