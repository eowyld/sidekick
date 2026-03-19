"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { defaultRepresentations } from "@/modules/live/data/defaultRepresentations";
import "leaflet/dist/leaflet.css";

type RepresentationItem = {
  id: number;
  city: string;
  venue: string;
  date: string;
  status: string;
  address?: string;
  organisateur?: string;
};

type RehearsalItem = {
  id: number;
  label?: string;
  date: string;
  time: string;
  location: string;
  address?: string;
};

type MapPoint = {
  lat: number;
  lng: number;
  label: string;
  type: "representation" | "rehearsal";
};

function parseFrDate(frDate: string): Date | null {
  if (!frDate) return null;
  const parts = frDate.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  return isNaN(date.getTime()) ? null : date;
}

function formatDateShort(frDate: string): string {
  const d = parseFrDate(frDate);
  if (!d) return frDate;
  const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const dayName = days[d.getDay()];
  const day = d.getDate();
  const month = d.getMonth() + 1;
  return `${dayName} ${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

function isDateTodayOrFuture(frDate: string): boolean {
  const d = parseFrDate(frDate);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d.getTime() >= today.getTime();
}

type UpcomingEvent =
  | { type: "representation"; id: number; name: string; date: string; href: string }
  | { type: "rehearsal"; id: number; name: string; date: string; href: string };

export function LiveOverviewPage() {
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const [representations] = useLocalStorage<RepresentationItem[]>(
    "live:representations",
    defaultRepresentations
  );
  const [rehearsals] = useLocalStorage<RehearsalItem[]>("live:rehearsals", []);

  // Même logique que l'onglet "A venir" du module Représentations (date >= aujourd'hui)
  const upcomingRepresentations = useMemo(
    () =>
      isHydrated
        ? representations.filter((r) => isDateTodayOrFuture(r.date))
        : [],
    [representations, isHydrated]
  );

  const upcomingRepresentationsForList = upcomingRepresentations;

  const upcomingRehearsals = useMemo(
    () =>
      isHydrated
        ? rehearsals.filter((r) => isDateTodayOrFuture(r.date))
        : [],
    [rehearsals, isHydrated]
  );

  const upcomingEvents: UpcomingEvent[] = useMemo(() => {
    const reps: UpcomingEvent[] = upcomingRepresentationsForList.map((r) => ({
      type: "representation" as const,
      id: r.id,
      // Titre: Organisateur – Salle (si disponible), sinon Ville / fallback
      name:
        [r.organisateur, r.venue].filter(Boolean).join(" – ") ||
        r.city ||
        "Sans nom",
      date: r.date,
      href: "/live/representations"
    }));
    const rehs: UpcomingEvent[] = upcomingRehearsals.map((r) => ({
      type: "rehearsal" as const,
      id: r.id,
      name: r.label || `Répétition – ${r.location}`,
      date: r.date,
      href: "/live/repetitions"
    }));
    const combined = [...reps, ...rehs];
    combined.sort((a, b) => {
      const da = parseFrDate(a.date)?.getTime() ?? 0;
      const db = parseFrDate(b.date)?.getTime() ?? 0;
      return da - db;
    });
    return combined;
  }, [upcomingRepresentationsForList, upcomingRehearsals]);

  const timelineEvents = upcomingEvents.slice(0, 8);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<ReturnType<typeof import("leaflet")["map"]> | null>(null);
  const geoCacheRef = useRef<Map<string, { lat: number; lng: number }>>(
    new Map()
  );

  useEffect(() => {
    if (!isHydrated || !mapContainerRef.current) return;

    let cancelled = false;

    (async () => {
      const cache = geoCacheRef.current;

      const mapPoints: MapPoint[] = [];

      const normalize = (value: string | undefined | null) =>
        (value || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "");

      // Géocodage des représentations
      for (const r of upcomingRepresentationsForList) {
        const place =
          r.address && r.address.trim().length > 0
            ? r.address
            : [r.venue, r.city].filter(Boolean).join(", ");
        const key = place.toLowerCase().trim() || "france";
        let coords = cache.get(key);
        if (!coords) {
          try {
            const q = place || "France";
            const resp = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(
                q
              )}&limit=5`
            );
            const data: Array<any> = await resp.json();
            if (data && data.length > 0) {
              const targetCity = normalize(r.city);
              let best = data[0];
              if (targetCity) {
                const candidate = data.find((item) => {
                  const addr = item.address || {};
                  const cityField =
                    normalize(addr.city) ||
                    normalize(addr.town) ||
                    normalize(addr.village);
                  return cityField && cityField === targetCity;
                });
                if (candidate) best = candidate;
              }
              coords = {
                lat: parseFloat(best.lat),
                lng: parseFloat(best.lon)
              };
            }
          } catch {
            // ignore network errors
          }
          if (!coords) {
            coords = { lat: 46.5, lng: 2.5 }; // centre France par défaut
          }
          cache.set(key, coords);
        }
        mapPoints.push({
          lat: coords.lat,
          lng: coords.lng,
          // Même format que dans la liste : Organisateur – Salle
          label:
            [r.organisateur, r.venue].filter(Boolean).join(" – ") ||
            r.city ||
            "Représentation",
          type: "representation"
        });
      }

      // Géocodage des répétitions
      for (const r of upcomingRehearsals) {
        const place =
          (r.address && r.address.trim().length > 0 && r.address) ||
          r.location ||
          r.label ||
          "";
        const key = place.toLowerCase().trim() || "france";
        let coords = cache.get(key);
        if (!coords) {
          try {
            const q = place || "France";
            const resp = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(
                q
              )}&limit=5`
            );
            const data: Array<any> = await resp.json();
            if (data && data.length > 0) {
              const targetCity = normalize(r.address) || normalize((r as any).city);
              let best = data[0];
              if (targetCity) {
                const candidate = data.find((item) => {
                  const addr = item.address || {};
                  const cityField =
                    normalize(addr.city) ||
                    normalize(addr.town) ||
                    normalize(addr.village);
                  return cityField && cityField === targetCity;
                });
                if (candidate) best = candidate;
              }
              coords = {
                lat: parseFloat(best.lat),
                lng: parseFloat(best.lon)
              };
            }
          } catch {
            // ignore
          }
          if (!coords) {
            coords = { lat: 46.5, lng: 2.5 };
          }
          cache.set(key, coords);
        }
        mapPoints.push({
          lat: coords.lat,
          lng: coords.lng,
          label: r.label || `Répétition – ${r.location}`,
          type: "rehearsal"
        });
      }

      if (cancelled || mapPoints.length === 0) {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
        return;
      }

      const L = await import("leaflet");

      if (cancelled || !mapContainerRef.current) return;

      // Correction des icônes par défaut dans Next/Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
      });

      const representationIcon = L.icon({
        iconRetinaUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      const rehearsalIcon = L.icon({
        iconRetinaUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      let map = mapInstanceRef.current;
      if (!map) {
        map = L.map(mapContainerRef.current, {
          center: [46.5, 2.5],
          zoom: 5,
          scrollWheelZoom: true
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);
        mapInstanceRef.current = map;
      } else {
        map.eachLayer((layer) => {
          // Ne pas retirer le fond de carte (tile layer)
          if ((layer as any).getAttribution) return;
        });
      }

      // Nettoyer les anciens marqueurs / tracés : retirer tout sauf le tile layer
      map.eachLayer((layer) => {
        const anyLayer = layer as any;
        if (!anyLayer.getAttribution) {
          map!.removeLayer(layer);
        }
      });

      const latlngs: [number, number][] = [];
      mapPoints.forEach((p) => {
        const ll: [number, number] = [p.lat, p.lng];
        latlngs.push(ll);
        if (p.type === "rehearsal") {
          L.marker(ll, { icon: rehearsalIcon })
            .addTo(map!)
            .bindPopup(p.label);
        } else {
          L.marker(ll, { icon: representationIcon })
            .addTo(map!)
            .bindPopup(p.label);
        }
      });

      if (latlngs.length === 1) {
        map.setView(latlngs[0], 6);
      } else if (latlngs.length > 1) {
        const polyline = L.polyline(latlngs, {
          color: "#0ea5e9",
          weight: 3
        }).addTo(map);
        map.fitBounds(polyline.getBounds().pad(0.3));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isHydrated, upcomingRepresentationsForList, upcomingRehearsals]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">
          Live – vue d&apos;ensemble
        </h1>
        <p className="text-sm text-muted-foreground">
          Synthèse rapide de ta tournée : dates, répétitions et prochains
          événements.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Représentations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Représentations</CardTitle>
            <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
              <Link href="/live/representations">Gérer les représentations</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-2xl font-semibold tabular-nums">
              {upcomingRepresentations.length}
            </p>
            <p className="text-sm text-muted-foreground">Concerts à venir</p>
          </CardContent>
        </Card>

        {/* Répétitions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Répétitions</CardTitle>
            <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
              <Link href="/live/repetitions">Gérer les répétitions</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-2xl font-semibold tabular-nums">
              {upcomingRehearsals.length}
            </p>
            <p className="text-sm text-muted-foreground">Répétitions à venir</p>
          </CardContent>
        </Card>
      </div>

      {/* Les Prochains événements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Les prochains événements
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Représentations et répétitions à venir, par date.
          </p>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun événement à venir. Ajoutez des représentations ou des
              répétitions.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 items-start">
                {/* Carte interactive */}
                <div className="rounded-md border bg-muted/20 p-3">
                  <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                    Carte des prochains événements
                  </p>
                  <div
                    ref={mapContainerRef}
                    className="h-64 w-full rounded-md border bg-background"
                  />
                </div>

                {/* Liste des événements */}
                <ul className="space-y-2">
                  {upcomingEvents.map((event) => (
                    <li
                      key={`${event.type}-${event.id}`}
                      className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium">{event.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateShort(event.date)}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" asChild>
                        <Link href={event.href}>Voir détails</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
