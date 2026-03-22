import { createServerSupabase } from "@/lib/supabase-server";
import type { PresskitProfile } from "@/modules/marketing/data/presskit";
import { PresskitViewClient } from "../PresskitViewClient";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PresskitViewIdPage({ params }: Props) {
  const { id } = await params;
  let payload: PresskitProfile | null = null;

  try {
    const supabase = await createServerSupabase();

    const { data: bySlug } = await supabase
      .from("presskit_user_slugs")
      .select("payload")
      .eq("slug", id)
      .single();

    if (bySlug?.payload) {
      payload = bySlug.payload as PresskitProfile;
    } else {
      const { data: byId } = await supabase
        .from("presskit_links")
        .select("payload")
        .eq("id", id)
        .single();
      if (byId?.payload) payload = byId.payload as PresskitProfile;
    }
  } catch {
    payload = null;
  }

  return <PresskitViewClient payloadDirect={payload} />;
}
