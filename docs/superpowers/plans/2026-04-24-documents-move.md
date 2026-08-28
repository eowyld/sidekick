# Documents — Move Folder/File Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Déplacer" option to the context menu in DocumentsPage that opens an inline folder-picker popover letting the user navigate the storage tree and confirm a move destination.

**Architecture:** All logic stays inside `DocumentsPage.tsx`. A new `MovePopover` component (inline in the same file) renders as `position: fixed` at the context-menu coordinates. It reuses `allAvailableFolders` (already loaded for the upload dialog) and calls `renameStorageFolderAtPath` / `renameStorageFileAtPath` with a new path built from the chosen destination.

**Tech Stack:** React, TypeScript, Supabase Storage (`move` via existing drive-db helpers), Tailwind, Lucide icons.

---

### Task 1: Add `moveStorageItem` helper to `drive-db.ts`

**Files:**
- Modify: `src/lib/drive-db.ts`

The existing `renameStorageFolder` only changes the name inside the same parent. We need a helper that moves a folder (or file) to an arbitrary new parent path.

- [ ] **Step 1: Add `moveStorageFolder` at the end of `drive-db.ts`**

```ts
/** Déplace un dossier Storage vers un nouveau chemin parent. */
export async function moveStorageFolder(
  supabase: SupabaseClient,
  folderPath: string,   // e.g. "uid/Admin/OldParent/MonDossier"
  newParentPath: string // e.g. "uid/Live"  (full path, including uid)
): Promise<void> {
  const name = folderPath.split("/").pop()!;
  const newPrefix = `${newParentPath}/${name}`;
  const paths = await listAllFilePathsUnderPrefix(supabase, folderPath);
  for (const oldPath of paths) {
    const suffix = oldPath.slice(folderPath.length);
    const newPath = newPrefix + suffix;
    const { error } = await supabase.storage.from(DRIVE_BUCKET).move(oldPath, newPath);
    if (error) throw new Error(error.message ?? String(error));
  }
}
```

- [ ] **Step 2: Add `moveStorageFile` at the end of `drive-db.ts`**

```ts
/** Déplace un fichier Storage vers un nouveau dossier. */
export async function moveStorageFile(
  supabase: SupabaseClient,
  filePath: string,     // e.g. "uid/Admin/Contrats/doc.pdf"
  newParentPath: string // e.g. "uid/Live"
): Promise<void> {
  const name = filePath.split("/").pop()!;
  const newPath = `${newParentPath}/${name}`;
  const { error } = await supabase.storage.from(DRIVE_BUCKET).move(filePath, newPath);
  if (error) throw new Error(error.message ?? String(error));
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `drive-db.ts`.

---

### Task 2: Expose `moveStorageFolderAtPath` and `moveStorageFileAtPath` in `useDriveData`

**Files:**
- Modify: `src/hooks/useDriveData.ts`

- [ ] **Step 1: Import the two new helpers**

In `src/hooks/useDriveData.ts`, add to the existing import from `@/lib/drive-db`:

```ts
import {
  // ... existing imports ...
  moveStorageFolder,
  moveStorageFile,
} from "@/lib/drive-db";
```

- [ ] **Step 2: Add the two callbacks inside the hook (after `renameStorageFileAtPath`)**

```ts
const moveStorageFolderAtPath = useCallback(
  async (folderPath: string, newParentPath: string) => {
    await moveStorageFolder(supabase, folderPath, newParentPath);
  },
  [supabase]
);

const moveStorageFileAtPath = useCallback(
  async (filePath: string, newParentPath: string) => {
    await moveStorageFile(supabase, filePath, newParentPath);
  },
  [supabase]
);
```

- [ ] **Step 3: Add them to the return object**

In the `return` statement of `useDriveData`, add:

```ts
moveStorageFolderAtPath,
moveStorageFileAtPath,
```

- [ ] **Step 4: Add to the hook's TypeScript interface** (if there is one in the same file — check for `interface DriveDataHook` or similar)

If an explicit interface exists, add:
```ts
moveStorageFolderAtPath: (folderPath: string, newParentPath: string) => Promise<void>;
moveStorageFileAtPath: (filePath: string, newParentPath: string) => Promise<void>;
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

### Task 3: Add move state and `handleMove` in `DocumentsPage`

**Files:**
- Modify: `src/modules/admin/components/DocumentsPage.tsx`

- [ ] **Step 1: Destructure the two new hook functions**

In the `useDriveData()` destructuring block (around line 96), add:

```ts
moveStorageFolderAtPath,
moveStorageFileAtPath,
```

- [ ] **Step 2: Add move-popover state (after the existing `contextMenu` state, ~line 129)**

```ts
const [movePopover, setMovePopover] = useState<{
  type: "folder" | "document";
  item: DriveFolder | DriveDocument;
  x: number;
  y: number;
} | null>(null);
const [moveBrowserPath, setMoveBrowserPath] = useState("");
const [moveHistory, setMoveHistory] = useState<string[]>([]);
const movePopoverRef = useRef<HTMLDivElement | null>(null);
```

