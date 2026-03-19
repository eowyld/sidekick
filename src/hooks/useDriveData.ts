"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { DriveFolder, DriveDocument } from "@/lib/drive-db";
import type { StorageContentsResult } from "@/lib/drive-db";
import {
  fetchUserFolders,
  fetchUserDocuments,
  getUserStorageUsed,
  insertFolder,
  insertDocument,
  updateDocument,
  updateFolder,
  deleteDocument,
  deleteFolder,
  uploadDriveFile,
  uploadDriveFileToPath,
  STORAGE_FOLDER_PREFIX,
  listStorageRootFolders,
  listStorageContents,
  deleteStorageFolder,
  renameStorageFolder,
  deleteStorageFile,
  renameStorageFile,
  createStorageFolder
} from "@/lib/drive-db";

export interface UseDriveDataResult {
  userId: string | null;
  documents: DriveDocument[];
  documentFolders: DriveFolder[];
  storageRootFolders: string[];
  storageContents: StorageContentsResult | null;
  isLoadingContents: boolean;
  loadStorageContents: (path: string) => Promise<void>;
  clearStorageContents: () => void;
  deleteStorageFolderAtPath: (folderPath: string) => Promise<void>;
  renameStorageFolderAtPath: (folderPath: string, newName: string) => Promise<void>;
  deleteStorageFileAtPath: (filePath: string) => Promise<void>;
  renameStorageFileAtPath: (filePath: string, newFileName: string) => Promise<void>;
  storageUsedBytes: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addFolder: (name: string, parentId?: string | null) => Promise<void>;
  uploadFile: (file: File, folderId?: string | null, onProgress?: (progress: number) => void) => Promise<void>;
  updateDocumentById: (id: string, updates: { title?: string; folderId?: string | null }) => Promise<void>;
  updateFolderById: (id: string, name: string) => Promise<void>;
  deleteDocumentById: (id: string) => Promise<void>;
  deleteFolderById: (id: string) => Promise<void>;
}

