"use client";

import { useRef, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Plus, Pencil, Trash2 } from "lucide-react";
import type {
  Distributor, DistributorImport, ImportsStore, ManualEntry, TabId
} from "../parsers/royalties-types";
import { parseDistroKid } from "../parsers/distrokid";
import { parseTuneCore } from "../parsers/tunecore";
import { parseCdBaby } from "../parsers/cdbaby";
import { parseSoundCloud } from "../parsers/soundcloud";
import { RoyaltiesManualModal } from "./RoyaltiesManualModal";
import { userErrorMessage } from "@/lib/user-error";

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; }
    else if (c === "," && !inQuotes) { values.push(current.trim().replace(/^"|"$/g, "")); current = ""; }
    else { current += c; }
  }
  values.push(current.trim().replace(/^"|"$/g, ""));
  return values;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  return { headers: parseCsvLine(lines[0]), rows: lines.slice(1).map(parseCsvLine) };
}

const PARSERS: Record<Distributor, (h: string[], r: string[][]) => ReturnType<typeof parseDistroKid>> = {
  distrokid: parseDistroKid,
  tunecore: parseTuneCore,
  cdbaby: parseCdBaby,
  soundcloud: parseSoundCloud,
};

const TABS: { id: TabId; label: string }[] = [
  { id: "distrokid", label: "DistroKid" },
  { id: "tunecore", label: "TuneCore" },
  { id: "cdbaby", label: "CD Baby" },
  { id: "soundcloud", label: "SoundCloud" },
  { id: "manual", label: "Saisie manuelle" },
];

interface RoyaltiesImportsProps {
  imports: ImportsStore;
  manualEntries: ManualEntry[];
  defaultTab: TabId;
  onImport: (distributor: Distributor, imp: DistributorImport) => void;
  onTabChange: (tab: TabId) => void;
  onAddManual: (entry: ManualEntry) => void;
  onEditManual: (entry: ManualEntry) => void;
  onDeleteManual: (id: string) => void;
}

