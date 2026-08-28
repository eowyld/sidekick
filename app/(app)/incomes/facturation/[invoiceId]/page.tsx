import { InvoiceEditorPage } from "@/modules/incomes/components/InvoiceEditorPage";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  return <InvoiceEditorPage invoiceId={invoiceId} />;
}
