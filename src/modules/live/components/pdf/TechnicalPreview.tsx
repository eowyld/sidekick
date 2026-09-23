"use client";

import { PDFViewer } from "@react-pdf/renderer";
import { TechnicalDocument, type TechnicalDocumentInput } from "./TechnicalDocument";

/**
 * Aperçu live de la fiche technique, pour les paramètres.
 * À importer en dynamic(ssr:false) : react-pdf utilise des APIs navigateur.
 */
export default function TechnicalPreview({ data }: { data: TechnicalDocumentInput }) {
    return <div className="h-full overflow-hidden rounded-md border border-[rgba(245,245,245,0.12)] bg-white">
    <PDFViewer showToolbar={false} style={{ width: "100%", height: "100%", border: "none" }}>
    <TechnicalDocument data={data}/>
    </PDFViewer>
    </div>;
}
