import { ListeningLinkEditorPage } from "@/modules/phono/components/ListeningLinkEditorPage";

export default async function EditListeningLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ListeningLinkEditorPage linkId={id} />;
}
