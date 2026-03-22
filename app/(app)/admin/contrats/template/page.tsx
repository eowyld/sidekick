"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TemplateEditorFullPage } from "@/modules/admin/components/contract/TemplateEditorFullPage";
import { useContractsData } from "@/hooks/useContractsData";

export default function TemplatePage() {
  const router = useRouter();
  const params = useSearchParams();
  const modeParam = params.get("mode");
  const templateId = params.get("templateId");

  const mode = modeParam === "edit" ? "edit" : "create";

  const { templates, addTemplate, saveTemplate } = useContractsData();

  const template = useMemo(() => {
    if (mode !== "edit") return null;
    if (!templateId) return null;
    return templates.find((t) => t.id === templateId) ?? null;
  }, [mode, templateId, templates]);

  return (
    <TemplateEditorFullPage
      mode={mode}
      initial={template ? { title: template.title, htmlContent: template.htmlContent } : undefined}
      onCancel={() => router.push("/admin/contrats")}
      onSave={async ({ title, htmlContent, variableKeys }) => {
        if (mode === "edit" && template) {
          await saveTemplate(template.id, { title, htmlContent, variableKeys });
        } else {
          await addTemplate({ title, htmlContent, variableKeys });
        }
        router.push("/admin/contrats");
      }}
    />
  );
}

