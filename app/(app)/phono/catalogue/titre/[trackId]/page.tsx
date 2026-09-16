import { TrackEditPage } from "@/modules/phono/components/tracks/TrackEditPage";

export default async function EditerTitrePage({
  params,
}: {
  params: Promise<{ trackId: string }>;
}) {
  const { trackId } = await params;
  return <TrackEditPage trackId={trackId} />;
}
