import { createClient } from "@/lib/supabase";
import { createStorageFolder, deleteStorageFolder, renameStorageFolder } from "@/lib/drive-db";
import type { AdminStatus } from "@/lib/sidekick-store";

export async function ensureLockedFolderForStatus(status: AdminStatus): Promise<AdminStatus> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return status;

  const oldPath = typeof status.data?.folderPath === "string" ? status.data.folderPath : null;
  const targetName = status.nom.trim();
  let folderPath = oldPath;

  if (folderPath && oldPath) {
    const last = oldPath.split("/").pop() ?? "";
    if (last !== targetName) {
      await renameStorageFolder(supabase, oldPath, targetName);
      folderPath = `${oldPath.slice(0, oldPath.lastIndexOf("/") + 1)}${targetName}`;
    }
  } else {
    folderPath = await createStorageFolder(supabase, user.id, targetName, "Admin");
  }

  const normalized = folderPath.startsWith(`${user.id}/`)
    ? folderPath.slice(user.id.length + 1)
    : folderPath;
  await supabase.from("drive_locked_storage_templates").upsert(
    { path: normalized, is_active: true },
    { onConflict: "path" }
  );

  return {
    ...status,
    data: {
      ...(status.data ?? {}),
      folderPath,
    },
  };
}

export async function removeStatusLockedFolder(status: AdminStatus | undefined): Promise<void> {
  const folderPath = typeof status?.data?.folderPath === "string" ? status.data.folderPath : null;
  if (!folderPath) return;
  const supabase = createClient();
  await deleteStorageFolder(supabase, folderPath);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const normalized =
    user && folderPath.startsWith(`${user.id}/`) ? folderPath.slice(user.id.length + 1) : folderPath;
  await supabase.from("drive_locked_storage_templates").delete().eq("path", normalized);
}
