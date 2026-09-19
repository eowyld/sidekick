"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { ArrowLeft } from "lucide-react";
import { usePhonoData } from "@/hooks/usePhonoData";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from "@/hooks/useUnsavedChangesGuard";
import { PageError } from "@/components/ui/page-error";
import { PageLoader } from "@/components/ui/page-loader";
import type {
  Album,
  AlbumGuest,
  AlbumType,
  ReleaseStatus,
  Track,
  TrackVersion,
} from "@/lib/sidekick-store";
import {
  defaultAlbumVersion,
  newAlbumId,
  normalizeAlbum,
} from "@/modules/phono/lib/album";
import { isStatusMoreAdvanced } from "@/modules/phono/lib/release-status";
import {
  defaultVersion,
  newTrackId,
  normalizeTrack,
  suggestedVersionLabel,
} from "@/modules/phono/lib/track";
import { isValidDateFr, toDisplayDate } from "@/lib/date-format";
import { cn, focusRing } from "@/lib/utils";
import { AlbumEditAside } from "./AlbumEditAside";
import { AlbumEditForm } from "./AlbumEditForm";

interface AlbumEditPageProps {
  /** `null` = création. */
  albumId: string | null;
}

/** Champs pilotés par le formulaire. Reprend l'ancien `AlbumDialog`. */
export interface AlbumFormState {
  title: string;
  type: AlbumType;
  artist: string;
  status: ReleaseStatus;
  releaseDate: string;
  upcEan: string;
  label: string;
  editor: string;
  distribution: string;
  genre: string;
  cover?: string;
  notes: string;
  guests: AlbumGuest[];
  trackIds: string[];
  /**
   * Versions retenues par titre. Jamais lu directement pour l'affichage :
   * passer par `effectiveVersionIds`, qui applique le repli des albums
   * enregistrés avant cette donnée et écarte les versions supprimées depuis.
   */
  trackVersions: Record<string, string[]>;
}

/**
 * Sélection réelle d'un titre, telle qu'elle doit s'afficher et s'enregistrer.
 *
 * Clé absente = album d'avant `trackVersions` : on retombe sur la version que
 * le reste du produit retenait déjà (première pourvue d'un fichier). Clé
 * présente = choix de l'artiste, y compris le choix de n'en retenir aucune.
 * Dans les deux cas, une version supprimée du titre depuis est écartée.
 */
function effectiveVersionIds(
  track: Track,
  trackVersions: Record<string, string[]>
): string[] {
  const existing = new Set((track.versions ?? []).map((v) => v.id));
  const chosen = trackVersions[track.id];
  if (chosen) return chosen.filter((id) => existing.has(id));
  const fallback = defaultAlbumVersion(track);
  return fallback ? [fallback.id] : [];
}

/**
 * Constante de module, contrairement à `emptyForm()` côté titre : un album
 * vierge ne tire aucun identifiant, il n'y a rien à figer au chargement du
 * bundle.
 */
const EMPTY_FORM: AlbumFormState = {
  title: "",
  type: "album",
  artist: "",
  status: "en_production",
  releaseDate: "",
  upcEan: "",
  label: "",
  editor: "",
  distribution: "",
  genre: "",
  cover: undefined,
  notes: "",
  guests: [],
  trackIds: [],
  trackVersions: {},
};

function formFromAlbum(album: Album): AlbumFormState {
  const a = normalizeAlbum(album);
  return {
    title: a.title,
    type: a.type,
    artist: a.artist,
    status: a.status,
    releaseDate: a.releaseDate,
    upcEan: a.upcEan,
    label: a.label ?? "",
    editor: a.editor ?? "",
    distribution: a.distribution ?? "",
    genre: a.genre ?? "",
    cover: a.cover,
    notes: a.notes ?? "",
    guests: a.guests ?? [],
    trackIds: a.trackIds,
    trackVersions: a.trackVersions ?? {},
  };
}

function newGuestId(): string {
  return "ag-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
}

/** Le catalogue, ouvert sur l'onglet d'où l'on vient. */
const BACK_URL = "/phono/catalogue?tab=albums";

