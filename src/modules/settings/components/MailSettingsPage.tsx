"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePostHog } from "posthog-js/react";
import { isUsableRefreshToken } from "@/lib/mail-refresh-error";
import { SettingRow, SettingsHeader, SettingsSection } from "./SettingsUI";
import { authErrorMessage } from "@/lib/auth-errors";

type MailStatus = {
  gmail: string | null;
  outlook: string | null;
};

function loadStatus(meta: Record<string, unknown>): MailStatus {
  const mailFrom = meta.mail_from as string | null | undefined;
  const hasGmail = isUsableRefreshToken(meta.gmail_refresh_token);
  const hasOutlook = isUsableRefreshToken(meta.outlook_refresh_token);
  return {
    gmail: hasGmail ? (mailFrom && mailFrom.includes("gmail") ? mailFrom : "Gmail connecté") : null,
    outlook: hasOutlook ? (mailFrom && (mailFrom.includes("outlook") || mailFrom.includes("hotmail")) ? mailFrom : "Outlook connecté") : null
  };
}

export function MailSettingsPage() {
  const [status, setStatus] = useState<MailStatus>({ gmail: null, outlook: null });
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<"gmail" | "outlook" | null>(null);
  const searchParams = useSearchParams();
  const posthog = usePostHog();
  const capturedRef = useRef(false);

  const refreshStatus = useCallback(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (!user) return;
        setStatus(loadStatus((user.user_metadata ?? {}) as Record<string, unknown>));
      })
      .catch(() => setStatus({ gmail: null, outlook: null }));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (!user) {
          setLoading(false);
          return;
        }
        setStatus(loadStatus((user.user_metadata ?? {}) as Record<string, unknown>));
      })
      .catch(() => setStatus({ gmail: null, outlook: null }))
      .finally(() => setLoading(false));
  }, []);

  const handleDisconnect = async (provider: "gmail" | "outlook") => {
    setDisconnecting(provider);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const updateData: Record<string, string | null> = {};
      if (provider === "gmail") {
        updateData.gmail_refresh_token = null;
      } else {
        updateData.outlook_refresh_token = null;
      }
      const mailFrom = meta.mail_from as string | undefined;
      const isGmail = mailFrom?.includes("gmail");
      const isOutlook = mailFrom?.includes("outlook") || mailFrom?.includes("hotmail");
      if ((provider === "gmail" && isGmail) || (provider === "outlook" && isOutlook)) {
        updateData.mail_from = null;
        updateData.mail_provider = null;
      }
      const { error } = await supabase.auth.updateUser({ data: updateData });
      if (error) throw error;
      // Le jeton en table part aussi. Table encore absente en production :
      // l'erreur est ignorée, les métadonnées ci-dessus suffisent à déconnecter.
      await supabase.from("user_mail_connections").delete().eq("user_id", user.id).eq("provider", provider);
      toast.success(provider === "gmail" ? "Gmail déconnecté." : "Outlook déconnecté.");
      refreshStatus();
    } catch (err) {
      toast.error(authErrorMessage(err, "Erreur lors de la déconnexion."));
    } finally {
      setDisconnecting(null);
    }
  };

  const urlStatus = searchParams.get("status");
  const urlError = searchParams.get("error");

  // Retour d'OAuth : un toast une seule fois, et l'événement analytique avec.
  useEffect(() => {
    if (capturedRef.current) return;
    if (urlStatus === "google_connected") {
      posthog?.capture("gmail_connected", { module: "settings" });
      toast.success("Gmail connecté.");
      capturedRef.current = true;
    } else if (urlStatus === "outlook_connected") {
      posthog?.capture("outlook_connected", { module: "settings" });
      toast.success("Outlook connecté.");
      capturedRef.current = true;
    } else if (urlError) {
      toast.error(`Connexion impossible : ${urlError.replace(/_/g, " ")}`);
      capturedRef.current = true;
    }
  }, [urlStatus, urlError, posthog]);

  const disconnectButton = (provider: "gmail" | "outlook") => (
    <Button
      size="sm"
      variant="ghost"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={() => handleDisconnect(provider)}
      disabled={disconnecting !== null}
    >
      {disconnecting === provider ? <Loader2 className="h-4 w-4 animate-spin" /> : "Déconnecter"}
    </Button>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <SettingsHeader
        title="Intégrations"
        description="Les services extérieurs reliés à ton compte."
      />

      <SettingsSection
        title="Messagerie"
        description="Tes invitations aux liens d’écoute partent depuis ta propre adresse : tes contacts reçoivent un email de toi, pas de SIDEKICK."
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (
          <>
            <SettingRow
              label="Gmail"
              description={
                status.gmail ??
                "Gratuit : 500 envois par jour. Google Workspace : 2 000 par jour."
              }
              control={
                status.gmail ? (
                  disconnectButton("gmail")
                ) : (
                  <Button size="sm" variant="outline" asChild>
                    <a href="/api/mail/oauth/google/start">Connecter Gmail</a>
                  </Button>
                )
              }
            />
            {/* Outlook n'est pas ouvert pour l'alpha : la ligne ne reste que
                pour un compte qui l'aurait déjà connecté, afin qu'il puisse
                le déconnecter. */}
            {status.outlook && (
              <SettingRow label="Outlook" description={status.outlook} control={disconnectButton("outlook")} />
            )}
          </>
        )}
      </SettingsSection>
    </div>
  );
}
