import type { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { SWRProvider } from "@/components/providers/SWRProvider";
import "../styles/globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-[#101010] text-[#F5F5F5] antialiased">
        <SWRProvider>
          <AuthProvider>{children}</AuthProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
