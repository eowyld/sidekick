"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { mutate } from "swr";
import { ArrowRight, CalendarClock, MapPin, Mic2, Radar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageError } from "@/components/ui/page-error";
import { PageLoader } from "@/components/ui/page-loader";
import { useLiveData } from "@/hooks/useLiveData";
import type { TourStatus } from "@/modules/live/data/defaultRepresentations";
import { STATUS_META, PIPELINE_ORDER, CONCERT_COLOR, REHEARSAL_COLOR } from "@/modules/live/data/statusMeta";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

// ─── Helpers dates ──────────────────────────────────────────────────────────

function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const s = String(value).trim();
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) {
    const d = new Date(parseInt(fr[3], 10), parseInt(fr[2], 10) - 1, parseInt(fr[1], 10));
    return isNaN(d.getTime()) ? null : d;
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isTodayOrFuture(value: string): boolean {
  const d = parseDate(value);
  if (!d) return false;
  d.setHours(0, 0, 0, 0);
  return d.getTime() >= startOfToday().getTime();
}

function daysUntil(value: string): number | null {
  const d = parseDate(value);
  if (!d) return null;
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - startOfToday().getTime()) / 86_400_000);
}

function relativeLabel(value: string): string {
  const diff = daysUntil(value);
  if (diff === null) return value;
  if (diff === 0) return "aujourd’hui";
  if (diff === 1) return "demain";
  if (diff < 7) return `dans ${diff} j`;
  if (diff < 14) return "dans 1 sem.";
  if (diff < 60) return `dans ${Math.round(diff / 7)} sem.`;
  return `dans ${Math.round(diff / 30)} mois`;
}

function formatDateShort(value: string): string {
  const d = parseDate(value);
  if (!d) return value;
  const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  return `${days[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}`;
}

