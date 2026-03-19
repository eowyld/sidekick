"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SettingsSidebar } from "@/components/layout/SettingsSidebar";

function AppLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isSettings = pathname.startsWith("/settings");

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {isSettings ? <SettingsSidebar /> : <Sidebar />}
      <div className="flex flex-1 flex-col bg-background">
        <Header />
        <main className="flex-1 bg-background p-6">{children}</main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AppLayoutInner>{children}</AppLayoutInner>
    </AuthGuard>
  );
}

