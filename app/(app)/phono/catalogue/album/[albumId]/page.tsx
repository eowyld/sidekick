import { AlbumEditPage } from "@/modules/phono/components/albums/AlbumEditPage";

export default async function EditerAlbumPage({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const { albumId } = await params;
  return <AlbumEditPage albumId={albumId} />;
}
