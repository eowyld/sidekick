import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function BlogContent({ children }: Props) {
  return (
    <div className="prose prose-invert max-w-none text-[rgba(245,245,245,0.8)]">
      {children}
    </div>
  );
}
