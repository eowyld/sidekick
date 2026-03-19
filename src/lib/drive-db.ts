import type { SupabaseClient } from "@supabase/supabase-js";

export interface DriveFolderRow {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  is_system?: boolean | null;
  created_at?: string | null;
}

export interface DriveDocumentRow {
  id: string;
  user_id: string;
  title: string;
  folder_id: string | null;
  link: string | null;
  category: string | null;
  source_module: string | null;
  notes: string | null;
  date_added: string | null;
  date_modified: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_system?: boolean | null;
  file_size_bytes?: number | null;
  file_extension?: string | null;
  storage_path?: string | null;
}

export interface DriveFolder {
  id: string;
  name: string;
  parentId?: string | null;
  isSystem?: boolean;
  createdAt?: string | null;
}

export interface DriveDocument {
  id: string;
  title: string;
  folderId?: string | null;
  link?: string | null;
  category?: string | null;
  sourceModule?: string | null;
  notes?: string | null;
  dateAdded?: string | null;
  dateModified?: string | null;
  isSystem?: boolean;
  fileSizeBytes?: number | null;
  fileExtension?: string | null;
  storagePath?: string | null;
}

export type DriveDocumentInsert = Omit<DriveDocument, "id"> & { id?: string };

function rowToFolder(row: DriveFolderRow): DriveFolder {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id ?? null,
    isSystem: row.is_system === true,
    createdAt: row.created_at ?? undefined
  };
}

function rowToDocument(row: DriveDocumentRow): DriveDocument {
  return {
    id: row.id,
    title: row.title,
    folderId: row.folder_id ?? null,
    link: row.link ?? undefined,
    category: row.category ?? undefined,
    sourceModule: row.source_module ?? undefined,
    notes: row.notes ?? undefined,
    dateAdded: row.date_added ?? undefined,
    dateModified: row.date_modified ?? undefined,
    isSystem: row.is_system === true,
    fileSizeBytes: row.file_size_bytes ?? undefined,
    fileExtension: row.file_extension ?? undefined,
    storagePath: row.storage_path ?? undefined
  };
}

export async function fetchUserFolders(
  supabase: SupabaseClient,
  userId: string
): Promise<DriveFolder[]> {
  const { data, error } = await supabase
    .from("user_document_folders")
    .select("id, user_id, name, parent_id, is_system, created_at")
    .eq("user_id", userId)
    .order("name");

  if (error) {
    const msg = error.message ?? String(error);
    const missingCol =
      (msg.includes("parent_id") || msg.includes("is_system")) &&
      (msg.includes("does not exist") || msg.includes("column"));
    if (missingCol) {
      const { data: fallback, error: err2 } = await supabase
        .from("user_document_folders")
        .select("id, user_id, name, created_at")
        .eq("user_id", userId)
        .order("name");
      if (err2) throw err2;
      return (fallback ?? []).map((r) =>
        rowToFolder({ ...r, parent_id: null, is_system: false } as DriveFolderRow)
      );
    }
    throw error;
  }
  return (data ?? []).map((row) => rowToFolder(row as DriveFolderRow));
}

export async function fetchUserDocuments(
  supabase: SupabaseClient,
  userId: string
): Promise<DriveDocument[]> {
  const cols =
    "id, user_id, title, folder_id, link, category, source_module, notes, date_added, date_modified, is_system, file_size_bytes, file_extension, storage_path";
  const { data, error } = await supabase
    .from("user_documents")
    .select(cols)
    .eq("user_id", userId)
    .order("date_modified", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    const msg = error.message ?? String(error);
    if (
      msg.includes("storage_path") &&
      (msg.includes("does not exist") || msg.includes("column"))
    ) {
      const { data: fallback, error: err2 } = await supabase
        .from("user_documents")
        .select(
          "id, user_id, title, folder_id, link, category, source_module, notes, date_added, date_modified, is_system, file_size_bytes, file_extension"
        )
        .eq("user_id", userId)
        .order("date_modified", { ascending: false })
        .order("created_at", { ascending: false });
      if (err2) throw err2;
      return (fallback ?? []).map((row) =>
        rowToDocument({ ...row, storage_path: null } as DriveDocumentRow)
      );
    }
    throw error;
  }
  return (data ?? []).map((row) => rowToDocument(row as DriveDocumentRow));
}