- [ ] **Step 3: Close popover on outside click (add new `useEffect` after the existing context-menu close effect)**

```ts
useEffect(() => {
  if (!movePopover) return;
  const handleMouseDown = (e: MouseEvent) => {
    if (movePopoverRef.current && !movePopoverRef.current.contains(e.target as Node)) {
      setMovePopover(null);
      setMoveBrowserPath("");
      setMoveHistory([]);
    }
  };
  window.addEventListener("mousedown", handleMouseDown);
  return () => window.removeEventListener("mousedown", handleMouseDown);
}, [movePopover]);
```

- [ ] **Step 4: Add `moveFolders` memo — subfolders visible at `moveBrowserPath`**

```ts
const moveFolders = useMemo(() => {
  return allAvailableFolders
    .filter((folder) => {
      const segments = folder.path.split("/").filter(Boolean);
      const parentPath = segments.slice(0, -1).join("/");
      return parentPath === moveBrowserPath;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}, [allAvailableFolders, moveBrowserPath]);
```

- [ ] **Step 5: Add `handleMoveConfirm` async function**

```ts
const handleMoveConfirm = async () => {
  if (!movePopover || !userId) return;
  setSubmitError(null);
  try {
    // Build full Supabase storage path for destination: uid/relative
    const newParentPath = moveBrowserPath
      ? `${userId}/${moveBrowserPath}`
      : userId;

    if (movePopover.type === "folder") {
      const folderPath = movePopover.item.id.startsWith(STORAGE_FOLDER_PREFIX)
        ? movePopover.item.id.slice(STORAGE_FOLDER_PREFIX.length)
        : null;
      if (!folderPath) return;
      await moveStorageFolderAtPath(folderPath, newParentPath);
      // If we were inside the moved folder, go back to root
      if (currentFolderId === movePopover.item.id || currentFolderId?.startsWith(movePopover.item.id + "/")) {
        setCurrentFolderId(null);
      }
    } else {
      const filePath = movePopover.item.id.startsWith("storage-file:")
        ? movePopover.item.id.slice("storage-file:".length)
        : null;
      if (!filePath) return;
      await moveStorageFileAtPath(filePath, newParentPath);
      posthog?.capture("file_moved", { module: "documents" });
    }

    if (isStorageView && storagePath) await loadStorageContents(storagePath);
    await refetch();
    invalidateGlobalSearch();
    setMovePopover(null);
    setMoveBrowserPath("");
    setMoveHistory([]);
    setSubmitSuccess("Élément déplacé.");
    setTimeout(() => setSubmitSuccess(null), 3000);
  } catch (err) {
    setSubmitError(err instanceof Error ? err.message : String(err));
    setMovePopover(null);
    setMoveBrowserPath("");
    setMoveHistory([]);
  }
};
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

---

### Task 4: Wire "Déplacer" into the context menu

**Files:**
- Modify: `src/modules/admin/components/DocumentsPage.tsx`

- [ ] **Step 1: Import `ArrowRight` from lucide (for the back button we'll use `ArrowLeft`)**

Check the existing import line (~line 34). Add `ArrowLeft` if not already present:

```ts
import { Plus, FolderOpen, FileText, ChevronRight, Home, RefreshCw, Lock, Loader2, CheckCircle2, AlertCircle, X, ArrowLeft } from "lucide-react";
```

- [ ] **Step 2: Add "Déplacer" button in the folder context menu (around line 1144)**

Inside the folder context menu, after the "Renommer" button and before "Supprimer", add:

```tsx
<button
  type="button"
  className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
  onClick={() => {
    setContextMenu(null);
    const initialPath = moveBrowserPath; // keep current browse path or reset
    setMoveBrowserPath("");
    setMoveHistory([]);
    void loadAllAvailableFolders();
    setMovePopover({ type: "folder", item: contextMenu!.item, x: contextMenu!.x, y: contextMenu!.y });
  }}
>
  Déplacer
</button>
```

- [ ] **Step 3: Add "Déplacer" button in the document context menu (around line 1168)**

After the "Renommer" button and before "Supprimer":

```tsx
<button
  type="button"
  className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
  onClick={() => {
    setContextMenu(null);
    setMoveBrowserPath("");
    setMoveHistory([]);
    void loadAllAvailableFolders();
    setMovePopover({ type: "document", item: contextMenu!.item, x: contextMenu!.x, y: contextMenu!.y });
  }}
>
  Déplacer
