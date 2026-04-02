"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Link, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase";
import type { CalendarSector } from "./GlobalCalendarPage";

const ALL_SECTORS: { key: CalendarSector; label: string }[] = [
  { key: "live", label: "Live" },
  { key: "phono", label: "Phono" },
  { key: "admin", label: "Admin" },
  { key: "marketing", label: "Marketing" },
  { key: "edition", label: "Édition" },
  { key: "other", label: "Autre" },
];

type Props = {
  allEvents: Array<{
    id: string;
    dateKey: string;
    label: string;
    subLabel?: string;
    sector: CalendarSector;
    type: string;
    time?: string;
    place?: string;
  }>;
};

export function ICalSyncPanel({ allEvents }: Props) {
  const supabase = createClient();
  const [token, setToken] = useState<string | null>(null);
  const [enabledSectors, setEnabledSectors] = useState<CalendarSector[]>([
    "live", "phono", "admin", "marketing", "edition", "other",
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("ical_tokens")
        .select("token, enabled_sectors")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setToken(data.token);
        setEnabledSectors(data.enabled_sectors as CalendarSector[]);
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  const icalUrl = token
    ? `${window.location.origin}/api/calendar/ical/${token}`
    : null;
  const webcalUrl = icalUrl?.replace(/^https?:\/\//, "webcal://") ?? null;

  async function handleGenerate() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    setMigrating(true);
    await fetch("/api/calendar/migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: allEvents }),
    });
    setMigrating(false);

    const { data } = await supabase
      .from("ical_tokens")
      .upsert(
        { user_id: user.id, enabled_sectors: enabledSectors },
        { onConflict: "user_id", ignoreDuplicates: false }
      )
      .select("token")
      .single();

    if (data) setToken(data.token);
    setSaving(false);
  }

  async function handleSectorChange(sector: CalendarSector, checked: boolean) {
    const next = checked
      ? [...enabledSectors, sector]
      : enabledSectors.filter((s) => s !== sector);
    setEnabledSectors(next);

    if (!token) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("ical_tokens")
      .update({ enabled_sectors: next })
      .eq("user_id", user.id);
  }

  async function handleRevoke() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("ical_tokens").delete().eq("user_id", user.id);
    setToken(null);
  }

  async function handleCopy(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <div className="text-sm text-white/50 py-4">Chargement…</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-white/80 mb-3">Secteurs à synchroniser</p>
        <div className="grid grid-cols-2 gap-2">
          {ALL_SECTORS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={`sector-${key}`}
                checked={enabledSectors.includes(key)}
                onCheckedChange={(v) => handleSectorChange(key, v === true)}
              />
              <Label htmlFor={`sector-${key}`} className="text-sm cursor-pointer">
                {label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {!token ? (
        <Button
          onClick={handleGenerate}
          disabled={saving}
          className="w-full"
        >
          {migrating ? (
            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Migration en cours…</>
          ) : saving ? (
            "Génération…"
          ) : (
            <><Link className="h-4 w-4 mr-2" />Générer le lien iCal</>
          )}
        </Button>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-white/50 mb-1">iPhone / Mac (Apple Calendar)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white/5 rounded px-2 py-1.5 truncate text-white/70">
                {webcalUrl}
              </code>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleCopy(webcalUrl!)}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-[#F0FF00]" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-white/40 mt-1">Appuie sur ce lien depuis ton iPhone pour l'ajouter à Apple Calendar</p>
          </div>

          <div>
            <p className="text-xs text-white/50 mb-1">Google Calendar</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white/5 rounded px-2 py-1.5 truncate text-white/70">
                {icalUrl}
              </code>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleCopy(icalUrl!)}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-[#F0FF00]" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-white/40 mt-1">Dans Google Calendar → Autres agendas → Depuis l'URL</p>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleRevoke}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Révoquer le lien
          </Button>
        </div>
      )}
    </div>
  );
}
