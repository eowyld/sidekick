"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "./utils";

type SwitchProps = React.ComponentPropsWithoutRef<
  typeof SwitchPrimitives.Root
> & {
  className?: string;
};

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0FF00]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010] disabled:cursor-not-allowed disabled:opacity-50",
      // État désactivé visible : sans piste ni bordure, l'interrupteur off disparaissait sur le fond sombre
      "data-[state=unchecked]:border-white/20 data-[state=unchecked]:bg-[rgba(245,245,245,0.14)] data-[state=unchecked]:hover:bg-[rgba(245,245,245,0.2)]",
      "data-[state=checked]:border-[#F0FF00] data-[state=checked]:bg-[#F0FF00]",
      className
    )}
    {...props}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-3.5 w-3.5 rounded-full shadow-md ring-0 transition-transform duration-200 ease-in-out",
        // Position
        "data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5",
        // Couleur du curseur selon l'état
        "data-[state=checked]:bg-[#101010] data-[state=unchecked]:bg-[rgba(245,245,245,0.8)]"
      )}
    />
  </SwitchPrimitives.Root>
));

Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };

