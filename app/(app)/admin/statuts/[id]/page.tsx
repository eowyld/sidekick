import { StatutEditPage } from "@/modules/admin/components/StatutEditPage";

export default async function AdminStatutEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StatutEditPage statusId={id} />;
}
