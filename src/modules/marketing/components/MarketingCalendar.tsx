"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, FolderOpen, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { useSidekickData } from "@/hooks/useSidekickData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { MAX_FILE_SIZE_BYTES, isPlaceholderFileName, uploadDriveFileToPath } from "@/lib/drive-db";
import type { MarketingEvent } from "@/lib/sidekick-store";
import {
  DEFAULT_EDITORIAL_EVENT_FORM,
  EDITORIAL_CONTENT_TYPES,
  EDITORIAL_PLATFORMS,
  EDITORIAL_STATUSES,
  type EditorialEvent,
  type EditorialEventForm,
  type EditorialStatus,
  normalizeEditorialEvent
} from "@/modules/marketing/data/calendrier-editorial";

const WEEK_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const STATUS_LABELS: Record<EditorialStatus, string> = {
  idee: "Idée",
  a_produire: "A produire",
  planifie: "Planifié",
  publie: "Publié"
};

const STATUS_BADGE_CLASS: Record<EditorialStatus, string> = {
  idee: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  a_produire: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  planifie: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  publie: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  newsletter: "Newsletter",
  presse: "Presse"
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  post: "Post",
  story: "Story",
  video_verticale: "Vidéo verticale",
  video_horizontale: "Vidéo horizontale",
  texte: "Texte"
};

