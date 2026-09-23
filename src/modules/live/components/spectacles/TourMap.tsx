"use client";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { RehearsalItem, TourDate } from "@/hooks/useLiveData";
import { CONCERT_COLOR, REHEARSAL_COLOR } from "../../data/statusMeta";
import { byDate } from "../../lib/live-links";

type Place = { query: string; city: string; label: string; rehearsal: boolean };
type Coords = { lat: number; lng: number };
/** Même typage que l'ancienne Vue d'ensemble : leaflet n'a pas de @types (module ambiant sans forme). */
type LeafletMap = ReturnType<typeof import("leaflet")["map"]>;

const normalize = (value?: string | null) => (value || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** Partagé entre montages : une adresse déjà géocodée ne repart pas chez Nominatim. */
const geoCache = new Map<string, Coords>();

async function geocode(query: string, city: string): Promise<Coords> {
    const key = query.toLowerCase().trim() || "france";
    const cached = geoCache.get(key);
    if (cached)
        return cached;
    let coords: Coords | undefined;
    try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query || "France")}&limit=5`);
        const data: Array<{ lat: string; lon: string; address?: { city?: string; town?: string; village?: string } }> = await resp.json();
        if (data?.length) {
            const target = normalize(city);
            const best = (target && data.find(item => { const a = item.address || {}; return (normalize(a.city) || normalize(a.town) || normalize(a.village)) === target; })) || data[0];
            coords = { lat: parseFloat(best.lat), lng: parseFloat(best.lon) };
        }
    }
    catch {
        /* réseau indisponible : point par défaut */
    }
    // Un petit lieu absent d'OSM ne doit pas finir au centre de la France quand la ville est connue.
    const result = coords ?? (city && normalize(query) !== normalize(city) ? await geocode(city, city) : { lat: 46.5, lng: 2.5 });
    geoCache.set(key, result);
    return result;
}

/** Itinéraire d'une tournée : ses dates et ses répétitions, dans l'ordre du calendrier. */
export function TourMap({ dates, rehearsals }: { dates: TourDate[]; rehearsals: RehearsalItem[] }) {
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => setHydrated(true), []);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const places = byDate([
        ...dates.map(d => ({ date: d.date, place: { query: d.address?.trim() || [d.venue, d.city].filter(Boolean).join(", "), city: d.city, label: [d.organisateur, d.venue].filter(Boolean).join(" · ") || d.city || "Représentation", rehearsal: false } })),
        ...rehearsals.map(r => ({ date: r.date, place: { query: r.address?.trim() || [r.location, r.city].filter(Boolean).join(", "), city: r.city ?? "", label: r.label || "Répétition", rehearsal: true } })),
    ]).map(x => x.place);
    const key = JSON.stringify(places);

    useEffect(() => {
        const list: Place[] = JSON.parse(key);
        if (!hydrated || !containerRef.current || !list.length)
            return;
        let cancelled = false;
        (async () => {
            const points: (Coords & { label: string; rehearsal: boolean })[] = [];
            for (const p of list)
                points.push({ ...(await geocode(p.query, p.city)), label: p.label, rehearsal: p.rehearsal });
            const L = await import("leaflet");
            if (cancelled || !containerRef.current)
                return;
            const dot = (color: string) => L.divIcon({ className: "", html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};box-shadow:0 0 0 3px rgba(16,16,16,0.95),0 0 12px ${color};"></span>`, iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -10] });
            let map = mapRef.current;
            if (!map) {
                map = L.map(containerRef.current, { center: [46.5, 2.5], zoom: 5, scrollWheelZoom: false, attributionControl: false });
                // Tuiles OSM standard (sans clé), assombries par le filtre CSS du conteneur.
                L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap", maxZoom: 19 }).addTo(map);
                mapRef.current = map;
            }
            const current = map;
            // Retirer marqueurs et tracé précédents, garder le fond de carte.
            current.eachLayer((layer: unknown) => { if (!(layer instanceof L.TileLayer)) current.removeLayer(layer); });
            const latlngs: [number, number][] = points.map(p => [p.lat, p.lng]);
            points.forEach((p, i) => L.marker(latlngs[i], { icon: dot(p.rehearsal ? REHEARSAL_COLOR : CONCERT_COLOR) }).addTo(current).bindPopup(p.label));
            if (latlngs.length === 1)
                current.setView(latlngs[0], 6);
            else
                current.fitBounds(L.polyline(latlngs, { color: CONCERT_COLOR, weight: 2, opacity: 0.7, dashArray: "1 6" }).addTo(current).getBounds().pad(0.3), { maxZoom: 10 });
        })();
        return () => { cancelled = true; };
    }, [hydrated, key]);

    useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);
    // Sans point, le conteneur disparaît du DOM : la carte liée à ce nœud doit partir avec lui,
    // sinon elle serait réutilisée, vide, au retour des dates.
    const empty = places.length === 0;
    useEffect(() => { if (empty && mapRef.current) { mapRef.current.remove(); mapRef.current = null; } }, [empty]);

    if (!places.length)
        return <p className="text-sm text-[#F5F5F5]/50">Ajoute des dates à la tournée pour tracer son itinéraire.</p>;
    return <div>
    <div className="mb-3 flex justify-end gap-4 text-[11px] text-[#F5F5F5]/55">
    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: CONCERT_COLOR }}/>Concert</span>
    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: REHEARSAL_COLOR }}/>Répétition</span>
    </div>
    <div ref={containerRef} className="h-72 w-full overflow-hidden rounded-lg border border-[rgba(245,245,245,0.08)] bg-[#101010] [&_.leaflet-container]:bg-[#101010] [&_.leaflet-tile-pane]:[filter:invert(1)_hue-rotate(180deg)_brightness(0.75)_contrast(0.95)_grayscale(0.6)]"/>
    </div>;
}
