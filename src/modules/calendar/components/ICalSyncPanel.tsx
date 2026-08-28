"use client";

import { useState, useEffect, useMemo } from "react";
import { Copy, Check, Link, Trash2, RefreshCw } from "lucide-react";
import { PageLoader } from "@/components/ui/page-loader";
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
  { key: "revenus", label: "Revenus" },
  { key: "other", label: "Autre" },
];

const DEFAULT_SYNC_SECTORS = ALL_SECTORS.map(({ key }) => key);

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
  const [selectedSectors, setSelectedSectors] =
    useState<CalendarSector[]>(DEFAULT_SYNC_SECTORS);
  const [generatedSectors, setGeneratedSectors] = useState<CalendarSector[]>([]);
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
        const sectors = (data.enabled_sectors as CalendarSector[]) ?? DEFAULT_SYNC_SECTORS;
        setSelectedSectors(sectors);
        setGeneratedSectors(sectors);
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  const icalUrl = token
    ? `${window.location.origin}/api/calendar/ical/${token}`
    : null;
  const webcalUrl = icalUrl?.replace(/^https?:\/\//, "webcal://") ?? null;
  const generatedSectorLabels = useMemo(
    () =>
      generatedSectors
        .map((sector) => ALL_SECTORS.find(({ key }) => key === sector)?.label)
        .filter(Boolean)
        .join(", "),
    [generatedSectors]
  );

  async function handleGenerate() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    setMigrating(true);
    if (allEvents.length > 0) {
      // Supprimer les anciens événements puis réinsérer (évite le pb de l'index partiel)
      await supabase.from("calendar_events").delete().eq("user_id", user.id);
      const rows = allEvents.map((e) => ({
        user_id: user.id,
        date: e.dateKey,
        end_date: e.dateKey,
        time: e.time ?? null,
        label: e.label,
        sub_label: e.subLabel ?? null,
        sector: e.sector,
        type: e.type,
        place: e.place ?? null,
        source_module: e.id.split("-")[0] ?? "custom",
        source_id: e.id,
        updated_at: new Date().toISOString(),
      }));
      await supabase.from("calendar_events").insert(rows);
    }
    setMigrating(false);

    const { data } = await supabase
      .from("ical_tokens")
      .upsert(
        { user_id: user.id, enabled_sectors: selectedSectors },
        { onConflict: "user_id", ignoreDuplicates: false }
      )
      .select("token")
      .single();

    if (data) {
      setToken(data.token);
      setGeneratedSectors(selectedSectors);
    }
    setSaving(false);
  }

  function handleSectorChange(sector: CalendarSector, checked: boolean) {
    const next = checked
      ? [...selectedSectors, sector]
      : selectedSectors.filter((s) => s !== sector);
    setSelectedSectors(next);
  }

  async function handleRevoke() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("ical_tokens").delete().eq("user_id", user.id);
    setToken(null);
    setGeneratedSectors([]);
  }

  async function handleCopy(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      {!token && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div>
            <p className="text-sm font-medium text-white/80">Secteurs inclus dans ce lien</p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">
              Ce choix est appliqué uniquement à la génération du lien. Pour changer les secteurs plus tard,
              révoque le lien puis génère un nouveau lien.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ALL_SECTORS.map(({ key, label }) => (
              <div key={key} className="flex min-h-11 items-center gap-2 rounded-md border border-white/10 px-2">
                <Checkbox
                  id={`sector-${key}`}
                  checked={selectedSectors.includes(key)}
                  onCheckedChange={(v) => handleSectorChange(key, v === true)}
                />
                <Label htmlFor={`sector-${key}`} className="cursor-pointer text-sm text-white/75">
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {!token ? (
        <Button
          onClick={handleGenerate}
          disabled={saving || selectedSectors.length === 0}
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
          {generatedSectorLabels && (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-white/35">Lien généré avec</p>
              <p className="mt-1 text-sm text-white/75">{generatedSectorLabels}</p>
            </div>
          )}
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
