"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useContractsData } from "@/hooks/useContractsData";
import { toDisplayDate } from "@/lib/date-format";
import type { ContractInstance, ContractStatus, ContractTemplate } from "@/lib/contracts-db";
import { TemplateEditor } from "@/modules/admin/components/contract/TemplateEditor";
import { ContractInstanceEditor } from "@/modules/admin/components/contract/ContractInstanceEditor";
import { SignaturePad } from "@/modules/admin/components/contract/SignaturePad";

function statusLabel(status: ContractStatus): string {
  if (status === "draft") return "En rédaction";
  if (status === "sent") return "Envoyé";
  return "Signé";
}

function escapeHtml(value: unknown): string {
  const s = value == null ? "" : String(value);
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function substituteVariables(html: string, variables: Record<string, unknown>) {
  return html.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_match, varName: string) => {
    const v = variables[varName];
    return escapeHtml(v);
  });
}

function extractVariableKeys(html: string): string[] {
  const set = new Set<string>();
  html.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_m, name: string) => {
    set.add(name);
    return "";
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export function ContractsPage() {
  const {
    templates,
    contracts,
    signatures,
    addTemplate,
    saveTemplate,
    createContract,
    addSignature,
    setContractStatus: setContractStatusDb,
    setActiveSignatureForUser,
    removeSignature
  } =
    useContractsData();

  const activeSignatureId = useMemo(() => signatures.find((s) => s.isActive)?.id ?? null, [signatures]);

  const router = useRouter();

  const [tab, setTab] = useState<"templates" | "contracts" | "signatures">("contracts");

  // --- Templates dialog (v1 placeholder until TemplateEditor UI) ---
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateEditorMode, setTemplateEditorMode] = useState<"create" | "edit">("create");
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);

  // --- Contract creation dialog (v1 placeholder until ContractInstanceEditor UI) ---
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [contractTemplateId, setContractTemplateId] = useState<string>("");
  const [contractTitle, setContractTitle] = useState("");
  const [contractStatus, setContractStatusUI] = useState<ContractStatus>("draft");
  const [variableDraft, setVariableDraft] = useState<Record<string, string>>({});
  const [generatedHtml, setGeneratedHtml] = useState("");

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === contractTemplateId) ?? null,
    [templates, contractTemplateId]
  );

  // --- Signatures dialog (v1 placeholder until SignaturePad UI) ---
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signatureLabel, setSignatureLabel] = useState("");
  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  const templateVariableKeys = useMemo(() => selectedTemplate?.variableKeys ?? [], [selectedTemplate]);

  const pdfPreviewRef = useRef<HTMLDivElement | null>(null);

  const exportContractPdf = async (contract: ContractInstance) => {
    try {
      if (typeof window === "undefined") return;
      if (!pdfPreviewRef.current) return;
      const previewEl = pdfPreviewRef.current;

      // Prépare le rendu HTML dans un conteneur "hors écran".
      previewEl.innerHTML = contract.htmlContent ?? "";

      const { jsPDF } = (await import("jspdf/dist/jspdf.umd.min.js")) as unknown as typeof import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const signature =
        contract.status === "signed"
          ? contract.signatureId
            ? signatures.find((s) => s.id === contract.signatureId) ?? null
            : signatures.find((s) => s.isActive) ?? null
          : null;

      let signatureDataUrl: string | null = null;
      if (signature?.url) {
        const blob = await fetch(signature.url, { mode: "cors" }).then((r) => {
          if (!r.ok) throw new Error("Impossible de charger la signature");
          return r.blob();
        });
        signatureDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Conversion signature impossible"));
          reader.readAsDataURL(blob);
        });
      }

      const pagesSigW = 45;
      const pagesSigH = 16;
      const margin = 10;
      const sigX = 210 - margin - pagesSigW;
      const sigY = 297 - margin - pagesSigH;

      const safeTitle =
        (contract.title ?? "contrat").replace(/[^a-z0-9\-_.]+/gi, "-").replace(/-+/g, "-");

      await doc.html(previewEl, {
        x: 10,
        y: 10,
        width: 190,
        windowWidth: 800,
        callback: () => {
          try {
            if (signatureDataUrl) {
              const pages = doc.getNumberOfPages();
              for (let i = 1; i <= pages; i++) {
                doc.setPage(i);
                doc.addImage(signatureDataUrl, "PNG", sigX, sigY, pagesSigW, pagesSigH);
              }
            }
            doc.save(`contrat-${safeTitle}.pdf`);
          } catch (e) {
            console.error(e);
            doc.save(`contrat-${safeTitle}.pdf`);
          }
        }
      });
    } catch (e) {
      console.error(e);
      window.alert("Erreur lors de l’export PDF.");
    }
  };

  function openNewTemplate() {
    router.push("/admin/contrats/template?mode=create");
  }

  function openEditTemplate(t: ContractTemplate) {
    router.push(`/admin/contrats/template?mode=edit&templateId=${t.id}`);
  }

  function openNewContract() {
    const first = templates[0]?.id ?? "";
    setContractTemplateId(first);
    const firstTemplate = templates[0] ?? null;
    setContractTitle(firstTemplate ? firstTemplate.title : "");
    setContractStatusUI("draft");
    setVariableDraft({});
    setGeneratedHtml(firstTemplate ? firstTemplate.htmlContent : "");
    setContractDialogOpen(true);
  }

  function handleUpdateGeneratedHtml() {
    if (!selectedTemplate) return;
    const content = substituteVariables(selectedTemplate.htmlContent, variableDraft);
    setGeneratedHtml(content);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mes contrats</h1>
          <p className="text-sm text-muted-foreground">
            Modèles, contrats spécifiques, signatures et suivi d&apos;avancement.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={tab === "contracts" ? "default" : "outline"} onClick={() => setTab("contracts")}>
            Contrats
          </Button>
          <Button variant={tab === "templates" ? "default" : "outline"} onClick={() => setTab("templates")}>
            Contrats types
          </Button>
          <Button variant={tab === "signatures" ? "default" : "outline"} onClick={() => setTab("signatures")}>
            Signatures
          </Button>
        </div>
      </div>

      {tab === "templates" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Contrats types</CardTitle>
            </div>
            <Button onClick={openNewTemplate}>
              Créer un modèle
            </Button>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun modèle pour le moment. Clique sur « Créer un modèle ».
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {templates.map((t) => (
                  <div key={t.id} className="rounded-md border bg-muted/20 p-4">
                    <p className="font-semibold">{t.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Variables : {t.variableKeys.length > 0 ? t.variableKeys.join(", ") : "—"}
                    </p>
                    <div className="mt-3">
                      <Button size="sm" variant="outline" onClick={() => openEditTemplate(t)}>
                        Modifier
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "contracts" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Contrats</CardTitle>
            </div>
            <Button onClick={openNewContract}>
              Nouveau contrat
            </Button>
          </CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun contrat. Crée un contrat spécifique à partir d&apos;un contrat type.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {contracts.map((c) => (
                  <ContractCard
                    key={c.id}
                    contract={c}
                    onSign={(signatureId) => setContractStatusDb(c.id, { status: "signed", signatureId })}
                    activeSignatureId={activeSignatureId}
                    onExport={() => exportContractPdf(c)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "signatures" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Signatures</CardTitle>
            </div>
            <Button onClick={() => setSignatureDialogOpen(true)}>Importer</Button>
          </CardHeader>
          <CardContent>
            {signatures.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune signature enregistrée. Importe une image (PNG/JPG) ou crée-la (feature v2).
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {signatures.map((s) => (
                  <div key={s.id} className="rounded-md border bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{s.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {s.isActive ? "Active" : "Inactif"}
                        </p>
                      </div>
                      {s.isActive ? (
                        <Badge>Actif</Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setActiveSignatureForUser(s.id)}>
                          Activer
                        </Button>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeSignature(s.id)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="text-sm text-muted-foreground">
        <Link href="/admin" className="underline hover:text-foreground">
          Retour à la vue d&apos;ensemble Admin
        </Link>
      </div>

      {/* Template Editor */}
      <TemplateEditor
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        mode={templateEditorMode}
        initial={
          editingTemplate
            ? { title: editingTemplate.title, htmlContent: editingTemplate.htmlContent }
            : undefined
        }
        onSave={async ({ title, htmlContent, variableKeys }) => {
          if (templateEditorMode === "create") {
            await addTemplate({ title, htmlContent, variableKeys });
          } else if (editingTemplate) {
            await saveTemplate(editingTemplate.id, { title, htmlContent, variableKeys });
          }
        }}
      />

      <ContractInstanceEditor
        open={contractDialogOpen}
        onOpenChange={setContractDialogOpen}
        mode="create"
        templates={templates}
        signatures={signatures}
        initialTemplateId={contractTemplateId}
        onSave={async (payload) => {
          const created = await createContract({
            templateId: payload.templateId,
            title: payload.title,
            variables: payload.variables,
            htmlContent: payload.htmlContent
          });
          if (payload.status !== "draft") {
            await setContractStatusDb(created.id, {
              status: payload.status,
              signatureId: payload.status === "signed" ? payload.signatureId : null
            });
          }
        }}
      />

      {/* Signature dialog */}
      <Dialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Importer une signature</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Libellé</label>
              <Input value={signatureLabel} onChange={(e) => setSignatureLabel(e.target.value)} placeholder="Ex. Paraphe Jean" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Signature</label>
              <SignaturePad onFileReady={setSignatureFile} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignatureDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={async () => {
                if (!signatureFile) return;
                await addSignature({
                  label: signatureLabel.trim() || "Signature",
                  file: signatureFile,
                  makeActive: true
                });
                setSignatureDialogOpen(false);
                setSignatureLabel("");
                setSignatureFile(null);
              }}
              disabled={!signatureFile}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conteneur hors-écran pour `jsPDF` (doc.html) */}
      <div
        ref={pdfPreviewRef}
        style={{ position: "absolute", left: "-10000px", top: 0, width: 800 }}
      />
    </div>
  );
}

function ContractCard({
  contract,
  onSign,
  activeSignatureId,
  onExport
}: {
  contract: ContractInstance;
  onSign: (signatureId: string) => Promise<void>;
  activeSignatureId: string | null;
  onExport: () => Promise<void>;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{contract.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {toDisplayDate(contract.statusUpdatedAt)} · {statusLabel(contract.status)}
          </p>
        </div>
        <Badge variant={contract.status === "signed" ? "default" : "secondary"}>
          {statusLabel(contract.status)}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {contract.status !== "signed" ? (
          <Button
            size="sm"
            onClick={() => {
              if (activeSignatureId) onSign(activeSignatureId);
            }}
            disabled={!activeSignatureId}
          >
            Marquer signé
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">Signature appliquée</span>
        )}

        <Button size="sm" variant="outline" onClick={onExport}>
          Exporter PDF
        </Button>
      </div>
    </div>
  );
}

