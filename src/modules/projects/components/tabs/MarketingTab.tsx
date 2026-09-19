"use client";

import { useState } from "react";
import Link from "next/link";
import type { Project, KeyDate } from "@/lib/sidekick-store";
import { useProjectsData } from "@/hooks/useProjectsData";
import { useProjectMarketingData } from "@/hooks/useProjectMarketingData";
import { useMarketingData } from "@/hooks/useMarketingData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  ExternalLink,
  Calendar,
  Mail,
  Flag,
  X,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

const KEY_DATE_TYPES = ["concert", "sortie", "clip", "annonce", "tournée", "autre"] as const;

const STATUS_LABELS: Record<string, string> = {
  idee: "Idée",
  a_produire: "À produire",
  planifie: "Planifié",
  publie: "Publié",
};

const STATUS_COLORS: Record<string, string> = {
  idee: "text-[#F5F5F5]/40 border-[rgba(245,245,245,0.1)]",
  a_produire: "text-yellow-400 border-yellow-500/30",
  planifie: "text-blue-400 border-blue-500/30",
  publie: "text-green-400 border-green-500/30",
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#F5F5F5]/40">{title}</h3>
      {children}
    </div>
  );
}

// ─── Add Key Date form ────────────────────────────────────────────────────────

function AddKeyDateForm({ onAdd }: { onAdd: (kd: Omit<KeyDate, "id">) => void }) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState("autre");
  const [date, setDate] = useState("");
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    if (!label.trim() || !date) return;
    onAdd({ label: label.trim(), type, date });
    setLabel("");
    setType("autre");
    setDate("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[12px] text-[#F5F5F5]/30 hover:text-[#F0FF00] transition-colors"
      >
        <Plus size={13} /> Ajouter un temps fort
      </button>
    );
  }

  return (
    <div className="flex gap-2 items-end flex-wrap rounded-lg border border-[rgba(245,245,245,0.08)] p-3">
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Libellé *"
        className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5] text-xs h-8 flex-1 min-w-[140px]"
        autoFocus
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="h-8 rounded-md border border-[rgba(245,245,245,0.12)] bg-[#101010] px-2 text-xs text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-[#F0FF00]/30"
      >
        {KEY_DATE_TYPES.map((t) => (
          <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
        ))}
      </select>
      <DatePicker
        value={date}
        onChange={setDate}
        size="sm"
        className="w-36 border-[rgba(245,245,245,0.12)] bg-[#101010] text-xs"
      />
      <Button size="sm" onClick={handleAdd} disabled={!label.trim() || !date}>Ajouter</Button>
      <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Annuler</Button>
    </div>
  );
}

// ─── Attach pickers (modaux) ──────────────────────────────────────────────────

