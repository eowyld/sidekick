"use client";
import { toast } from "sonner";
import { useArtistIdentity } from "@/hooks/useArtistIdentity";
import { useContactsData } from "@/hooks/useContactsData";
import { useLiveData } from "@/hooks/useLiveData";
import { usePreferencesData } from "@/hooks/usePreferencesData";
import { logoFor, logoForDarkSpot } from "@/lib/artist-logo";
import { durationSeconds, type SetlistTrack, type TechnicalSheet } from "../../lib/live-model";
import { resolveBrought } from "../../lib/live-equipment";

type Request = {
    title: string;
    meta: { label: string; value: string }[];
    sheet: TechnicalSheet;
    listIds: string[];
    schedule?: { time: string; activity: string }[];
    /** Ajoute la durée du set au bandeau, arrondie à la minute. */
    setlist?: SetlistTrack[];
};

/**
 * Téléchargement de la fiche technique : nom de l'artiste, habillage des factures,
 * contacts à jour. Le moteur PDF n'est chargé qu'au clic.
 */
export function useTechnicalPdf() {
    const { artistName, logo, logoExports } = useArtistIdentity();
    const { invoiceTemplate } = usePreferencesData();
    const { contacts } = useContactsData();
    const { equipmentLists, equipmentInventory } = useLiveData();
    return async ({ title, meta, sheet, listIds, schedule, setlist = [] }: Request) => {
        const seconds = setlist.reduce((n, t) => n + durationSeconds(t.duration), 0);
        if (seconds)
            meta = [...meta, { label: "Durée du set", value: `${Math.round(seconds / 60)} min · ${setlist.length} titre${setlist.length > 1 ? "s" : ""}` }];
        try {
            const { downloadTechnicalPDF } = await import("../pdf/TechnicalDocument");
            await downloadTechnicalPDF({ artistName, title, meta, sheet, schedule, contacts, template: invoiceTemplate, logo: logoFor(logo, logoExports, "technical"), posterLogo: logoForDarkSpot(logo, logoExports, "technical"), brought: resolveBrought(sheet, listIds, equipmentLists, equipmentInventory) });
        }
        catch (e) {
            console.error("[fiche technique PDF]", e);
            toast.error("Le PDF n’a pas pu être généré. Réessaie dans un instant.");
        }
    };
}
