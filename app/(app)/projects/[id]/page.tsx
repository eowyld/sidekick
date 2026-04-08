import { ProjectDashboard } from "@/modules/projects/components/ProjectDashboard";

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  return <ProjectDashboard projectId={params.id} />;
}
