"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle, AlertCircle, Loader2, Lightbulb } from "lucide-react";

type MailStatus = {
  gmail: string | null;
  outlook: string | null;
};

function loadStatus(meta: Record<string, unknown>): MailStatus {
  const mailFrom = meta.mail_from as string | null | undefined;
  const hasGmail = !!(meta.gmail_refresh_token as string | undefined);
  const hasOutlook = !!(meta.outlook_refresh_token as string | undefined);
  return {
    gmail: hasGmail ? (mailFrom && mailFrom.includes("gmail") ? mailFrom : "Gmail connecté") : null,
    outlook: hasOutlook ? (mailFrom && (mailFrom.includes("outlook") || mailFrom.includes("hotmail")) ? mailFrom : "Outlook connecté") : null
  };
}

export function MailSettingsPage() {
  const [status, setStatus] = useState<MailStatus>({ gmail: null, outlook: null });
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<"gmail" | "outlook" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const searchParams = useSearchParams();

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
    setMessage(null);
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
      setMessage({ type: "success", text: provider === "gmail" ? "Gmail déconnecté." : "Outlook déconnecté." });
      refreshStatus();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erreur lors de la déconnexion."
      });
    } finally {
      setDisconnecting(null);
    }
  };

  const urlStatus = searchParams.get("status");
  const urlError = searchParams.get("error");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">
          Configuration mail
        </h1>
        <p className="text-sm text-muted-foreground">
          Adresses utilisées pour l&apos;envoi des campagnes (Gmail, Outlook).
        </p>
      </div>

      {urlStatus === "google_connected" && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Gmail connecté avec succès.
        </div>
      )}
      {urlStatus === "outlook_connected" && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Outlook connecté avec succès.
        </div>
      )}
      {urlError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Erreur : {urlError.replace(/_/g, " ")}
        </div>
      )}
      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-medium">
          <Mail className="h-4 w-4" />
          Adresses connectées
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Gmail</span>
              {status.gmail ? (
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">{status.gmail}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDisconnect("gmail")}
                    disabled={disconnecting !== null}
                  >
                    {disconnecting === "gmail" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Déconnecter"
                    )}
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" asChild>
                  <a href="/api/mail/oauth/google/start">Connecter Gmail</a>
                </Button>
              )}
            </li>
            <li className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Outlook</span>
              {status.outlook ? (
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">{status.outlook}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDisconnect("outlook")}
                    disabled={disconnecting !== null}
                  >
                    {disconnecting === "outlook" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Déconnecter"
                    )}
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" asChild>
                  <a href="/api/mail/oauth/outlook/start">Connecter Outlook</a>
                </Button>
              )}
            </li>
          </ul>
        )}
        {!loading && !status.gmail && !status.outlook && (
          <p className="mt-3 text-xs text-muted-foreground">
            Aucune adresse connectée. Connecte au moins une adresse pour envoyer des campagnes.
          </p>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-50 via-background to-background px-3.5 py-2.5 shadow-sm dark:from-amber-500/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.2),transparent_45%)]" />
        <div className="relative flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-amber-100 p-1.5 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Gmail gratuit: 500 e-mails (ou destinataires) par jour. Google Workspace: 2&nbsp;000 messages/jour.
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Outlook gratuit: environ 300 e-mails/jour. Microsoft 365: 5&nbsp;000 messages/jour.*
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
