import { PresskitViewClient } from "./PresskitViewClient";

type Props = { searchParams: Promise<{ d?: string }> };

export default async function PresskitViewPage({ searchParams }: Props) {
  const params = await searchParams;
  const payloadParam = params.d ?? null;

  return <PresskitViewClient payloadParam={payloadParam} />;
}
