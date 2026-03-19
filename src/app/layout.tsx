"use client";

import type { ReactNode } from "react";
import "../styles/globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#101010] text-[#F5F5F5] antialiased">
        {children}
      </body>
    </html>
  );
}
