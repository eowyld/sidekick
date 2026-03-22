"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const VAR_REGEX = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;

function extractVariableKeysFromHtml(html: string): string[] {
  const set = new Set<string>();
  html.replace(VAR_REGEX, (_m, key: string) => {
    set.add(key);
    return "";
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function insertTextAtCursor(text: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function execEditorCommand(editorEl: HTMLDivElement | null, command: string, value?: string) {
  if (!editorEl) return;
  editorEl.focus();
  // eslint-disable-next-line deprecation/deprecation
  document.execCommand(command, false, value);
}

export function TemplateEditor(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: { title: string; htmlContent: string };
  onSave: (payload: { title: string; htmlContent: string; variableKeys: string[] }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [variableToInsert, setVariableToInsert] = useState("");
  const [sizeToken, setSizeToken] = useState<"2" | "3" | "4" | "5">("3");

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!props.open) return;
    setTitle(props.initial?.title ?? "");
    setHtmlContent(props.initial?.htmlContent ?? "");
    setBulkEditOpen(false);
    setVariableToInsert("");

    // Applique le contenu au contenteditable au moment d'ouverture.
    if (editorRef.current) {
      editorRef.current.innerHTML = props.initial?.htmlContent ?? "";
    }
  }, [props.open, props.initial?.title, props.initial?.htmlContent]);

  const variableKeys = useMemo(() => extractVariableKeysFromHtml(htmlContent), [htmlContent]);

  const syncFromEditor = () => {
    const current = editorRef.current?.innerHTML ?? "";
    setHtmlContent(current);
  };

  const applyBold = () => {
    execEditorCommand(editorRef.current, "bold");
    syncFromEditor();
  };

  const applyUnderline = () => {
    execEditorCommand(editorRef.current, "underline");
    syncFromEditor();
  };

  const applyFontSize = (token: "2" | "3" | "4" | "5") => {
    setSizeToken(token);
    execEditorCommand(editorRef.current, "fontSize", token);
    syncFromEditor();
  };

  const insertVariableKey = (key: string) => {
    const safe = key.trim().replace(/[^a-zA-Z0-9_.-]/g, "");
    if (!safe) return;
    const ok = insertTextAtCursor(`{{${safe}}}`);
    if (!ok) {
      setHtmlContent((prev) => prev + `{{${safe}}}`);
      if (editorRef.current) editorRef.current.innerHTML = htmlContent + `{{${safe}}}`;
    } else {
      setTimeout(syncFromEditor, 0);
    }
  };

  const handleClickInsertVariable = () => {
    const safe = variableToInsert.trim().replace(/[^a-zA-Z0-9_.-]/g, "");
    if (!safe) return;
    insertVariableKey(safe);
    setVariableToInsert("");
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{props.mode === "edit" ? "Modifier le contrat type" : "Créer un contrat type"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Titre</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Contrat de mission" />
          </div>

          {/* Barre d'outils simple (v1) */}
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-background p-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                type="button"
                size="sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={applyBold}
              >
                Gras
              </Button>
              <Button
                variant="outline"
                type="button"
                size="sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={applyUnderline}
              >
                Souligné
              </Button>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Taille :</span>
              <Button
                variant={sizeToken === "2" ? "default" : "outline"}
                type="button"
                size="sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFontSize("2")}
              >
                10
              </Button>
              <Button
                variant={sizeToken === "3" ? "default" : "outline"}
                type="button"
                size="sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFontSize("3")}
              >
                12
              </Button>
              <Button
                variant={sizeToken === "4" ? "default" : "outline"}
                type="button"
                size="sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFontSize("4")}
              >
                14
              </Button>
              <Button
                variant={sizeToken === "5" ? "default" : "outline"}
                type="button"
                size="sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFontSize("5")}
              >
                18
              </Button>
            </div>

            <div className="w-full md:hidden" />

            <div className="flex w-full md:w-auto">
              <Button
                variant="outline"
                type="button"
                className="w-full md:w-auto"
                onClick={() => setBulkEditOpen(true)}
              >
                Modifier tout le texte
              </Button>
            </div>
          </div>

          {/* Éditeur + panneau variables */}
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="rounded-md border bg-background p-3">
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="min-h-[220px] w-full whitespace-pre-wrap break-words outline-none"
                  onInput={syncFromEditor}
                  onBlur={syncFromEditor}
                />
              </div>

              <div className="mt-3 text-sm text-muted-foreground">
                Variables détectées :{" "}
                {variableKeys.length > 0 ? variableKeys.map((k) => `{{${k}}}`).join(", ") : "—"}
              </div>
            </div>

            <div className="space-y-3 rounded-md border bg-background p-3">
              <div>
                <p className="text-sm font-medium">Variables (intuitif)</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Dans ton contrat, écris des placeholders sous la forme{" "}
                  <span className="font-medium text-foreground">{"{{NOM_VARIABLE}}"}</span>.
                  Ensuite, dans le contrat spécifique, tu saisis la valeur de chaque variable.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Exemples : <span className="font-medium">{"{{CLIENT_NAME}}"}</span>, <span className="font-medium">{"{{DATE}}"}</span>
                </p>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Créer une variable</label>
                <div className="flex items-center gap-2">
                  <Input
                    value={variableToInsert}
                    onChange={(e) => setVariableToInsert(e.target.value)}
                    placeholder="Ex. CLIENT_NAME"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!variableToInsert.trim()}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleClickInsertVariable}
                  >
                    Insérer
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <p className="text-sm font-medium">Variables détectées</p>
                {variableKeys.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucune variable trouvée pour l’instant.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {variableKeys.map((k) => (
                      <Button
                        key={k}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => insertVariableKey(k)}
                      >
                        {`{{${k}}}`}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={async () => {
              if (!title.trim()) return;
              await props.onSave({
                title: title.trim(),
                htmlContent,
                variableKeys
              });
              props.onOpenChange(false);
            }}
            disabled={!title.trim()}
          >
            Enregistrer
          </Button>
        </DialogFooter>

        {/* Bulk edit */}
        {bulkEditOpen && (
          <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Modifier le texte (HTML)</DialogTitle>
              </DialogHeader>
              <Textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} rows={14} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setBulkEditOpen(false)}>
                  Annuler
                </Button>
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

