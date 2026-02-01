"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Clock,
  MapPin,
  TrainFront,
  Car,
  Plane,
  MoreHorizontal,
  FilePlus2,
  Trash2
} from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  defaultRepresentations,
  type TimetableItem,
  type TourDate,
  type TourStatus
} from "@/modules/live/data/defaultRepresentations";

function parseFrDate(frDate: string): Date | null {
  if (!frDate) return null;
  const parts = frDate.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  return isNaN(date.getTime()) ? null : date;
}

function isRepresentationPast(dateStr: string): boolean {
  const d = parseFrDate(dateStr);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

type TransportType = "train" | "plane" | "car" | "other";

type TransportEntry = {
  id: number;
  type: TransportType;
  amount: string;
  paymentMode: "self" | "reimburse" | "covered";
  details: string;
};

type LodgingType = "hotel" | "airbnb" | "friend" | "other";

type LodgingEntry = {
  id: number;
  type: LodgingType;
  nights: string;
  amount: string;
  details: string;
  paymentMode: "self" | "reimburse" | "covered";
};

type DocumentType = "contract" | "tech" | "other";

type DocumentEntry = {
  id: number;
  type: DocumentType;
  note: string;
};

export function TourDatesPage() {
  const [openSection, setOpenSection] = useState<"past" | "upcoming" | null>("upcoming");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingStatusType, setEditingStatusType] = useState<"past" | "future">("future");
  const [editingStatus, setEditingStatus] = useState<TourStatus>("Confirmée");
  const [editingDateValue, setEditingDateValue] = useState<string>("");
  const [optionsDialog, setOptionsDialog] = useState<{
    dateId: number | null;
    type: "transport" | "lodging" | "remuneration" | "equipment" | null;
  }>({ dateId: null, type: null });
  const [transportsByDate, setTransportsByDate] = useLocalStorage<
    Record<number, TransportEntry[]>
  >("live:tour-dates:transports", {});
  const [lodgingsByDate, setLodgingsByDate] = useLocalStorage<
    Record<number, LodgingEntry[]>
  >("live:tour-dates:lodgings", {});
  const [timetablesByDate, setTimetablesByDate] = useLocalStorage<
    Record<number, TimetableItem[]>
  >("live:tour-dates:timetables", {});
  const [documentsByDate, setDocumentsByDate] = useLocalStorage<
    Record<number, DocumentEntry[]>
  >("live:tour-dates:documents", {});
  type EquipmentList = { id: number; name: string; description: string; itemIds: number[] };
  type EquipmentInventoryItem = { id: number; name: string; quantity: number; condition: string; comment?: string };
  const [equipmentLists] = useLocalStorage<EquipmentList[]>("live:equipment-lists", []);
  const [equipmentInventory] = useLocalStorage<EquipmentInventoryItem[]>("live:equipment-inventory", []);
  const [selectedListIdByDate, setSelectedListIdByDate] = useLocalStorage<Record<number, number>>(
    "live:representations-material-by-date",
    {}
  );
  const [transportForm, setTransportForm] = useState<{
    type: TransportType;
    amount: string;
    paymentMode: "self" | "reimburse" | "covered";
    details: string;
  }>({
    type: "train",
    amount: "",
    paymentMode: "self",
    details: ""
  });
  const [lodgingForm, setLodgingForm] = useState<{
    type: LodgingType;
    nights: string;
    amount: string;
    details: string;
    paymentMode: "self" | "reimburse" | "covered";
  }>({
    type: "hotel",
    nights: "",
    amount: "",
    details: "",
    paymentMode: "self"
  });

  // Pour éviter les erreurs d'hydratation liées à localStorage,
  // on n'utilise les valeurs persistées qu'après le montage client.
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const [timetableDialogDateId, setTimetableDialogDateId] = useState<number | null>(
    null
  );
  const [timetableDraft, setTimetableDraft] = useState<TimetableItem[]>([]);
  const [documentDialogDateId, setDocumentDialogDateId] = useState<number | null>(
    null
  );
  const [documentForm, setDocumentForm] = useState<{
    type: DocumentType;
    note: string;
  }>({
    type: "contract",
    note: ""
  });


  const [dates, setDates] = useLocalStorage<TourDate[]>(
    "live:representations",
    defaultRepresentations
  );

  const pastDates = useMemo(
    () => dates.filter((d) => isRepresentationPast(d.date)),
    [dates]
  );

  const upcomingDates = useMemo(
    () => dates.filter((d) => !isRepresentationPast(d.date)),
    [dates]
  );

  const toggleSection = (section: "past" | "upcoming") => {
    setOpenSection(openSection === section ? null : section);
  };

  const allDates = dates;

  const editingDate = editingId
    ? allDates.find((date) => date.id === editingId) ?? null
    : null;

  const optionsDate =
    optionsDialog.dateId != null
      ? allDates.find((date) => date.id === optionsDialog.dateId) ?? null
      : null;

  const currentTransports: TransportEntry[] =
    optionsDate && transportsByDate[optionsDate.id]
      ? transportsByDate[optionsDate.id]
      : [];

  const reimbursableTransports: TransportEntry[] =
    optionsDate && transportsByDate[optionsDate.id]
      ? (transportsByDate[optionsDate.id] ?? []).filter(
          (t) => t.paymentMode === "reimburse"
        )
      : [];

  const currentLodgings: LodgingEntry[] =
    optionsDate && lodgingsByDate[optionsDate.id]
      ? lodgingsByDate[optionsDate.id]
      : [];

  const reimbursableLodgings: LodgingEntry[] =
    optionsDate && lodgingsByDate[optionsDate.id]
      ? (lodgingsByDate[optionsDate.id] ?? []).filter(
          (l) => l.paymentMode === "reimburse"
        )
      : [];

  const currentDocuments: DocumentEntry[] =
    optionsDate && documentsByDate[optionsDate.id]
      ? documentsByDate[optionsDate.id]
      : [];

  const getSelectedListForDate = (dateId: number) =>
    equipmentLists.find((l) => l.id === selectedListIdByDate[dateId]);
  const getItemsForMaterialList = (itemIds: number[]) =>
    itemIds
      .map((id) => equipmentInventory.find((i) => i.id === id))
      .filter((i): i is EquipmentInventoryItem => i != null);

  const handleDeleteDate = (id: number) => {
    setDates((prev) => prev.filter((d) => d.id !== id));
    setTransportsByDate((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setTimetablesByDate((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (editingId === id) {
      setEditingId(null);
    }
  };

  const handleAddTransport = () => {
    if (!optionsDate || optionsDialog.type !== "transport") return;

    const trimmedDetails = transportForm.details.trim();
    const amount = transportForm.amount.trim();

    setTransportsByDate((prev) => {
      const existing = prev[optionsDate.id] ?? [];
      const nextEntry: TransportEntry = {
        id: Date.now(),
        type: transportForm.type,
        amount: amount || "0.00",
        paymentMode: transportForm.paymentMode,
        details: trimmedDetails
      };
      return {
        ...prev,
        [optionsDate.id]: [...existing, nextEntry]
      };
    });

    setTransportForm((prev) => ({
      ...prev,
      amount: "",
      details: ""
    }));
  };

  const handleDeleteTransport = (dateId: number, transportId: number) => {
    setTransportsByDate((prev) => {
      const existing = prev[dateId] ?? [];
      return {
        ...prev,
        [dateId]: existing.filter((t) => t.id !== transportId)
      };
    });
  };

  const handleAddLodging = () => {
    if (!optionsDate || optionsDialog.type !== "lodging") return;

    const nights = lodgingForm.nights.trim();
    const amount = lodgingForm.amount.trim();
    const details = lodgingForm.details.trim();

    setLodgingsByDate((prev) => {
      const existing = prev[optionsDate.id] ?? [];
      const nextEntry: LodgingEntry = {
        id: Date.now(),
        type: lodgingForm.type,
        nights: nights || "1",
        amount: amount || "0,00",
        details,
        paymentMode: lodgingForm.paymentMode
      };
      return {
        ...prev,
        [optionsDate.id]: [...existing, nextEntry]
      };
    });

    setLodgingForm((prev) => ({
      ...prev,
      nights: "",
      amount: "",
      details: ""
    }));
  };

  const handleDeleteLodging = (dateId: number, lodgingId: number) => {
    setLodgingsByDate((prev) => {
      const existing = prev[dateId] ?? [];
      return {
        ...prev,
        [dateId]: existing.filter((l) => l.id !== lodgingId)
      };
    });
  };

  const handleAddDocument = () => {
    if (!optionsDate || documentDialogDateId === null) return;

    const note = documentForm.note.trim();
    if (!note) return;

    setDocumentsByDate((prev) => {
      const existing = prev[documentDialogDateId] ?? [];
      const nextEntry: DocumentEntry = {
        id: Date.now(),
        type: documentForm.type,
        note
      };
      return {
        ...prev,
        [documentDialogDateId]: [...existing, nextEntry]
      };
    });

    setDocumentForm({
      type: "contract",
      note: ""
    });
  };

  const handleDeleteDocument = (dateId: number, docId: number) => {
    setDocumentsByDate((prev) => {
      const existing = prev[dateId] ?? [];
      return {
        ...prev,
        [dateId]: existing.filter((d) => d.id !== docId)
      };
    });
  };

  const handleExportExpensesPdf = () => {
    if (!optionsDate) return;
    if (
      reimbursableTransports.length === 0 &&
      reimbursableLodgings.length === 0
    ) {
      return;
    }
    if (typeof window === "undefined") return;

    // Import côté client uniquement
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { jsPDF } = require("jspdf") as typeof import("jspdf");
    const doc = new jsPDF();

    const parseAmount = (rawAmount: string) => {
      const raw = (rawAmount || "0").replace(",", ".").trim();
      const parsed = Number.parseFloat(raw);
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    const items: { label: string; details: string; amount: string }[] = [];

    reimbursableTransports.forEach((t) => {
      const typeLabel = labelForTransportType(t.type);
      const amount = t.amount || "0,00";
      const details = t.details || "";
      items.push({
        label: `Transport – ${typeLabel}`,
        details,
        amount
      });
    });

    reimbursableLodgings.forEach((l) => {
      const typeLabel = labelForLodgingType(l.type);
      const amount = l.amount || "0,00";
      const nights = l.nights || "1";
      const base = `${typeLabel} – ${nights} nuit${nights === "1" ? "" : "s"}`;
      const details = l.details ? `${base}. ${l.details}` : base;
      items.push({
        label: "Logement",
        details,
        amount
      });
    });

    const total = items.reduce((sum, item) => sum + parseAmount(item.amount), 0);

    const today = new Date();
    const todayStr = today.toLocaleDateString("fr-FR");

    // Design simple type première version
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(
      `Note de frais – ${optionsDate.city} • ${optionsDate.venue}`,
      10,
      20
    );

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    let y = 30;
    doc.text(`Objet : ${optionsDate.city} – ${optionsDate.venue}`, 10, y);
    y += 6;
    doc.text(`Date de l'événement : ${optionsDate.date}`, 10, y);
    y += 6;
    doc.text(`Date de la note de frais : ${todayStr}`, 10, y);

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Dépenses à faire rembourser :", 10, y);

    y += 6;
    doc.setFont("helvetica", "normal");
    items.forEach((item, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${index + 1}. ${item.label}`, 10, y);
      y += 5;
      if (item.details) {
        const lines = doc.splitTextToSize(item.details, 180);
        doc.text(lines, 14, y);
        y += lines.length * 5;
      }
      doc.text(`${item.amount || "0,00"} €`, 180, y - 3, { align: "right" });
      y += 4;
    });

    const totalStr = `${total.toFixed(2).replace(".", ",")} €`;
    y += 8;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.text(`Montant total à rembourser : ${totalStr}`, 10, y);

    const safeCity = optionsDate.city.replace(/[^a-z0-9\-]+/gi, "-");
    const fileName = `note-de-frais-${safeCity}-${today
      .toISOString()
      .slice(0, 10)}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Représentations</h1>
        <p className="text-sm text-muted-foreground">
          Gère tes représentations passées et à venir.
        </p>
      </div>

      <div className="space-y-4">
        {/* Section Passées */}
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => toggleSection("past")}
          >
            <div className="flex items-center justify-between">
              <CardTitle>Passées</CardTitle>
              <span className="text-sm text-muted-foreground">
                {openSection === "past" ? "▾" : "▸"}
              </span>
            </div>
          </CardHeader>
          {openSection === "past" && (
            <CardContent>
              {pastDates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune date passée enregistrée.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pastDates.map((date) => (
                    <div
                      key={date.id}
                      className="flex flex-col justify-between rounded-md border bg-muted/40 p-4 text-sm"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">
                              {date.city} – {date.venue}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {date.date}
                            </p>
                          </div>
                          <span className="rounded-full bg-muted px-2 py-1 text-xs">
                            {date.status}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Adresse
                          </p>
                          <p className="text-xs">{date.address}</p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Timetable
                          </p>
                          <div className="mt-1 space-y-1 rounded-md bg-background/40 p-2">
                            {(timetablesByDate[date.id] ?? date.timetable).map(
                              (slot, index) => (
                              <div
                                key={`${date.id}-past-${index}`}
                                className="flex items-center gap-2 text-[11px]"
                              >
                                <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono">
                                  {slot.time}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {slot.activity}
                                </span>
                              </div>
                              )
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="mt-1 h-7 px-2 text-[11px]"
                              onClick={() => {
                                const base =
                                  timetablesByDate[date.id] ?? date.timetable;
                                setTimetableDraft(base.map((s) => ({ ...s })));
                                setTimetableDialogDateId(date.id);
                              }}
                            >
                              <Clock className="mr-1 h-3 w-3" />
                              Gérer
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(() => {
                            const count = isHydrated
                              ? transportsByDate[date.id]?.length ?? 0
                              : 0;
                            const active = count > 0;
                            return (
                              <button
                                type="button"
                                className="focus-visible:outline-none"
                                onClick={() =>
                                  setOptionsDialog({
                                    dateId: date.id,
                                    type: "transport"
                                  })
                                }
                              >
                                <Tag
                                  label="Transport"
                                  active={active}
                                  count={count}
                                />
                              </button>
                            );
                          })()}
                          {(() => {
                            const count = isHydrated
                              ? lodgingsByDate[date.id]?.length ?? 0
                              : 0;
                            const active = count > 0;
                            return (
                              <button
                                type="button"
                                className="focus-visible:outline-none"
                                onClick={() =>
                                  setOptionsDialog({
                                    dateId: date.id,
                                    type: "lodging"
                                  })
                                }
                              >
                                <Tag
                                  label="Logement"
                                  active={active}
                                  count={count}
                                />
                              </button>
                            );
                          })()}
                          <button
                            type="button"
                            className="focus-visible:outline-none"
                            onClick={() =>
                              setOptionsDialog({ dateId: date.id, type: "remuneration" })
                            }
                          >
                            <Tag label="Rémunération" />
                          </button>
                          {(() => {
                            const hasList = !!selectedListIdByDate[date.id];
                            return (
                              <button
                                type="button"
                                className="focus-visible:outline-none"
                                onClick={() =>
                                  setOptionsDialog({ dateId: date.id, type: "equipment" })
                                }
                              >
                                <Tag label="Matériel" active={hasList} />
                              </button>
                            );
                          })()}
                        </div>

                        {date.note && (
                          <div className="pt-1">
                            <p className="text-xs font-medium uppercase text-muted-foreground">
                              Note
                            </p>
                            <p className="text-xs text-muted-foreground">{date.note}</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9 p-0 text-muted-foreground"
                          onClick={() => setDocumentDialogDateId(date.id)}
                        >
                          <FilePlus2 className="h-6 w-6" />
                          <span className="sr-only">Documents</span>
                        </Button>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => {
                              setEditingId(date.id);
                              setEditingStatusType("past");
                              setEditingStatus(date.status);
                              setEditingDateValue(toIsoFromFr(date.date));
                            }}
                          >
                            Modifier
                          </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          className="text-destructive"
                          onClick={() => handleDeleteDate(date.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          <span className="sr-only">Supprimer</span>
                        </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Section A venir */}
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => toggleSection("upcoming")}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                A venir
                {upcomingDates.length > 0 && (
                  <span className="rounded-full bg-muted px-1.5 text-xs font-normal">
                    {upcomingDates.length}
                  </span>
                )}
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {openSection === "upcoming" ? "▾" : "▸"}
              </span>
            </div>
          </CardHeader>
          {openSection === "upcoming" && (
            <CardContent>
              {upcomingDates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune date à venir planifiée.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {upcomingDates.map((date) => (
                    <div
                      key={date.id}
                      className="flex flex-col justify-between rounded-md border bg-muted/40 p-4 text-sm"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">
                              {date.city} – {date.venue}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {date.date}
                            </p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                            {date.status}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Adresse
                          </p>
                          <p className="text-xs">{date.address}</p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Timetable
                          </p>
                          <div className="mt-1 space-y-1 rounded-md bg-background/40 p-2">
                            {(timetablesByDate[date.id] ?? date.timetable).map(
                              (slot, index) => (
                              <div
                                key={`${date.id}-upcoming-${index}`}
                                className="flex items-center gap-2 text-[11px]"
                              >
                                <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono">
                                  {slot.time}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {slot.activity}
                                </span>
                              </div>
                              )
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="mt-1 h-7 px-2 text-[11px]"
                              onClick={() => {
                                const base =
                                  timetablesByDate[date.id] ?? date.timetable;
                                setTimetableDraft(base.map((s) => ({ ...s })));
                                setTimetableDialogDateId(date.id);
                              }}
                            >
                              <Clock className="mr-1 h-3 w-3" />
                              Gérer
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(() => {
                            const count = isHydrated
                              ? transportsByDate[date.id]?.length ?? 0
                              : 0;
                            const active = count > 0;
                            return (
                              <button
                                type="button"
                                className="focus-visible:outline-none"
                                onClick={() =>
                                  setOptionsDialog({
                                    dateId: date.id,
                                    type: "transport"
                                  })
                                }
                              >
                                <Tag
                                  label="Transport"
                                  active={active}
                                  count={count}
                                />
                              </button>
                            );
                          })()}
                          {(() => {
                            const count = isHydrated
                              ? lodgingsByDate[date.id]?.length ?? 0
                              : 0;
                            const active = count > 0;
                            return (
                              <button
                                type="button"
                                className="focus-visible:outline-none"
                                onClick={() =>
                                  setOptionsDialog({
                                    dateId: date.id,
                                    type: "lodging"
                                  })
                                }
                              >
                                <Tag
                                  label="Logement"
                                  active={active}
                                  count={count}
                                />
                              </button>
                            );
                          })()}
                          <button
                            type="button"
                            className="focus-visible:outline-none"
                            onClick={() =>
                              setOptionsDialog({ dateId: date.id, type: "remuneration" })
                            }
                          >
                            <Tag label="Rémunération" />
                          </button>
                          {(() => {
                            const hasList = !!selectedListIdByDate[date.id];
                            return (
                              <button
                                type="button"
                                className="focus-visible:outline-none"
                                onClick={() =>
                                  setOptionsDialog({ dateId: date.id, type: "equipment" })
                                }
                              >
                                <Tag label="Matériel" active={hasList} />
                              </button>
                            );
                          })()}
                        </div>

                        {date.note && (
                          <div className="pt-1">
                            <p className="text-xs font-medium uppercase text-muted-foreground">
                              Note
                            </p>
                            <p className="text-xs text-muted-foreground">{date.note}</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9 p-0 text-muted-foreground"
                          onClick={() => setDocumentDialogDateId(date.id)}
                        >
                          <FilePlus2 className="h-6 w-6" />
                          <span className="sr-only">Documents</span>
                        </Button>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => {
                              setEditingId(date.id);
                              setEditingStatusType("future");
                              setEditingStatus(date.status);
                              setEditingDateValue(toIsoFromFr(date.date));
                            }}
                          >
                            Modifier
                          </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          className="text-destructive"
                          onClick={() => handleDeleteDate(date.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          <span className="sr-only">Supprimer</span>
                        </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
      {/* Dialog d’édition d’une date (hors timetable) */}
      <Dialog open={!!editingDate} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent
          className="bg-white text-foreground"
          style={{
            backgroundColor: "#ffffff",
            borderColor: "rgba(15,23,42,0.12)"
          }}
        >
          {editingDate && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Modifier la date – {editingDate.city} • {editingDate.venue}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2 text-sm">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                      Ville
                    </p>
                    <Input defaultValue={editingDate.city} />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                      Salle
                    </p>
                    <Input defaultValue={editingDate.venue} />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Date
                    </p>
                    <DatePicker
                      value={editingDateValue}
                      onChange={setEditingDateValue}
                      placeholder="Choisir une date"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                      Statut
                    </p>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={editingStatus}
                      onChange={(e) =>
                        setEditingStatus(e.target.value as TourStatus)
                      }
                    >
                      {["Finalisée", "Passée", "Signée", "Confirmée", "En option"].map(
                        (status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                    Adresse
                  </p>
                  <div className="flex items-center gap-2">
                    <Input defaultValue={editingDate.address} />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="whitespace-nowrap"
                      onClick={() => {
                        if (!editingDate.address) return;
                        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          editingDate.address
                        )}`;
                        if (typeof window !== "undefined") {
                          window.open(url, "_blank", "noopener,noreferrer");
                        }
                      }}
                    >
                      <MapPin className="mr-1 h-3 w-3" />
                      Carte
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                    Note
                  </p>
                  <Textarea defaultValue={editingDate.note} rows={3} />
                </div>

              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingId(null)}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!editingDate || editingId === null) return;
                    setDates((prev) =>
                      prev.map((d) =>
                        d.id === editingId
                          ? {
                              ...d,
                              date: editingDateValue
                                ? isoToFr(editingDateValue)
                                : d.date,
                              status: editingStatus
                            }
                          : d
                      )
                    );
                    setEditingId(null);
                  }}
                >
                  Enregistrer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog gestion Transport / Logement / Rémunération / Matériel */}
      <Dialog
        open={!!optionsDate && !!optionsDialog.type}
        onOpenChange={(open) => {
          if (!open) setOptionsDialog({ dateId: null, type: null });
        }}
      >
        <DialogContent
          className="bg-white text-foreground"
          style={{
            backgroundColor: "#ffffff",
            borderColor: "rgba(15,23,42,0.12)"
          }}
        >
          {optionsDate && optionsDialog.type === "transport" && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Transports – {optionsDate.city} • {optionsDate.venue}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground mb-1">
                    Nom de l&apos;événement
                  </p>
                  <p className="text-sm">
                    {optionsDate.city} – {optionsDate.venue} ({optionsDate.date})
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Gérez les transports pour cet événement.
                  </p>
                </div>

                <div className="space-y-3 rounded-md border bg-muted/40 p-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                        Type de transport
                      </p>
                      <select
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={transportForm.type}
                        onChange={(e) =>
                          setTransportForm((prev) => ({
                            ...prev,
                            type: e.target.value as TransportType
                          }))
                        }
                      >
                        <option value="train">Train</option>
                        <option value="plane">Avion</option>
                        <option value="car">Voiture</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                        Montant
                      </p>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={transportForm.amount}
                        onChange={(e) =>
                          setTransportForm((prev) => ({
                            ...prev,
                            amount: e.target.value
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                      Mode de paiement
                    </p>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={transportForm.paymentMode}
                      onChange={(e) =>
                        setTransportForm((prev) => ({
                          ...prev,
                          paymentMode:
                            e.target.value === "self"
                              ? "self"
                              : e.target.value === "reimburse"
                                ? "reimburse"
                                : "covered"
                        }))
                      }
                    >
                      <option value="self">À ma charge</option>
                      <option value="reimburse">À faire rembourser</option>
                      <option value="covered">Pris en charge</option>
                    </select>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                      Détails du trajet
                    </p>
                    <Textarea
                      rows={3}
                      placeholder="Itinéraire, horaires précis, numéros de réservation…"
                      value={transportForm.details}
                      onChange={(e) =>
                        setTransportForm((prev) => ({
                          ...prev,
                          details: e.target.value
                        }))
                      }
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="button" size="sm" onClick={handleAddTransport}>
                      Ajouter ce transport
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                    Transports enregistrés
                  </p>
                  {currentTransports.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Aucun transport enregistré pour cet événement pour le
                      moment.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {currentTransports.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-start justify-between rounded-md border bg-muted/40 px-3 py-2 text-xs"
                        >
                          <div className="flex items-start gap-2">
                            <TransportTypeIcon type={t.type} />
                            <div>
                              <p className="font-medium">
                                {labelForTransportType(t.type)} • {t.amount || "0,00"} €
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {labelForPaymentMode(t.paymentMode)}
                              </p>
                              {t.details && (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {t.details}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() =>
                              optionsDate &&
                              handleDeleteTransport(optionsDate.id, t.id)
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="sr-only">Supprimer</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {reimbursableTransports.length + reimbursableLodgings.length > 0 && (
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleExportExpensesPdf}
                      >
                        Exporter note de frais
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOptionsDialog({ dateId: null, type: null })}
                >
                  Fermer
                </Button>
              </DialogFooter>
            </>
          )}

          {optionsDate && optionsDialog.type === "lodging" && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Logement – {optionsDate.city} • {optionsDate.venue}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground mb-1">
                    Nom de l&apos;événement
                  </p>
                  <p className="text-sm">
                    {optionsDate.city} – {optionsDate.venue} ({optionsDate.date})
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Gérez les hébergements pour cet événement.
                  </p>
                </div>

                <div className="space-y-3 rounded-md border bg-muted/40 p-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                        Type de logement
                      </p>
                      <select
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={lodgingForm.type}
                        onChange={(e) =>
                          setLodgingForm((prev) => ({
                            ...prev,
                            type: e.target.value as LodgingType
                          }))
                        }
                      >
                        <option value="hotel">Hôtel</option>
                        <option value="airbnb">Airbnb</option>
                        <option value="friend">Chez un ami</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                        Nombre de nuits
                      </p>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="1"
                        value={lodgingForm.nights}
                        onChange={(e) =>
                          setLodgingForm((prev) => ({
                            ...prev,
                            nights: e.target.value
                          }))
                        }
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                      Montant total
                    </p>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={lodgingForm.amount}
                      onChange={(e) =>
                        setLodgingForm((prev) => ({
                          ...prev,
                          amount: e.target.value
                        }))
                      }
                      className="text-xs"
                    />
                  </div>

                <div>
                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                    Mode de paiement
                  </p>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={lodgingForm.paymentMode}
                    onChange={(e) =>
                      setLodgingForm((prev) => ({
                        ...prev,
                        paymentMode:
                          e.target.value === "self"
                            ? "self"
                            : e.target.value === "reimburse"
                              ? "reimburse"
                              : "covered"
                      }))
                    }
                  >
                    <option value="self">À ma charge</option>
                    <option value="reimburse">À faire rembourser</option>
                    <option value="covered">Pris en charge</option>
                  </select>
                </div>

                  <div>
                    <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                      Détails du logement
                    </p>
                    <Textarea
                      rows={3}
                      placeholder="Nom de l'hôtel, adresse, référence de réservation…"
                      value={lodgingForm.details}
                      onChange={(e) =>
                        setLodgingForm((prev) => ({
                          ...prev,
                          details: e.target.value
                        }))
                      }
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="button" size="sm" onClick={handleAddLodging}>
                      Ajouter ce logement
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                    Logements enregistrés
                  </p>
                  {currentLodgings.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Aucun logement enregistré pour cet événement pour le moment.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {currentLodgings.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-start justify-between rounded-md border bg-muted/40 px-3 py-2 text-xs"
                        >
                          <div className="space-y-0.5">
                            <p className="font-medium">
                              {labelForLodgingType(l.type)} • {l.nights || "1"} nuit
                              {l.nights === "1" ? "" : "s"} • {l.amount || "0,00"} €
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {labelForPaymentMode(l.paymentMode)}
                            </p>
                            {l.details && (
                              <p className="text-[11px] text-muted-foreground">
                                {l.details}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() =>
                              optionsDate &&
                              handleDeleteLodging(optionsDate.id, l.id)
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="sr-only">Supprimer</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {reimbursableTransports.length + reimbursableLodgings.length > 0 && (
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleExportExpensesPdf}
                      >
                        Exporter note de frais
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOptionsDialog({ dateId: null, type: null })}
                >
                  Fermer
                </Button>
              </DialogFooter>
            </>
          )}

          {optionsDate && optionsDialog.type === "equipment" && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Matériel – {optionsDate.city} • {optionsDate.venue}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2 text-sm">
                <p className="text-xs text-muted-foreground">
                  Choisis une liste de matériel existante pour cette représentation.
                </p>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                    Liste de matériel
                  </p>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={selectedListIdByDate[optionsDate.id] ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedListIdByDate((prev) => {
                        const next = { ...prev };
                        if (!val) delete next[optionsDate.id];
                        else next[optionsDate.id] = Number(val);
                        return next;
                      });
                    }}
                  >
                    <option value="">Aucune liste sélectionnée</option>
                    {equipmentLists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                </div>
                {(() => {
                  const selectedList = getSelectedListForDate(optionsDate.id);
                  if (!selectedList) return null;
                  const items = getItemsForMaterialList(selectedList.itemIds);
                  return (
                    <div className="rounded-md border bg-muted/40 p-3">
                      <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                        Matériel dans la liste &quot;{selectedList.name}&quot;
                      </p>
                      {items.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Aucun matériel dans cette liste.
                        </p>
                      ) : (
                        <ul className="space-y-1.5 text-xs">
                          {items.map((item) => (
                            <li key={item.id}>
                              {item.name} — Qté : {item.quantity}, État : {item.condition}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })()}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOptionsDialog({ dateId: null, type: null })}
                >
                  Fermer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog gestion Timetable */}
      <Dialog
        open={timetableDialogDateId !== null}
        onOpenChange={(open) => {
          if (!open) setTimetableDialogDateId(null);
        }}
      >
        <DialogContent
          className="bg-white text-foreground"
          style={{
            backgroundColor: "#ffffff",
            borderColor: "rgba(15,23,42,0.12)"
          }}
        >
          {timetableDialogDateId !== null && (
            <>
              <DialogHeader>
                <DialogTitle>Gérer les horaires de la journée</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">
                  Ajoute ou modifie les créneaux horaires pour cette date de
                  tournée.
                </p>
                <div className="space-y-2">
                  {timetableDraft.map((slot, index) => (
                    <div
                      key={`${timetableDialogDateId}-slot-${index}`}
                      className="grid grid-cols-[80px,1fr,auto] items-center gap-2"
                    >
                      <Input
                        type="text"
                        placeholder="16:30"
                        value={slot.time}
                        onChange={(e) => {
                          const value = e.target.value;
                          setTimetableDraft((prev) =>
                            prev.map((s, i) =>
                              i === index ? { ...s, time: value } : s
                            )
                          );
                        }}
                        className="text-xs"
                      />
                      <Input
                        type="text"
                        placeholder="Balance, ouverture des portes…"
                        value={slot.activity}
                        onChange={(e) => {
                          const value = e.target.value;
                          setTimetableDraft((prev) =>
                            prev.map((s, i) =>
                              i === index ? { ...s, activity: value } : s
                            )
                          );
                        }}
                        className="text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() =>
                          setTimetableDraft((prev) =>
                            prev.filter((_, i) => i !== index)
                          )
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                        <span className="sr-only">Supprimer</span>
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-1"
                    onClick={() =>
                      setTimetableDraft((prev) => [
                        ...prev,
                        { time: "", activity: "" }
                      ])
                    }
                  >
                    Ajouter un créneau
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTimetableDialogDateId(null)}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (timetableDialogDateId === null) return;
                    const cleaned = timetableDraft.filter(
                      (s) => s.time.trim() || s.activity.trim()
                    );
                    setTimetablesByDate((prev) => ({
                      ...prev,
                      [timetableDialogDateId]: cleaned
                    }));
                    setTimetableDialogDateId(null);
                  }}
                >
                  Enregistrer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog gestion Documents */}
      <Dialog
        open={documentDialogDateId !== null}
        onOpenChange={(open) => {
          if (!open) setDocumentDialogDateId(null);
        }}
      >
        <DialogContent
          className="bg-white text-foreground"
          style={{
            backgroundColor: "#ffffff",
            borderColor: "rgba(15,23,42,0.12)"
          }}
        >
          {documentDialogDateId !== null && (
            <>
              <DialogHeader>
                <DialogTitle>Documents liés à la date</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2 text-sm">
                <div className="space-y-2 rounded-md border bg-muted/40 p-3">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                      Type de document
                    </p>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={documentForm.type}
                      onChange={(e) =>
                        setDocumentForm((prev) => ({
                          ...prev,
                          type: e.target.value as DocumentType
                        }))
                      }
                    >
                      <option value="contract">Contrat</option>
                      <option value="tech">Fiche technique</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                      Note / description
                    </p>
                    <Textarea
                      rows={3}
                      placeholder="Numéro de contrat, lien vers le PDF, infos importantes…"
                      value={documentForm.note}
                      onChange={(e) =>
                        setDocumentForm((prev) => ({
                          ...prev,
                          note: e.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" size="sm" onClick={handleAddDocument}>
                      Ajouter ce document
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                    Documents enregistrés
                  </p>
                  {currentDocuments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Aucun document lié pour le moment. Tu peux ajouter des notes
                      ou des références de fichiers que tu stockes ailleurs.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {currentDocuments.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-start justify-between rounded-md border bg-muted/40 px-3 py-2 text-xs"
                        >
                          <div className="space-y-0.5">
                            <p className="font-medium">
                              {d.type === "contract"
                                ? "Contrat"
                                : d.type === "tech"
                                  ? "Fiche technique"
                                  : "Autre"}
                            </p>
                            {d.note && (
                              <p className="text-[11px] text-muted-foreground">
                                {d.note}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() =>
                              documentDialogDateId !== null &&
                              handleDeleteDocument(documentDialogDateId, d.id)
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="sr-only">Supprimer</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDocumentDialogDateId(null)}
                >
                  Fermer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

type TagProps = {
  label: string;
  active?: boolean;
  count?: number;
};

function Tag({ label, active, count }: TagProps) {
  const content =
    typeof count === "number" && count > 0 ? `${label} (${count})` : label;

  if (!active) {
    return (
      <span className="inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
        {content}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-md border border-slate-500 bg-slate-800 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-50 shadow-sm">
      {content}
    </span>
  );
}

function toIsoFromFr(frDate: string): string {
  const parts = frDate.split("/");
  if (parts.length !== 3) return "";
  const [day, month, year] = parts;
  if (!day || !month || !year) return "";
  return `${year}-${String(Number(month)).padStart(2, "0")}-${String(
    Number(day)
  ).padStart(2, "0")}`;
}

function isoToFr(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts;
  return `${String(Number(day)).padStart(2, "0")}/${String(
    Number(month)
  ).padStart(2, "0")}/${year}`;
}

function TransportTypeIcon({ type }: { type: TransportType }) {
  const className = "mt-0.5 h-4 w-4 text-muted-foreground";
  switch (type) {
    case "train":
      return <TrainFront className={className} />;
    case "plane":
      return <Plane className={className} />;
    case "car":
      return <Car className={className} />;
    case "other":
    default:
      return <MoreHorizontal className={className} />;
  }
}

function labelForTransportType(type: TransportType): string {
  switch (type) {
    case "train":
      return "Train";
    case "plane":
      return "Avion";
    case "car":
      return "Voiture";
    case "other":
    default:
      return "Autre";
  }
}

function labelForPaymentMode(mode: TransportEntry["paymentMode"]): string {
  switch (mode) {
    case "self":
      return "À ma charge";
    case "reimburse":
      return "À faire rembourser";
    case "covered":
      return "Pris en charge";
    default:
      return "";
  }
}

function labelForLodgingType(type: LodgingType): string {
  switch (type) {
    case "hotel":
      return "Hôtel";
    case "airbnb":
      return "Airbnb";
    case "friend":
      return "Chez un ami";
    case "other":
    default:
      return "Autre";
  }
}



