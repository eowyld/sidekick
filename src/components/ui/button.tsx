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
    "bg-[#F0FF00] text-[#0d0d0d] font-semibold hover:bg-[#F0FF00]/90 hover:shadow-[0_0_20px_rgba(240,255,0,0.45)] disabled:bg-[#F0FF00]/40 disabled:shadow-none",
  secondary:
    "bg-transparent border border-[#F0FF00]/40 text-[#F5F5F5] hover:border-[#F0FF00]/70 hover:bg-[#F0FF00]/5 disabled:border-[rgba(245,245,245,0.12)] disabled:text-[#F5F5F5]/40",
  outline:
    "border border-[rgba(245,245,245,0.2)] bg-transparent text-[#F5F5F5] hover:border-[rgba(245,245,245,0.4)] hover:bg-[rgba(245,245,245,0.05)]",
  ghost: "text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.07)] hover:text-[#F5F5F5]",
  destructive:
    "bg-rose-600 text-white hover:bg-rose-500 hover:shadow-[0_0_16px_rgba(244,63,94,0.35)]",
  link: "text-[#F0FF00] underline-offset-4 hover:underline"
};

const sizeClasses: Record<Size, string> = {
  xs: "h-7 px-2.5 text-xs",
  sm: "h-8 px-3.5 text-xs",
  md: "h-9 px-5 text-sm",
  lg: "h-11 px-6 text-sm",
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
        "inline-flex items-center justify-center whitespace-nowrap rounded-none font-medium ring-offset-[#101010] transition-[color,background-color,border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0FF00]/70 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}
