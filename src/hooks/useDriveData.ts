"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient, getSessionUser } from "@/lib/supabase";
import type { DriveFolder, DriveDocument } from "@/lib/drive-db";
import type { StorageContentsResult } from "@/lib/drive-db";
import {
  fetchUserFolders,
  fetchUserDocuments,
  fetchUserStorage,
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
  createStorageFolder,
  moveStorageFolder,
  moveStorageFile
} from "@/lib/drive-db";

const isAbortError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AbortError" || error.message.toLowerCase().includes("signal is aborted"));

export interface UseDriveDataResult {
  userId: string | null;
  documents: DriveDocument[];
  documentFolders: DriveFolder[];
  storageRootFolders: string[];
  storageContents: StorageContentsResult | null;
  isLoadingContents: boolean;
  /** `silent` recharge sans passer `isLoadingContents` à true (pas de spinner). */
  loadStorageContents: (path: string, options?: { silent?: boolean }) => Promise<void>;
  clearStorageContents: () => void;
  deleteStorageFolderAtPath: (folderPath: string) => Promise<void>;
  renameStorageFolderAtPath: (folderPath: string, newName: string) => Promise<void>;
  deleteStorageFileAtPath: (filePath: string) => Promise<void>;
  renameStorageFileAtPath: (filePath: string, newFileName: string) => Promise<void>;
  moveStorageFolderAtPath: (folderPath: string, newParentPath: string) => Promise<void>;
  moveStorageFileAtPath: (filePath: string, newParentPath: string) => Promise<void>;
  storageUsedBytes: number;
  isLoading: boolean;
  error: string | null;
  /** Recharge en arrière-plan, sans repasser `isLoading` à true. */
  refetch: () => Promise<void>;
  /** Recalcule l'espace réel en parcourant le bucket (lent) et recale le compteur. */
  resyncStorageUsed: () => Promise<void>;
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

  // Lit le compteur stocké : une requête. Le recalcul complet passe par
  // `resyncStorageUsed`, lancé en arrière-plan au premier chargement.
  const refreshStorageUsed = useCallback(async (supabase = createClient()) => {
    if (!userId) return;
    const used = await fetchUserStorage(supabase, userId);
    setStorageUsedBytes(used);
  }, [userId]);

  const resyncStorageUsed = useCallback(async () => {
    if (!userId) return;
    try {
      const used = await getUserStorageUsed(createClient(), userId);
      setStorageUsedBytes(used);
    } catch {
      // Le compteur stocké reste affiché : un recalcul raté n'est pas bloquant.
    }
  }, [userId]);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const supabase = createClient();
    if (!options?.silent) setIsLoading(true);
    setError(null);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const {
          data: { user }
        } = await getSessionUser(supabase);
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
          fetchUserStorage(supabase, user.id),
          listStorageRootFolders(supabase, user.id)
        ]);
        setDocumentFolders(folders);
        setDocuments(docs);
        setStorageUsedBytes(used);
        setStorageRootFolders(rootStorage);
        break;
      } catch (err) {
        // Requête interrompue (verrou d'auth, réseau coupé) : une seconde
        // tentative suffit presque toujours, inutile d'afficher l'erreur brute.
        if (isAbortError(err) && attempt === 0) continue;
        setError(
          isAbortError(err)
            ? "Le chargement du Drive a été interrompu. Recharge la page."
            : err instanceof Error ? err.message : String(err)
        );
        break;
      }
    }
    setIsLoading(false);
  }, []);

  // Dernier dossier demandé : un rechargement lancé en arrière-plan ne doit pas
  // écraser la vue si l'utilisateur a changé de dossier entre-temps.
  const latestContentsPathRef = useRef<string | null>(null);

  const loadStorageContents = useCallback(async (path: string, options?: { silent?: boolean }) => {
    latestContentsPathRef.current = path;
    if (!options?.silent) setIsLoadingContents(true);
    try {
      const supabase = createClient();
      const result = await listStorageContents(supabase, path);
      if (latestContentsPathRef.current !== path) return;
      setStorageContents(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingContents(false);
    }
  }, []);

  const clearStorageContents = useCallback(() => {
    latestContentsPathRef.current = null;
    setStorageContents(null);
  }, []);

  // Suppressions Storage optimistes : l'élément disparaît tout de suite de la
  // vue, et revient si Supabase refuse. Même principe que les autres hooks.
  const removeFromStorageContents = useCallback((path: string) => {
    let snapshot: StorageContentsResult | null = null;
    setStorageContents((prev) => {
      snapshot = prev;
      if (!prev) return prev;
      return {
        folders: prev.folders.filter((f) => f.path !== path),
        files: prev.files.filter((f) => f.path !== path)
      };
    });
    return () => setStorageContents(snapshot);
  }, []);

  const deleteStorageFolderAtPath = useCallback(async (folderPath: string) => {
    const rollback = removeFromStorageContents(folderPath);
    const supabase = createClient();
    try {
      await deleteStorageFolder(supabase, folderPath);
    } catch (err) {
      rollback();
      throw err;
    }
    await refreshStorageUsed(supabase);
  }, [refreshStorageUsed, removeFromStorageContents]);

  const renameStorageFolderAtPath = useCallback(
    async (folderPath: string, newName: string) => {
      const supabase = createClient();
      await renameStorageFolder(supabase, folderPath, newName);
    },
    []
  );

  const deleteStorageFileAtPath = useCallback(async (filePath: string) => {
    const rollback = removeFromStorageContents(filePath);
    const supabase = createClient();
    try {
      await deleteStorageFile(supabase, filePath);
    } catch (err) {
      rollback();
      throw err;
    }
    await refreshStorageUsed(supabase);
  }, [refreshStorageUsed, removeFromStorageContents]);

  const renameStorageFileAtPath = useCallback(
    async (filePath: string, newFileName: string) => {
      const supabase = createClient();
      await renameStorageFile(supabase, filePath, newFileName);
    },
    []
  );

  const moveStorageFolderAtPath = useCallback(
    async (folderPath: string, newParentPath: string) => {
      const supabase = createClient();
      await moveStorageFolder(supabase, folderPath, newParentPath);
    },
    []
  );

  const moveStorageFileAtPath = useCallback(
    async (filePath: string, newParentPath: string) => {
      const supabase = createClient();
      await moveStorageFile(supabase, filePath, newParentPath);
    },
    []
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Recalage du compteur une fois par session du Drive, sans bloquer l'affichage.
  const resyncedForUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (!userId || resyncedForUserRef.current === userId) return;
    resyncedForUserRef.current = userId;
    void resyncStorageUsed();
  }, [userId, resyncStorageUsed]);

  const refetch = useCallback(() => load({ silent: true }), [load]);

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
        ? await uploadDriveFileToPath(supabase, userId, file, subPathUnderUser, { onProgress })
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
    moveStorageFolderAtPath,
    moveStorageFileAtPath,
    storageUsedBytes,
    isLoading,
    error,
    refetch,
    resyncStorageUsed,
    addFolder,
    uploadFile,
    updateDocumentById,
    updateFolderById,
    deleteDocumentById,
    deleteFolderById
  };
}
