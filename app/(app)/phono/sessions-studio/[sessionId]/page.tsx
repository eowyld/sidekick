import { SessionEditPage } from "@/modules/phono/components/SessionEditPage";
export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) { const { sessionId } = await params; return <SessionEditPage sessionId={sessionId} />; }
