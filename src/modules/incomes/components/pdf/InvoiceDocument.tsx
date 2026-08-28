import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { InvoiceLine, InvoiceStatus } from "@/hooks/useIncomesData";
import { DEFAULT_TERMS_AND_CONDITIONS, type InvoiceTemplate } from "@/lib/sidekick-store";
import { computeTotals, formatMoney, parseAmount } from "../invoice-utils";
import { registerInvoiceFonts, resolveFontFamily } from "./fonts";

registerInvoiceFonts();

export interface InvoiceIssuer {
  name: string;
  addressLines: string[];
  siret?: string;
  vatNumber?: string;
  iban?: string;
  bic?: string;
}

export interface InvoiceDocumentData {
  number: string;
  client: string;
  clientAddress?: string;
  clientSiret?: string;
  clientVatNumber?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientExtraInfo?: string;
  subject?: string;
  issueDate?: string;
  dueDate?: string;
  status: InvoiceStatus;
  incomeType?: string;
  lines: InvoiceLine[];
  notes?: string;
  issuer: InvoiceIssuer;
  template: InvoiceTemplate;
}

const MUTED = "#6b7280";
const TEXT = "#111827";
const HAIRLINE = "#e5e7eb";

function buildStyles(accent: string, fontFamily: string) {
  return StyleSheet.create({
    page: {
      fontFamily,
      fontSize: 9,
      color: TEXT,
      paddingTop: 40,
      paddingBottom: 56,
      paddingHorizontal: 44,
      lineHeight: 1.4,
    },
    // En-tête : émetteur gauche / client droite
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 20,
    },
    headerLeft: { maxWidth: 260 },
    headerRight: { maxWidth: 220, alignItems: "flex-end" },
    logo: { maxWidth: 160, maxHeight: 64, objectFit: "contain", alignSelf: "flex-start" },
    issuerName: { fontSize: 14, fontWeight: 700, color: accent, marginBottom: 4 },
    issuerLine: { color: MUTED, fontSize: 8.5 },
    sectionLabel: {
      fontSize: 7.5,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 1,
      color: MUTED,
      marginBottom: 4,
    },
    clientName: { fontSize: 11, fontWeight: 600, marginBottom: 2 },
    clientLine: { color: MUTED, fontSize: 8.5, textAlign: "right" },
    // Bandeau méta facture
    metaBand: {
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: "#f3f4f6",
      borderRadius: 4,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginBottom: 20,
    },
    metaItem: { alignItems: "center" },
    metaItemLeft: { alignItems: "flex-start" },
    metaItemRight: { alignItems: "flex-end" },
    metaLabel: { color: MUTED, fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 },
    metaValue: { fontSize: 9, fontWeight: 600, color: TEXT },
    // Objet
    subject: {
      marginBottom: 16,
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: "#f9fafb",
      borderRadius: 4,
    },
    table: { marginBottom: 16 },
    tHead: {
      flexDirection: "row",
      backgroundColor: accent,
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
    },
    th: { color: "#ffffff", fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 },
    tRow: {
      flexDirection: "row",
      paddingVertical: 7,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: HAIRLINE,
    },
    td: { fontSize: 8.5 },
    colDesc: { flex: 1, paddingRight: 8 },
    colQty: { width: 38, textAlign: "right" },
    colPu: { width: 64, textAlign: "right" },
    colVat: { width: 44, textAlign: "right" },
    colTotal: { width: 70, textAlign: "right" },
    descType: { color: MUTED, fontSize: 7.5, marginTop: 1 },
    totals: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 22 },
    totalsBox: { width: 230 },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
    },
    totalLabel: { color: MUTED, fontSize: 9 },
    totalValue: { fontSize: 9, fontWeight: 600 },
    grandRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 4,
      paddingTop: 8,
      paddingBottom: 8,
      paddingHorizontal: 10,
      backgroundColor: accent,
      borderRadius: 4,
    },
    grandLabel: { color: "#ffffff", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 },
    grandValue: { color: "#ffffff", fontSize: 12, fontWeight: 700 },
    payment: {
      marginBottom: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: HAIRLINE,
      flexDirection: "row",
    },
    payCol: { flex: 1 },
    notes: { color: MUTED, fontSize: 8, lineHeight: 1.5 },
    terms: {
      marginBottom: 14,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: HAIRLINE,
    },
    termsText: { color: MUTED, fontSize: 7.5, lineHeight: 1.6 },
    footer: {
      position: "absolute",
      bottom: 28,
      left: 44,
      right: 44,
      textAlign: "center",
      color: MUTED,
      fontSize: 7,
      borderTopWidth: 1,
      borderTopColor: HAIRLINE,
      paddingTop: 8,
    },
  });
}

