"use client";

import { useMemo, useState } from "react";
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
import { Clock, MapPin } from "lucide-react";

type TimetableItem = {
  time: string;
  activity: string;
};

type TourDate = {
  id: number;
  city: string;
  venue: string;
  date: string;
  status: string;
  address: string;
  timetable: TimetableItem[];
  transport: boolean;
  lodging: boolean;
  remuneration: boolean;
  equipment: boolean;
  note?: string;
};

export function TourDatesPage() {
  const [openSection, setOpenSection] = useState<"past" | "upcoming" | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingStatusType, setEditingStatusType] = useState<"past" | "future">("future");
  const [editingDateValue, setEditingDateValue] = useState<string>("");

  // TODO: remplacer par de vraies données depuis Supabase
  const pastDates: TourDate[] = [
    {
      id: 1,
      city: "Paris",
      venue: "La Cigale",
      date: "15/02/2025",
      status: "Terminé",
      address: "120 Boulevard de Rochechouart, 75018 Paris",
      timetable: [
        { time: "16:30", activity: "Arrivée & déchargement" },
        { time: "18:00", activity: "Ouverture des portes" },
        { time: "20:30", activity: "Show" }
      ],
      transport: true,
      lodging: true,
      remuneration: true,
      equipment: false,
      note: "Super accueil, penser à revenir avec ingé son."
    },
    {
      id: 2,
      city: "Lyon",
      venue: "Le Transbordeur",
      date: "08/02/2025",
      status: "Terminé",
      address: "3 Boulevard de Stalingrad, 69100 Lyon",
      timetable: [
        { time: "17:00", activity: "Balance" },
        { time: "20:00", activity: "Ouverture des portes" },
        { time: "21:00", activity: "Show" }
      ],
      transport: true,
      lodging: false,
      remuneration: true,
      equipment: true,
      note: "Backline partagé avec autre groupe."
    },
    {
      id: 3,
      city: "Marseille",
      venue: "Le Dôme",
      date: "01/02/2025",
      status: "Terminé",
      address: "48 Avenue de Saint-Just, 13004 Marseille",
      timetable: [
        { time: "16:00", activity: "Arrivée équipe" },
        { time: "18:30", activity: "Balance" },
        { time: "20:00", activity: "Show" }
      ],
      transport: false,
      lodging: true,
      remuneration: true,
      equipment: true,
      note: "Prévoir temps de chargement plus long."
    }
  ];

  const upcomingDates: TourDate[] = [
    {
      id: 4,
      city: "Paris",
      venue: "La Cigale",
      date: "14/03/2025",
      status: "Confirmé",
      address: "120 Boulevard de Rochechouart, 75018 Paris",
      timetable: [
        { time: "17:00", activity: "Balance" },
        { time: "19:00", activity: "Dîner" },
        { time: "20:30", activity: "Show" }
      ],
      transport: true,
      lodging: true,
      remuneration: true,
      equipment: true,
      note: "Prévoir captation vidéo."
    },
    {
      id: 5,
      city: "Lyon",
      venue: "Le Transbordeur",
      date: "22/03/2025",
      status: "En option",
      address: "3 Boulevard de Stalingrad, 69100 Lyon",
      timetable: [
        { time: "Option", activity: "Hold jusqu’au 01/03" }
      ],
      transport: false,
      lodging: false,
      remuneration: false,
      equipment: false,
      note: "En attente de réponse programmateur."
    },
    {
      id: 6,
      city: "Bordeaux",
      venue: "Le Rocher de Palmer",
      date: "05/04/2025",
      status: "Confirmé",
      address: "1 Rue Aristide Briand, 33152 Cenon",
      timetable: [
        { time: "15:00", activity: "Arrivée & installation" },
        { time: "17:30", activity: "Balance" },
        { time: "20:00", activity: "Show" }
      ],
      transport: true,
      lodging: true,
      remuneration: true,
      equipment: true,
      note: "Prévoir merch supplémentaire (grosse jauge)."
    }
  ];

  const toggleSection = (section: "past" | "upcoming") => {
    setOpenSection(openSection === section ? null : section);
  };

  const allDates = useMemo(
    () => [...pastDates, ...upcomingDates],
    [pastDates, upcomingDates]
  );

  const editingDate = editingId
    ? allDates.find((date) => date.id === editingId) ?? null
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Dates de tournées</h1>
        <p className="text-sm text-muted-foreground">
          Gère tes dates passées et à venir pour ta tournée.
        </p>
      </div>

      <div className="space-y-4">
        {/* Section Dates passées */}
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => toggleSection("past")}
          >
            <div className="flex items-center justify-between">
              <CardTitle>Dates passées</CardTitle>
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
                            {date.timetable.map((slot, index) => (
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
                            ))}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="mt-1 h-7 px-2 text-[11px]"
                            >
                              <Clock className="mr-1 h-3 w-3" />
                              Gérer
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <Tag label="Transport" active={date.transport} />
                          <Tag label="Logement" active={date.lodging} />
                          <Tag label="Rémunération" active={date.remuneration} />
                          <Tag label="Équipement" active={date.equipment} />
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

                      <div className="mt-3 flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          onClick={() => {
                            setEditingId(date.id);
                            setEditingStatusType("past");
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
                        >
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Section Prochaines dates */}
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => toggleSection("upcoming")}
          >
            <div className="flex items-center justify-between">
              <CardTitle>Prochaines</CardTitle>
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
                            {date.timetable.map((slot, index) => (
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
                            ))}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="mt-1 h-7 px-2 text-[11px]"
                            >
                              <Clock className="mr-1 h-3 w-3" />
                              Gérer
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <Tag label="Transport" active={date.transport} />
                          <Tag label="Logement" active={date.lodging} />
                          <Tag label="Rémunération" active={date.remuneration} />
                          <Tag label="Équipement" active={date.equipment} />
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

                      <div className="mt-3 flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          onClick={() => {
                            setEditingId(date.id);
                            setEditingStatusType("future");
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
                        >
                          Supprimer
                        </Button>
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
                      value={editingStatusType}
                      onChange={(e) =>
                        setEditingStatusType(
                          e.target.value === "past" ? "past" : "future"
                        )
                      }
                    >
                      <option value="future">Date future</option>
                      <option value="past">Date passée</option>
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
                <Button type="button">Enregistrer</Button>
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
};

function Tag({ label, active }: TagProps) {
  if (!active) {
    return (
      <span className="rounded-full border border-dashed border-muted-foreground/30 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">
        {label}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
      {label}
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


