import * as React from "react";
import { cn } from "./utils";

type TextareaProps = React.ComponentProps<"textarea"> & {
  className?: string;
};

function Textarea({ className, ...rest }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none flex field-sizing-content min-h-16 w-full rounded-none border border-[rgba(245,245,245,0.12)] bg-[rgba(255,255,255,0.05)] px-3 py-2 text-sm text-[#F5F5F5] placeholder:text-[#F5F5F5]/40 transition-[border-color,box-shadow] duration-200 outline-none focus-visible:border-[#F0FF00]/40 focus-visible:ring-[3px] focus-visible:ring-[#F0FF00]/20 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...rest}
    />
  );
}

export { Textarea };