export function InvoiceDocument({ data }: { data: InvoiceDocumentData }) {
  const accent = data.template.accentColor || "#101010";
  const fontFamily = resolveFontFamily(data.template.fontFamily);
  const s = buildStyles(accent, fontFamily);

  const lines = data.lines.filter(
    (l) => l.description.trim() || parseAmount(l.unitPrice) > 0
  );
  const { totalHT, totalTTC } = computeTotals(lines);
  const totalTVA = totalTTC - totalHT;
  const hasVat = totalTVA > 0.005;

  return (
    <Document title={`Facture ${data.number}`} author={data.issuer.name}>
      <Page size="A4" style={s.page}>
        {/* En-tête : émetteur gauche / client droite */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {data.template.logoDataUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={data.template.logoDataUrl} style={s.logo} />
            ) : (
              <Text style={s.issuerName}>{data.issuer.name}</Text>
            )}
            {data.template.logoDataUrl ? (
              <Text style={[s.issuerLine, { marginTop: 6, fontWeight: 600, color: TEXT }]}>
                {data.issuer.name}
              </Text>
            ) : null}
            {data.issuer.addressLines.map((line, i) => (
              <Text key={i} style={s.issuerLine}>{line}</Text>
            ))}
            {data.issuer.siret ? <Text style={s.issuerLine}>SIRET {data.issuer.siret}</Text> : null}
            {data.issuer.vatNumber ? <Text style={s.issuerLine}>TVA {data.issuer.vatNumber}</Text> : null}
          </View>

          <View style={s.headerRight}>
            <Text style={s.sectionLabel}>Facturé à</Text>
            <Text style={s.clientName}>{data.client || "—"}</Text>
            {data.clientAddress ? <Text style={s.clientLine}>{data.clientAddress}</Text> : null}
            {data.clientSiret ? <Text style={s.clientLine}>SIRET {data.clientSiret}</Text> : null}
            {data.clientVatNumber ? <Text style={s.clientLine}>TVA {data.clientVatNumber}</Text> : null}
            {data.clientEmail ? <Text style={s.clientLine}>{data.clientEmail}</Text> : null}
            {data.clientPhone ? <Text style={s.clientLine}>{data.clientPhone}</Text> : null}
            {data.clientExtraInfo
              ? data.clientExtraInfo.split("\n").map((line, i) => (
                  <Text key={i} style={s.clientLine}>{line}</Text>
                ))
              : null}
          </View>
        </View>

        {/* Bandeau méta : N° / Date d'émission / Échéance */}
        <View style={s.metaBand}>
          <View style={s.metaItemLeft}>
            <Text style={s.metaLabel}>Facture</Text>
            <Text style={s.metaValue}>{data.number || "—"}</Text>
          </View>
          {data.issueDate ? (
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>Émise le</Text>
              <Text style={s.metaValue}>{data.issueDate}</Text>
            </View>
          ) : null}
          {data.dueDate ? (
            <View style={s.metaItemRight}>
              <Text style={s.metaLabel}>Échéance</Text>
              <Text style={s.metaValue}>{data.dueDate}</Text>
            </View>
          ) : null}
        </View>

        {/* Objet */}
        {data.subject ? (
          <View style={s.subject}>
            <Text style={s.sectionLabel}>Objet</Text>
            <Text style={{ fontSize: 9 }}>{data.subject}</Text>
          </View>
        ) : null}

        {/* Tableau des lignes */}
        <View style={s.table}>
          <View style={s.tHead}>
            <Text style={[s.th, s.colDesc]}>Description</Text>
            <Text style={[s.th, s.colQty]}>Qté</Text>
            <Text style={[s.th, s.colPu]}>Prix unit.</Text>
            {hasVat ? <Text style={[s.th, s.colVat]}>TVA</Text> : null}
            <Text style={[s.th, s.colTotal]}>Total HT</Text>
          </View>
          {lines.length > 0 ? (
            lines.map((line) => {
              const lineHt = parseAmount(line.quantity) * parseAmount(line.unitPrice);
              return (
                <View key={line.id} style={s.tRow} wrap={false}>
                  <View style={s.colDesc}>
                    <Text style={s.td}>{line.description.trim() || "—"}</Text>
                    <Text style={s.descType}>
                      {line.type === "service" ? "Service" : "Vente de marchandise"}
                    </Text>
                  </View>
                  <Text style={[s.td, s.colQty]}>{line.quantity || "0"}</Text>
                  <Text style={[s.td, s.colPu]}>{formatMoney(parseAmount(line.unitPrice))} €</Text>
                  {hasVat ? (
                    <Text style={[s.td, s.colVat]}>{parseAmount(line.vatPercent)} %</Text>
                  ) : null}
                  <Text style={[s.td, s.colTotal]}>{formatMoney(lineHt)} €</Text>
                </View>
              );
            })
          ) : (
            <View style={s.tRow}>
              <Text style={[s.td, s.colDesc, { color: MUTED }]}>Aucune ligne</Text>
            </View>
          )}
        </View>

        {/* Totaux */}
        <View style={s.totals}>
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total HT</Text>
              <Text style={s.totalValue}>{formatMoney(totalHT)} €</Text>
            </View>
            {hasVat ? (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>TVA</Text>
                <Text style={s.totalValue}>{formatMoney(totalTVA)} €</Text>
              </View>
            ) : null}
            <View style={s.grandRow}>
              <Text style={s.grandLabel}>Total TTC</Text>
              <Text style={s.grandValue}>{formatMoney(totalTTC)} €</Text>
            </View>
            {!hasVat ? (
              <Text style={[s.notes, { marginTop: 6 }]}>
                TVA non applicable, art. 293 B du CGI.
              </Text>
            ) : null}
          </View>
        </View>

        {/* Coordonnées bancaires + notes */}
        {(data.issuer.iban || data.issuer.bic || data.notes) ? (
          <View style={s.payment}>
            {data.issuer.iban || data.issuer.bic ? (
              <View style={s.payCol}>
                <Text style={s.sectionLabel}>Règlement</Text>
                {data.issuer.iban ? <Text style={s.notes}>IBAN : {data.issuer.iban}</Text> : null}
                {data.issuer.bic ? <Text style={s.notes}>BIC : {data.issuer.bic}</Text> : null}
              </View>
            ) : null}
            {data.notes ? (
              <View style={s.payCol}>
                <Text style={s.sectionLabel}>Notes</Text>
                <Text style={s.notes}>{data.notes}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Termes et conditions */}
        {(() => {
          const terms = data.template.termsAndConditions ?? DEFAULT_TERMS_AND_CONDITIONS;
          return terms.trim() ? (
            <View style={s.terms}>
              <Text style={s.sectionLabel}>Termes et conditions</Text>
              {terms.split("\n").filter(Boolean).map((line, i) => (
                <Text key={i} style={s.termsText}>{line}</Text>
              ))}
            </View>
          ) : null;
        })()}

        {/* Pied de page */}
        <Text style={s.footer} fixed>
          {data.issuer.name}
          {data.issuer.siret ? ` · SIRET ${data.issuer.siret}` : ""}
          {data.issuer.vatNumber ? ` · TVA ${data.issuer.vatNumber}` : ""}
        </Text>
      </Page>
    </Document>
  );
}
