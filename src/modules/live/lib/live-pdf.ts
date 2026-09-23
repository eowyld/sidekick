import { setlistDuration, type SetlistTrack } from "./live-model";
export type DocumentSection = {
    title: string;
    lines: string[];
};
export async function exportLivePDF(title: string, subtitle: string, sections: DocumentSection[]) {
    // Build UMD explicite : le specifier nu « jspdf » résout vers la build node
    // pendant la passe SSR, qui tire `fflate/lib/node.cjs` et son `new Worker(…,
    // { eval: true })` que Turbopack ne sait pas résoudre — l'erreur de compil
    // qui en découle fait tomber toutes les routes. Même import que ContractsPage
    // et PresskitPage.
    const { jsPDF } = (await import("jspdf/dist/jspdf.umd.min.js")) as unknown as typeof import("jspdf");
    const pdf = new jsPDF();
    let y = 22;
    const page = () => { pdf.addPage(); y = 22; };
    pdf.setFillColor(16, 16, 16);
    pdf.rect(0, 0, 210, 42, "F");
    pdf.setTextColor(240, 255, 0);
    pdf.setFontSize(10);
    pdf.text("SIDEKICK / LIVE", 16, 14);
    pdf.setTextColor(245, 245, 245);
    pdf.setFontSize(17);
    pdf.text(pdf.splitTextToSize(title, 178).slice(0, 2), 16, 25);
    y = 53;
    pdf.setTextColor(90);
    pdf.setFontSize(10);
    const sub = pdf.splitTextToSize(subtitle, 178);
    pdf.text(sub, 16, y);
    y += sub.length * 5 + 8;
    for (const section of sections) {
        if (y > 260)
            page();
        pdf.setTextColor(20);
        pdf.setFontSize(12);
        pdf.text(section.title, 16, y);
        y += 7;
        pdf.setFontSize(10);
        pdf.setTextColor(65);
        for (const line of section.lines.length ? section.lines : ["Non renseigné"]) {
            for (const wrapped of pdf.splitTextToSize(line || "—", 178)) {
                if (y > 278)
                    page();
                pdf.text(wrapped, 16, y);
                y += 5;
            }
            y += 2;
        }
        y += 7;
    }
    const pages = pdf.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(120);
        pdf.text(`SIDEKICK  |  ${i} / ${pages}`, 16, 289);
    }
    pdf.save(`${title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-").slice(0, 80)}.pdf`);
}
export function setlistSection(value: SetlistTrack[]): DocumentSection { return { title: `Setlist — ${setlistDuration(value)} min`, lines: value.map((t, i) => `${i + 1}. ${t.title || "Sans titre"}${t.artist ? ` — ${t.artist}` : ""}${t.duration ? ` (${t.duration})` : ""}${t.note ? `\n${t.note}` : ""}`) }; }
