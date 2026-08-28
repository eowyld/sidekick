import Image from "next/image";
import { cn } from "@/lib/utils";

type SidekickLogoProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function SidekickLogo({
  className,
  imageClassName,
  priority = false,
}: SidekickLogoProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <Image
        src="/images/sidekick-logo-horizontal.png"
        alt="Logo Sidekick"
        width={1024}
        height={349}
        priority={priority}
        className={cn("h-auto w-full object-contain", imageClassName)}
      />
    </div>
  );
}