function AttachEventModal({
  projectId,
  attachedIds,
  onAttach,
  onClose,
}: {
  projectId: string;
  attachedIds: Set<string>;
  onAttach: (id: string) => void;
  onClose: () => void;
}) {
  const { marketingEvents } = useMarketingData();
  const available = marketingEvents.filter((e) => !attachedIds.has(e.id) && !e.projectId);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
        <DialogHeader>
          <DialogTitle className="text-[#F5F5F5]">Rattacher une publication</DialogTitle>
        </DialogHeader>
        {available.length === 0 ? (
          <p className="text-[13px] text-[#F5F5F5]/30 italic py-4">
            Toutes les publications sont déjà rattachées à un projet.
          </p>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {available.map((e) => (
              <button
                key={e.id}
                onClick={() => { onAttach(e.id); onClose(); }}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-[rgba(245,245,245,0.05)] transition-colors"
              >
                <div>
                  <p className="text-[13px] text-[#F5F5F5]/80">{e.title}</p>
                  <p className="text-[11px] text-[#F5F5F5]/30">{fmtDate(e.date)}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_COLORS[e.status] ?? STATUS_COLORS.idee}`}>
                  {STATUS_LABELS[e.status] ?? e.status}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-[rgba(245,245,245,0.08)]">
          <Link
            href={`/marketing/calendrier-editorial?project_id=${projectId}`}
            className="flex items-center gap-1.5 text-[12px] text-[#F5F5F5]/40 hover:text-[#F0FF00] transition-colors"
          >
            <ExternalLink size={12} /> Créer dans le calendrier
          </Link>
          <Button variant="ghost" size="sm" onClick={onClose}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AttachCampaignModal({
  projectId,
  attachedIds,
  onAttach,
  onClose,
}: {
  projectId: string;
  attachedIds: Set<string>;
  onAttach: (id: string) => void;
  onClose: () => void;
}) {
  const { campaigns } = useMarketingData();
  const available = campaigns.filter((c) => !attachedIds.has(c.id) && !c.projectId);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
        <DialogHeader>
          <DialogTitle className="text-[#F5F5F5]">Rattacher une campagne mailing</DialogTitle>
        </DialogHeader>
        {available.length === 0 ? (
          <p className="text-[13px] text-[#F5F5F5]/30 italic py-4">
            Toutes les campagnes sont déjà rattachées à un projet.
          </p>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {available.map((c) => (
              <button
                key={c.id}
                onClick={() => { onAttach(c.id); onClose(); }}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-[rgba(245,245,245,0.05)] transition-colors"
              >
                <div>
                  <p className="text-[13px] text-[#F5F5F5]/80">{c.name}</p>
                  {c.subject && <p className="text-[11px] text-[#F5F5F5]/30">{c.subject}</p>}
                </div>
                <span className="text-[11px] text-[#F5F5F5]/30">{fmtDate(c.dateEnvoi)}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-[rgba(245,245,245,0.08)]">
          <Link
            href={`/marketing/campagnes?project_id=${projectId}`}
            className="flex items-center gap-1.5 text-[12px] text-[#F5F5F5]/40 hover:text-[#F0FF00] transition-colors"
          >
            <ExternalLink size={12} /> Créer dans Marketing
          </Link>
          <Button variant="ghost" size="sm" onClick={onClose}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

type TimelineItem =
  | { kind: "keydate"; id: string; label: string; type: string; date: string }
  | { kind: "event"; id: string; title: string; date: string; status: string; platforms: string[] }
  | { kind: "campaign"; id: string; name: string; date: string; envoyes: number };

function Timeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-[12px] text-[#F5F5F5]/20 italic">
        Aucun élément. Ajoute des temps forts, puis rattache des publications ou campagnes.
      </p>
    );
  }

  const sorted = [...items].sort((a, b) => (a.date > b.date ? 1 : -1));

  return (
    <div className="relative pl-5 space-y-0">
      <div className="absolute left-1.5 top-2 bottom-2 w-px bg-[rgba(245,245,245,0.08)]" />
      {sorted.map((item) => (
        <div key={`${item.kind}-${item.id}`} className="relative flex items-start gap-3 py-2.5">
          {/* Dot */}
          <div className={`absolute -left-[1px] mt-1 h-3 w-3 rounded-full border-2 shrink-0 ${
            item.kind === "keydate"
              ? "bg-[#F0FF00] border-[#F0FF00]"
              : item.kind === "event"
              ? "bg-blue-500/60 border-blue-500"
              : "bg-purple-500/60 border-purple-500"
          }`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {item.kind === "keydate" && (
                <>
                  <Flag size={12} className="text-[#F0FF00] shrink-0" />
                  <span className="text-[13px] font-medium text-[#F5F5F5]">{item.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#F0FF00]/30 text-[#F0FF00]/70">
                    {item.type}
                  </span>
                </>
              )}
              {item.kind === "event" && (
                <>
                  <Calendar size={12} className="text-blue-400 shrink-0" />
                  <span className="text-[13px] text-[#F5F5F5]/80">{item.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_COLORS[item.status] ?? STATUS_COLORS.idee}`}>
                    {STATUS_LABELS[item.status] ?? item.status}
                  </span>
                </>
              )}
              {item.kind === "campaign" && (
                <>
                  <Mail size={12} className="text-purple-400 shrink-0" />
                  <span className="text-[13px] text-[#F5F5F5]/80">{item.name}</span>
                  {item.envoyes > 0 && (
                    <span className="text-[10px] text-[#F5F5F5]/30">{item.envoyes} envoyés</span>
                  )}
                </>
              )}
            </div>
            <p className="text-[11px] text-[#F5F5F5]/30 mt-0.5">{fmtDate(item.date)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MarketingTab ─────────────────────────────────────────────────────────────

export function MarketingTab({ project }: { project: Project }) {
  const { setProjects } = useProjectsData();
  const { campaigns, events, attachCampaign, detachCampaign, attachEvent, detachEvent, loading } =
    useProjectMarketingData(project.id);

  const [attachEventOpen, setAttachEventOpen] = useState(false);
  const [attachCampaignOpen, setAttachCampaignOpen] = useState(false);

  const keyDates = project.keyDates ?? [];

  const addKeyDate = (kd: Omit<KeyDate, "id">) => {
    const newKd: KeyDate = { id: crypto.randomUUID(), ...kd };
    setProjects((prev) =>
      prev.map((p) =>
        p.id === project.id
          ? { ...p, keyDates: [...(p.keyDates ?? []), newKd], updatedAt: new Date().toISOString() }
          : p
      )
    );
  };

  const removeKeyDate = (id: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === project.id
          ? { ...p, keyDates: (p.keyDates ?? []).filter((kd) => kd.id !== id), updatedAt: new Date().toISOString() }
          : p
      )
    );
  };

  const timelineItems: TimelineItem[] = [
    ...keyDates.map((kd) => ({ kind: "keydate" as const, id: kd.id, label: kd.label, type: kd.type, date: kd.date })),
    ...events.map((e) => ({ kind: "event" as const, id: e.id, title: e.title, date: e.date, status: e.status, platforms: e.platforms })),
    ...campaigns.map((c) => ({ kind: "campaign" as const, id: c.id, name: c.name, date: c.dateEnvoi, envoyes: c.envoyes })),
  ];

  const attachedEventIds = new Set(events.map((e) => e.id));
  const attachedCampaignIds = new Set(campaigns.map((c) => c.id));

  return (
    <div className="space-y-8">
      {/* Temps forts */}
      <Section title="Temps forts">
        {keyDates.length === 0 && (
          <p className="text-[12px] text-[#F5F5F5]/20 italic">Aucun temps fort défini.</p>
        )}
        {keyDates.map((kd) => (
          <div
            key={kd.id}
            className="flex items-center justify-between gap-3 py-2 border-b border-[rgba(245,245,245,0.06)]"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Flag size={12} className="text-[#F0FF00] shrink-0" />
              <span className="text-[13px] text-[#F5F5F5]/80">{kd.label}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#F0FF00]/20 text-[#F0FF00]/60">
                {kd.type}
              </span>
            </div>
            <span className="text-[11px] text-[#F5F5F5]/30 shrink-0">{fmtDate(kd.date)}</span>
            <button
              onClick={() => removeKeyDate(kd.id)}
              className="text-[#F5F5F5]/20 hover:text-red-400 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <AddKeyDateForm onAdd={addKeyDate} />
      </Section>

      {/* Publications rattachées */}
      <Section title="Publications rattachées">
        {loading ? (
          <p className="text-[12px] text-[#F5F5F5]/20">Chargement...</p>
        ) : (
          <>
            {events.length === 0 && (
              <p className="text-[12px] text-[#F5F5F5]/20 italic">Aucune publication rattachée.</p>
            )}
            {events.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-[rgba(245,245,245,0.06)]"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Calendar size={12} className="text-blue-400 shrink-0" />
                  <span className="text-[13px] text-[#F5F5F5]/80 truncate">{e.title}</span>
                  <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border ${STATUS_COLORS[e.status] ?? STATUS_COLORS.idee}`}>
                    {STATUS_LABELS[e.status] ?? e.status}
                  </span>
                </div>
                <span className="text-[11px] text-[#F5F5F5]/30 shrink-0">{fmtDate(e.date)}</span>
                <button
                  onClick={() => detachEvent(e.id)}
                  title="Détacher"
                  className="text-[#F5F5F5]/20 hover:text-red-400 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-3 mt-1">
              <button
                onClick={() => setAttachEventOpen(true)}
                className="flex items-center gap-1.5 text-[12px] text-[#F5F5F5]/30 hover:text-[#F0FF00] transition-colors"
              >
                <Plus size={13} /> Rattacher une publication existante
              </button>
              <Link
                href={`/marketing/calendrier-editorial`}
                className="flex items-center gap-1.5 text-[12px] text-[#F5F5F5]/30 hover:text-[#F5F5F5] transition-colors"
              >
                <ExternalLink size={12} /> Créer dans le calendrier
              </Link>
            </div>
          </>
        )}
      </Section>

      {/* Campagnes mailing rattachées */}
      <Section title="Campagnes mailing rattachées">
        {loading ? (
          <p className="text-[12px] text-[#F5F5F5]/20">Chargement...</p>
        ) : (
          <>
            {campaigns.length === 0 && (
              <p className="text-[12px] text-[#F5F5F5]/20 italic">Aucune campagne rattachée.</p>
            )}
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-[rgba(245,245,245,0.06)]"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Mail size={12} className="text-purple-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[13px] text-[#F5F5F5]/80 truncate block">{c.name}</span>
                    {c.subject && (
                      <span className="text-[11px] text-[#F5F5F5]/30">{c.subject}</span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-[#F5F5F5]/30 shrink-0">{fmtDate(c.dateEnvoi)}</span>
                <button
                  onClick={() => detachCampaign(c.id)}
                  title="Détacher"
                  className="text-[#F5F5F5]/20 hover:text-red-400 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-3 mt-1">
              <button
                onClick={() => setAttachCampaignOpen(true)}
                className="flex items-center gap-1.5 text-[12px] text-[#F5F5F5]/30 hover:text-[#F0FF00] transition-colors"
              >
                <Plus size={13} /> Rattacher une campagne existante
              </button>
              <Link
                href="/marketing/campagnes"
                className="flex items-center gap-1.5 text-[12px] text-[#F5F5F5]/30 hover:text-[#F5F5F5] transition-colors"
              >
                <ExternalLink size={12} /> Créer dans Marketing
              </Link>
            </div>
          </>
        )}
      </Section>

      {/* Timeline chronologique */}
      <Section title="Timeline">
        <Timeline items={timelineItems} />
      </Section>

      {/* Modaux rattachement */}
      {attachEventOpen && (
        <AttachEventModal
          projectId={project.id}
          attachedIds={attachedEventIds}
          onAttach={(id) => attachEvent(id)}
          onClose={() => setAttachEventOpen(false)}
        />
      )}
      {attachCampaignOpen && (
        <AttachCampaignModal
          projectId={project.id}
          attachedIds={attachedCampaignIds}
          onAttach={(id) => attachCampaign(id)}
          onClose={() => setAttachCampaignOpen(false)}
        />
      )}
    </div>
  );
}