export function useDriveData(): UseDriveDataResult {
  const [userId, setUserId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DriveDocument[]>([]);
  const [documentFolders, setDocumentFolders] = useState<DriveFolder[]>([]);
  const [storageRootFolders, setStorageRootFolders] = useState<string[]>([]);
  const [storageContents, setStorageContents] = useState<StorageContentsResult | null>(null);
  const [isLoadingContents, setIsLoadingContents] = useState(false);
  const [storageUsedBytes, setStorageUsedBytes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStorageUsed = useCallback(async (supabase = createClient()) => {
    if (!userId) return;
    const used = await getUserStorageUsed(supabase, userId);
    setStorageUsedBytes(used);
  }, [userId]);

  const load = useCallback(async () => {
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        setUserId(null);
        setDocuments([]);
        setDocumentFolders([]);
        setStorageRootFolders([]);
        setStorageContents(null);
        setStorageUsedBytes(0);
        setIsLoading(false);
        return;
      }
      setUserId(user.id);
      const [folders, docs, used, rootStorage] = await Promise.all([
        fetchUserFolders(supabase, user.id),
        fetchUserDocuments(supabase, user.id),
        getUserStorageUsed(supabase, user.id),
        listStorageRootFolders(supabase, user.id)
      ]);
      setDocumentFolders(folders);
      setDocuments(docs);
      setStorageUsedBytes(used);
      setStorageRootFolders(rootStorage);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadStorageContents = useCallback(async (path: string) => {
    setIsLoadingContents(true);
    try {
      const supabase = createClient();
      const result = await listStorageContents(supabase, path);
      setStorageContents(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingContents(false);
    }
  }, []);

  const clearStorageContents = useCallback(() => {
    setStorageContents(null);
  }, []);

  const deleteStorageFolderAtPath = useCallback(async (folderPath: string) => {
    const supabase = createClient();
    await deleteStorageFolder(supabase, folderPath);
    await refreshStorageUsed(supabase);
  }, [refreshStorageUsed]);

  const renameStorageFolderAtPath = useCallback(
    async (folderPath: string, newName: string) => {
      const supabase = createClient();
      await renameStorageFolder(supabase, folderPath, newName);
    },
    []
  );

  const deleteStorageFileAtPath = useCallback(async (filePath: string) => {
    const supabase = createClient();
    await deleteStorageFile(supabase, filePath);
    await refreshStorageUsed(supabase);
  }, [refreshStorageUsed]);

  const renameStorageFileAtPath = useCallback(
    async (filePath: string, newFileName: string) => {
      const supabase = createClient();
      await renameStorageFile(supabase, filePath, newFileName);
    },
    []
  );

  useEffect(() => {
    void load();
  }, [load]);

  const refetch = load;

  const addFolder = useCallback(
    async (name: string, parentId?: string | null) => {
      const supabase = createClient();
      if (!userId) throw new Error("Utilisateur non connecté.");
      const isStorageFolder = typeof parentId === "string" && parentId.startsWith(STORAGE_FOLDER_PREFIX);
      if (isStorageFolder) {
        const fullStoragePath = parentId.slice(STORAGE_FOLDER_PREFIX.length);
        const parentPathUnderUser = fullStoragePath.startsWith(userId + "/")
          ? fullStoragePath.slice(userId.length + 1)
          : fullStoragePath === userId
            ? ""
            : fullStoragePath;
        await createStorageFolder(supabase, userId, name, parentPathUnderUser);
        return;
      }
      const folder = await insertFolder(supabase, userId, name, {
        parentId: parentId ?? null
      });
      setDocumentFolders((prev) => [...prev, folder]);
    },
    [userId]
  );

  const uploadFile = useCallback(
    async (file: File, folderId?: string | null, onProgress?: (progress: number) => void) => {
      const supabase = createClient();
      if (!userId) throw new Error("Utilisateur non connecté.");
      const isStorageFolder = typeof folderId === "string" && folderId.startsWith(STORAGE_FOLDER_PREFIX);
      const fullStoragePath = isStorageFolder ? folderId.slice(STORAGE_FOLDER_PREFIX.length) : "";
      const subPathUnderUser = fullStoragePath.startsWith(userId + "/")
        ? fullStoragePath.slice(userId.length + 1)
        : fullStoragePath === userId
          ? ""
          : fullStoragePath;

      const { url, path: uploadedPath } = isStorageFolder
        ? await uploadDriveFileToPath(supabase, userId, file, subPathUnderUser, onProgress)
        : await uploadDriveFile(supabase, userId, file);
      if (isStorageFolder) {
        await refreshStorageUsed(supabase);
        return;
      }
      const ext = file.name.includes(".")
        ? file.name.slice(file.name.lastIndexOf("."))
        : "";
      const doc = await insertDocument(supabase, userId, {
        title: file.name,
        folderId: folderId ?? null,
        link: url,
        storagePath: uploadedPath,
        fileSizeBytes: file.size,
        fileExtension: ext || undefined,
        sourceModule: "drive"
      });
      setDocuments((prev) => [doc, ...prev]);
      await refreshStorageUsed(supabase);
    },
    [userId, refreshStorageUsed]
  );

  const updateDocumentById = useCallback(
    async (id: string, updates: { title?: string; folderId?: string | null }) => {
      const supabase = createClient();
      if (!userId) throw new Error("Utilisateur non connecté.");
      const updated = await updateDocument(supabase, userId, id, updates);
      setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)));
    },
    [userId]
  );

  const updateFolderById = useCallback(
    async (id: string, name: string) => {
      const supabase = createClient();
      if (!userId) throw new Error("Utilisateur non connecté.");
      const updated = await updateFolder(supabase, userId, id, { name });
      setDocumentFolders((prev) => prev.map((f) => (f.id === id ? updated : f)));
    },
    [userId]
  );

  const deleteDocumentById = useCallback(
    async (id: string) => {
      const supabase = createClient();
      if (!userId) throw new Error("Utilisateur non connecté.");
      await deleteDocument(supabase, userId, id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      await refreshStorageUsed(supabase);
    },
    [userId, refreshStorageUsed]
  );

  const deleteFolderById = useCallback(
    async (id: string) => {
      const supabase = createClient();
      if (!userId) throw new Error("Utilisateur non connecté.");
      await deleteFolder(supabase, userId, id);
      setDocumentFolders((prev) => prev.filter((f) => f.id !== id));
      setDocuments((prev) => prev.filter((d) => d.folderId !== id));
      await refreshStorageUsed(supabase);
    },
    [userId, refreshStorageUsed]
  );

  return {
    userId,
    documents,
    documentFolders,
    storageRootFolders,
    storageContents,
    isLoadingContents,
    loadStorageContents,
    clearStorageContents,
    deleteStorageFolderAtPath,
    renameStorageFolderAtPath,
    deleteStorageFileAtPath,
    renameStorageFileAtPath,
    storageUsedBytes,
    isLoading,
    error,
    refetch,
    addFolder,
    uploadFile,
    updateDocumentById,
    updateFolderById,
    deleteDocumentById,
    deleteFolderById
  };
}
