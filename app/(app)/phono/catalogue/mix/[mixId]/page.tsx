import { MixEditPage } from "@/modules/phono/components/mixes/MixEditPage";

export default async function EditerMixPage({
  params,
}: {
  params: Promise<{ mixId: string }>;
}) {
  const { mixId } = await params;
  return <MixEditPage mixId={mixId} />;
}
