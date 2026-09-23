"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { userErrorMessage } from "@/lib/user-error";

/*
  L'import d'un fichier dure parfois plusieurs minutes. Tant que l'état vivait
  dans `DocumentsPage`, quitter le Drive démontait la vignette de progression :
  l'envoi continuait en silence, sans rien à l'écran. Le provider est monté dans
  le layout `(app)`, donc la vignette traverse les changements de route — même
  logique que le lecteur audio du catalogue.
*/

type UploadStatus = "uploading" | "success" | "error";

interface UploadToastState {
  open: boolean;
  status: UploadStatus;
  progress: number;
  message: string;
  fileName: string;
}

interface StartUploadInput {
  fileName: string;
  /** L'envoi lui-même. Rapporte l'avancement en pourcentage. */
  run: (onProgress: (progress: number) => void) => Promise<void>;
  /** Rafraîchissements côté page, joués une fois l'envoi terminé. */
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

interface DriveUploadContextValue {
  isUploading: boolean;
  startUpload: (input: StartUploadInput) => Promise<void>;
}

const DriveUploadContext = createContext<DriveUploadContextValue | null>(null);

const CLOSED_TOAST: UploadToastState = {
  open: false,
  status: "uploading",
  progress: 0,
  message: "",
  fileName: ""
};

export function DriveUploadProvider({ children }: { children: ReactNode }) {
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<UploadToastState>(CLOSED_TOAST);
  const toastTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Fermer l'onglet pendant un envoi le perd : on prévient.
  useEffect(() => {
    if (!isUploading) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isUploading]);

  const startUpload = useCallback(async ({ fileName, run, onSuccess, onError }: StartUploadInput) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setIsUploading(true);
    setToast({
      open: true,
      status: "uploading",
      progress: 0,
      message: "Importation en cours…",
      fileName
    });

    try {
      await run((progress) => {
        setToast((prev) => ({ ...prev, open: true, status: "uploading", progress, fileName }));
      });
      setToast({
        open: true,
        status: "success",
        progress: 100,
        message: "Fichier importé avec succès.",
        fileName
      });
      toastTimeoutRef.current = window.setTimeout(() => {
        setToast((prev) => ({ ...prev, open: false }));
      }, 5000);
      onSuccess?.();
    } catch (err) {
      const message = userErrorMessage(err, "L’import a échoué. Réessaie.");
      setToast({ open: true, status: "error", progress: 0, message, fileName });
      onError?.(message);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const value = useMemo<DriveUploadContextValue>(
    () => ({ isUploading, startUpload }),
    [isUploading, startUpload]
  );

  return (
    <DriveUploadContext.Provider value={value}>
      {children}
      {toast.open && (
        <div className="fixed bottom-4 right-4 z-[100] w-[360px] rounded-lg border border-[rgba(245,245,245,0.2)] bg-[rgba(15,23,42,0.96)] p-3 text-[#F5F5F5] shadow-2xl backdrop-blur">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {toast.status === "uploading" ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : toast.status === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              )}
              <p className="truncate text-sm font-medium">{toast.fileName}</p>
            </div>
            {toast.status !== "uploading" && (
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => setToast((prev) => ({ ...prev, open: false }))}
                aria-label="Fermer la notification"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mb-2 text-xs text-muted-foreground">{toast.message}</p>
          {toast.status === "uploading" && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Progression</span>
                <span>{toast.progress}%</span>
              </div>
              <Progress value={toast.progress} className="h-2" />
            </div>
          )}
        </div>
      )}
    </DriveUploadContext.Provider>
  );
}

export function useDriveUpload(): DriveUploadContextValue {
  const ctx = useContext(DriveUploadContext);
  if (!ctx) {
    throw new Error("useDriveUpload doit être utilisé dans un DriveUploadProvider.");
  }
  return ctx;
}
