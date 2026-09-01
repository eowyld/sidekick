"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { ModuleGuard } from "@/components/layout/ModuleGuard";
import { DesktopOnlyGuard } from "@/components/layout/DesktopOnlyGuard";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SettingsSidebar } from "@/components/layout/SettingsSidebar";
import { GlobalErrorBoundary } from "@/components/analytics/GlobalErrorBoundary";
import { FeedbackButton } from "@/components/analytics/FeedbackButton";

function AppLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isSettings = pathname.startsWith("/settings");

  return (
    <GlobalErrorBoundary>
      <div className="flex min-h-screen bg-background text-foreground">
        {isSettings ? <SettingsSidebar /> : <Sidebar />}
        <div className="flex flex-1 flex-col bg-background">
          <Header />
          <main className="flex-1 bg-background p-6">
            <ModuleGuard>{children}</ModuleGuard>
          </main>
        </div>
        <Toaster richColors theme="dark" />
        <FeedbackButton />
      </div>
    </GlobalErrorBoundary>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <DesktopOnlyGuard>
        <AppLayoutInner>{children}</AppLayoutInner>
      </DesktopOnlyGuard>
    </AuthGuard>
  );
}