export function RoyaltiesImports({
  imports,
  manualEntries,
  defaultTab,
  onImport,
  onTabChange,
  onAddManual,
  onEditManual,
  onDeleteManual,
}: RoyaltiesImportsProps) {
  const posthog = usePostHog();
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const [errors, setErrors] = useState<Partial<Record<Distributor, string>>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ManualEntry | null>(null);
  const fileRefs = useRef<Partial<Record<Distributor, HTMLInputElement | null>>>({});

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    onTabChange(tab);
  };

  const handleFileChange = (distributor: Distributor, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const { headers, rows } = parseCsv(text);
      try {
        const entries = PARSERS[distributor](headers, rows);
        setErrors((prev) => ({ ...prev, [distributor]: undefined }));
        onImport(distributor, {
          distributor,
          fileName: file.name,
          importedAt: new Date().toISOString(),
          entries,
        });
        posthog?.capture("royalties_import_uploaded", { module: "incomes" });
        posthog?.capture("item_created", { module: "incomes" });
      } catch (err) {
        setErrors((prev) => ({ ...prev, [distributor]: userErrorMessage(err, "Ce fichier n’a pas pu être lu. Vérifie qu’il vient bien de ce distributeur.") }));
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const handleSaveManual = (entry: ManualEntry) => {
    if (editingEntry) {
      onEditManual(entry);
    } else {
      onAddManual(entry);
    }
    setModalOpen(false);
    setEditingEntry(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-1 text-xl font-semibold tracking-tight text-[#F5F5F5]">Imports & données</h2>
        <p className="text-xs text-[#F5F5F5]/60">Importez vos CSV par distributeur ou saisissez des données manuellement.</p>
      </div>

      {/* Onglets */}
      <div className="inline-flex flex-wrap gap-1 rounded-full border border-[rgba(245,245,245,0.15)] bg-[rgba(44,44,46,0.7)] px-1 py-1 backdrop-blur-xl">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              activeTab === tab.id
                ? "bg-[#F0FF00] text-[#101010]"
                : "text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.08)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu onglet CSV */}
      {activeTab !== "manual" && (() => {
        const distributor = activeTab as Distributor;
        const imp = imports[distributor];
        const error = errors[distributor];
        const totalRevenue = imp?.entries.reduce((s, e) => s + e.revenue, 0) ?? 0;
        const totalStreams = imp?.entries.reduce((s, e) => s + e.streams, 0) ?? 0;
        const totalTracks = new Set(imp?.entries.map((e) => e.trackTitle) ?? []).size;

        return (
          <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold text-[#F5F5F5]">
                  {TABS.find((t) => t.id === distributor)?.label}
                </CardTitle>
                {imp && (
                  <p className="mt-0.5 text-xs text-[#F5F5F5]/50">
                    {imp.fileName} — importé le {new Date(imp.importedAt).toLocaleDateString("fr-FR")} — {imp.entries.length} lignes
                  </p>
                )}
              </div>
              <div>
                <input
                  ref={(el) => { fileRefs.current[distributor] = el; }}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleFileChange(distributor, e)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRefs.current[distributor]?.click()}
                  className="flex items-center gap-2 rounded-full border-[rgba(245,245,245,0.3)] bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#F5F5F5] hover:bg-[rgba(245,245,245,0.08)]"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Importer CSV
                </Button>
              </div>
            </CardHeader>
            {error && (
              <CardContent className="pt-0">
                <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
              </CardContent>
            )}
            {!imp && (
              <CardContent className="pt-0">
                <p className="py-4 text-center text-xs" style={{ color: "rgba(245,245,245,0.4)" }}>
                  Aucun import pour ce distributeur.
                </p>
              </CardContent>
            )}
            {imp && (
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-[rgba(15,23,42,0.6)] px-3 py-2">
                    <div className="text-xs text-[#F5F5F5]/50">Revenus</div>
                    <div className="text-base font-semibold text-[#F0FF00]">${totalRevenue.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg bg-[rgba(15,23,42,0.6)] px-3 py-2">
                    <div className="text-xs text-[#F5F5F5]/50">Streams</div>
                    <div className="text-base font-semibold text-[#F5F5F5]">{totalStreams.toLocaleString("fr-FR")}</div>
                  </div>
                  <div className="rounded-lg bg-[rgba(15,23,42,0.6)] px-3 py-2">
                    <div className="text-xs text-[#F5F5F5]/50">Titres</div>
                    <div className="text-base font-semibold text-[#F5F5F5]">{totalTracks}</div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })()}

      {/* Contenu onglet saisie manuelle */}
      {activeTab === "manual" && (
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-[#F5F5F5]">Saisie manuelle</CardTitle>
              <p className="mt-0.5 text-xs text-[#F5F5F5]/50">{manualEntries.length} entrée{manualEntries.length !== 1 ? "s" : ""}</p>
            </div>
            <Button
              type="button"
              onClick={() => { setEditingEntry(null); setModalOpen(true); }}
              className="flex items-center gap-2 rounded-full bg-[#F0FF00] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#101010] hover:bg-[#F0FF00]/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter un titre
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {manualEntries.length === 0 ? (
              <p className="py-4 text-center text-xs" style={{ color: "rgba(245,245,245,0.4)" }}>
                Aucune entrée manuelle. Clique sur « Ajouter un titre » pour commencer.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[rgba(245,245,245,0.08)]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[rgba(245,245,245,0.08)] bg-[rgba(15,23,42,0.8)]">
                      <th className="px-3 py-2 text-left font-medium text-[#F5F5F5]/60">Période</th>
                      <th className="px-3 py-2 text-left font-medium text-[#F5F5F5]/60">Titre</th>
                      <th className="px-3 py-2 text-right font-medium text-[#F5F5F5]/60">Streams</th>
                      <th className="px-3 py-2 text-right font-medium text-[#F5F5F5]/60">Revenus</th>
                      <th className="px-3 py-2 text-right font-medium text-[#F5F5F5]/60">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-[rgba(245,245,245,0.04)] last:border-0 hover:bg-[rgba(245,245,245,0.03)]">
                        <td className="px-3 py-2 text-[#F5F5F5]/70">{entry.period}</td>
                        <td className="max-w-[180px] truncate px-3 py-2 font-medium text-[#F5F5F5]">{entry.trackTitle}</td>
                        <td className="px-3 py-2 text-right text-[#F5F5F5]/80">{entry.streams.toLocaleString("fr-FR")}</td>
                        <td className="px-3 py-2 text-right font-semibold text-[#F0FF00]">{entry.revenue.toFixed(2)} {entry.currency}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              type="button" variant="outline" size="icon"
                              className="h-7 w-7 rounded-full border-[rgba(245,245,245,0.2)] bg-transparent text-[#F5F5F5] hover:bg-[rgba(245,245,245,0.08)]"
                              onClick={() => { setEditingEntry(entry); setModalOpen(true); }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button" variant="outline" size="icon"
                              className="h-7 w-7 rounded-full border-[rgba(248,113,113,0.4)] bg-transparent text-rose-300 hover:bg-[rgba(127,29,29,0.6)]"
                              onClick={() => onDeleteManual(entry.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <RoyaltiesManualModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEntry(null); }}
        onSave={handleSaveManual}
        entry={editingEntry}
      />
    </div>
  );
}
