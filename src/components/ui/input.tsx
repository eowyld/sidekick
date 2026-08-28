import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-none border border-[rgba(245,245,245,0.12)] bg-[rgba(255,255,255,0.05)] px-3 py-1 text-sm text-[#F5F5F5] shadow-sm transition-[border-color,box-shadow] duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#F5F5F5] placeholder:text-[#F5F5F5]/40 focus-visible:outline-none focus-visible:border-[#F0FF00]/40 focus-visible:ring-[3px] focus-visible:ring-[#F0FF00]/20 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}
