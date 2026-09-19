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
import { AudioPlayerBar } from "@/modules/phono/components/audio/AudioPlayerBar";
import { PhonoPlayerProvider } from "@/modules/phono/components/audio/PhonoPlayerProvider";
import { PhonoSortProvider } from "@/modules/phono/components/PhonoSortProvider";
import { DriveUploadProvider } from "@/modules/admin/components/DriveUploadProvider";

function AppLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isSettings = pathname.startsWith("/settings");

  return (
    <GlobalErrorBoundary>
      {/*
        Le lecteur vit dans le layout, pas dans la page Catalogue : monté sous
        `CatalogPage`, il était démonté à chaque navigation et la lecture
        s'arrêtait dès qu'on quittait la page. Ici il traverse les changements
        de route et reste disponible partout sur le site — un artiste peut
        réécouter ses masters en remplissant une fiche ailleurs.

        L'ordre d'imbrication compte : la file du lecteur suit l'ordre
        d'affichage des onglets du catalogue, donc le tri doit être disponible
        au-dessus de lui.
      */}
      <PhonoSortProvider>
        <PhonoPlayerProvider>
          {/*
            Même raison pour l'import de fichiers du Drive : la vignette de
            progression doit survivre à un changement de page.
          */}
          <DriveUploadProvider>
            <div className="flex min-h-screen bg-background text-foreground">
              {isSettings ? <SettingsSidebar /> : <Sidebar />}
              <div className="flex flex-1 flex-col bg-background">
                <Header />
                <main className="flex flex-1 flex-col bg-background p-6">
                  <div className="flex-1">
                    <ModuleGuard>{children}</ModuleGuard>
                  </div>
                  {/*
                    Dans le `<main>` : la barre est `sticky bottom-0 -mx-6` et
                    compte sur le padding de 24 px de ce conteneur pour retrouver
                    la largeur du contenu.
                  */}
                  <AudioPlayerBar />
                </main>
              </div>
              <Toaster richColors theme="dark" />
              <FeedbackButton />
            </div>
          </DriveUploadProvider>
        </PhonoPlayerProvider>
      </PhonoSortProvider>
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
