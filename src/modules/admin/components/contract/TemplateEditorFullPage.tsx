"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ContractTemplate } from "@/lib/contracts-db";

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

export function TemplateEditorFullPage(props: {
  mode: "create" | "edit";
  initial?: Pick<ContractTemplate, "title" | "htmlContent">;
  onSave: (payload: { title: string; htmlContent: string; variableKeys: string[] }) => Promise<void>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  const [variableToInsert, setVariableToInsert] = useState("");
  const [sizeToken, setSizeToken] = useState<"2" | "3" | "4" | "5">("3");

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitle(props.initial?.title ?? "");
    setHtmlContent(props.initial?.htmlContent ?? "");
    setBulkEditOpen(false);
    setVariableToInsert("");
    if (editorRef.current) {
      editorRef.current.innerHTML = props.initial?.htmlContent ?? "";
    }
  }, [props.initial?.title, props.initial?.htmlContent, props.mode]);

  const variableKeys = useMemo(() => extractVariableKeysFromHtml(htmlContent), [htmlContent]);

  const syncFromEditor = () => {
    const current = editorRef.current?.innerHTML ?? "";
    setHtmlContent(current);
  };

  const applyBold = () => {
    execEditorCommand(editorRef.current, "bold");
    syncFromEditor();
  };

  const applyItalic = () => {
    execEditorCommand(editorRef.current, "italic");
    syncFromEditor();
  };

  const applyStrike = () => {
    execEditorCommand(editorRef.current, "strikeThrough");
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

  const applyAlignLeft = () => {
    execEditorCommand(editorRef.current, "justifyLeft");
    syncFromEditor();
  };

  const applyAlignCenter = () => {
    execEditorCommand(editorRef.current, "justifyCenter");
    syncFromEditor();
  };

  const applyAlignRight = () => {
    execEditorCommand(editorRef.current, "justifyRight");
    syncFromEditor();
  };

  const applyListBullets = () => {
    execEditorCommand(editorRef.current, "insertUnorderedList");
    syncFromEditor();
  };

  const applyListOrdered = () => {
    execEditorCommand(editorRef.current, "insertOrderedList");
    syncFromEditor();
  };

  const outdent = () => {
    execEditorCommand(editorRef.current, "outdent");
    syncFromEditor();
  };

  const indent = () => {
    execEditorCommand(editorRef.current, "indent");
    syncFromEditor();
  };

  const formatParagraph = () => {
    execEditorCommand(editorRef.current, "formatBlock", "p");
    syncFromEditor();
  };

  const formatHeading2 = () => {
    execEditorCommand(editorRef.current, "formatBlock", "h2");
    syncFromEditor();
  };

  const insertVariableKey = (rawKey: string) => {
    const safe = rawKey.trim().replace(/[^a-zA-Z0-9_.-]/g, "");
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
    insertVariableKey(variableToInsert);
    setVariableToInsert("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {props.mode === "edit" ? "Modifier le contrat type" : "Créer un contrat type"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Utilise des variables sous la forme{" "}
            <span className="font-medium text-foreground">{"{{VARIABLE}}"}</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {props.onCancel && (
            <Button variant="outline" onClick={props.onCancel}>
              Retour
            </Button>
          )}
          <Button
            disabled={!title.trim()}
            onClick={async () => {
              if (!title.trim()) return;
              await props.onSave({
                title: title.trim(),
                htmlContent,
                variableKeys
              });
            }}
          >
            Enregistrer
          </Button>
        </div>
      </div>

      {/* Toolbar + editor */}
      <div className="rounded-md border bg-background p-3">
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/30 p-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" type="button" onMouseDown={(e) => e.preventDefault()} onClick={applyBold}>
              Gras
            </Button>
            <Button variant="outline" size="sm" type="button" onMouseDown={(e) => e.preventDefault()} onClick={applyItalic}>
              Italique
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={applyUnderline}
            >
              Souligné
            </Button>
            <Button variant="outline" size="sm" type="button" onMouseDown={(e) => e.preventDefault()} onClick={applyStrike}>
              Barré
            </Button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Taille :</span>
            {(["2", "3", "4", "5"] as const).map((t) => (
              <Button
                key={t}
                variant={sizeToken === t ? "default" : "outline"}
                size="sm"
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFontSize(t)}
              >
                {t === "2" ? "10" : t === "3" ? "12" : t === "4" ? "14" : "18"}
              </Button>
            ))}
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Align :</span>
              <Button variant="outline" size="sm" type="button" onMouseDown={(e) => e.preventDefault()} onClick={applyAlignLeft}>
                Gauche
              </Button>
              <Button variant="outline" size="sm" type="button" onMouseDown={(e) => e.preventDefault()} onClick={applyAlignCenter}>
                Centré
              </Button>
              <Button variant="outline" size="sm" type="button" onMouseDown={(e) => e.preventDefault()} onClick={applyAlignRight}>
                Droite
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Listes :</span>
              <Button variant="outline" size="sm" type="button" onMouseDown={(e) => e.preventDefault()} onClick={applyListBullets}>
                Puces
              </Button>
              <Button variant="outline" size="sm" type="button" onMouseDown={(e) => e.preventDefault()} onClick={applyListOrdered}>
                Num.
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Retrait :</span>
              <Button variant="outline" size="sm" type="button" onMouseDown={(e) => e.preventDefault()} onClick={outdent}>
                –
              </Button>
              <Button variant="outline" size="sm" type="button" onMouseDown={(e) => e.preventDefault()} onClick={indent}>
                +
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Style :</span>
              <Button variant="outline" size="sm" type="button" onMouseDown={(e) => e.preventDefault()} onClick={formatHeading2}>
                H2
              </Button>
              <Button variant="outline" size="sm" type="button" onMouseDown={(e) => e.preventDefault()} onClick={formatParagraph}>
                Paragraphe
              </Button>
            </div>

            <Button variant="outline" size="sm" className="w-full sm:w-auto" type="button" onClick={() => setBulkEditOpen(true)}>
              Modifier tout le texte
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="rounded-md border bg-background p-3">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="min-h-[520px] w-full whitespace-pre-wrap break-words outline-none"
                onInput={syncFromEditor}
                onBlur={syncFromEditor}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-md border bg-background p-3">
            <div>
              <p className="text-sm font-medium">Variables (visuel + guidé)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Insère <span className="font-medium text-foreground">{"{{NOM_VARIABLE}}"}</span> dans le template.
                Ensuite, dans le contrat spécifique, on te demandera les valeurs.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Exemples : <span className="font-medium text-foreground">{"{{CLIENT_NAME}}"}</span>,{" "}
                <span className="font-medium text-foreground">{"{{DATE}}"}</span>
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
                <Button type="button" variant="secondary" disabled={!variableToInsert.trim()} onMouseDown={(e) => e.preventDefault()} onClick={handleClickInsertVariable}>
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
                      variant="outline"
                      size="sm"
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

      {/* Bulk edit (v1) */}
      {bulkEditOpen && (
        <div className="fixed inset-0 z-[60] bg-black/70 p-4">
          <div className="mx-auto max-w-4xl rounded-md bg-background p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Modifier le HTML complet</p>
              <Button variant="outline" type="button" onClick={() => setBulkEditOpen(false)}>
                Fermer
              </Button>
            </div>
            <Textarea className="mt-3" value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} rows={16} />
            <div className="mt-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBulkEditOpen(false);
                  if (editorRef.current) editorRef.current.innerHTML = htmlContent;
                }}
              >
                Reprendre
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

