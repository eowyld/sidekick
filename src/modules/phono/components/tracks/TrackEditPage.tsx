"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { ArrowLeft } from "lucide-react";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useProjectsData } from "@/hooks/useProjectsData";
import { PageError } from "@/components/ui/page-error";
import { PageLoader } from "@/components/ui/page-loader";
import type {
  Album,
  PhonoRole,
  ReleaseStatus,
  Track,
  TrackGuest,
  TrackVersion,
} from "@/lib/sidekick-store";
import {
  defaultVersion,
  isSuggestedVersion,
  newTrackId,
  normalizePhonoRole,
  normalizeTrackGuests,
  normalizeTrack,
  suggestedVersionLabel,
} from "@/modules/phono/lib/track";
import { newAlbumId } from "@/modules/phono/lib/album";
import { isValidDateFr, toDisplayDate } from "@/lib/date-format";
import { cn, focusRing } from "@/lib/utils";
import { TrackEditAside } from "./TrackEditAside";
import { TrackEditForm } from "./TrackEditForm";

interface TrackEditPageProps {
  /** `null` = création. */
  trackId: string | null;
}

/** Champs pilotés par le formulaire. Reprend `TrackDialog`, plus `versions`. */
export interface TrackFormState {
  title: string;
  mainArtist: string;
  role: PhonoRole;
  status: ReleaseStatus;
  cover?: string;
  releaseDate: string;
  isrc: string;
  genre: string;
  distribution: string;
  selfProduced: boolean;
  label: string;
  editor: string;
  guestArtists: TrackGuest[];
  notes: string;
  versions: Track["versions"];
}

/**
 * Formulaire vierge d'un nouveau titre.
 *
 * Fonction, et surtout pas constante de module : `defaultVersion()` tire une id
 * de version, et une constante l'aurait figée au chargement du bundle. Deux
 * titres créés à la suite sans rechargement de page recevaient alors la même id
 * de version — jusque dans la base, la colonne `versions` étant du JSON sans
 * contrainte d'unicité. Le lecteur, qui identifie ce qu'il joue par `versionId`,
 * prenait le brouillon pour le titre déjà en écoute et basculait en pause au
 * lieu de charger le nouveau fichier.
 */
function emptyForm(): TrackFormState {
  return {
    title: "",
    mainArtist: "",
    role: "artiste_principal",
    status: "en_production",
    cover: undefined,
    releaseDate: "",
    isrc: "",
    genre: "",
    distribution: "",
    selfProduced: true,
    label: "",
    editor: "",
    guestArtists: [],
    notes: "",
    versions: [defaultVersion(suggestedVersionLabel("en_production"))],
  };
}

function formFromTrack(track: Track): TrackFormState {
  return {
    title: track.title ?? "",
    mainArtist: track.mainArtist ?? "",
    role: normalizePhonoRole((track.role as PhonoRole) ?? "artiste_principal"),
    status: track.status ?? "en_production",
    cover: track.cover,
    releaseDate: track.releaseDate ?? "",
    isrc: track.isrc ?? "",
    genre: track.genre ?? "",
    distribution: track.distribution ?? "",
    selfProduced: track.selfProduced !== false,
    label: track.label ?? "",
    editor: track.editor ?? "",
    guestArtists: normalizeTrackGuests(track.guestArtists),
    notes: track.notes ?? "",
    versions: track.versions ?? [],
  };
}

