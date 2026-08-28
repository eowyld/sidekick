import * as React from "react";
import { cn } from "./utils";

type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "production"
  | "mixed"
  | "mastered"
  | "published"
  | "pending"
  | "paid";

const variantClasses: Record<BadgeVariant, string> = {
  default:
    "bg-[rgba(245,245,245,0.1)] border-[rgba(245,245,245,0.15)] text-[#F5F5F5]",
  secondary:
    "bg-[rgba(245,245,245,0.06)] border-[rgba(245,245,245,0.1)] text-[#F5F5F5]/60",
  outline:
    "bg-transparent border-[rgba(245,245,245,0.2)] text-[#F5F5F5]/70",
  destructive:
    "bg-rose-950/70 border-rose-800/50 text-rose-300",
  production:
    "bg-amber-950/70 border-amber-700/40 text-amber-300",
  mixed:
    "bg-blue-950/70 border-blue-700/40 text-blue-300",
  mastered:
    "bg-purple-950/70 border-purple-700/40 text-purple-300",
  published:
    "bg-emerald-950/70 border-emerald-700/40 text-emerald-300",
  pending:
    "bg-orange-950/70 border-orange-700/40 text-orange-300",
  paid:
    "bg-emerald-950/70 border-emerald-700/40 text-emerald-300",
};

type BadgeProps = React.ComponentProps<"span"> & {
  variant?: BadgeVariant;
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 [&>svg]:pointer-events-none overflow-hidden",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
export type { BadgeVariant };
