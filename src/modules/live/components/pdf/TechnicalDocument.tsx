import { Document, Page, View, Text, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import type { Contact } from "@/hooks/useContactsData";
import type { InvoiceTemplate, TechnicalLayout } from "@/lib/sidekick-store";
import { registerInvoiceFonts, resolveFontFamily } from "@/modules/incomes/components/pdf/fonts";
import { EQUIPMENT_CATEGORIES, PERSON_GROUPS, type TechnicalSheet } from "../../lib/live-model";
import { CATEGORY_COLOR, personName, type BroughtLine } from "../../lib/live-equipment";

registerInvoiceFonts();

/**
 * Fiche technique en PDF, habillée comme les factures : même police, même couleur
 * d'accent, même logo (réglages de facturation). Signée du nom de l'artiste
 * (`artist_name`), jamais de SIDEKICK : c'est le document de l'artiste, envoyé au lieu.
 * Trois mises en page au choix (Paramètres > Fiche technique).
 */
export type TechnicalDocumentInput = {
    artistName: string;
    /** Nom du live, ou lieu de la date. */
    title: string;
    /** Bandeau d'informations : date, lieu, spectacle, durée… Les valeurs vides sont ignorées. */
    meta: { label: string; value: string }[];
    sheet: TechnicalSheet;
    brought: BroughtLine[];
    contacts: Contact[];
    /** Déroulé de la journée d'une date. */
    schedule?: { time: string; activity: string }[];
    template: InvoiceTemplate;
    /** Logo de l'artiste, déjà filtré par son interrupteur (`logoFor(…, "technical")`). */
    logo?: string;
    /** Même logo, version sombre si possible : pour le bandeau coloré de la mise en page Affiche (`logoForDarkSpot`). */
    posterLogo?: string;
};

export const TECHNICAL_LAYOUTS: { value: TechnicalLayout; label: string; description: string }[] = [
    { value: "classic", label: "Classique", description: "Sections numérotées, bandeau d’informations, filets de couleur par catégorie." },
    { value: "poster", label: "Affiche", description: "Grand en-tête à ta couleur, matériel en cartes. Le plus visuel." },
    { value: "compact", label: "Compacte", description: "Dense et sobre, pensée pour tenir sur une page." },
];

const MUTED = "#6b7280";
const TEXT = "#111827";
const HAIRLINE = "#e5e7eb";
const SOFT = "#f3f4f6";

/** Texte lisible sur un fond de couleur : blanc sur fond sombre, encre sur fond clair. */
function onColor(hex: string): string {
    const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
    if (!m)
        return "#ffffff";
    const n = parseInt(m[1], 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? TEXT : "#ffffff";
}

function buildStyles(accent: string, fontFamily: string, layout: TechnicalLayout) {
    const compact = layout === "compact";
    const ink = onColor(accent);
    return StyleSheet.create({
        page: { fontFamily, fontSize: compact ? 8 : 9, color: TEXT, paddingTop: layout === "poster" ? 0 : compact ? 32 : 40, paddingBottom: 56, paddingHorizontal: compact ? 36 : 44, lineHeight: compact ? 1.3 : 1.4 },
        // Classique
        header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
        eyebrow: { fontSize: 8, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: accent, marginBottom: 6 },
        artist: { fontSize: 24, fontWeight: 700, lineHeight: 1.1 },
        title: { fontSize: 12, color: MUTED, marginTop: 4 },
        logo: { maxWidth: 140, maxHeight: 60, objectFit: "contain" },
        accentRule: { height: 3, backgroundColor: accent, marginBottom: 14, borderRadius: 2 },
        metaBand: { flexDirection: "row", flexWrap: "wrap", backgroundColor: SOFT, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 18 },
        metaItem: { width: "33%", paddingRight: 10, marginVertical: 3 },
        // Affiche
        band: { backgroundColor: accent, marginHorizontal: -44, paddingHorizontal: 44, paddingTop: 40, paddingBottom: 26, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
        bandEyebrow: { fontSize: 8, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: ink, opacity: 0.75, marginBottom: 8 },
        bandArtist: { fontSize: 34, fontWeight: 700, lineHeight: 1, color: ink },
        bandTitle: { fontSize: 13, color: ink, opacity: 0.85, marginTop: 8 },
        bandLogo: { maxWidth: 120, maxHeight: 56, objectFit: "contain" },
        tiles: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20, marginHorizontal: -4 },
        tile: { width: "33.33%", paddingHorizontal: 4, marginBottom: 8 },
        tileInner: { borderTopWidth: 2, borderTopColor: accent, paddingTop: 5 },
        // Compacte
        compactHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 8, borderBottomWidth: 1.5, borderBottomColor: accent, marginBottom: 6 },
        compactArtist: { fontSize: 16, fontWeight: 700 },
        compactKind: { fontSize: 8, color: accent, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" },
        compactMeta: { color: MUTED, fontSize: 7.5, marginBottom: 12 },
        compactLogo: { maxWidth: 90, maxHeight: 36, objectFit: "contain" },
        // Communs
        label: { fontSize: compact ? 6.5 : 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: MUTED, marginBottom: 2 },
        metaValue: { fontSize: 9.5, fontWeight: 600 },
        section: { marginBottom: compact ? 10 : 16 },
        sectionHead: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
        sectionNumber: { width: 18, height: 18, borderRadius: 9, backgroundColor: accent, alignItems: "center", justifyContent: "center", marginRight: 8 },
        sectionNumberText: { color: ink, fontSize: 8, fontWeight: 700, lineHeight: 1 },
        sectionTitle: { fontSize: 13, fontWeight: 700 },
        posterHead: { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: accent, paddingBottom: 4, borderBottomWidth: 1.5, borderBottomColor: accent, marginBottom: 8 },
        compactHead: { fontSize: 7.5, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: TEXT, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: HAIRLINE, marginBottom: 5 },
        groupLabel: { fontSize: compact ? 6.5 : 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: accent, marginTop: compact ? 2 : 4, marginBottom: compact ? 2 : 4 },
        personRow: { flexDirection: "row", paddingVertical: compact ? 2 : 4, borderBottomWidth: 1, borderBottomColor: HAIRLINE },
        colName: { width: "30%", fontWeight: 600, paddingRight: 6 },
        colRole: { width: "24%", color: MUTED, paddingRight: 6 },
        colPhone: { width: "20%", paddingRight: 6 },
        colMail: { width: "26%" },
        category: { marginBottom: 10, borderLeftWidth: 3, paddingLeft: 10 },
        categoryTitle: { fontSize: 10, fontWeight: 700, marginBottom: 4 },
        card: { marginBottom: 10, borderRadius: 4, borderWidth: 1, borderColor: HAIRLINE },
        cardHead: { paddingVertical: 5, paddingHorizontal: 10, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
        cardTitle: { fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" },
        cardBody: { paddingVertical: 8, paddingHorizontal: 10 },
        compactRow: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: HAIRLINE },
        compactCat: { width: 90, flexDirection: "row", alignItems: "flex-start", paddingRight: 6 },
        dot: { width: 6, height: 6, borderRadius: 3, marginTop: 2.5, marginRight: 5 },
        columns: { flexDirection: "row" },
        column: { flex: 1, paddingRight: compact ? 8 : 12 },
        itemRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: compact ? 1 : 2.5, borderBottomWidth: compact ? 0 : 1, borderBottomColor: HAIRLINE },
        qty: { width: compact ? 20 : 26, fontWeight: 700 },
        itemName: { flex: 1 },
        none: { color: MUTED, fontStyle: "italic", paddingVertical: compact ? 1 : 3 },
        details: { marginTop: 6, backgroundColor: SOFT, borderRadius: 3, paddingVertical: 6, paddingHorizontal: 8 },
        compactDetails: { marginTop: 2, color: MUTED, fontStyle: "italic" },
        scheduleRow: { flexDirection: "row", paddingVertical: compact ? 2 : 4, borderBottomWidth: 1, borderBottomColor: HAIRLINE },
        scheduleTime: { width: compact ? 44 : 60, fontWeight: 700, color: accent },
        footer: { position: "absolute", bottom: 26, left: compact ? 36 : 44, right: compact ? 36 : 44, color: MUTED, fontSize: 7, borderTopWidth: 1, borderTopColor: HAIRLINE, paddingTop: 8 },
    });
}

type Styles = ReturnType<typeof buildStyles>;

function SectionHead({ n, title, s, layout }: { n: number; title: string; s: Styles; layout: TechnicalLayout }) {
    if (layout === "poster")
        return <Text style={s.posterHead} minPresenceAhead={60}>{title}</Text>;
    if (layout === "compact")
        return <Text style={s.compactHead} minPresenceAhead={40}>{title}</Text>;
    return <View style={s.sectionHead} wrap={false} minPresenceAhead={60}>
    <View style={s.sectionNumber}><Text style={s.sectionNumberText}>{n}</Text></View>
    <Text style={s.sectionTitle}>{title}</Text>
    </View>;
}

function ItemList({ label, items, s }: { label: string; items: { name: string; quantity: number }[]; s: Styles }) {
    return <View style={s.column}>
    <Text style={s.label}>{label}</Text>
    {items.length ? items.map((item, i) => <View key={i} style={s.itemRow} wrap={false}>
        <Text style={s.qty}>{item.quantity}×</Text>
        <Text style={s.itemName}>{item.name}</Text>
        </View>) : <Text style={s.none}>Rien</Text>}
    </View>;
}

type Category = { label: string; color: string; brought: BroughtLine[]; venue: { name: string; quantity: number }[]; details: string };

function Header({ data, s, layout, heading, subtitle, meta }: { data: TechnicalDocumentInput; s: Styles; layout: TechnicalLayout; heading: string; subtitle: string; meta: { label: string; value: string }[] }) {
    const logo = data.logo;
    if (layout === "poster")
        return <>
        <View style={s.band}>
        <View style={{ flex: 1, paddingRight: 16 }}>
        <Text style={s.bandEyebrow}>Fiche technique</Text>
        <Text style={s.bandArtist}>{heading}</Text>
        {subtitle ? <Text style={s.bandTitle}>{subtitle}</Text> : null}
        </View>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        {data.posterLogo ?? logo ? <Image src={data.posterLogo ?? logo} style={s.bandLogo}/> : null}
        </View>
        {meta.length ? <View style={s.tiles}>
            {meta.map(m => <View key={m.label} style={s.tile}><View style={s.tileInner}>
            <Text style={s.label}>{m.label}</Text>
            <Text style={s.metaValue}>{m.value}</Text>
            </View></View>)}
        </View> : null}
        </>;
    if (layout === "compact")
        return <>
        <View style={s.compactHeader}>
        <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={s.compactKind}>Fiche technique</Text>
        <Text style={s.compactArtist}>{[heading, subtitle].filter(Boolean).join(" — ")}</Text>
        </View>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        {logo ? <Image src={logo} style={s.compactLogo}/> : null}
        </View>
        {meta.length ? <Text style={s.compactMeta}>{meta.map(m => `${m.label} : ${m.value}`).join("   ·   ")}</Text> : null}
        </>;
    return <>
    <View style={s.header}>
    <View style={{ flex: 1, paddingRight: 16 }}>
    <Text style={s.eyebrow}>Fiche technique</Text>
    <Text style={s.artist}>{heading}</Text>
    {subtitle ? <Text style={s.title}>{subtitle}</Text> : null}
    </View>
    {/* eslint-disable-next-line jsx-a11y/alt-text */}
    {logo ? <Image src={logo} style={s.logo}/> : null}
    </View>
    <View style={s.accentRule}/>
    {meta.length ? <View style={s.metaBand}>
        {meta.map(m => <View key={m.label} style={s.metaItem}>
        <Text style={s.label}>{m.label}</Text>
        <Text style={s.metaValue}>{m.value}</Text>
        </View>)}
    </View> : null}
    </>;
}

function Equipment({ categories, s, layout }: { categories: Category[]; s: Styles; layout: TechnicalLayout }) {
    if (!categories.length)
        return <Text style={s.none}>Non renseigné</Text>;
    if (layout === "compact")
        return <>
        {categories.map(c => <View key={c.label} style={s.compactRow} wrap={false}>
            <View style={s.compactCat}><View style={[s.dot, { backgroundColor: c.color }]}/><Text style={{ fontWeight: 700, flex: 1 }}>{c.label}</Text></View>
            <View style={{ flex: 1 }}>
            <View style={s.columns}>
            <ItemList label="Apporté" items={c.brought} s={s}/>
            <ItemList label="Fourni par le lieu" items={c.venue} s={s}/>
            </View>
            {c.details ? <Text style={s.compactDetails}>{c.details}</Text> : null}
            </View>
            </View>)}
        </>;
    if (layout === "poster")
        return <>
        {categories.map(c => <View key={c.label} style={s.card} wrap={false}>
            <View style={[s.cardHead, { backgroundColor: c.color }]}><Text style={[s.cardTitle, { color: onColor(c.color) }]}>{c.label}</Text></View>
            <View style={s.cardBody}>
            <View style={s.columns}>
            <ItemList label="Apporté par l’artiste" items={c.brought} s={s}/>
            <ItemList label="À fournir par le lieu" items={c.venue} s={s}/>
            </View>
            {c.details ? <View style={s.details}><Text style={s.label}>Détails</Text><Text>{c.details}</Text></View> : null}
            </View>
            </View>)}
        </>;
    return <>
    {categories.map(c => <View key={c.label} style={[s.category, { borderLeftColor: c.color }]} wrap={false}>
        <Text style={s.categoryTitle}>{c.label}</Text>
        <View style={s.columns}>
        <ItemList label="Apporté par l’artiste" items={c.brought} s={s}/>
        <ItemList label="À fournir par le lieu" items={c.venue} s={s}/>
        </View>
        {c.details ? <View style={s.details}><Text style={s.label}>Détails</Text><Text>{c.details}</Text></View> : null}
        </View>)}
    </>;
}

export function TechnicalDocument({ data }: { data: TechnicalDocumentInput }) {
    const layout = TECHNICAL_LAYOUTS.find(l => l.value === data.template.technicalLayout)?.value ?? "classic";
    const accent = data.template.accentColor || "#101010";
    const s = buildStyles(accent, resolveFontFamily(data.template.fontFamily), layout);
    const who = (p: TechnicalSheet["people"][number]) => (p.contactId && data.contacts.find(c => c.id === p.contactId)) || p;
    const groups = PERSON_GROUPS.map(([group, label]) => ({ label, people: data.sheet.people.filter(p => p.group === group).map(who) })).filter(g => g.people.length);
    const categories: Category[] = EQUIPMENT_CATEGORIES.map(([category, label]) => ({
        label,
        color: CATEGORY_COLOR[category],
        brought: data.brought.filter(b => b.category === category),
        venue: data.sheet.venue.filter(v => v.category === category),
        details: data.sheet.details[category].trim(),
    })).filter(c => c.brought.length || c.venue.length || c.details);
    const schedule = (data.schedule ?? []).filter(t => t.time || t.activity.trim());
    const meta = data.meta.filter(m => m.value.trim());
    // Sans nom d'artiste renseigné, le nom du live (ou du lieu) prend la tête.
    const heading = data.artistName.trim() || data.title;
    const subtitle = data.artistName.trim() ? data.title : "";
    let n = 0;
    return <Document title={`Fiche technique — ${data.title}`} author={data.artistName}>
    <Page size="A4" style={s.page}>
    <Header data={data} s={s} layout={layout} heading={heading} subtitle={subtitle} meta={meta}/>

    <View style={s.section}>
    <SectionHead n={++n} title="Équipe et contacts" s={s} layout={layout}/>
    {groups.length ? groups.map(g => <View key={g.label} style={{ marginBottom: layout === "compact" ? 4 : 8 }}>
        <Text style={s.groupLabel}>{g.label}</Text>
        {g.people.map((p, i) => <View key={i} style={s.personRow} wrap={false}>
        <Text style={s.colName}>{personName(p) || "—"}</Text>
        <Text style={s.colRole}>{p.role || ""}</Text>
        <Text style={s.colPhone}>{p.phone || ""}</Text>
        <Text style={s.colMail}>{p.email || ""}</Text>
        </View>)}
        </View>) : <Text style={s.none}>Non renseigné</Text>}
    </View>

    {schedule.length ? <View style={s.section}>
        <SectionHead n={++n} title="Déroulé de la journée" s={s} layout={layout}/>
        {schedule.map((t, i) => <View key={i} style={s.scheduleRow} wrap={false}>
            <Text style={s.scheduleTime}>{t.time || "—"}</Text>
            <Text style={{ flex: 1 }}>{t.activity}</Text>
            </View>)}
        </View> : null}

    <View style={s.section}>
    <SectionHead n={++n} title="Matériel" s={s} layout={layout}/>
    <Equipment categories={categories} s={s} layout={layout}/>
    </View>

    {/* Texte statique : dans cette version de react-pdf, un texte à `render` (numéro de page) ou une View fixe ne s'impriment pas. */}
    <Text style={s.footer} fixed>{[data.artistName, "Fiche technique", data.title].filter(Boolean).join(" · ")}</Text>
    </Page>
    </Document>;
}

export async function downloadTechnicalPDF(data: TechnicalDocumentInput) {
    const blob = await pdf(<TechnicalDocument data={data}/>).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Fiche-technique-${data.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "live"}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Révoquer tout de suite peut annuler le téléchargement avant qu'il démarre.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