async function fetchUserStorage(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("user_drive_storage")
    .select("storage_used_bytes")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data?.storage_used_bytes as number | null) ?? 0;
}

export async function getUserStorageUsed(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const actualUsed = await calculateStorageUsedFromFiles(supabase, userId);
  const storedUsed = await fetchUserStorage(supabase, userId);
  if (Math.abs(actualUsed - storedUsed) > 1024) {
    await supabase.from("user_drive_storage").upsert(
      { user_id: userId, storage_used_bytes: actualUsed, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  }
  return actualUsed;
}

export async function addStorageUsed(
  supabase: SupabaseClient,
  userId: string,
  bytes: number
): Promise<void> {
  const current = await fetchUserStorage(supabase, userId);
  const newTotal = current + bytes;
  const { error } = await supabase.from("user_drive_storage").upsert(
    { user_id: userId, storage_used_bytes: newTotal, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export async function subtractStorageUsed(
  supabase: SupabaseClient,
  userId: string,
  bytes: number
): Promise<void> {
  const current = await fetchUserStorage(supabase, userId);
  const newTotal = Math.max(0, current - bytes);
  const { error } = await supabase.from("user_drive_storage").upsert(
    { user_id: userId, storage_used_bytes: newTotal, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export async function insertDocument(
  supabase: SupabaseClient,
  userId: string,
  doc: DriveDocumentInsert
): Promise<DriveDocument> {
  const today = new Date().toISOString().slice(0, 10);
  const payload: Record<string, unknown> = {
    user_id: userId,
    title: doc.title,
    folder_id: doc.folderId ?? null,
    link: doc.link ?? null,
    category: doc.category ?? null,
    source_module: doc.sourceModule ?? null,
    notes: doc.notes ?? null,
    date_added: doc.dateAdded ?? today,
    date_modified: doc.dateModified ?? today
  };
  if (doc.fileSizeBytes != null) payload.file_size_bytes = doc.fileSizeBytes;
  if (doc.fileExtension != null) payload.file_extension = doc.fileExtension;
  if (doc.isSystem === true) payload.is_system = true;
  if (doc.storagePath != null) payload.storage_path = doc.storagePath;

  const { data, error } = await supabase
    .from("user_documents")
    .insert(payload)
    .select()
    .single();

  if (error) {
    const msg = error.message ?? String(error);
    if (
      doc.storagePath != null &&
      msg.includes("storage_path") &&
      (msg.includes("does not exist") || msg.includes("column"))
    ) {
      const fallback = { ...payload } as Record<string, unknown>;
      delete fallback.storage_path;
      const res = await supabase.from("user_documents").insert(fallback).select().single();
      if (res.error) throw res.error;
      return rowToDocument(res.data as DriveDocumentRow);
    }
    throw error;
  }
  return rowToDocument(data as DriveDocumentRow);
}

export async function updateDocument(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
  updates: { title?: string; folderId?: string | null }
): Promise<DriveDocument> {
  const { data: existing } = await supabase
    .from("user_documents")
    .select("is_system")
    .eq("id", documentId)
    .eq("user_id", userId)
    .single();
  if (existing && (existing as { is_system?: boolean }).is_system) {
    throw new Error("Ce document est verrouillé et ne peut pas être modifié.");
  }
  const today = new Date().toISOString().slice(0, 10);
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.folderId !== undefined) payload.folder_id = updates.folderId ?? null;
  if (updates.title !== undefined || updates.folderId !== undefined) {
    payload.date_modified = today;
  }
  const { data, error } = await supabase
    .from("user_documents")
    .update(payload)
    .eq("id", documentId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return rowToDocument(data as DriveDocumentRow);
}

export async function deleteDocument(
  supabase: SupabaseClient,
  userId: string,
  documentId: string
): Promise<void> {
  type ExistingRow = { is_system?: boolean; file_size_bytes?: number | null; storage_path?: string | null } | null;
  let existing: ExistingRow = null;
  const { data: data1, error: err1 } = await supabase
    .from("user_documents")
    .select("is_system, file_size_bytes, storage_path")
    .eq("id", documentId)
    .eq("user_id", userId)
    .single();

  if (err1) {
    const msg = err1.message ?? String(err1);
    if (
      msg.includes("storage_path") &&
      (msg.includes("does not exist") || msg.includes("column"))
    ) {
      const { data: data2, error: err2 } = await supabase
        .from("user_documents")
        .select("is_system, file_size_bytes")
        .eq("id", documentId)
        .eq("user_id", userId)
        .single();
      if (err2) throw err2;
      existing = data2 as ExistingRow;
    } else throw err1;
  } else existing = data1 as ExistingRow;

  if (existing && existing.is_system) {
    throw new Error("Ce document est verrouillé et ne peut pas être supprimé.");
  }

  const storagePath = existing?.storage_path;
  if (storagePath && typeof storagePath === "string") {
    await supabase.storage.from(DRIVE_BUCKET).remove([storagePath]);
  }

  const fileSizeBytes = existing?.file_size_bytes;
  if (fileSizeBytes != null && fileSizeBytes > 0) {
    await subtractStorageUsed(supabase, userId, fileSizeBytes);
  }

  const { error } = await supabase
    .from("user_documents")
    .delete()
    .eq("id", documentId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function insertFolder(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  options?: { parentId?: string | null; isSystem?: boolean }
): Promise<DriveFolder> {
  const payload: Record<string, unknown> = { user_id: userId, name };
  if (options?.parentId !== undefined) payload.parent_id = options.parentId ?? null;
  if (options?.isSystem === true) payload.is_system = true;

  const { data, error } = await supabase
    .from("user_document_folders")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return rowToFolder(data as DriveFolderRow);
}

export async function updateFolder(
  supabase: SupabaseClient,
  userId: string,
  folderId: string,
  updates: { name: string }
): Promise<DriveFolder> {
  const { data: existing } = await supabase
    .from("user_document_folders")
    .select("is_system")
    .eq("id", folderId)
    .eq("user_id", userId)
    .single();
  if (existing && (existing as { is_system?: boolean }).is_system) {
    throw new Error("Ce dossier est verrouillé et ne peut pas être renommé.");
  }
  const { data, error } = await supabase
    .from("user_document_folders")
    .update({ name: updates.name })
    .eq("id", folderId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return rowToFolder(data as DriveFolderRow);
}

export async function deleteFolder(
  supabase: SupabaseClient,
  userId: string,
  folderId: string
): Promise<void> {
  const { error: docsError } = await supabase
    .from("user_documents")
    .delete()
    .eq("user_id", userId)
    .eq("folder_id", folderId);

  if (docsError) throw docsError;

  const { error } = await supabase
    .from("user_document_folders")
    .delete()
    .eq("id", folderId)
    .eq("user_id", userId);

  if (error) throw error;
}

export const DRIVE_BUCKET = "drive";

function sanitizePathSegment(segment: string): string {
  return (
    segment
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "folder"
  );
}

export interface UploadDriveResult {
  url: string;
  path: string;
}

export async function uploadDriveFileToPath(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  subPath: string,
  onProgress?: (progress: number) => void
): Promise<UploadDriveResult> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const maxFileMB = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    throw new Error(
      `Taille maximale par fichier dépassée. Maximum: ${maxFileMB} MB.`
    );
  }
  const currentUsed = await getUserStorageUsed(supabase, userId);
  if (currentUsed + file.size > STORAGE_LIMIT_BYTES) {
    const usedGB = (currentUsed / (1024 * 1024 * 1024)).toFixed(2);
    throw new Error(
      `Espace de stockage insuffisant. Utilisé : ${usedGB} GB / 1 GB. Taille du fichier : ${(file.size / (1024 * 1024)).toFixed(2)} MB.`
    );
  }

  const segments = subPath
    .replace(/\.\./g, "")
    .split("/")
    .filter(Boolean)
    .map(sanitizePathSegment);
  const sanitized = segments.join("/");
  const rawBase = file.name.includes(".")
    ? file.name.slice(0, file.name.lastIndexOf("."))
    : file.name;
  const safeBase = sanitizePathSegment(rawBase) || "fichier";
  const rawExt = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf("."))
    : "";
  const safeExt = rawExt
    .replace(/[^a-zA-Z0-9.]/g, "")
    .replace(/^\.+/, ".")
    .slice(0, 20);
  const path = [userId, sanitized, `${safeBase}${safeExt}`].filter(Boolean).join("/");

  if (onProgress) {
    onProgress(10);
  }

  const { error } = await supabase.storage.from(DRIVE_BUCKET).upload(path, file, {
    upsert: false,
    cacheControl: "3600"
  });

  if (error) throw new Error(error.message ?? String(error));

  if (onProgress) {
    onProgress(90);
  }

  await addStorageUsed(supabase, userId, file.size);

  if (onProgress) {
    onProgress(100);
  }

  const { data: urlData } = supabase.storage.from(DRIVE_BUCKET).getPublicUrl(path);
  return { url: urlData.publicUrl, path };
}

export async function uploadDriveFile(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<UploadDriveResult> {
  return uploadDriveFileToPath(supabase, userId, file, "");
}

/** Crée un dossier Storage via un placeholder invisible. */
export async function createStorageFolder(
  supabase: SupabaseClient,
  userId: string,
  folderName: string,
  parentPathUnderUser = ""
): Promise<string> {
  const safeFolderName = sanitizePathSegment(folderName.trim()) || "folder";
  const parentSegments = parentPathUnderUser
    .replace(/\.\./g, "")
    .split("/")
    .filter(Boolean)
    .map(sanitizePathSegment);
  const folderPath = [...parentSegments, safeFolderName].filter(Boolean).join("/");
  const objectPath = [userId, folderPath, ".emptyfolderplaceholder"].filter(Boolean).join("/");

  const { error } = await supabase.storage
    .from(DRIVE_BUCKET)
    .upload(objectPath, new Blob([""]), { upsert: true, contentType: "text/plain" });

  if (error) throw new Error(error.message ?? String(error));
  return [userId, folderPath].filter(Boolean).join("/");
}

/** Préfixe d'id pour les dossiers Storage (non gérés par user_document_folders). */
export const STORAGE_FOLDER_PREFIX = "storage:";

/** Noms de fichiers/dossiers placeholders (dossiers vides) à ne pas afficher. */
const STORAGE_PLACEHOLDER_NAMES = new Set([
  "_dossier_vide",
  ".emptyfolderplaceholder",
  "dossier vide",
  "empty folder",
  "emptyfolderplaceholder",
  ".dossier_vide"
]);

export function isPlaceholderFileName(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  const n = name.trim().toLowerCase();
  if (STORAGE_PLACEHOLDER_NAMES.has(n)) return true;
  if (n.includes("dossier vide") || n.includes("emptyfolder")) return true;
  return false;
}

/** Liste les noms des dossiers à la racine Storage de l'utilisateur (ex: Admin, contacts, Revenus). */
export async function listStorageRootFolders(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(DRIVE_BUCKET)
    .list(userId, { limit: 500, sortBy: { column: "name", order: "asc" } });

  if (error) return [];
  const names = (data ?? [])
    .map((x) => x.name)
    .filter((n): n is string => Boolean(n) && !isPlaceholderFileName(n));
  return names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export interface StorageFileEntry {
  name: string;
  path: string;
  url: string;
  sizeBytes: number;
  updatedAt?: string | null;
}

export interface StorageFolderEntry {
  name: string;
  path: string;
  createdAt?: string | null;
}

export interface StorageContentsResult {
  folders: StorageFolderEntry[];
  files: StorageFileEntry[];
}

function hasFileSizeMetadata(item: { metadata?: { size?: unknown } | null }): boolean {
  return typeof item.metadata?.size === "number";
}


/** Liste le contenu d'un dossier Storage (sous-dossiers + fichiers). Les placeholders de dossiers vides sont exclus. */
export async function listStorageContents(
  supabase: SupabaseClient,
  folderPath: string
): Promise<StorageContentsResult> {
  const { data, error } = await supabase.storage
    .from(DRIVE_BUCKET)
    .list(folderPath, { limit: 500, sortBy: { column: "name", order: "asc" } });

  if (error) return { folders: [], files: [] };
  const items = data ?? [];
  const folders: StorageFolderEntry[] = [];
  const files: StorageFileEntry[] = [];

  for (const item of items) {
    const name = item.name;
    if (!name) continue;
    if (isPlaceholderFileName(name)) continue;
    const childPath = folderPath ? `${folderPath}/${name}` : name;
    if (hasFileSizeMetadata(item)) {
      const { data: urlData } = supabase.storage.from(DRIVE_BUCKET).getPublicUrl(childPath);
      files.push({
        name,
        path: childPath,
        url: urlData.publicUrl,
        sizeBytes: Number(item.metadata?.size) || 0,
        updatedAt: ("updated_at" in item ? (item.updated_at as string | null) : null) ?? null
      });
      continue;
    }

    const { data: childData } = await supabase.storage
      .from(DRIVE_BUCKET)
      .list(childPath, { limit: 1 });
    const isFolder = (childData?.length ?? 0) > 0;
    if (isFolder) {
      folders.push({
        name,
        path: childPath,
        createdAt: ("created_at" in item ? (item.created_at as string | null) : null) ?? null
      });
    } else {
      const { data: urlData } = supabase.storage.from(DRIVE_BUCKET).getPublicUrl(childPath);
      files.push({
        name,
        path: childPath,
        url: urlData.publicUrl,
        sizeBytes: Number(item.metadata?.size) || 0,
        updatedAt: ("updated_at" in item ? (item.updated_at as string | null) : null) ?? null
      });
    }
  }

  return { folders, files };
}

/** Liste récursivement tous les dossiers et fichiers sous un préfixe (ex. userId). Pour recherche globale. */
export async function listAllStorageContents(
  supabase: SupabaseClient,
  rootPath: string
): Promise<StorageContentsResult> {
  const { folders, files } = await listStorageContents(supabase, rootPath);
  const allFolders: StorageFolderEntry[] = [...folders];
  const allFiles: StorageFileEntry[] = [...files];
  for (const folder of folders) {
    const sub = await listAllStorageContents(supabase, folder.path);
    allFolders.push(...sub.folders);
    allFiles.push(...sub.files);
  }
  return { folders: allFolders, files: allFiles };
}

/** Liste récursivement tous les chemins de fichiers sous un préfixe (pour suppression/renommage de dossier). */
async function listAllFilePathsUnderPrefix(
  supabase: SupabaseClient,
  prefix: string
): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(DRIVE_BUCKET)
    .list(prefix, { limit: 1000 });
  if (error) return [];
  const paths: string[] = [];
  for (const item of data ?? []) {
    const name = item.name;
    if (!name) continue;
    const childPath = prefix ? `${prefix}/${name}` : name;
    if (hasFileSizeMetadata(item)) {
      paths.push(childPath);
      continue;
    }
    const { data: childData } = await supabase.storage
      .from(DRIVE_BUCKET)
      .list(childPath, { limit: 1 });
    if ((childData?.length ?? 0) > 0) {
      const sub = await listAllFilePathsUnderPrefix(supabase, childPath);
      paths.push(...sub);
    } else {
      paths.push(childPath);
    }
  }
  return paths;
}

/** Calcule l'espace réellement utilisé dans le Storage en listant récursivement tous les fichiers. */
async function calculateStorageUsedFromFiles(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  async function sumFilesInPath(path: string): Promise<number> {
    const { data, error } = await supabase.storage.from(DRIVE_BUCKET).list(path, {
      limit: 1000
    });
    if (error || !data) return 0;
    let total = 0;
    const subfolders: string[] = [];
    for (const item of data) {
      if (!item.name || isPlaceholderFileName(item.name)) continue;
      const childPath = path ? `${path}/${item.name}` : item.name;
      if (hasFileSizeMetadata(item)) {
        total += Number(item.metadata?.size) || 0;
        continue;
      }
      const { data: childData } = await supabase.storage
        .from(DRIVE_BUCKET)
        .list(childPath, { limit: 1 });
      if ((childData?.length ?? 0) > 0) {
        subfolders.push(childPath);
      }
    }
    for (const subfolder of subfolders) {
      total += await sumFilesInPath(subfolder);
    }
    return total;
  }
  return await sumFilesInPath(userId);
}

/** Limite de stockage par utilisateur : 1 GB */
export const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;
/** Taille maximale par fichier : 50 MB */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/** Supprime un dossier Storage et tout son contenu. */
export async function deleteStorageFolder(
  supabase: SupabaseClient,
  folderPath: string
): Promise<void> {
  const userId = folderPath.split("/")[0];
  const paths = await listAllFilePathsUnderPrefix(supabase, folderPath);
  if (paths.length === 0) return;
  let totalSize = 0;
  for (const path of paths) {
    const pathParts = path.split("/");
    const fileName = pathParts[pathParts.length - 1];
    const parentPath = pathParts.slice(0, -1).join("/");
    const { data } = await supabase.storage.from(DRIVE_BUCKET).list(parentPath || userId, {
      limit: 1000
    });
    const file = data?.find((f) => f.name === fileName);
    if (file?.metadata?.size) {
      totalSize += Number(file.metadata.size) || 0;
    }
  }
  const batchSize = 1000;
  for (let i = 0; i < paths.length; i += batchSize) {
    const chunk = paths.slice(i, i + batchSize);
    await supabase.storage.from(DRIVE_BUCKET).remove(chunk);
  }
  if (userId && totalSize > 0) {
    await subtractStorageUsed(supabase, userId, totalSize);
  }
}

/** Renomme un dossier Storage (déplace tout le contenu sous le nouveau nom). */
export async function renameStorageFolder(
  supabase: SupabaseClient,
  folderPath: string,
  newName: string
): Promise<void> {
  const paths = await listAllFilePathsUnderPrefix(supabase, folderPath);
  const parentPath = folderPath.includes("/")
    ? folderPath.slice(0, folderPath.lastIndexOf("/"))
    : "";
  const newPrefix = parentPath ? `${parentPath}/${newName}` : newName;
  for (const oldPath of paths) {
    const suffix = oldPath.slice(folderPath.length);
    const newPath = newPrefix + suffix;
    await supabase.storage.from(DRIVE_BUCKET).move(oldPath, newPath);
  }
}

/** Supprime un fichier Storage. */
export async function deleteStorageFile(
  supabase: SupabaseClient,
  filePath: string
): Promise<void> {
  const userId = filePath.split("/")[0];
  const pathParts = filePath.split("/");
  const fileName = pathParts[pathParts.length - 1];
  const parentPath = pathParts.slice(0, -1).join("/");
  let fileSize = 0;
  if (userId) {
    const { data } = await supabase.storage.from(DRIVE_BUCKET).list(parentPath || userId, {
      limit: 1000
    });
    const file = data?.find((f) => f.name === fileName);
    if (file?.metadata?.size) {
      fileSize = Number(file.metadata.size) || 0;
    }
  }
  const { error } = await supabase.storage.from(DRIVE_BUCKET).remove([filePath]);
  if (error) throw new Error(error.message ?? String(error));
  if (userId && fileSize > 0) {
    await subtractStorageUsed(supabase, userId, fileSize);
  }
}

/** Renomme un fichier Storage (même dossier, nouveau nom). */
export async function renameStorageFile(
  supabase: SupabaseClient,
  filePath: string,
  newFileName: string
): Promise<void> {
  const safeName = sanitizePathSegment(newFileName.trim()) || "fichier";
  const parentPath = filePath.includes("/")
    ? filePath.slice(0, filePath.lastIndexOf("/"))
    : "";
  const newPath = parentPath ? `${parentPath}/${safeName}` : safeName;
  const { error } = await supabase.storage.from(DRIVE_BUCKET).move(filePath, newPath);
  if (error) throw new Error(error.message ?? String(error));
}