export function TrackEditPage({ trackId }: TrackEditPageProps) {
  const router = useRouter();
  const posthog = usePostHog();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");
  const { tracks, setTracks, albums, setAlbums, loading, error } = usePhonoData();
  const { projects, patchProjectLinks } = useProjectsData();

  const existing = trackId ? tracks.find((t) => t.id === trackId) : undefined;
  const track = existing ? normalizeTrack(existing) : null;

  const [form, setForm] = useState<TrackFormState>(emptyForm);
  // Même objet que `form` au montage : deux appels à `emptyForm()` donneraient
  // deux ids de version différentes, donc un formulaire « modifié » d'entrée.
  const [initialForm, setInitialForm] = useState<TrackFormState>(form);
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [initialAlbumId, setInitialAlbumId] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Le titre arrive après le premier rendu (SWR) : on remplit le formulaire dès
  // qu'il est là, une seule fois, sans écraser une saisie en cours. Ajustement
  // d'état en cours de rendu (motif déjà utilisé par `TrackDialog`) : pas de
  // useEffect, pour que la première peinture montre déjà les bonnes valeurs.
  const readyId = track ? track.id : trackId === null ? "__new__" : null;
  if (readyId !== null && loadedId !== readyId) {
    setLoadedId(readyId);
    const initial = track ? formFromTrack(track) : emptyForm();
    setForm(initial);
    setInitialForm(initial);
    // Un album ne référence pas son titre : il faut le chercher côté album.
    const owningAlbum = track
      ? albums.find((a) => (a.trackIds ?? []).includes(track.id)) ?? null
      : null;
    setAlbumId(owningAlbum?.id ?? null);
    setInitialAlbumId(owningAlbum?.id ?? null);
  }

  const patch = (values: Partial<TrackFormState>) =>
    setForm((prev) => ({ ...prev, ...values }));

  const patchVersion = (versionId: string, versionPatch: Partial<TrackVersion>) =>
    setForm((prev) => ({
      ...prev,
      versions: prev.versions.map((v) =>
        v.id === versionId ? { ...v, ...versionPatch } : v
      ),
    }));

  const addVersion = () =>
    setForm((prev) => {
      const taken = new Set(prev.versions.map((v) => v.label.toLowerCase()));
      // La suggestion du statut d'abord ; si elle est déjà prise, on numérote,
      // comme le fait déjà le catalogue.
      const suggested = suggestedVersionLabel(prev.status);
      if (!taken.has(suggested.toLowerCase())) {
        return { ...prev, versions: [...prev.versions, defaultVersion(suggested)] };
      }
      let n = 2;
      while (taken.has(`version ${n}`)) n += 1;
      return {
        ...prev,
        versions: [...prev.versions, defaultVersion(`Version ${n}`)],
      };
    });

  const removeVersion = (versionId: string) =>
    setForm((prev) => ({
      ...prev,
      versions: prev.versions.filter((v) => v.id !== versionId),
    }));

  const onStatusChange = (status: ReleaseStatus) =>
    setForm((prev) => ({
      ...prev,
      status,
      // Une version encore vierge suit le statut en silence : rien à réécrire,
      // personne ne l'a vue. Toute autre version est figée — elle porte un
      // fichier ou un nom choisi, et les liens d'écoute publiés ont dénormalisé
      // ce nom.
      versions: prev.versions.map((v) =>
        isSuggestedVersion(v) ? { ...v, label: suggestedVersionLabel(status) } : v
      ),
    }));

  // `VersionList` attend un Track : on lui donne l'état du formulaire, pas la
  // donnée serveur. C'est ce qui permet de déposer un fichier avant même le
  // premier enregistrement.
  const draftTrack: Track = {
    ...(track ?? { id: "__draft__", versions: [] }),
    ...form,
    guestArtists: form.guestArtists,
  } as Track;

  const handleAlbumChange = (
    nextAlbumId: string | null,
    fieldPatch: Partial<Pick<TrackFormState, "label" | "editor" | "distribution">>
  ) => {
    setAlbumId(nextAlbumId);
    if (Object.keys(fieldPatch).length > 0) patch(fieldPatch);
  };

  const handleCreateAlbum = (title: string): Album => {
    const album: Album = {
      id: newAlbumId(),
      title,
      type: "single",
      status: "en_production",
      artist: form.mainArtist || "",
      releaseDate: "",
      upcEan: "",
      trackIds: [],
      notes: "",
    };
    setAlbums((prev) => [album, ...prev]);
    return album;
  };

  const displayedDate = toDisplayDate(form.releaseDate);
  const dateInvalid = displayedDate !== "" && !isValidDateFr(displayedDate);
  const canSubmit =
    form.title.trim() !== "" && form.mainArtist.trim() !== "" && !dateInvalid;
  const dirty =
    JSON.stringify(form) !== JSON.stringify(initialForm) || albumId !== initialAlbumId;

  // Quitter avec une saisie non enregistrée, c'est perdre le travail : le
  // fichier audio déjà déposé, lui, sera ramassé par `pruneOrphanAudio`.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const handleSubmit = () => {
    if (!canSubmit || saving) return;
    setSaving(true);

    const fields = {
      title: form.title.trim(),
      mainArtist: form.mainArtist.trim(),
      role: form.role,
      status: form.status,
      cover: form.cover,
      releaseDate: form.releaseDate,
      isrc: form.isrc,
      genre: form.genre,
      distribution: form.distribution,
      selfProduced: form.selfProduced,
      // Conservé même en auto-produit : `buildMetadataPayload` ignore déjà le
      // label dans ce cas, l'effacer ferait perdre la saisie au décochage.
      label: form.label,
      editor: form.editor,
      guestArtists: form.guestArtists.filter((g) => g.name.trim() !== ""),
      notes: form.notes,
      versions: form.versions,
    };

    const next: Track = track
      ? { ...track, ...fields }
      : { id: newTrackId(), ...fields };

    setTracks((prev) =>
      track ? prev.map((t) => (t.id === next.id ? next : t)) : [next, ...prev]
    );

    // Un album ne référence pas son titre : le rattachement s'écrit ici, côté
    // album, en ne touchant que l'ancien et le nouveau — jamais les autres
    // albums qui pourraient référencer ce titre par ailleurs.
    if (albumId !== initialAlbumId) {
      setAlbums((prev) =>
        prev.map((a) => {
          if (a.id === initialAlbumId) {
            return { ...a, trackIds: (a.trackIds ?? []).filter((id) => id !== next.id) };
          }
          if (a.id === albumId) {
            return { ...a, trackIds: [...new Set([...(a.trackIds ?? []), next.id])] };
          }
          return a;
        })
      );
    }

    if (!track) {
      posthog?.capture("item_created", { module: "phono" });
      if (projectIdParam) {
        // L'ancien dialogue écrivait ce rattachement dans `useSidekickData`,
        // c'est-à-dire dans le vide (TracksTab.tsx:193). Ici il atteint la
        // base.
        const project = projects.find((p) => p.id === projectIdParam);
        if (project) {
          patchProjectLinks(projectIdParam, {
            linkedTracks: [...new Set([...project.linkedTracks, next.id])],
          });
        }
      }
    }

    // Retour au catalogue dans tous les cas, création ou édition : c'est ce
    // que faisait déjà l'ancienne fenêtre en se fermant sur « Enregistrer ».
    router.push("/phono/catalogue");
  };

  const handleCancel = () => {
    if (dirty && !window.confirm("Abandonner les modifications non enregistrées ?"))
      return;
    router.push("/phono/catalogue");
  };

  if (loading) return <PageLoader />;
  if (error)
    return (
      <PageError
        title="Impossible de charger ce titre"
        description="Vérifie ta connexion ou réessaie dans quelques instants."
        onRetry={() => router.refresh()}
      />
    );

  if (trackId && !existing)
    return (
      <PageError
        title="Ce titre n'existe plus"
        description="Il a peut-être été supprimé depuis un autre onglet."
        onRetry={() => router.push("/phono/catalogue")}
      />
    );

  return (
    <div>
      <button
        type="button"
        onClick={() => router.push("/phono/catalogue")}
        className={cn(
          "mb-4 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-xs text-[#F5F5F5]/70 transition-colors hover:text-[#F5F5F5]",
          focusRing
        )}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour au catalogue
      </button>

      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#F5F5F5]/40">
        Phono · Catalogue
      </p>
      <h1 className="text-xl font-bold tracking-tight text-[#F5F5F5]">
        {track ? track.title || "Titre sans nom" : "Nouveau titre"}
      </h1>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <TrackEditForm
          form={form}
          patch={patch}
          dateInvalid={dateInvalid}
          draftTrack={draftTrack}
          onPatchVersion={patchVersion}
          onAddVersion={addVersion}
          onRemoveVersion={removeVersion}
          onStatusChange={onStatusChange}
          albums={albums}
          albumId={albumId}
          onAlbumChange={handleAlbumChange}
          onCreateAlbum={handleCreateAlbum}
        />
        <TrackEditAside
          form={form}
          patch={patch}
          canSubmit={canSubmit}
          saving={saving}
          dirty={dirty}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
