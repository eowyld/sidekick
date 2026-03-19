import type { ButtonHTMLAttributes, DetailedHTMLProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";
type Size = "xs" | "sm" | "md" | "lg" | "icon";

type ButtonProps = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  variant?: Variant;
  size?: Size;
  /** Quand true, rend l'enfant (ex. Link) avec les styles du bouton au lieu d'un <button>. */
  asChild?: boolean;
};

const variantClasses: Record<Variant, string> = {
  default:
    "bg-[#F0FF00] text-[#101010] hover:bg-[#F0FF00]/90 disabled:bg-[#F0FF00]/55",
  secondary:
    "bg-[rgba(245,245,245,0.12)] text-[#F5F5F5] hover:bg-[rgba(245,245,245,0.18)] disabled:bg-[rgba(245,245,245,0.08)]",
  outline:
    "border border-[rgba(245,245,245,0.28)] bg-transparent text-[#F5F5F5] hover:bg-[rgba(245,245,245,0.08)]",
  ghost: "text-[#F5F5F5]/82 hover:bg-[rgba(245,245,245,0.08)] hover:text-[#F5F5F5]",
  destructive:
    "bg-rose-600 text-white hover:bg-rose-500",
  link: "text-[#F0FF00] underline-offset-4 hover:underline"
};

const sizeClasses: Record<Size, string> = {
  xs: "h-7 px-2 text-xs",
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-10 px-5 text-sm",
  icon: "h-9 w-9 p-0"
};

export function Button({
  className,
  variant = "default",
  size = "md",
  type = "button",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      type={asChild ? undefined : type}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium ring-offset-[#101010] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0FF00]/70 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}

