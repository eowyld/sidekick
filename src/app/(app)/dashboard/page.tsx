import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { DashboardPage as DashboardPageContent } from "@/modules/dashboard/components/DashboardPage";

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <DashboardPageContent />;
}
