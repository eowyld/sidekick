"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useDriveData } from "@/hooks/useDriveData";
import type { DriveFolder, DriveDocument } from "@/lib/drive-db";
import {
  STORAGE_FOLDER_PREFIX,
  STORAGE_LIMIT_BYTES,
  MAX_FILE_SIZE_BYTES,
  DRIVE_BUCKET,
  isPlaceholderFileName,
  listAllStorageContents,
  type StorageContentsResult
} from "@/lib/drive-db";
import { createClient } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Plus, FolderOpen, FileText, ChevronRight, Home, RefreshCw, Lock, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";

const HIDDEN_STORAGE_FILES = ["_dossier_vide", ".emptyfolderplaceholder"];

const DEFAULT_LOCKED_TEMPLATE_PATHS = [
  "Admin",
  "Contacts",
  "Edition",
  "Live",
  "Marketing",
  "Marketing/Publications",
  "Marketing/Presskit",
  "Phono",
  "Revenus"
];

function normalizeStoragePathForLock(path: string, userId?: string | null): string {
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return "";
  if (userId && segments[0] === userId && segments.length > 1) {
    return segments.slice(1).join("/");
  }
  return segments.join("/");
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = value.slice(0, 10);
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return day && m && y ? `${day}/${m}/${y}` : d;
}

function formatFileType(ext: string | null | undefined, isFolder: boolean): string {
  if (isFolder) return "Dossier";
  if (ext) return ext.replace(/^\./, "").toUpperCase();
  return "—";
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

function splitFileName(name: string): { base: string; extension: string } {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex > 0) {
    return { base: name.slice(0, dotIndex), extension: name.slice(dotIndex) };
  }
  return { base: name, extension: "" };
}

function stripExtension(name: string): string {
  return splitFileName(name).base;
}

