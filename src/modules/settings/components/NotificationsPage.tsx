"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePostHog } from "posthog-js/react";
import { Switch } from "@/components/ui/switch";
import { createClient, getSessionUser } from "@/lib/supabase";
import { usePreferencesData } from "@/hooks/usePreferencesData";
import { SettingRow, SettingsHeader, SettingsSection } from "./SettingsUI";

export function NotificationsPage() {
  const { remindersEnabled, setRemindersEnabled } = usePreferencesData();
  const posthog = usePostHog();
  const [email, setEmail] = useState("");

  useEffect(() => {
    getSessionUser(createClient())
      .then(({ data: { user } }) => setEmail(user?.email ?? ""))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-3xl space-y-6">
      <SettingsHeader
        title="Notifications"
        description={
          <>
            Les emails que SIDEKICK t&apos;envoie{email ? <> sur {email}</> : null}. Les emails liés
            à ton compte (confirmation, mot de passe) partent toujours.
          </>
        }
      />

      <SettingsSection title="Par email">
        <SettingRow
          htmlFor="reminders"
          label="Rappels de démarches"
          description={
            <>
              Un récapitulatif quand des démarches administratives arrivent à échéance. Un seul
              message par jour, jamais un par démarche. Tes démarches restent visibles dans{" "}
              <Link href="/admin/demarches" className="text-[#F0FF00] underline-offset-2 hover:underline">
                Admin
              </Link>{" "}
              même sans les emails.
            </>
          }
          control={
            <Switch
              id="reminders"
              checked={remindersEnabled}
              onCheckedChange={(checked) => {
                setRemindersEnabled(checked);
                posthog?.capture("reminders_toggled", { enabled: checked });
              }}
            />
          }
        />
      </SettingsSection>
    </div>
  );
}
