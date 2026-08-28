import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  clickable?: boolean;
};

export function Card({ className, clickable, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-none border border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] text-[#F5F5F5] shadow-xl backdrop-blur-xl transition-[border-color,transform,box-shadow] duration-200",
        clickable && "cursor-pointer hover:border-t-[#F0FF00]/60 hover:border-t hover:-translate-y-px hover:shadow-2xl hover:bg-[rgba(44,44,46,0.82)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 px-6 py-4", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-semibold leading-none tracking-normal", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-[#F5F5F5]/60", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-4 text-sm", className)} {...props} />
  );
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center px-6 py-4 border-t border-[rgba(245,245,245,0.08)]", className)}
      {...props}
    />
  );
}