export function DocumentsPage() {
  const {
    userId,
    documents,
    documentFolders,
    storageRootFolders,
    storageContents,
    isLoadingContents,
    loadStorageContents,
    clearStorageContents,
    storageUsedBytes,
    isLoading,
    error,
    addFolder,
    uploadFile: uploadFileToDrive,
    updateDocumentById,
    updateFolderById,
    deleteDocumentById,
    deleteFolderById,
    deleteStorageFolderAtPath,
    renameStorageFolderAtPath,
    deleteStorageFileAtPath,
    renameStorageFileAtPath,
    refetch
  } = useDriveData();

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<"name" | "date" | "type" | "size">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const [contextMenu, setContextMenu] = useState<{
    type: "folder" | "document";
    item: DriveFolder | DriveDocument;
    x: number;
    y: number;
  } | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<
    { type: "folder" | "document"; item: DriveFolder | DriveDocument } | null
  >(null);
  const [renameValue, setRenameValue] = useState("");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFileName, setUploadFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadBrowserPath, setUploadBrowserPath] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isLoadingAllFolders, setIsLoadingAllFolders] = useState(false);
  const [uploadToast, setUploadToast] = useState<{
    open: boolean;
    status: "uploading" | "success" | "error";
    progress: number;
    message: string;
    fileName: string;
  }>({
    open: false,
    status: "uploading",
    progress: 0,
    message: "",
    fileName: ""
  });
  const [lockedTemplatePaths, setLockedTemplatePaths] = useState<string[]>(DEFAULT_LOCKED_TEMPLATE_PATHS);
  const [allAvailableFolders, setAllAvailableFolders] = useState<{ id: string; name: string; path: string }[]>([]);
  const [globalSearchContents, setGlobalSearchContents] = useState<StorageContentsResult | null>(null);
  const [isLoadingGlobalSearch, setIsLoadingGlobalSearch] = useState(false);
  const loadingPathRef = useRef<string | null>(null);
  const globalSearchUserIdRef = useRef<string | null>(null);
  const globalSearchTimeoutRef = useRef<number | null>(null);
  const uploadToastTimeoutRef = useRef<number | null>(null);

  const invalidateGlobalSearch = useCallback(() => {
    globalSearchUserIdRef.current = null;
    setGlobalSearchContents(null);
    setIsLoadingGlobalSearch(false);
  }, []);

  const searchLower = searchQuery.trim().toLowerCase();
  const storageUsedPercent = Math.min(
    100,
    Math.round((storageUsedBytes / STORAGE_LIMIT_BYTES) * 100)
  );
  const storageUsedMo = (storageUsedBytes / (1024 * 1024)).toFixed(1);
  const storageLimitGo = (STORAGE_LIMIT_BYTES / (1024 * 1024 * 1024)).toFixed(1);
  const maxFileSizeMB = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
  const remainingStorageBytes = Math.max(0, STORAGE_LIMIT_BYTES - storageUsedBytes);
  const selectedFileExceedsRemaining = selectedFile ? selectedFile.size > remainingStorageBytes : false;
  const selectedFileExceedsMax = selectedFile ? selectedFile.size > MAX_FILE_SIZE_BYTES : false;
  const selectedFileTooLarge = selectedFileExceedsRemaining || selectedFileExceedsMax;

  const isStorageView =
    currentFolderId === null || (currentFolderId != null && currentFolderId.startsWith(STORAGE_FOLDER_PREFIX));
  const storagePath =
    currentFolderId === null
      ? userId ?? ""
      : currentFolderId.startsWith(STORAGE_FOLDER_PREFIX)
        ? currentFolderId.slice(STORAGE_FOLDER_PREFIX.length)
        : "";
  const storageRootFolderId = userId ? `${STORAGE_FOLDER_PREFIX}${userId}` : null;

  const folderIdByPath = useMemo(
    () => new Map(allAvailableFolders.map((f) => [f.path, f.id])),
    [allAvailableFolders]
  );
  const lockedPathSet = useMemo(
    () => new Set(lockedTemplatePaths.map((p) => p.trim().toLowerCase()).filter(Boolean)),
    [lockedTemplatePaths]
  );
  const isLockedStoragePath = (path: string): boolean => {
    const normalized = normalizeStoragePathForLock(path, userId).toLowerCase();
    return lockedPathSet.has(normalized);
  };

  const uploadBrowserFolders = useMemo(() => {
    const children = allAvailableFolders.filter((folder) => {
      const segments = folder.path.split("/").filter(Boolean);
      const parentPath = segments.slice(0, -1).join("/");
      return parentPath === uploadBrowserPath;
    });
    return children.sort((a, b) => a.name.localeCompare(b.name));
  }, [allAvailableFolders, uploadBrowserPath]);

  const uploadBrowserCrumbs = useMemo(() => {
    const segments = uploadBrowserPath.split("/").filter(Boolean);
    const crumbs: { label: string; path: string }[] = [{ label: "Racine", path: "" }];
    let currentPath = "";
    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      crumbs.push({ label: segment, path: currentPath });
    }
    return crumbs;
  }, [uploadBrowserPath]);

  const loadAllAvailableFolders = useCallback(async () => {
    if (!userId) {
      setAllAvailableFolders([]);
      return;
    }
    const uid = userId;
    setIsLoadingAllFolders(true);
    try {
      const supabase = createClient();
      const folders: { id: string; name: string; path: string }[] = [];

      async function collectFolders(path: string, displayPath: string) {
        const { data } = await supabase.storage.from(DRIVE_BUCKET).list(path, { limit: 1000 });
        if (!data) return;
        for (const item of data) {
          if (!item.name || isPlaceholderFileName(item.name)) continue;
          // With Storage metadata, files expose metadata.size, folders don't.
          if (typeof item.metadata?.size === "number") continue;
          const childPath = path ? `${path}/${item.name}` : item.name;
          const newDisplayPath = displayPath ? `${displayPath}/${item.name}` : item.name;
          folders.push({
            id: `${STORAGE_FOLDER_PREFIX}${childPath}`,
            name: item.name,
            path: newDisplayPath
          });
          await collectFolders(childPath, newDisplayPath);
        }
      }

      await collectFolders(uid, "");
      setAllAvailableFolders(folders.sort((a, b) => a.path.localeCompare(b.path)));
    } finally {
      setIsLoadingAllFolders(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isStorageView && storagePath) {
      if (loadingPathRef.current !== storagePath) {
        loadingPathRef.current = storagePath;
        void loadStorageContents(storagePath).finally(() => {
          if (loadingPathRef.current === storagePath) {
            loadingPathRef.current = null;
          }
        });
      }
    } else {
      clearStorageContents();
      loadingPathRef.current = null;
    }
  }, [currentFolderId, isStorageView, storagePath, loadStorageContents, clearStorageContents]);

  useEffect(() => {
    if (!uploadDialogOpen) return;
    void loadAllAvailableFolders();
  }, [uploadDialogOpen, loadAllAvailableFolders]);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!userId || !isStorageView) {
      invalidateGlobalSearch();
      if (globalSearchTimeoutRef.current) {
        window.clearTimeout(globalSearchTimeoutRef.current);
        globalSearchTimeoutRef.current = null;
      }
      return;
    }

    if (!q) {
      setIsLoadingGlobalSearch(false);
      if (globalSearchTimeoutRef.current) {
        window.clearTimeout(globalSearchTimeoutRef.current);
        globalSearchTimeoutRef.current = null;
      }
      return;
    }

    // If the user changes, the cached inventory must be invalidated.
    if (globalSearchUserIdRef.current !== userId) {
      invalidateGlobalSearch();
    }

    // If inventory is already loaded for this user, do not re-fetch on each keystroke.
    if (globalSearchContents && globalSearchUserIdRef.current === userId) return;

    if (globalSearchTimeoutRef.current) {
      window.clearTimeout(globalSearchTimeoutRef.current);
    }
    globalSearchTimeoutRef.current = window.setTimeout(() => {
      globalSearchTimeoutRef.current = null;
      let cancelled = false;
      setIsLoadingGlobalSearch(true);
      (async () => {
        try {
          const supabase = createClient();
          const result = await listAllStorageContents(supabase, userId!);
          if (!cancelled) {
            globalSearchUserIdRef.current = userId!;
            setGlobalSearchContents(result);
          }
        } catch {
          if (!cancelled) setGlobalSearchContents({ folders: [], files: [] });
        } finally {
          if (!cancelled) setIsLoadingGlobalSearch(false);
        }
      })();
    }, 300);
    return () => {
      if (globalSearchTimeoutRef.current) {
        window.clearTimeout(globalSearchTimeoutRef.current);
        globalSearchTimeoutRef.current = null;
      }
    };
  }, [searchQuery, userId, isStorageView, globalSearchContents, invalidateGlobalSearch]);

  useEffect(() => {
    if (!userId) {
      setLockedTemplatePaths(DEFAULT_LOCKED_TEMPLATE_PATHS);
      return;
    }
    async function loadLockedTemplates() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("drive_locked_storage_templates")
        .select("path")
        .eq("is_active", true)
        .order("path", { ascending: true });
      if (error) {
        setLockedTemplatePaths(DEFAULT_LOCKED_TEMPLATE_PATHS);
        return;
      }
      const paths = (data ?? [])
        .map((row: { path?: string | null }) => row.path?.trim() ?? "")
        .filter(Boolean);
      const merged = Array.from(new Set([...DEFAULT_LOCKED_TEMPLATE_PATHS, ...paths]));
      setLockedTemplatePaths(merged);
    }
    void loadLockedTemplates();
  }, [userId]);

  const foldersById = useMemo(
    () => new Map(documentFolders.map((f: DriveFolder) => [f.id, f])),
    [documentFolders]
  );

  const breadcrumb = useMemo(() => {
    if (isStorageView && storagePath) {
      const segments = storagePath.split("/").filter(Boolean);
      const path: { id: string | null; name: string }[] = [{ id: null, name: "Racine" }];
      const start = userId && segments[0] === userId ? 1 : 0;
      for (let i = start; i < segments.length; i++) {
        path.push({
          id: STORAGE_FOLDER_PREFIX + segments.slice(0, i + 1).join("/"),
          name: segments[i]
        });
      }
      return path;
    }
    const path: { id: string | null; name: string }[] = [{ id: null, name: "Racine" }];
    let id: string | null = currentFolderId;
    const chain: { id: string; name: string }[] = [];
    while (id && !id.startsWith(STORAGE_FOLDER_PREFIX)) {
      const f = foldersById.get(id) as DriveFolder | undefined;
      if (!f) break;
      chain.push({ id: f.id, name: f.name });
      id = f.parentId ?? null;
    }
    path.push(...chain.reverse());
    return path;
  }, [currentFolderId, foldersById, isStorageView, storagePath, userId]);

  const storageFolderPrefix =
    currentFolderId === null && userId
      ? `${STORAGE_FOLDER_PREFIX}${userId}`
      : currentFolderId ?? "";

  const subfolders = useMemo(() => {
    if (!isStorageView) return [];
    if (searchLower && globalSearchContents) {
      const prefix = userId ? `${userId}/` : "";
      return globalSearchContents.folders
        .filter((f) => f.name.toLowerCase().includes(searchLower))
        .map((folder) => {
          const displayPath = folder.path.startsWith(prefix) ? folder.path.slice(prefix.length) : folder.path;
          const segments = displayPath.split("/").filter(Boolean);
          const parentPath = segments.length > 1 ? segments.slice(0, -1).join("/") : "";
          return {
            id: `${STORAGE_FOLDER_PREFIX}${folder.path}`,
            name: folder.name,
            createdAt: folder.createdAt ?? null,
            isLocked: isLockedStoragePath(displayPath),
            parentPath
          };
        });
    }
    const list = (storageContents?.folders ?? []).map((folder: { name: string; createdAt?: string | null }) => ({
      id: storageFolderPrefix ? `${storageFolderPrefix}/${folder.name}` : folder.name,
      name: folder.name,
      createdAt: folder.createdAt ?? null,
      isLocked: isLockedStoragePath(storagePath ? `${storagePath}/${folder.name}` : folder.name),
      parentPath: null as string | null
    }));
    if (searchLower) return list.filter((f: { name: string }) => f.name.toLowerCase().includes(searchLower));
    return list.map((f) => ({ ...f, parentPath: null as string | null }));
  }, [
    isStorageView,
    storageContents?.folders,
    storageFolderPrefix,
    searchLower,
    storagePath,
    globalSearchContents,
    userId
  ]);

  const docsInFolder = useMemo(() => {
    if (!isStorageView) return [];
    if (searchLower && globalSearchContents) {
      const prefix = userId ? `${userId}/` : "";
      return globalSearchContents.files
        .filter((f) => !HIDDEN_STORAGE_FILES.includes(f.name) && f.name.toLowerCase().includes(searchLower))
        .map((f) => {
          const displayPath = f.path.startsWith(prefix) ? f.path.slice(prefix.length) : f.path;
          const segments = displayPath.split("/").filter(Boolean);
          const parentPath = segments.length > 1 ? segments.slice(0, -1).join("/") : "";
          return {
            id: `storage-file:${f.path}`,
            title: f.name,
            link: f.url,
            folderId: null,
            dateModified: f.updatedAt ?? null,
            dateAdded: null,
            isSystem: true,
            isLocked: false,
            fileSizeBytes: f.sizeBytes ?? 0,
            fileExtension: f.name.includes(".") ? f.name.slice(f.name.lastIndexOf(".")) : null,
            parentPath
          };
        });
    }
    const list = (storageContents?.files ?? [])
      .filter(
        (f: { name: string }) => !HIDDEN_STORAGE_FILES.includes(f.name)
      )
      .map((f: { path: string; name: string; url: string }) => ({
        id: `storage-file:${f.path}`,
        title: f.name,
        link: f.url,
        folderId: null,
        dateModified: "updatedAt" in f ? (f.updatedAt as string | null) : null,
        dateAdded: null,
        isSystem: true,
        isLocked: false,
        fileSizeBytes: "sizeBytes" in f ? (f.sizeBytes as number) : 0,
        fileExtension: f.name.includes(".") ? f.name.slice(f.name.lastIndexOf(".")) : null,
        parentPath: null as string | null
      }));
    if (searchLower) return list.filter((d: { title: string }) => d.title.toLowerCase().includes(searchLower));
    return list.map((d) => ({ ...d, parentPath: null as string | null }));
  }, [isStorageView, storageContents?.files, searchLower, storagePath, globalSearchContents, userId]);

  const isGlobalSearchMode = searchLower.length > 0;

  const storageRows = useMemo(() => {
    const rows = [
      ...subfolders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        date: folder.createdAt ?? "",
        type: "Dossier",
        size: 0,
        isFolder: true as const,
        folder,
        doc: null as null,
        parentPath: "parentPath" in folder ? (folder as { parentPath?: string | null }).parentPath : null
      })),
      ...docsInFolder.map((doc) => ({
        id: doc.id,
        name: doc.title,
        date: doc.dateModified ?? doc.dateAdded ?? "",
        type: formatFileType(doc.fileExtension, false),
        size: doc.fileSizeBytes ?? 0,
        isFolder: false as const,
        folder: null as null,
        doc,
        parentPath: "parentPath" in doc ? (doc as { parentPath?: string | null }).parentPath : null
      }))
    ];

    const sorted = [...rows].sort((a, b) => {
      if (sortColumn === "name") return a.name.localeCompare(b.name, "fr");
      if (sortColumn === "date") return a.date.localeCompare(b.date);
      if (sortColumn === "type") return a.type.localeCompare(b.type, "fr");
      return a.size - b.size;
    });
    return sortDirection === "asc" ? sorted : sorted.reverse();
  }, [docsInFolder, sortColumn, sortDirection, subfolders]);

  const toggleSort = (column: "name" | "date" | "type" | "size") => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(column);
    setSortDirection(column === "date" || column === "size" ? "desc" : "asc");
  };

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [contextMenu]);

  useEffect(() => {
    if (!uploading) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [uploading]);

  useEffect(() => {
    return () => {
      if (uploadToastTimeoutRef.current) {
        window.clearTimeout(uploadToastTimeoutRef.current);
      }
    };
  }, []);

  const handleRenameSubmit = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setSubmitError(null);
    try {
      if (renameTarget.type === "folder") {
        if (renameTarget.item.id.startsWith(STORAGE_FOLDER_PREFIX)) {
          const path = renameTarget.item.id.slice(STORAGE_FOLDER_PREFIX.length);
          await renameStorageFolderAtPath(path, renameValue.trim());
          const parentPath = path.includes("/")
            ? path.slice(0, path.lastIndexOf("/"))
            : userId ?? "";
          await loadStorageContents(parentPath);
          await refetch();
          invalidateGlobalSearch();
          setCurrentFolderId((prev) =>
            prev === renameTarget!.item.id
              ? (parentPath ? `${STORAGE_FOLDER_PREFIX}${parentPath}/${renameValue.trim()}` : null)
              : prev
          );
        } else {
          await updateFolderById(renameTarget.item.id, renameValue.trim());
          await refetch();
          invalidateGlobalSearch();
        }
        setSubmitSuccess("Dossier renommé.");
      } else {
        if (renameTarget.item.id.startsWith("storage-file:")) {
          const path = renameTarget.item.id.slice("storage-file:".length);
          await renameStorageFileAtPath(path, renameValue.trim());
          if (storagePath) await loadStorageContents(storagePath);
          await refetch();
          invalidateGlobalSearch();
          setSubmitSuccess("Fichier renommé.");
        } else {
          await updateDocumentById(renameTarget.item.id, {
            title: renameValue.trim()
          });
          await refetch();
          invalidateGlobalSearch();
          setSubmitSuccess("Document renommé.");
        }
      }
      setRenameOpen(false);
      setRenameTarget(null);
      setRenameValue("");
      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  };

  const openRename = (type: "folder" | "document", item: DriveFolder | DriveDocument) => {
    setContextMenu(null);
    setRenameTarget({ type, item });
    setRenameValue(type === "folder" ? (item as DriveFolder).name : (item as DriveDocument).title);
    setRenameOpen(true);
  };

  const handleDeleteFolder = async (id: string) => {
    setContextMenu(null);
    setSubmitError(null);
    try {
      if (id.startsWith(STORAGE_FOLDER_PREFIX)) {
        const path = id.slice(STORAGE_FOLDER_PREFIX.length);
        await deleteStorageFolderAtPath(path);
        const parentId =
          id.includes("/") ? id.slice(0, id.lastIndexOf("/")) : null;
        const inDeleted = currentFolderId === id || (currentFolderId?.startsWith(id + "/") ?? false);
        if (inDeleted) setCurrentFolderId(parentId);
        const refreshPath = parentId == null ? (userId ?? "") : parentId.slice(STORAGE_FOLDER_PREFIX.length);
        await loadStorageContents(refreshPath);
        await refetch();
        invalidateGlobalSearch();
      } else {
        await deleteFolderById(id);
        await refetch();
        invalidateGlobalSearch();
        if (currentFolderId === id) setCurrentFolderId(null);
      }
      setSubmitSuccess("Dossier supprimé.");
      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteDocument = async (id: string) => {
    setContextMenu(null);
    setSubmitError(null);
    try {
      if (id.startsWith("storage-file:")) {
        const path = id.slice("storage-file:".length);
        await deleteStorageFileAtPath(path);
        if (storagePath) await loadStorageContents(storagePath);
        await refetch();
        invalidateGlobalSearch();
        setSubmitSuccess("Fichier supprimé.");
      } else {
        await deleteDocumentById(id);
        await refetch();
        invalidateGlobalSearch();
        setSubmitSuccess("Document supprimé.");
      }
      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setSubmitError(null);
    try {
      const targetFolderId = isStorageView
        ? (currentFolderId ?? storageRootFolderId)
        : currentFolderId;
      await addFolder(newFolderName.trim(), targetFolderId);
      if (isStorageView && storagePath) {
        await loadStorageContents(storagePath);
      }
      await refetch();
      invalidateGlobalSearch();
      if (uploadDialogOpen) {
        await loadAllAvailableFolders();
      }
      setNewFolderOpen(false);
      setNewFolderName("");
      setSubmitSuccess("Dossier créé.");
      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  };

  // Sélection du fichier : on prépare les infos, mais on n'envoie pas encore.
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (!uploadFileName.trim()) {
      setUploadFileName(stripExtension(file.name));
    }
    setUploadProgress(0);
    setSubmitError(null);
    setSubmitSuccess(null);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Validation finale : on prend en compte le nom et la destination
  // au moment du clic sur "Ajouter", on envoie le fichier et on ferme la fenêtre.
  const handleUploadConfirm = async () => {
    if (!selectedFile || !uploadFileName.trim()) return;
    if (selectedFileTooLarge) {
      const remainingMo = (remainingStorageBytes / (1024 * 1024)).toFixed(2);
      const selectedMo = (selectedFile.size / (1024 * 1024)).toFixed(2);
      const maxFileMo = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(2);
      setSubmitError(
        selectedFileExceedsMax
          ? `Taille maximale par fichier dépassée : ${maxFileMo} MB autorisés, fichier de ${selectedMo} MB.`
          : `Espace insuffisant : ${remainingMo} MB restants, fichier de ${selectedMo} MB.`
      );
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(null);
    setUploading(true);
    setUploadProgress(0);

    const uploadSourceFile = selectedFile;
    const uploadNameBase = stripExtension(uploadFileName.trim()) || "fichier";
    const uploadDestinationPath = uploadBrowserPath;
    const { extension } = splitFileName(uploadSourceFile.name);
    const uploadFinalName = `${uploadNameBase}${extension}`;
    const fileToUpload = new File([uploadSourceFile], uploadFinalName, { type: uploadSourceFile.type });
    const targetFolderId =
      uploadDestinationPath
        ? (folderIdByPath.get(uploadDestinationPath) ??
          (storageRootFolderId ? `${storageRootFolderId}/${uploadDestinationPath}` : null))
        : storageRootFolderId;
    if (!targetFolderId) {
      setUploading(false);
      setSubmitError("Dossier de destination introuvable.");
      setUploadToast({
        open: true,
        status: "error",
        progress: 0,
        message: "Dossier de destination introuvable.",
        fileName: uploadFinalName
      });
      return;
    }

    setUploadDialogOpen(false);
    setSelectedFile(null);
    setUploadFileName("");
    setUploadBrowserPath("");
    setUploadToast({
      open: true,
      status: "uploading",
      progress: 0,
      message: "Importation en cours…",
      fileName: uploadFinalName
    });

    try {
      await uploadFileToDrive(fileToUpload, targetFolderId, (progress: number) => {
        setUploadProgress(progress);
        setUploadToast((prev) => ({
          ...prev,
          open: true,
          status: "uploading",
          progress
        }));
      });

      if (isStorageView && storagePath) {
        await loadStorageContents(storagePath);
      }
      await refetch();
      invalidateGlobalSearch();

      setSubmitSuccess("Fichier ajouté avec succès.");
      setUploadToast({
        open: true,
        status: "success",
        progress: 100,
        message: "Fichier importé avec succès.",
        fileName: uploadFinalName
      });
      if (uploadToastTimeoutRef.current) {
        window.clearTimeout(uploadToastTimeoutRef.current);
      }
      uploadToastTimeoutRef.current = window.setTimeout(() => {
        setUploadToast((prev) => ({ ...prev, open: false }));
      }, 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSubmitError(message);
      setUploadToast({
        open: true,
        status: "error",
        progress: 0,
        message,
        fileName: uploadFinalName
      });
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };


  const [isReloading, setIsReloading] = useState(false);
  const handleReload = async () => {
    if (isReloading || isLoadingContents) return;
    setSubmitError(null);
    setIsReloading(true);
    try {
      if (isStorageView && storagePath) {
        loadingPathRef.current = null;
        await loadStorageContents(storagePath);
        invalidateGlobalSearch();
      } else {
        await refetch();
        invalidateGlobalSearch();
      }
      setSubmitSuccess("Contenu rechargé.");
      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsReloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-sm text-muted-foreground">
          Chargement…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-sm text-muted-foreground">
          Centralise tes fichiers et dossiers.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {submitError && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </div>
      )}
      {submitSuccess && (
        <div className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
          {submitSuccess}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b bg-muted/30">
            {breadcrumb.map((seg, i) => (
              <span key={seg.id ?? "root"} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                <button
                  type="button"
                  onClick={() => setCurrentFolderId(seg.id)}
                  className="rounded px-1.5 py-0.5 text-sm hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-1"
                  title={seg.id === null ? "Racine" : undefined}
                >
                  {seg.id === null ? (
                    <Home className="h-4 w-4" />
                  ) : (
                    seg.name
                  )}
                </button>
              </span>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 h-8 ml-auto"
              onClick={handleReload}
              disabled={isReloading || isLoadingContents}
              title="Recharger"
            >
              <RefreshCw className={`h-4 w-4 ${isReloading || isLoadingContents ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/20">
            <Input
              placeholder="Rechercher…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs w-40 h-8 text-sm"
            />
            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {storageUsedMo} Mo / {storageLimitGo} Go
              </span>
              <Progress value={storageUsedPercent} className="w-24 h-2" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="shrink-0 h-8">
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setNewFolderOpen(true)}>
                    Nouveau dossier
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const initialPath =
                        currentFolderId && currentFolderId.startsWith(STORAGE_FOLDER_PREFIX)
                          ? currentFolderId.slice(STORAGE_FOLDER_PREFIX.length)
                          : userId ?? "";
                      const relativePath =
                        userId && initialPath.startsWith(`${userId}/`)
                          ? initialPath.slice(userId.length + 1)
                          : initialPath === userId
                            ? ""
                            : initialPath;
                      setUploadDialogOpen(true);
                      setSelectedFile(null);
                      setUploadFileName("");
                      setUploadBrowserPath(relativePath);
                      setUploadProgress(0);
                      setSubmitError(null);
                      setSubmitSuccess(null);
                    }}
                    disabled={uploading}
                  >
                    {uploading ? "Envoi…" : "Importer un fichier"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">
                    <button type="button" onClick={() => toggleSort("name")} className="hover:underline">
                      Nom
                    </button>
                  </th>
                  {isGlobalSearchMode && (
                    <th className="px-3 py-2 text-left font-medium w-40">Emplacement</th>
                  )}
                  <th className="px-3 py-2 text-left font-medium w-32">
                    <button type="button" onClick={() => toggleSort("date")} className="hover:underline">
                      Date de modification
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left font-medium w-24">
                    <button type="button" onClick={() => toggleSort("type")} className="hover:underline">
                      Type
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left font-medium w-24">
                    <button type="button" onClick={() => toggleSort("size")} className="hover:underline">
                      Taille
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoadingContents ? (
                  <>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`skeleton-${i}`} className="border-t">
                        <td className="px-3 py-2 align-middle">
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                          </div>
                        </td>
                        {isGlobalSearchMode && (
                          <td className="px-3 py-2 align-middle">
                            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                          </td>
                        )}
                        <td className="px-3 py-2 align-middle">
                          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                        </td>
                      </tr>
                    ))}
                  </>
                ) : isLoadingGlobalSearch && isGlobalSearchMode ? (
                  <tr>
                    <td colSpan={isGlobalSearchMode ? 5 : 4} className="px-3 py-8 text-center text-muted-foreground">
                      Recherche dans l&apos;ensemble des dossiers…
                    </td>
                  </tr>
                ) : subfolders.length === 0 && docsInFolder.length === 0 ? (
                  <tr>
                    <td colSpan={isGlobalSearchMode ? 5 : 4} className="px-3 py-8 text-center text-muted-foreground">
                      {isGlobalSearchMode ? "Aucun résultat." : "Ce dossier est vide."}
                    </td>
                  </tr>
                ) : (
                  <>
                    {storageRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`border-t hover:bg-muted/30 ${row.isFolder ? "cursor-pointer" : ""}`}
                        onClick={() => {
                          if (row.isFolder) setCurrentFolderId(row.folder.id);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (row.isFolder) {
                            if (row.folder.isLocked) return;
                            setContextMenu({ type: "folder", item: row.folder as DriveFolder, x: e.clientX, y: e.clientY });
                          } else {
                            setContextMenu({ type: "document", item: row.doc, x: e.clientX, y: e.clientY });
                          }
                        }}
                      >
                        <td className="px-3 py-2 align-middle">
                          {row.isFolder ? (
                            <span className="flex items-center gap-2">
                              <span className="relative inline-flex items-center">
                                <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                                {row.folder.isLocked && (
                                  <Lock className="h-2.5 w-2.5 text-muted-foreground absolute -bottom-0.5 -right-0.5" />
                                )}
                              </span>
                              {row.name}
                            </span>
                          ) : row.doc.link ? (
                            <a
                              href={row.doc.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              {row.name}
                            </a>
                          ) : (
                            <span className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              {row.name}
                            </span>
                          )}
                        </td>
                        {isGlobalSearchMode && (
                          <td className="px-3 py-2 align-middle text-muted-foreground text-xs">
                            {row.parentPath || "—"}
                          </td>
                        )}
                        <td className="px-3 py-2 align-middle text-muted-foreground">
                          {formatDate(row.date)}
                        </td>
                        <td className="px-3 py-2 align-middle text-muted-foreground">
                          {row.type}
                        </td>
                        <td className="px-3 py-2 align-middle text-muted-foreground">
                          {row.isFolder ? "—" : formatFileSize(row.size)}
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {uploadToast.open && (
        <div className="fixed bottom-4 right-4 z-[100] w-[360px] rounded-lg border border-[rgba(245,245,245,0.2)] bg-[rgba(15,23,42,0.96)] p-3 text-[#F5F5F5] shadow-2xl backdrop-blur">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {uploadToast.status === "uploading" ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : uploadToast.status === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              )}
              <p className="truncate text-sm font-medium">{uploadToast.fileName}</p>
            </div>
            {uploadToast.status !== "uploading" && (
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => setUploadToast((prev) => ({ ...prev, open: false }))}
                aria-label="Fermer la notification"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mb-2 text-xs text-muted-foreground">{uploadToast.message}</p>
          {uploadToast.status === "uploading" && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Progression</span>
                <span>{uploadToast.progress}%</span>
              </div>
              <Progress value={uploadToast.progress} className="h-2" />
            </div>
          )}
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed z-50 min-w-[140px] rounded-md border border-[rgba(245,245,245,0.2)] bg-[rgba(15,23,42,0.96)] py-1 text-[#F5F5F5] shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.type === "folder" ? (
            <>
              {contextMenu.item.id.startsWith(STORAGE_FOLDER_PREFIX) ||
              !(contextMenu.item as DriveFolder).isSystem ? (
                <>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => openRename("folder", contextMenu.item)}
                  >
                    Renommer
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm text-destructive hover:bg-accent"
                    onClick={() => handleDeleteFolder(contextMenu.item.id)}
                  >
                    Supprimer
                  </button>
                </>
              ) : (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Dossier verrouillé
                </p>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => openRename("document", contextMenu.item)}
              >
                Renommer
              </button>
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left text-sm text-destructive hover:bg-accent"
                onClick={() => void handleDeleteDocument(contextMenu.item.id)}
              >
                Supprimer
              </button>
            </>
          )}
        </div>
      )}

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {renameTarget?.type === "folder" ? "Renommer le dossier" : "Renommer le document"}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Nom"
            className="mt-2"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => void handleRenameSubmit()} disabled={!renameValue.trim()}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Nom du dossier"
            className="mt-2"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => void handleCreateFolder()} disabled={!newFolderName.trim()}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
        if (!uploading) {
          setUploadDialogOpen(open);
          if (!open) {
            setSelectedFile(null);
            setUploadFileName("");
            setUploadBrowserPath("");
            setUploadProgress(0);
          }
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importer un fichier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Fichier</label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                Choisir un fichier
              </Button>
              {selectedFile && (
                <div className="mt-2 space-y-1 rounded-md border bg-muted/30 px-3 py-2">
                  <p className="text-sm font-medium break-all">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  {selectedFileTooLarge && (
                    <p className="text-xs text-destructive">
                      {selectedFileExceedsMax
                        ? `Fichier trop volumineux (max par fichier: ${maxFileSizeMB} MB).`
                        : "Fichier trop volumineux pour l'espace restant."}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Nom du fichier</label>
              <Input
                value={uploadFileName}
                onChange={(e) => setUploadFileName(stripExtension(e.target.value))}
                placeholder="Nom du fichier"
              />
              {selectedFile && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Extension conservée automatiquement : {splitFileName(selectedFile.name).extension || "aucune"}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Dossier de destination</label>
              <div className="rounded-md border bg-muted/20">
                <div className="flex flex-wrap items-center gap-1 border-b px-2 py-2">
                  {uploadBrowserCrumbs.map((crumb, index) => (
                    <span key={crumb.path || "root"} className="inline-flex items-center gap-1">
                      {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      <button
                        type="button"
                        className="rounded px-1.5 py-0.5 text-xs hover:bg-accent"
                        onClick={() => setUploadBrowserPath(crumb.path)}
                      >
                        {crumb.label}
                      </button>
                    </span>
                  ))}
                </div>
                <div className="max-h-40 overflow-auto p-1">
                  {isLoadingAllFolders ? (
                    <p className="px-2 py-2 text-xs text-muted-foreground">
                      Chargement des dossiers...
                    </p>
                  ) : uploadBrowserFolders.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-muted-foreground">
                      Aucun sous-dossier.
                    </p>
                  ) : (
                    uploadBrowserFolders.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => setUploadBrowserPath(folder.path)}
                      >
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{folder.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Dossier sélectionné : {uploadBrowserPath || "Racine"}
              </p>
            </div>
            {submitSuccess && (
              <div className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                {submitSuccess}
              </div>
            )}
            {submitError && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!uploading) {
                  setUploadDialogOpen(false);
                  setSelectedFile(null);
                  setUploadFileName("");
                  setUploadBrowserPath("");
                  setUploadProgress(0);
                  setSubmitError(null);
                  setSubmitSuccess(null);
                }
              }}
              disabled={uploading}
            >
              Annuler
            </Button>
            <Button
              onClick={() => void handleUploadConfirm()}
              disabled={
                !selectedFile ||
                !uploadFileName.trim() ||
                selectedFileTooLarge ||
                uploading
              }
            >
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