function normalizeText(value: string | undefined | null): string {
  return (value || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

// ─── Types vue ──────────────────────────────────────────────────────────────

type UpcomingEvent = {
  key: string;
  type: "representation" | "rehearsal";
  title: string;
  subtitle: string;
  date: string;
  status?: TourStatus;
  href: string;
};

type MapPoint = { lat: number; lng: number; label: string; type: UpcomingEvent["type"] };

// ─── Composant ────────────────────────────────────────────────────────────────

export function LiveOverviewPage() {
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => setIsHydrated(true), []);

  const { tourDates, rehearsals, prospection, loading, error } = useLiveData();

  const upcomingConcerts = useMemo(
    () =>
      tourDates
        .filter((t) => isTodayOrFuture(t.date))
        .sort((a, b) => (parseDate(a.date)?.getTime() ?? 0) - (parseDate(b.date)?.getTime() ?? 0)),
    [tourDates]
  );

  const upcomingRehearsals = useMemo(
    () =>
      rehearsals
        .filter((r) => isTodayOrFuture(r.date))
        .sort((a, b) => (parseDate(a.date)?.getTime() ?? 0) - (parseDate(b.date)?.getTime() ?? 0)),
    [rehearsals]
  );

  const distinctCities = useMemo(
    () => new Set(upcomingConcerts.map((c) => normalizeText(c.city)).filter(Boolean)).size,
    [upcomingConcerts]
  );

  // Répartition des dates à venir par statut (pipeline)
  const pipeline = useMemo(() => {
    const counts = PIPELINE_ORDER.map((status) => ({
      status,
      count: upcomingConcerts.filter((c) => c.status === status).length,
    })).filter((s) => s.count > 0);
    return { segments: counts, total: upcomingConcerts.length };
  }, [upcomingConcerts]);

  // Synthèse prospection
  const prospectionStats = useMemo(() => {
    let active = 0;
    let discussion = 0;
    let relancer = 0;
    for (const p of prospection) {
      const s = normalizeText(p.status);
      if (s.includes("archiv")) continue;
      active += 1;
      if (s.includes("discussion") || s.includes("accept")) discussion += 1;
      if (s.includes("relancer") || s.includes("attente")) relancer += 1;
    }
    return { active, discussion, relancer };
  }, [prospection]);

  const upcomingEvents: UpcomingEvent[] = useMemo(() => {
    const concerts: UpcomingEvent[] = upcomingConcerts.map((r) => ({
      key: `representation-${r.id}`,
      type: "representation",
      title: [r.organisateur, r.venue].filter(Boolean).join(" – ") || r.city || "Représentation",
      subtitle:
        [r.venue && r.organisateur ? r.venue : null, r.city].filter(Boolean).join(" · ") || "Concert",
      date: r.date,
      status: r.status,
      href: "/live/representations",
    }));
    const rehs: UpcomingEvent[] = upcomingRehearsals.map((r) => ({
      key: `rehearsal-${r.id}`,
      type: "rehearsal",
      title: r.label || [`Répétition`, r.location || r.city].filter(Boolean).join(" – "),
      subtitle: [r.location || r.city, r.time].filter(Boolean).join(" · ") || "Répétition",
      date: r.date,
      href: "/live/repetitions",
    }));
    return [...concerts, ...rehs].sort(
      (a, b) => (parseDate(a.date)?.getTime() ?? 0) - (parseDate(b.date)?.getTime() ?? 0)
    );
  }, [upcomingConcerts, upcomingRehearsals]);

  const timelineEvents = upcomingEvents.slice(0, 8);

  // ─── Carte ─────────────────────────────────────────────────────────────────
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<ReturnType<typeof import("leaflet")["map"]> | null>(null);
  const geoCacheRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  const hasMapData = upcomingConcerts.length + upcomingRehearsals.length > 0;

  useEffect(() => {
    if (!isHydrated || !mapContainerRef.current || !hasMapData) return;
    let cancelled = false;

    (async () => {
      const cache = geoCacheRef.current;
      const mapPoints: MapPoint[] = [];

      const geocode = async (place: string, targetCity: string) => {
        const key = place.toLowerCase().trim() || "france";
        let coords = cache.get(key);
        if (coords) return coords;
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(
              place || "France"
            )}&limit=5`
          );
          const data: Array<any> = await resp.json();
          if (data && data.length > 0) {
            let best = data[0];
            if (targetCity) {
              const candidate = data.find((item) => {
                const addr = item.address || {};
                const cityField =
                  normalizeText(addr.city) || normalizeText(addr.town) || normalizeText(addr.village);
                return cityField && cityField === targetCity;
              });
              if (candidate) best = candidate;
            }
            coords = { lat: parseFloat(best.lat), lng: parseFloat(best.lon) };
          }
        } catch {
          /* ignore network errors */
        }
        if (!coords) coords = { lat: 46.5, lng: 2.5 };
        cache.set(key, coords);
        return coords;
      };

      for (const r of upcomingConcerts) {
        const place =
          r.address && r.address.trim().length > 0
            ? r.address
            : [r.venue, r.city].filter(Boolean).join(", ");
        const coords = await geocode(place, normalizeText(r.city));
        mapPoints.push({
          lat: coords.lat,
          lng: coords.lng,
          label: [r.organisateur, r.venue].filter(Boolean).join(" – ") || r.city || "Représentation",
          type: "representation",
        });
      }

      for (const r of upcomingRehearsals) {
        const place =
          r.address && r.address.trim().length > 0
            ? r.address
            : [r.location, r.city].filter(Boolean).join(", ");
        const coords = await geocode(place, normalizeText(r.city));
        mapPoints.push({
          lat: coords.lat,
          lng: coords.lng,
          label: r.label || [`Répétition`, r.location || r.city].filter(Boolean).join(" – "),
          type: "rehearsal",
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

      const makeDot = (color: string) =>
        L.divIcon({
          className: "",
          html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};box-shadow:0 0 0 3px rgba(16,16,16,0.95),0 0 12px ${color};"></span>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
          popupAnchor: [0, -10],
        });

      let map = mapInstanceRef.current;
      if (!map) {
        map = L.map(mapContainerRef.current, {
          center: [46.5, 2.5],
          zoom: 5,
          scrollWheelZoom: false,
          attributionControl: false,
        });
        // Tuiles OSM standard (sans clé) — assombries via un filtre CSS appliqué
        // au tile-pane, cf. classes du conteneur plus bas.
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 19,
        }).addTo(map);
        mapInstanceRef.current = map;
      }

      // Nettoyer marqueurs / tracés précédents (garder le fond de carte)
      map.eachLayer((layer: unknown) => {
        const anyLayer = layer as any;
        if (!anyLayer.getAttribution) map!.removeLayer(layer as any);
      });

      const latlngs: [number, number][] = [];
      mapPoints.forEach((p) => {
        const ll: [number, number] = [p.lat, p.lng];
        latlngs.push(ll);
        L.marker(ll, { icon: makeDot(p.type === "rehearsal" ? REHEARSAL_COLOR : CONCERT_COLOR) })
          .addTo(map!)
          .bindPopup(p.label);
      });

      if (latlngs.length === 1) {
        map.setView(latlngs[0], 6);
      } else if (latlngs.length > 1) {
        const polyline = L.polyline(latlngs, {
          color: CONCERT_COLOR,
          weight: 2,
          opacity: 0.7,
          dashArray: "1 6",
        }).addTo(map);
        map.fitBounds(polyline.getBounds().pad(0.3));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isHydrated, hasMapData, upcomingConcerts, upcomingRehearsals]);

  // ─── États ───────────────────────────────────────────────────────────────────

  if (!isHydrated || loading) return <PageLoader />;

  if (error)
    return (
      <PageError
        title="Impossible de charger la vue d’ensemble Live"
        description="Vérifie ta connexion ou réessaie dans quelques instants."
        onRetry={() => mutate("user_live")}
      />
    );

  if (upcomingEvents.length === 0)
    return (
      <EmptyState
        icon={CalendarClock}
        title="Rien de prévu pour le moment"
        description="Ajoute une représentation ou une répétition pour voir ta tournée s’organiser ici."
      />
    );

  return (
    <div className="space-y-6">
      {/* ─── Pipeline : dates à venir par statut ─────────────────────── */}
      <section className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-sm font-medium text-[#F5F5F5]">Tournée à venir</h2>
            <p className="text-xs text-[#F5F5F5]/45">Répartition de tes dates par statut</p>
          </div>
          <Link
            href="/live/representations"
            className="text-right leading-tight transition-opacity hover:opacity-80"
          >
            <span className="block text-[28px] font-extralight leading-none tabular-nums text-[#F5F5F5]">
              {pipeline.total}
            </span>
            <span className="text-[11px] text-[#F5F5F5]/45">
              {pipeline.total > 1 ? "dates" : "date"} · {distinctCities}{" "}
              {distinctCities > 1 ? "villes" : "ville"}
            </span>
          </Link>
        </div>

        {pipeline.segments.length > 0 ? (
          <>
            {/* Barre segmentée */}
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
              {pipeline.segments.map((s) => (
                <div
                  key={s.status}
                  className="h-full rounded-full transition-all"
                  style={{
                    flexGrow: s.count,
                    minWidth: 14,
                    background: STATUS_META[s.status].color,
                  }}
                  title={`${s.status} : ${s.count}`}
                  aria-label={`${s.status} : ${s.count}`}
                />
              ))}
            </div>

            {/* Légende cliquable */}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {pipeline.segments.map((s) => (
                <Link
                  key={s.status}
                  href="/live/representations"
                  className="group flex items-center gap-2 transition-opacity hover:opacity-80"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: STATUS_META[s.status].color }}
                  />
                  <span className="text-sm tabular-nums text-[#F5F5F5]">{s.count}</span>
                  <span className="text-sm text-[#F5F5F5]/55 group-hover:text-[#F5F5F5]/80">
                    {s.status}
                  </span>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-[#F5F5F5]/45">Aucune date à venir pour l’instant.</p>
        )}
      </section>

      {/* ─── Répétitions + Prospection ───────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/live/repetitions"
          className="group flex items-center justify-between rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5 transition-colors hover:border-[rgba(245,245,245,0.18)]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(56,189,248,0.12)] text-[#38BDF8]">
              <Mic2 size={18} />
            </span>
            <div>
              <p className="text-sm font-medium text-[#F5F5F5]">Répétitions</p>
              <p className="text-xs text-[#F5F5F5]/45">à venir</p>
            </div>
          </div>
          <span className="text-[28px] font-extralight tabular-nums text-[#F5F5F5]">
            {upcomingRehearsals.length}
          </span>
        </Link>

        <Link
          href="/live/prospection"
          className="group flex items-center justify-between rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5 transition-colors hover:border-[rgba(245,245,245,0.18)]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(240,255,0,0.12)] text-[#F0FF00]">
              <Radar size={18} />
            </span>
            <div>
              <p className="text-sm font-medium text-[#F5F5F5]">Prospection</p>
              <p className="text-xs text-[#F5F5F5]/45">
                {prospectionStats.discussion > 0
                  ? `${prospectionStats.discussion} en discussion`
                  : prospectionStats.relancer > 0
                    ? `${prospectionStats.relancer} à relancer`
                    : "salles suivies"}
              </p>
            </div>
          </div>
          <span className="text-[28px] font-extralight tabular-nums text-[#F5F5F5]">
            {prospectionStats.active}
          </span>
        </Link>
      </div>

      {/* ─── Timeline + Carte ─────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] items-start">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-[#F5F5F5]">Prochains événements</h2>
              <p className="text-xs text-[#F5F5F5]/45">Représentations et répétitions, par date</p>
            </div>
            <Link
              href="/live/representations"
              className="inline-flex items-center gap-1 text-xs text-[#F5F5F5]/55 transition-colors hover:text-[#F0FF00]"
            >
              Tout voir <ArrowRight size={13} />
            </Link>
          </div>

          <ul className="space-y-1.5">
            {timelineEvents.map((event) => {
              const isConcert = event.type === "representation";
              const dotColor = isConcert ? CONCERT_COLOR : REHEARSAL_COLOR;
              return (
                <li key={event.key}>
                  <Link
                    href={event.href}
                    className="group flex items-center gap-4 rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] px-4 py-3 transition-colors hover:border-[rgba(245,245,245,0.18)] hover:bg-[rgba(44,44,46,0.8)]"
                  >
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}66` }}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-[#F5F5F5]">{event.title}</p>
                        {isConcert && event.status && (
                          <Badge variant={STATUS_META[event.status].badge} className="shrink-0">
                            {event.status}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-[#F5F5F5]/50">
                        {isConcert ? <MapPin size={12} /> : <Mic2 size={12} />}
                        <span className="truncate">{event.subtitle}</span>
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm tabular-nums text-[#F5F5F5]/80">
                        {formatDateShort(event.date)}
                      </p>
                      <p className="text-[11px] text-[#F5F5F5]/40">{relativeLabel(event.date)}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {upcomingEvents.length > timelineEvents.length && (
            <p className="mt-3 text-center text-xs text-[#F5F5F5]/40">
              +{upcomingEvents.length - timelineEvents.length} autre
              {upcomingEvents.length - timelineEvents.length > 1 ? "s" : ""} à venir
            </p>
          )}
        </section>

        <section className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-[#F5F5F5]">Itinéraire</h2>
            <div className="flex items-center gap-4 text-[11px] text-[#F5F5F5]/55">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: CONCERT_COLOR }} />
                Concert
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: REHEARSAL_COLOR }} />
                Répétition
              </span>
            </div>
          </div>
          <div
            ref={mapContainerRef}
            className="h-72 w-full overflow-hidden rounded-lg border border-[rgba(245,245,245,0.08)] bg-[#101010] [&_.leaflet-container]:bg-[#101010] [&_.leaflet-tile-pane]:[filter:invert(1)_hue-rotate(180deg)_brightness(0.75)_contrast(0.95)_grayscale(0.6)]"
          />
        </section>
      </div>
    </div>
  );
}
