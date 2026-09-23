import { WorkEditPage } from "@/modules/edition/components/work/WorkEditPage";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkEditPage id={decodeURIComponent(id)} />;
}