type CalendarViewMode = "month" | "week";

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildMonthMatrix(baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: Array<number | null> = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: Array<Array<number | null>> = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatFrDate(date: string): string {
  if (!date) return "-";
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}

function sortEvents(a: EditorialEvent, b: EditorialEvent) {
  const aKey = `${a.date} ${a.time || "23:59"}`;
  const bKey = `${b.date} ${b.time || "23:59"}`;
  return aKey.localeCompare(bKey);
}

function formatOptionLabel(value: string, labels: Record<string, string>): string {
  if (labels[value]) return labels[value];
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function attachmentLabel(value: string): string {
  const parts = value.split("/");
  return parts[parts.length - 1] || value;
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

export function MarketingCalendar() {
  const { data, setData } = useSidekickData();
  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditorialEventForm>(DEFAULT_EDITORIAL_EVENT_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [newPlatform, setNewPlatform] = useState("");
  const [newContentType, setNewContentType] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadBrowserPath, setUploadBrowserPath] = useState("Marketing");
  const [allAvailableFolders, setAllAvailableFolders] = useState<
    Array<{ id: string; name: string; path: string }>
  >([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rawEvents = (data.marketing.events ?? []) as MarketingEvent[];
  const events = useMemo(
    () => rawEvents.map(normalizeEditorialEvent).filter((e) => e.date).sort(sortEvents),
    [rawEvents]
  );
  const customPlatforms = data.marketing.editorialPlatforms ?? [];
  const customContentTypes = data.marketing.editorialContentTypes ?? [];
  const platformOptions = useMemo(
    () => Array.from(new Set([...EDITORIAL_PLATFORMS, ...customPlatforms.map((v) => v.trim().toLowerCase()).filter(Boolean)])),
    [customPlatforms]
  );
  const contentTypeOptions = useMemo(
    () => Array.from(new Set([...EDITORIAL_CONTENT_TYPES, ...customContentTypes.map((v) => v.trim().toLowerCase()).filter(Boolean)])),
    [customContentTypes]
  );
  const uploadBrowserFolders = useMemo(() => {
    return allAvailableFolders
      .filter((folder) => {
        const segments = folder.path.split("/").filter(Boolean);
        const parentPath = segments.slice(0, -1).join("/");
        return parentPath === uploadBrowserPath;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
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

  const eventsByDate = useMemo(() => {
    const map: Record<string, EditorialEvent[]> = {};
    for (const event of events) {
      if (!map[event.date]) map[event.date] = [];
      map[event.date].push(event);
    }
    Object.values(map).forEach((items) => items.sort(sortEvents));
    return map;
  }, [events]);

  const todayKey = toDateKey(new Date());

  const monthLabel = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric"
  }).format(currentMonth);

  const monthGrid = useMemo(() => buildMonthMatrix(currentMonth), [currentMonth]);
  const selectedDateObj = useMemo(() => parseDateKey(selectedDate), [selectedDate]);
  const weekStart = useMemo(() => startOfWeek(selectedDateObj), [selectedDateObj]);
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, index) => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + index);
        return {
          date: day,
          dateKey: toDateKey(day),
          label: new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(day)
        };
      }),
    [weekStart]
  );
  const weekLabel = `${formatFrDate(weekDays[0]?.dateKey ?? selectedDate)} - ${formatFrDate(
    weekDays[6]?.dateKey ?? selectedDate
  )}`;

  useEffect(() => {
    if (!uploadDialogOpen) return;
    let cancelled = false;
    async function loadFolders() {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const folders: Array<{ id: string; name: string; path: string }> = [];
      async function collectFolders(path: string, displayPath: string) {
        const { data } = await supabase.storage.from("drive").list(path, { limit: 1000 });
        if (!data || cancelled) return;
        for (const item of data) {
          if (!item.name || isPlaceholderFileName(item.name)) continue;
          const childPath = path ? `${path}/${item.name}` : item.name;
          const hasExtension = item.name.includes(".");
          const { data: childData } = await supabase.storage.from("drive").list(childPath, { limit: 1 });
          const isFolder = (childData?.length ?? 0) > 0 || !hasExtension;
          if (!isFolder) continue;
          const newDisplayPath = displayPath ? `${displayPath}/${item.name}` : item.name;
          folders.push({
            id: childPath,
            name: item.name,
            path: newDisplayPath
          });
          await collectFolders(childPath, newDisplayPath);
        }
      }
      await collectFolders(user.id, "");
      if (!cancelled) {
        setAllAvailableFolders(folders);
        setUploadBrowserPath("Marketing");
      }
    }
    void loadFolders();
    return () => {
      cancelled = true;
    };
  }, [uploadDialogOpen]);

  const openCreateDialog = (date?: string) => {
    setEditingId(null);
    setFormError(null);
    setUploadError(null);
    setForm({ ...DEFAULT_EDITORIAL_EVENT_FORM, date: date ?? selectedDate });
    setNewPlatform("");
    setNewContentType("");
    setDialogOpen(true);
  };

  const openEditDialog = (event: EditorialEvent) => {
    setEditingId(event.id);
    setFormError(null);
    setUploadError(null);
    setForm({
      title: event.title,
      date: event.date,
      time: event.time || "",
      platforms: event.platforms,
      status: event.status,
      contentTypes: event.contentTypes,
      text: event.text || "",
      attachments: event.attachments || [],
      notes: event.notes || ""
    });
    setNewPlatform("");
    setNewContentType("");
    setDialogOpen(true);
  };

  const persistEvents = (updater: (prev: MarketingEvent[]) => MarketingEvent[]) => {
    setData((prev) => {
      const previousMarketingEvents = (prev.marketing.events ?? []) as MarketingEvent[];
      return {
        ...prev,
        marketing: {
          ...prev.marketing,
          events: updater(previousMarketingEvents)
        }
      };
    });
  };

  const toggleInFormList = (key: "platforms" | "contentTypes", value: string) => {
    setForm((prev) => {
      const current = prev[key];
      if (current.includes(value)) {
        return { ...prev, [key]: current.filter((item) => item !== value) };
      }
      return { ...prev, [key]: [...current, value] };
    });
  };

  const addCustomOption = (type: "platform" | "contentType") => {
    const raw = type === "platform" ? newPlatform : newContentType;
    const value = raw.trim().toLowerCase().replace(/\s+/g, "_");
    if (!value) return;

    setData((prev) => {
      const existing =
        type === "platform"
          ? prev.marketing.editorialPlatforms ?? []
          : prev.marketing.editorialContentTypes ?? [];
      if (existing.includes(value)) return prev;
      return {
        ...prev,
        marketing: {
          ...prev.marketing,
          editorialPlatforms:
            type === "platform" ? [...(prev.marketing.editorialPlatforms ?? []), value] : prev.marketing.editorialPlatforms ?? [],
          editorialContentTypes:
            type === "contentType"
              ? [...(prev.marketing.editorialContentTypes ?? []), value]
              : prev.marketing.editorialContentTypes ?? []
        }
      };
    });

    if (type === "platform") {
      setNewPlatform("");
      setForm((prev) =>
        prev.platforms.includes(value) ? prev : { ...prev, platforms: [...prev.platforms, value] }
      );
    } else {
      setNewContentType("");
      setForm((prev) =>
        prev.contentTypes.includes(value) ? prev : { ...prev, contentTypes: [...prev.contentTypes, value] }
      );
    }
  };

  const removeCustomOption = (type: "platform" | "contentType", value: string) => {
    setData((prev) => {
      const nextPlatforms =
        type === "platform"
          ? (prev.marketing.editorialPlatforms ?? []).filter((v) => v !== value)
          : (prev.marketing.editorialPlatforms ?? []);
      const nextTypes =
        type === "contentType"
          ? (prev.marketing.editorialContentTypes ?? []).filter((v) => v !== value)
          : (prev.marketing.editorialContentTypes ?? []);
      return {
        ...prev,
        marketing: {
          ...prev.marketing,
          editorialPlatforms: nextPlatforms,
          editorialContentTypes: nextTypes
        }
      };
    });

    if (type === "platform") {
      setForm((prev) => ({ ...prev, platforms: prev.platforms.filter((p) => p !== value) }));
    } else {
      setForm((prev) => ({ ...prev, contentTypes: prev.contentTypes.filter((t) => t !== value) }));
    }
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      setUploadFileName("");
      return;
    }
    setSelectedFile(file);
    setUploadFileName(stripExtension(file.name));
  };

  const handleUploadConfirm = async () => {
    if (!selectedFile) return;
    if (!uploadFileName.trim()) {
      setUploadError("Nom du fichier requis.");
      return;
    }
    const maxFileSizeMB = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`Fichier trop volumineux (max par fichier: ${maxFileSizeMB} MB).`);
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setUploadingFiles(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté.");
      const uploadBase = stripExtension(uploadFileName.trim()) || "fichier";
      const { extension } = splitFileName(selectedFile.name);
      const fileToUpload = new File([selectedFile], `${uploadBase}${extension}`, {
        type: selectedFile.type
      });
      const destinationPath = uploadBrowserPath.trim();
      const { path: uploadedPath } = await uploadDriveFileToPath(
        supabase,
        user.id,
        fileToUpload,
        destinationPath
      );

      setForm((prev) => ({
        ...prev,
        attachments: Array.from(new Set([...prev.attachments, uploadedPath]))
      }));
      setUploadSuccess("Fichier importé.");
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadFileName("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur pendant l'upload.";
      setUploadError(message);
    } finally {
      setUploadingFiles(false);
    }
  };

  const saveEvent = () => {
    if (!form.title.trim()) {
      setFormError("Le titre est obligatoire.");
      return;
    }
    if (!form.date) {
      setFormError("La date est obligatoire.");
      return;
    }
    if (form.platforms.length === 0) {
      setFormError("Selectionne au moins une plateforme.");
      return;
    }
    if (form.contentTypes.length === 0) {
      setFormError("Selectionne au moins un type de contenu.");
      return;
    }

    const payload: EditorialEvent = {
      id: editingId ?? makeId(),
      title: form.title.trim(),
      date: form.date,
      time: form.time.trim(),
      platforms: form.platforms,
      status: form.status,
      contentTypes: form.contentTypes,
      text: form.text.trim(),
      attachments: form.attachments,
      notes: form.notes.trim()
    };

    persistEvents((prev) => {
      if (!editingId) return [...prev, payload];
      return prev.map((item) => (String(item.id) === editingId ? { ...item, ...payload } : item));
    });

    setSelectedDate(payload.date);
    setDialogOpen(false);
  };

  const deleteEvent = (id: string) => {
    const target = events.find((event) => event.id === id);
    if (!target) return;
    if (!window.confirm(`Supprimer "${target.title}" ?`)) return;
    persistEvents((prev) => prev.filter((item) => String(item.id) !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Publications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Planifie tes contenus marketing par date, canal et statut.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border bg-background p-0.5">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "week" ? "default" : "ghost"}
              onClick={() => setViewMode("week")}
            >
              Semaine
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "month" ? "default" : "ghost"}
              onClick={() => setViewMode("month")}
            >
              Mois
            </Button>
          </div>
          <Button onClick={() => openCreateDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle publication
          </Button>
        </div>
      </div>

      <div>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4" />
                {viewMode === "week" ? weekLabel : monthLabel}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (viewMode === "week") {
                      const prev = new Date(selectedDateObj);
                      prev.setDate(prev.getDate() - 7);
                      setSelectedDate(toDateKey(prev));
                      setCurrentMonth(new Date(prev.getFullYear(), prev.getMonth(), 1));
                    } else {
                      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
                    }
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (viewMode === "week") {
                      const next = new Date(selectedDateObj);
                      next.setDate(next.getDate() + 7);
                      setSelectedDate(toDateKey(next));
                      setCurrentMonth(new Date(next.getFullYear(), next.getMonth(), 1));
                    } else {
                      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
                    }
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground">
              {WEEK_DAYS.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>
            {viewMode === "month" ? (
              <div className="space-y-2">
                {monthGrid.map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-cols-7 gap-2">
                    {week.map((day, dayIndex) => {
                      if (!day) {
                        return <div key={`empty-${weekIndex}-${dayIndex}`} className="h-28 rounded-md border bg-muted/20" />;
                      }

                      const dateKey = toDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
                      const dayEvents = eventsByDate[dateKey] ?? [];
                      const isSelected = selectedDate === dateKey;
                      const isToday = dateKey === todayKey;

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          onClick={() => setSelectedDate(dateKey)}
                          onDoubleClick={() => openCreateDialog(dateKey)}
                          className={cn(
                            "h-28 rounded-md border p-2 text-left transition-colors",
                            "hover:border-primary/30 hover:bg-primary/5",
                            isSelected && "border-primary bg-primary/10",
                            isToday && !isSelected && "border-emerald-500/60"
                          )}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs font-medium">{String(day).padStart(2, "0")}</span>
                            {dayEvents.length > 0 && (
                              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                {dayEvents.length}
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 2).map((event) => (
                              <div key={event.id} className="truncate text-[11px] text-muted-foreground">
                                {event.time ? `${event.time} - ` : ""}{event.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-[11px] text-muted-foreground">+{dayEvents.length - 2} autres</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-7">
                {weekDays.map((day) => {
                  const dayEvents = eventsByDate[day.dateKey] ?? [];
                  const isSelected = selectedDate === day.dateKey;
                  const isToday = day.dateKey === todayKey;
                  return (
                    <div
                      key={day.dateKey}
                      onClick={() => setSelectedDate(day.dateKey)}
                      onDoubleClick={() => openCreateDialog(day.dateKey)}
                      className={cn(
                        "min-h-64 rounded-md border p-2 text-left transition-colors",
                        "hover:border-primary/30 hover:bg-primary/5",
                        isSelected && "border-primary bg-primary/10",
                        isToday && !isSelected && "border-emerald-500/60"
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between border-b pb-1">
                        <span className="text-xs font-semibold">
                          {day.label} {String(day.date.getDate()).padStart(2, "0")}
                        </span>
                        {dayEvents.length > 0 && (
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                            {dayEvents.length}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {dayEvents.length === 0 ? (
                          <div className="flex h-28 items-center justify-center">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-10 w-10 rounded-md bg-[#F0FF00] p-0 text-[#101010] hover:bg-[#E3F100]"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCreateDialog(day.dateKey);
                              }}
                            >
                              <Plus className="h-5 w-5" strokeWidth={2.75} />
                            </Button>
                          </div>
                        ) : (
                          dayEvents.map((event) => (
                            <div key={event.id} className="rounded border bg-background px-2 py-1">
                              <p className="truncate text-[11px] font-medium">
                                {event.time ? `${event.time} - ` : ""}{event.title}
                              </p>
                              <p className="truncate text-[10px] text-muted-foreground">
                                {event.platforms.map((p) => formatOptionLabel(p, PLATFORM_LABELS)).join(", ")} - {STATUS_LABELS[event.status]}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[78vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier la publication" : "Nouvelle publication"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="editorial-title">Titre</Label>
              <Input
                id="editorial-title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Reel backstage repetitions"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <DatePicker
                  value={form.date}
                  onChange={(date) => setForm((prev) => ({ ...prev, date }))}
                  placeholder="Date de publication"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editorial-time">Heure</Label>
                <Input
                  id="editorial-time"
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Plateformes</Label>
              <div className="flex flex-wrap gap-2">
                {platformOptions.map((platform) => {
                  const selected = form.platforms.includes(platform);
                  const isCustom = !EDITORIAL_PLATFORMS.includes(platform as (typeof EDITORIAL_PLATFORMS)[number]);
                  return (
                    <div key={platform} className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        onClick={() => toggleInFormList("platforms", platform)}
                      >
                        {formatOptionLabel(platform, PLATFORM_LABELS)}
                      </Button>
                      {isCustom && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeCustomOption("platform", platform)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                  placeholder="Ajouter une plateforme"
                />
                <Button type="button" variant="outline" onClick={() => addCustomOption("platform")}>
                  Ajouter
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Types de contenu</Label>
              <div className="flex flex-wrap gap-2">
                {contentTypeOptions.map((contentType) => {
                  const selected = form.contentTypes.includes(contentType);
                  const isCustom = !EDITORIAL_CONTENT_TYPES.includes(contentType as (typeof EDITORIAL_CONTENT_TYPES)[number]);
                  return (
                    <div key={contentType} className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        onClick={() => toggleInFormList("contentTypes", contentType)}
                      >
                        {formatOptionLabel(contentType, CONTENT_TYPE_LABELS)}
                      </Button>
                      {isCustom && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeCustomOption("contentType", contentType)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newContentType}
                  onChange={(e) => setNewContentType(e.target.value)}
                  placeholder="Ajouter un type"
                />
                <Button type="button" variant="outline" onClick={() => addCustomOption("contentType")}>
                  Ajouter
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as EditorialStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDITORIAL_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editorial-text">Texte</Label>
              <Textarea
                id="editorial-text"
                value={form.text}
                onChange={(e) => setForm((prev) => ({ ...prev, text: e.target.value }))}
                placeholder="Texte principal du contenu..."
                rows={4}
              />
            </div>

            <div className="space-y-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setUploadError(null);
                  setUploadSuccess(null);
                  setUploadBrowserPath("Marketing");
                  setUploadDialogOpen(true);
                }}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Uploader des fichiers
              </Button>
              {uploadSuccess && <p className="text-xs text-emerald-600">{uploadSuccess}</p>}
              {form.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.attachments.map((filePath) => (
                    <Badge key={filePath} variant="outline" className="gap-1">
                      {attachmentLabel(filePath)}
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            attachments: prev.attachments.filter((name) => name !== filePath)
                          }))
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editorial-notes">Notes / brief</Label>
              <Textarea
                id="editorial-notes"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Message cle, hook, CTA, assets a preparer..."
                rows={4}
              />
            </div>
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveEvent}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          if (!uploadingFiles) {
            setUploadDialogOpen(open);
            if (!open) {
              setSelectedFile(null);
              setUploadFileName("");
              setUploadError(null);
            }
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importer un fichier</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Fichier</label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  handleFileSelect(e.target.files?.[0] ?? null);
                  e.currentTarget.value = "";
                }}
                disabled={uploadingFiles}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFiles}
              >
                Choisir un fichier
              </Button>
              {selectedFile && (
                <div className="mt-2 space-y-1 rounded-md border bg-muted/30 px-3 py-2">
                  <p className="break-all text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Nom du fichier</label>
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
              <label className="mb-2 block text-sm font-medium">Dossier de destination</label>
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
                  {uploadBrowserFolders.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-muted-foreground">Aucun sous-dossier.</p>
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

            {uploadError && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {uploadError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!uploadingFiles) {
                  setUploadDialogOpen(false);
                  setSelectedFile(null);
                  setUploadFileName("");
                  setUploadError(null);
                }
              }}
              disabled={uploadingFiles}
            >
              Annuler
            </Button>
            <Button
              onClick={() => void handleUploadConfirm()}
              disabled={!selectedFile || !uploadFileName.trim() || uploadingFiles}
            >
              {uploadingFiles ? "Envoi..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

