import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-[rgba(245,245,245,0.2)] bg-[rgba(15,23,42,0.88)] px-3 py-1 text-sm text-[#F5F5F5] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#F5F5F5] placeholder:text-[#F5F5F5]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0FF00]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010] disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}

