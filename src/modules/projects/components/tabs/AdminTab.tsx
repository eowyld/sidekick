"use client";

import { useState } from "react";
import Link from "next/link";
import type { Project } from "@/lib/sidekick-store";
import { useProjectsData } from "@/hooks/useProjectsData";
import { useProjectAdminData } from "@/hooks/useProjectAdminData";
import { useAdminData } from "@/hooks/useAdminData";
import { useContractsData } from "@/hooks/useContractsData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Plus,
  X,
  ExternalLink,
  CheckCircle2,
  Clock,
  Send,
  FileText,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONTRACT_STATUS_CONFIG = {
  draft: { label: "Brouillon", color: "text-[#F5F5F5]/40 border-[rgba(245,245,245,0.1)]", icon: FileText },
  sent: { label: "Envoyé", color: "text-blue-400 border-blue-500/30", icon: Send },
  signed: { label: "Signé", color: "text-green-400 border-green-500/30", icon: CheckCircle2 },
};

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#F5F5F5]/40">{title}</h3>
      {children}
    </div>
  );
}

// ─── Attach contract modal ────────────────────────────────────────────────────

function AttachContractModal({
  attachedIds,
  onAttach,
  onClose,
}: {
  attachedIds: Set<string>;
  onAttach: (id: string) => void;
  onClose: () => void;
}) {
  const { contracts: allContracts } = useContractsData();
  const available = allContracts.filter((c) => !attachedIds.has(c.id) && !c.projectId);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
        <DialogHeader>
          <DialogTitle className="text-[#F5F5F5]">Rattacher un contrat existant</DialogTitle>
        </DialogHeader>
        {available.length === 0 ? (
          <p className="text-[13px] text-[#F5F5F5]/30 italic py-4">
            Tous les contrats sont déjà rattachés à un projet.
          </p>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {available.map((c) => {
              const cfg = CONTRACT_STATUS_CONFIG[c.status] ?? CONTRACT_STATUS_CONFIG.draft;
              const StatusIcon = cfg.icon;
              return (
                <button
                  key={c.id}
                  onClick={() => { onAttach(c.id); onClose(); }}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-[rgba(245,245,245,0.05)] transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusIcon size={13} className={cfg.color.split(" ")[0]} />
                    <span className="text-[13px] text-[#F5F5F5]/80 truncate">{c.title}</span>
                  </div>
                  <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-[rgba(245,245,245,0.08)]">
          <Link
            href="/admin/documents"
            className="flex items-center gap-1.5 text-[12px] text-[#F5F5F5]/40 hover:text-[#F0FF00] transition-colors"
          >
            <ExternalLink size={12} /> Créer dans Admin
          </Link>
          <Button variant="ghost" size="sm" onClick={onClose}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── AdminTab ─────────────────────────────────────────────────────────────────

export function AdminTab({ project }: { project: Project }) {
  const { setProjects } = useProjectsData();
  const { contracts, attachContract, detachContract, loading } = useProjectAdminData(project.id);
  const { statuses } = useAdminData();
  const [attachContractOpen, setAttachContractOpen] = useState(false);

  const linkedStatutIds = project.linkedStatutIds ?? [];
  const linkedStatuts = statuses.filter((s) => linkedStatutIds.includes(s.id));
  const unlinkedStatuts = statuses.filter((s) => !linkedStatutIds.includes(s.id));

  const toggleStatut = (id: string) => {
    const isLinked = linkedStatutIds.includes(id);
    const next = isLinked
      ? linkedStatutIds.filter((sid) => sid !== id)
      : [...linkedStatutIds, id];
    setProjects((prev) =>
      prev.map((p) =>
        p.id === project.id
          ? { ...p, linkedStatutIds: next, updatedAt: new Date().toISOString() }
          : p
      )
    );
  };

  const attachedContractIds = new Set(contracts.map((c) => c.id));

  return (
    <div className="space-y-8">
      {/* Statuts juridiques */}
      <Section title="Statuts juridiques rattachés">
        {statuses.length === 0 && (
          <p className="text-[12px] text-[#F5F5F5]/20 italic">
            Aucun statut configuré.{" "}
            <Link href="/admin/statuts" className="underline hover:text-[#F0FF00] transition-colors">
              Configurer dans Admin
            </Link>
          </p>
        )}

        {/* Statuts liés */}
        {linkedStatuts.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between gap-3 py-2 border-b border-[rgba(245,245,245,0.06)]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`h-2 w-2 rounded-full shrink-0 ${s.actif ? "bg-green-400" : "bg-[#F5F5F5]/20"}`} />
              <span className="text-[13px] text-[#F5F5F5]/80">{s.nom}</span>
              <span className="text-[11px] text-[#F5F5F5]/30">{String(s.type).replace(/_/g, " ")}</span>
            </div>
            <button
              onClick={() => toggleStatut(s.id)}
              title="Détacher"
              className="text-[#F5F5F5]/20 hover:text-red-400 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        ))}

        {/* Statuts disponibles à rattacher */}
        {unlinkedStatuts.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] text-[#F5F5F5]/20 uppercase tracking-wider pt-1">Rattacher un statut</p>
            {unlinkedStatuts.map((s) => (
              <button
                key={s.id}
                onClick={() => toggleStatut(s.id)}
                className="flex items-center gap-2 text-[12px] text-[#F5F5F5]/30 hover:text-[#F0FF00] transition-colors py-1"
              >
                <Plus size={12} />
                <span>{s.nom}</span>
                <span className="text-[#F5F5F5]/20">{String(s.type).replace(/_/g, " ")}</span>
              </button>
            ))}
          </div>
        )}

        <Link
          href="/admin/statuts"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#F5F5F5]/20 hover:text-[#F5F5F5] transition-colors"
        >
          <ExternalLink size={12} /> Gérer les statuts dans Admin
        </Link>
      </Section>

      {/* Contrats */}
      <Section title="Contrats rattachés">
        {loading ? (
          <p className="text-[12px] text-[#F5F5F5]/20">Chargement...</p>
        ) : (
          <>
            {contracts.length === 0 && (
              <p className="text-[12px] text-[#F5F5F5]/20 italic">Aucun contrat rattaché à ce projet.</p>
            )}
            {contracts.map((c) => {
              const cfg = CONTRACT_STATUS_CONFIG[c.status] ?? CONTRACT_STATUS_CONFIG.draft;
              const StatusIcon = cfg.icon;
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 py-2 border-b border-[rgba(245,245,245,0.06)]"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <StatusIcon size={13} className={cfg.color.split(" ")[0]} />
                    <span className="text-[13px] text-[#F5F5F5]/80 truncate">{c.title}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    {c.signedAt && (
                      <span className="text-[11px] text-[#F5F5F5]/30">signé {fmtDate(c.signedAt)}</span>
                    )}
                    <button
                      onClick={() => detachContract(c.id)}
                      title="Détacher"
                      className="text-[#F5F5F5]/20 hover:text-red-400 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-4 mt-1">
              <button
                onClick={() => setAttachContractOpen(true)}
                className="flex items-center gap-1.5 text-[12px] text-[#F5F5F5]/30 hover:text-[#F0FF00] transition-colors"
              >
                <Plus size={13} /> Rattacher un contrat existant
              </button>
              <Link
                href="/admin/documents"
                className="flex items-center gap-1.5 text-[12px] text-[#F5F5F5]/30 hover:text-[#F5F5F5] transition-colors"
              >
                <ExternalLink size={12} /> Créer dans Admin
              </Link>
            </div>
          </>
        )}
      </Section>

      {/* Modal rattachement contrat */}
      {attachContractOpen && (
        <AttachContractModal
          attachedIds={attachedContractIds}
          onAttach={(id) => attachContract(id)}
          onClose={() => setAttachContractOpen(false)}
        />
      )}
    </div>
  );
}