</button>
```

- [ ] **Step 4: Prevent "Déplacer" from appearing for locked folders**

The context menu already returns early (`if (row.folder.isLocked) return;`) on right-click for locked folders (line ~1038), so no additional guard is needed. Confirm this is still the case.

---

### Task 5: Render the `MovePopover`

**Files:**
- Modify: `src/modules/admin/components/DocumentsPage.tsx`

Add the popover JSX just before the closing `</div>` of the main return, after the `contextMenu` block.

- [ ] **Step 1: Add the popover JSX**

```tsx
{movePopover && (
  <div
    ref={movePopoverRef}
    className="fixed z-50 w-64 rounded-md border border-[rgba(245,245,245,0.2)] bg-[rgba(15,23,42,0.96)] text-[#F5F5F5] shadow-lg overflow-hidden"
    style={{ left: movePopover.x, top: movePopover.y }}
  >
    {/* Header: back arrow + current path */}
    <div className="flex items-center gap-2 border-b border-[rgba(245,245,245,0.12)] px-3 py-2">
      {moveHistory.length > 0 ? (
        <button
          type="button"
          className="rounded p-0.5 hover:bg-accent"
          onClick={() => {
            const prev = moveHistory[moveHistory.length - 1];
            setMoveHistory((h) => h.slice(0, -1));
            setMoveBrowserPath(prev);
          }}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      ) : (
        <span className="w-5" />
      )}
      <span className="text-xs font-medium truncate flex-1">
        {moveBrowserPath
          ? moveBrowserPath.split("/").pop()
          : "Racine"}
      </span>
    </div>

    {/* Folder list */}
    <div className="max-h-48 overflow-auto py-1">
      {isLoadingAllFolders ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">Chargement…</p>
      ) : moveFolders.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">Aucun sous-dossier.</p>
      ) : (
        moveFolders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent"
            onClick={() => {
              setMoveHistory((h) => [...h, moveBrowserPath]);
              setMoveBrowserPath(folder.path);
            }}
          >
            <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{folder.name}</span>
          </button>
        ))
      )}
    </div>

    {/* Confirm button */}
    <div className="border-t border-[rgba(245,245,245,0.12)] px-3 py-2">
      <Button
        size="sm"
        className="w-full"
        onClick={() => void handleMoveConfirm()}
      >
        Déplacer ici
      </Button>
    </div>
  </div>
)}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start dev server and test**

```bash
npm run dev
```

Manual test checklist:
1. Right-click a non-locked folder → "Déplacer" appears
2. Right-click a locked folder (🔒) → "Déplacer" does NOT appear (context menu blocked entirely)
3. Right-click a file inside a locked folder → "Déplacer" appears
4. Open move popover → shows folders at root
5. Click a folder → navigates into it, back arrow appears
6. Click back arrow → returns to previous level
7. At root → no back arrow
8. Click "Déplacer ici" → item moves, popover closes, success toast
9. Click outside popover → closes without moving

---

### Task 6: Edge-case guard — prevent moving a folder into itself or a descendant

**Files:**
- Modify: `src/modules/admin/components/DocumentsPage.tsx`

- [ ] **Step 1: Filter out self and descendants from `moveFolders`**

Update the `moveFolders` memo to exclude the item being moved (and its children) when the move target is a folder:

```ts
const moveFolders = useMemo(() => {
  // Compute the relative path of the item being moved (if folder)
  let excludedPrefix: string | null = null;
  if (movePopover?.type === "folder" && movePopover.item.id.startsWith(STORAGE_FOLDER_PREFIX)) {
    const fullPath = movePopover.item.id.slice(STORAGE_FOLDER_PREFIX.length);
    const prefix = userId && fullPath.startsWith(`${userId}/`) ? fullPath.slice(userId.length + 1) : fullPath;
    excludedPrefix = prefix;
  }

  return allAvailableFolders
    .filter((folder) => {
      const segments = folder.path.split("/").filter(Boolean);
      const parentPath = segments.slice(0, -1).join("/");
      if (parentPath !== moveBrowserPath) return false;
      // Exclude self and descendants
      if (excludedPrefix && (folder.path === excludedPrefix || folder.path.startsWith(excludedPrefix + "/"))) return false;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}, [allAvailableFolders, moveBrowserPath, movePopover, userId]);
```

- [ ] **Step 2: Also guard `handleMoveConfirm` to prevent same-parent no-op**

At the start of `handleMoveConfirm`, after building `newParentPath`, add:

```ts
// Prevent no-op: item is already in this destination
if (movePopover.type === "folder") {
  const folderPath = movePopover.item.id.startsWith(STORAGE_FOLDER_PREFIX)
    ? movePopover.item.id.slice(STORAGE_FOLDER_PREFIX.length)
    : null;
  if (folderPath) {
    const currentParent = folderPath.includes("/")
      ? folderPath.slice(0, folderPath.lastIndexOf("/"))
      : userId ?? "";
    if (currentParent === newParentPath) {
      setMovePopover(null);
      setMoveBrowserPath("");
      setMoveHistory([]);
      return;
    }
  }
} else {
  const filePath = movePopover.item.id.startsWith("storage-file:")
    ? movePopover.item.id.slice("storage-file:".length)
    : null;
  if (filePath) {
    const currentParent = filePath.includes("/")
      ? filePath.slice(0, filePath.lastIndexOf("/"))
      : userId ?? "";
    if (currentParent === newParentPath) {
      setMovePopover(null);
      setMoveBrowserPath("");
      setMoveHistory([]);
      return;
    }
  }
}
```

- [ ] **Step 3: Final TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.
