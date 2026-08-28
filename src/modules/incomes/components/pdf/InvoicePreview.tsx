"use client";

import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { InvoiceDocument, type InvoiceDocumentData } from "./InvoiceDocument";

/**
 * Aperçu live + téléchargement du PDF de facture.
 * À importer en dynamic(ssr:false) — react-pdf utilise des APIs navigateur.
 */
export default function InvoicePreview({
  data,
  hideDownload,
  height = 720,
  fillHeight = false,
}: {
  data: InvoiceDocumentData;
  hideDownload?: boolean;
  height?: number;
  fillHeight?: boolean;
}) {
  const fileName = `${(data.number || "facture").replace(/[^\w.-]+/g, "_")}.pdf`;

  return (
    <div className={cn("flex flex-col gap-3", fillHeight && "h-full")}>
      {!hideDownload && (
        <div className="flex shrink-0 justify-end">
          <PDFDownloadLink
            document={<InvoiceDocument data={data} />}
            fileName={fileName}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-4 text-sm font-medium",
              "bg-[#F0FF00] text-[#0d0d0d] transition-colors hover:bg-[#F0FF00]/90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0FF00]/70",
            )}
          >
            {({ loading }) => (
              <>
                <Download className="h-4 w-4" />
                {loading ? "Préparation…" : "Télécharger le PDF"}
              </>
            )}
          </PDFDownloadLink>
        </div>
      )}
      <div className={cn("overflow-hidden rounded-md border border-[rgba(245,245,245,0.12)] bg-white", fillHeight && "flex-1 min-h-0")}>
        <PDFViewer
          showToolbar={false}
          style={{ width: "100%", height: fillHeight ? "100%" : height, border: "none" }}
        >
          <InvoiceDocument data={data} />
        </PDFViewer>
      </div>
    </div>
  );
}
