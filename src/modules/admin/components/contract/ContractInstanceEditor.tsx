"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import type { ContractInstance, ContractSignature, ContractStatus, ContractTemplate } from "@/lib/contracts-db";

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

const VAR_PLACEHOLDER_REGEX = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;

function extractVariableKeys(html: string): string[] {
  const set = new Set<string>();
  html.replace(VAR_PLACEHOLDER_REGEX, (_m, k: string) => {
    set.add(k);
    return "";
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export function ContractInstanceEditor(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  templates: ContractTemplate[];
  signatures: ContractSignature[];
  initial?: ContractInstance;
  initialTemplateId?: string;
  onSave: (payload: {
    templateId: string;
    title: string;
    variables: Record<string, unknown>;
    htmlContent: string;
    status: ContractStatus;
    signatureId: string | null;
  }) => Promise<void>;
}) {
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<ContractStatus>("draft");
  const [signatureId, setSignatureId] = useState<string | null>(null);

  const [htmlContent, setHtmlContent] = useState("");
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  const activeSignature = useMemo(
    () => props.signatures.find((s) => s.isActive) ?? null,
    [props.signatures]
  );

  const selectedTemplate = useMemo(
    () => props.templates.find((t) => t.id === templateId) ?? null,
    [props.templates, templateId]
  );

  useEffect(() => {
    if (!props.open) return;

    const nextTemplateId = props.mode === "edit" ? props.initial?.templateId ?? "" : props.initialTemplateId ?? (props.templates[0]?.id ?? "");
    const t = props.templates.find((x) => x.id === nextTemplateId) ?? null;

    setTemplateId(nextTemplateId);
    setTitle(props.mode === "edit" ? props.initial?.title ?? "" : t?.title ?? "");
    setStatus(props.mode === "edit" ? props.initial?.status ?? "draft" : "draft");
    setSignatureId(props.mode === "edit" ? props.initial?.signatureId ?? (activeSignature?.id ?? null) : activeSignature?.id ?? null);

    const initialVars: Record<string, string> = {};
    const keys =
      props.mode === "edit"
        ? Object.keys(props.initial?.variables ?? {})
        : t?.variableKeys ?? extractVariableKeys(t?.htmlContent ?? "");
    keys.forEach((k) => (initialVars[k] = (props.mode === "edit" ? (props.initial?.variables?.[k] as string | undefined) : undefined) ?? ""));
    setVariables(initialVars);

    const nextHtml =
      props.mode === "edit"
        ? props.initial?.htmlContent ?? ""
        : t
          ? substituteVariables(t.htmlContent, initialVars)
          : "";

    setHtmlContent(nextHtml);
    if (editorRef.current) {
      editorRef.current.innerHTML = nextHtml;
    }

    setBulkEditOpen(false);
  }, [props.open, props.mode, props.initial, props.initialTemplateId, props.templates, activeSignature]);

  const variableKeys = useMemo(() => {
    if (selectedTemplate?.variableKeys?.length) return selectedTemplate.variableKeys;
    return extractVariableKeys(selectedTemplate?.htmlContent ?? "");
  }, [selectedTemplate]);

  const syncFromEditor = () => {
    const current = editorRef.current?.innerHTML ?? "";
    setHtmlContent(current);
  };

  const regenerateFromVariables = () => {
    if (!selectedTemplate) return;
    const next = substituteVariables(selectedTemplate.htmlContent, variables);
    setHtmlContent(next);
    if (editorRef.current) editorRef.current.innerHTML = next;
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{props.mode === "edit" ? "Modifier le contrat" : "Créer un contrat spécifique"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Contrat type</label>
              <Select value={templateId} onValueChange={(v) => setTemplateId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un modèle" />
                </SelectTrigger>
                <SelectContent>
                  {props.templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                {selectedTemplate?.variableKeys?.length ? `${selectedTemplate.variableKeys.length} variables` : "—"}
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Titre</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du contrat" />
            </div>
          </div>

          <div className="rounded-md border bg-background p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-medium">Variables</p>
                <p className="text-xs text-muted-foreground">Saisis les valeurs puis génère le contenu.</p>
              </div>
              <Button variant="outline" type="button" onClick={regenerateFromVariables} disabled={!selectedTemplate}>
                Générer/mettre à jour le contenu
              </Button>
            </div>

            {variableKeys.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Aucune variable détectée dans le template.</p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                {variableKeys.map((k) => (
                  <div key={k} className="grid gap-1">
                    <label className="text-xs text-muted-foreground">{`{{${k}}}`}</label>
                    <Input value={variables[k] ?? ""} onChange={(e) => setVariables((prev) => ({ ...prev, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Contenu</p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setBulkEditOpen(true)}>
                Modifier tout le texte
              </Button>
            </div>
          </div>

          <div className="rounded-md border bg-background p-3">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[260px] whitespace-pre-wrap break-words outline-none"
              onInput={syncFromEditor}
              onBlur={syncFromEditor}
            />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Statut</label>
              <Select value={status} onValueChange={(v) => setStatus(v as ContractStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">En rédaction</SelectItem>
                  <SelectItem value="sent">Envoyé</SelectItem>
                  <SelectItem value="signed">Signé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Signature</label>
              <Select
                value={signatureId ?? ""}
                onValueChange={(v) => setSignatureId(v || null)}
                disabled={status !== "signed"}
              >
                <SelectTrigger>
                  <SelectValue placeholder={status === "signed" ? "Choisir une signature" : "—"} />
                </SelectTrigger>
                <SelectContent>
                  {props.signatures.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                      {s.isActive ? " (active)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={async () => {
              if (!selectedTemplate) return;
              await props.onSave({
                templateId: selectedTemplate.id,
                title: title.trim() || selectedTemplate.title,
                variables,
                htmlContent,
                status,
                signatureId: status === "signed" ? signatureId : null
              });
              props.onOpenChange(false);
            }}
            disabled={!selectedTemplate || !title.trim()}
          >
            Sauvegarder
          </Button>
        </DialogFooter>

        {bulkEditOpen && (
          <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Modifier le texte (HTML)</DialogTitle>
              </DialogHeader>
              <Textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} rows={16} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setBulkEditOpen(false)}>Annuler</Button>
                <Button
                  onClick={() => {
                    setBulkEditOpen(false);
                    if (editorRef.current) editorRef.current.innerHTML = htmlContent;
                  }}
                >
                  Reprendre
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}

