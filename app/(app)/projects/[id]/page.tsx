import { ProjectDashboard } from "@/modules/projects/components/ProjectDashboard";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDashboard projectId={id} />;
}