export function AlbumEditPage({ albumId }: AlbumEditPageProps) {
  const router = useRouter();
  const posthog = usePostHog();
  const {
    albums,
    setAlbums,
    tracks: tracksRaw,
    setTracks,
    loading,
    error,
  } = usePhonoData();

  const existing = albumId ? albums.find((a) => a.id === albumId) : undefined;
  const album = existing ? normalizeAlbum(existing) : null;
  const tracks = tracksRaw.map(normalizeTrack);

  const [form, setForm] = useState<AlbumFormState>(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState<AlbumFormState>(EMPTY_FORM);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // L'album arrive après le premier rendu (SWR) : on remplit le formulaire dès
  // qu'il est là, une seule fois, sans écraser une saisie en cours. Ajustement
  // d'état en cours de rendu, comme `TrackEditPage` : pas de useEffect, pour
  // que la première peinture montre déjà les bonnes valeurs.
  const readyId = album ? album.id : albumId === null ? "__new__" : null;
  if (readyId !== null && loadedId !== readyId) {
    setLoadedId(readyId);
    const initial = album ? formFromAlbum(album) : EMPTY_FORM;
    setForm(initial);
    setInitialForm(initial);
  }

  const patch = (values: Partial<AlbumFormState>) =>
    setForm((prev) => ({ ...prev, ...values }));

  const addGuest = () =>
    setForm((prev) => ({
      ...prev,
      guests: [
        ...prev.guests,
        { id: newGuestId(), name: "", role: "artiste_secondaire" },
      ],
    }));
  const updateGuest = (id: string, values: Partial<AlbumGuest>) =>
    setForm((prev) => ({
      ...prev,
      guests: prev.guests.map((g) => (g.id === id ? { ...g, ...values } : g)),
    }));
  const removeGuest = (id: string) =>
    setForm((prev) => ({
      ...prev,
      guests: prev.guests.filter((g) => g.id !== id),
    }));

  /** Ce que la tracklist doit afficher comme coché, titre par titre. */
  const selectedVersionIds: Record<string, string[]> = {};
  for (const id of form.trackIds) {
    const track = tracks.find((t) => t.id === id);
    selectedVersionIds[id] = track
      ? effectiveVersionIds(track, form.trackVersions)
      : [];
  }

  /**
   * Entrer ou sortir un titre de la tracklist.
   *
   * La sélection de versions suit le mouvement : un titre qui entre voit son
   * repli matérialisé (la case est cochée d'emblée, personne n'a à deviner ce
   * qui part sur la sortie), un titre qui sort emporte sa clé plutôt que de
   * laisser une entrée orpheline s'accumuler en base.
   */
  const handleTracklistChange = (nextTrackIds: string[]) => {
    setForm((prev) => {
      const kept: Record<string, string[]> = {};
      for (const id of nextTrackIds) {
        const track = tracks.find((t) => t.id === id);
        kept[id] = track
          ? effectiveVersionIds(track, prev.trackVersions)
          : prev.trackVersions[id] ?? [];
      }
      return { ...prev, trackIds: nextTrackIds, trackVersions: kept };
    });
  };

  /** Cocher ou décocher une version : donnée d'album, enregistrée avec lui. */
  const toggleVersion = (
    trackId: string,
    versionId: string,
    selected: boolean
  ) => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;
    setForm((prev) => {
      const current = effectiveVersionIds(track, prev.trackVersions);
      if (selected && current.includes(versionId)) return prev;
      // L'ordre d'écoute suit l'ordre des versions sur le titre, pas l'ordre
      // des clics : deux allers-retours sur une case ne doivent pas déplacer
      // la piste dans la sortie.
      const order = (track.versions ?? []).map((v) => v.id);
      const next = selected
        ? [...current, versionId].sort(
            (a, b) => order.indexOf(a) - order.indexOf(b)
          )
        : current.filter((id) => id !== versionId);
      return {
        ...prev,
        trackVersions: { ...prev.trackVersions, [trackId]: next },
      };
    });
  };

  /**
   * Les trois écritures qui portent sur le **titre**, pas sur l'album.
   *
   * Elles partent en base immédiatement, sans attendre « Enregistrer » : un
   * fichier audio appartient au titre, qui vit dans le catalogue et peut être
   * porté par plusieurs sorties. L'écrire tout de suite supprime aussi toute
   * fenêtre d'orphelin — le fichier est référencé par une version enregistrée
   * dès la seconde où il est déposé, `pruneOrphanAudio` ne peut plus le prendre
   * pour un reliquat. Détacher, remplacer ou supprimer une version passe par
   * `VersionList`, donc par `handleDetachedAudio` et sa case « supprimer aussi
   * du Drive » : même mécanique qu'au catalogue, à l'identique.
   */
  const patchTrackVersion = (
    trackId: string,
    versionId: string,
    patch: Partial<TrackVersion>
  ) => {
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? {
              ...normalizeTrack(t),
              versions: (t.versions ?? []).map((v) =>
                v.id === versionId ? { ...v, ...patch } : v
              ),
            }
          : t
      )
    );
  };

  const addTrackVersion = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;
    const taken = new Set(
      (track.versions ?? []).map((v) => v.label.toLowerCase())
    );
    // La suggestion du statut du titre d'abord ; si elle est déjà prise, on
    // numérote, comme le fait la page titre.
    const suggested = suggestedVersionLabel(track.status ?? "en_production");
    let label = suggested;
    if (taken.has(suggested.toLowerCase())) {
      let n = 2;
      while (taken.has(`version ${n}`)) n += 1;
      label = `Version ${n}`;
    }
    const version = defaultVersion(label);

    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? { ...normalizeTrack(t), versions: [...(t.versions ?? []), version] }
          : t
      )
    );
    // Une version ajoutée depuis la page album est destinée à l'album : la
    // cocher évite le piège du fichier déposé qui ne part nulle part faute
    // d'avoir vu la case.
    setForm((prev) => ({
      ...prev,
      trackVersions: {
        ...prev.trackVersions,
        [trackId]: [
          ...effectiveVersionIds(track, prev.trackVersions),
          version.id,
        ],
      },
    }));
  };

  const removeTrackVersion = (trackId: string, versionId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? {
              ...normalizeTrack(t),
              versions: (t.versions ?? []).filter((v) => v.id !== versionId),
            }
          : t
      )
    );
    if (!track) return;
    setForm((prev) => ({
      ...prev,
      trackVersions: {
        ...prev.trackVersions,
        [trackId]: effectiveVersionIds(track, prev.trackVersions).filter(
          (id) => id !== versionId
        ),
      },
    }));
  };

  const displayedDate = toDisplayDate(form.releaseDate);
  const dateInvalid = displayedDate !== "" && !isValidDateFr(displayedDate);
  const canSubmit =
    form.title.trim() !== "" && form.artist.trim() !== "" && !dateInvalid;
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  /**
   * Titres que l'enregistrement fera avancer.
   *
   * Publier un album fait avancer ses titres, jamais reculer : un titre déjà
   * « Publié » ne redevient pas « En production ». Même règle qu'avant, mais
   * calculée une seule fois — c'est elle qui est annoncée sous le statut et
   * elle qui est appliquée à l'enregistrement.
   */
  const advancing =
    form.status !== initialForm.status
      ? tracks.filter(
          (t) =>
            form.trackIds.includes(t.id) &&
            isStatusMoreAdvanced(form.status, t.status ?? "en_production")
        )
      : [];

  // Quitter avec une saisie non enregistrée, c'est perdre le travail :
  // fermeture de l'onglet comme clic sur un lien de la sidebar.
  useUnsavedChangesGuard(dirty);

  const handleSubmit = () => {
    if (!canSubmit || saving) return;
    setSaving(true);

    const fields = {
      title: form.title.trim(),
      type: form.type,
      artist: form.artist.trim(),
      status: form.status,
      releaseDate: form.releaseDate,
      upcEan: form.upcEan.trim(),
      label: form.label,
      editor: form.editor,
      distribution: form.distribution,
      genre: form.genre,
      cover: form.cover,
      notes: form.notes,
      guests: form.guests.filter((g) => g.name.trim() !== ""),
      trackIds: form.trackIds,
      // Toujours écrit en clair, repli résolu et versions disparues écartées :
      // ce qui part en base est exactement ce que la page montrait, sans
      // dépendre d'un repli qui pourrait changer plus tard.
      trackVersions: form.trackIds.reduce<Record<string, string[]>>((acc, id) => {
        const t = tracks.find((x) => x.id === id);
        if (t) acc[id] = effectiveVersionIds(t, form.trackVersions);
        return acc;
      }, {}),
    };

    // En édition on repart de l'album existant : tout champ hors formulaire doit
    // survivre. En création on génère l'id.
    const next: Album = album
      ? { ...album, ...fields }
      : { id: newAlbumId(), ...fields };

    setAlbums((prev) =>
      album ? prev.map((a) => (a.id === next.id ? next : a)) : [next, ...prev]
    );

    if (advancing.length > 0) {
      const ids = new Set(advancing.map((t) => t.id));
      setTracks((prev) =>
        prev.map((t) =>
          ids.has(t.id) ? { ...normalizeTrack(t), status: form.status } : t
        )
      );
    }

    if (!album) posthog?.capture("item_created", { module: "phono" });

    router.push(BACK_URL);
  };

  const handleCancel = () => {
    if (dirty && !window.confirm(UNSAVED_CHANGES_MESSAGE)) return;
    router.push(BACK_URL);
  };

  /**
   * Crée un titre depuis la tracklist.
   *
   * Le titre rejoint le catalogue général immédiatement, avant l'enregistrement
   * de l'album : c'est déjà ce que fait la page titre dans l'autre sens, où
   * choisir « Nouvel album ou EP » crée l'album sur-le-champ. Abandonner
   * l'album ne défait donc pas les titres créés ici — ils restent dans le
   * catalogue, simplement rattachés à rien.
   *
   * Il hérite aussi de tout ce que l'album sait déjà et qui a un sens au
   * niveau du titre : artiste, statut, date de sortie, genre, distribution,
   * label, éditeur, pochette. Contrairement à `TrackAlbumField` (qui attache
   * un titre *existant*, potentiellement déjà renseigné), il n'y a ici aucun
   * risque de conflit à résoudre — le titre vient de naître, tout est vide.
   * Restent propres au titre : ISRC (identifie un enregistrement, pas une
   * sortie), notes et invités (les crédits d'un titre ne sont pas ceux de
   * l'album), UPC/EAN (identifie l'album, pas un enregistrement).
   *
   * `defaultVersion()` est appelé ici, à chaque création : hissé en constante,
   * il figerait une `versionId` partagée par tous les titres créés sans
   * rechargement de page, et le lecteur les confondrait.
   */
  const handleCreateTrack = (title: string) => {
    const clean = title.trim();
    if (clean === "") return;
    const version = defaultVersion(suggestedVersionLabel(form.status));
    const track: Track = {
      id: newTrackId(),
      title: clean,
      mainArtist: form.artist.trim(),
      role: "artiste_principal",
      status: form.status,
      guestArtists: [],
      isrc: "",
      releaseDate: form.releaseDate,
      // Un label renseigné dit que le titre n'est pas auto-produit — sans quoi
      // le champ « Label » resterait rempli mais caché par TrackEditForm, qui
      // ne l'affiche que si la case est décochée.
      selfProduced: form.label.trim() === "",
      label: form.label,
      editor: form.editor,
      genre: form.genre,
      distribution: form.distribution,
      cover: form.cover,
      notes: "",
      versions: [version],
    };
    setTracks((prev) => [track, ...prev]);
    setForm((prev) => ({
      ...prev,
      trackIds: [...prev.trackIds, track.id],
      // Sa version unique part sur l'album : sans ça, un titre tout juste créé
      // s'afficherait « aucune version » alors que c'est l'album qui vient de
      // le faire naître.
      trackVersions: { ...prev.trackVersions, [track.id]: [version.id] },
    }));
  };

  if (loading) return <PageLoader />;
  if (error)
    return (
      <PageError
        title="Impossible de charger cet album"
        description="Vérifie ta connexion ou réessaie dans quelques instants."
        onRetry={() => router.refresh()}
      />
    );

  if (albumId && !existing)
    return (
      <PageError
        title="Cet album n'existe plus"
        description="Il a peut-être été supprimé depuis un autre onglet."
        onRetry={() => router.push(BACK_URL)}
      />
    );

  return (
    <div>
      <button
        type="button"
        // Même chemin que le bouton « Annuler » du pied de page : confirmation
        // si des modifications sont en attente.
        onClick={handleCancel}
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
        {album ? album.title || "Album sans nom" : "Nouvel album ou EP"}
      </h1>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <AlbumEditForm
          form={form}
          patch={patch}
          dateInvalid={dateInvalid}
          allTracks={tracks}
          advancingCount={advancing.length}
          selectedVersionIds={selectedVersionIds}
          onTracklistChange={handleTracklistChange}
          onToggleVersion={toggleVersion}
          onPatchTrackVersion={patchTrackVersion}
          onAddTrackVersion={addTrackVersion}
          onRemoveTrackVersion={removeTrackVersion}
          onCreateTrack={handleCreateTrack}
          onAddGuest={addGuest}
          onUpdateGuest={updateGuest}
          onRemoveGuest={removeGuest}
        />
        <AlbumEditAside
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
