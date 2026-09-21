"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { ArrowLeft } from "lucide-react";
import { usePhonoData } from "@/hooks/usePhonoData";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from "@/hooks/useUnsavedChangesGuard";
import { useProjectsData } from "@/hooks/useProjectsData";
import { useArtistIdentity } from "@/hooks/useArtistIdentity";
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
import { handleDetachedAudio } from "@/modules/phono/lib/audio-cleanup";
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
function emptyForm(mainArtist = ""): TrackFormState {
  return {
    title: "",
    mainArtist,
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

  const { releaseArtist, ready: identityReady } = useArtistIdentity();

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
  // Un nouveau titre attend l'identité pour naître pré-rempli.
  const readyId = track
    ? track.id
    : trackId === null && identityReady
      ? "__new__"
      : null;
  if (readyId !== null && loadedId !== readyId) {
    setLoadedId(readyId);
    const initial = track ? formFromTrack(track) : emptyForm(releaseArtist);
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

  /**
   * Crée un album depuis le titre en cours d'édition.
   *
   * Il hérite de ce que le titre sait déjà et qui a un sens au niveau de la
   * sortie : artiste, statut, genre, distribution, label, éditeur, pochette —
   * symétrique de `handleCreateTrack` côté `AlbumEditPage`. Seule la date de
   * sortie ne suit pas : un titre en cours d'écriture n'en a le plus souvent
   * pas encore, et un album fraîchement créé n'a pas de raison d'en hériter
   * une qui n'existe pas — contrairement à l'autre sens, où un album déjà
   * daté fixe une date de sortie cohérente pour un titre qui vient de naître.
   */
  const handleCreateAlbum = (title: string): Album => {
    const album: Album = {
      id: newAlbumId(),
      title,
      type: "single",
      status: form.status,
      artist: form.mainArtist || "",
      releaseDate: "",
      upcEan: "",
      trackIds: [],
      label: form.label,
      genre: form.genre,
      editor: form.editor,
      distribution: form.distribution,
      cover: form.cover,
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

  // Quitter avec une saisie non enregistrée, c'est perdre le travail :
  // fermeture de l'onglet comme clic sur un lien de la sidebar. Même garde-fou
  // que la page album, une seule implémentation pour les deux.
  useUnsavedChangesGuard(dirty);

  /**
   * Nettoyage à la sortie de la page, quel que soit le chemin emprunté pour
   * en sortir (Annuler, lien de la sidebar confirmé ci-dessus, retour
   * navigateur…) : un fichier tout juste uploadé mais jamais enregistré ne
   * doit pas traîner. Passe par une ref plutôt que par `unsavedUploadedPaths`
   * directement dans les dépendances : la fonction de nettoyage d'un effet
   * monté une seule fois capturerait sinon le formulaire vide du tout premier
   * rendu, jamais son état au moment réel du départ.
   *
   * `committedRef` court-circuite ce nettoyage après un enregistrement
   * réussi : `handleSubmit` navigue aussitôt vers le catalogue, démontant
   * cette page comme n'importe quel départ — sans ce garde, le fichier tout
   * juste sauvegardé (donc « différent de `initialForm` », le seul signal
   * dont dispose `unsavedUploadedPaths`) serait supprimé du Drive juste après
   * avoir été validé.
   */
  const unsavedUploadedPathsRef = useRef<() => string[]>(() => []);
  const committedRef = useRef(false);
  useEffect(() => {
    return () => {
      if (committedRef.current) return;
      const orphaned = unsavedUploadedPathsRef.current();
      if (orphaned.length > 0) void handleDetachedAudio(orphaned, true);
    };
  }, []);

  const handleSubmit = () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    // Marqué avant même l'écriture : la navigation qui suit démonte cette
    // page comme n'importe quel départ, et le nettoyage au démontage ne doit
    // pas confondre un fichier qu'on vient de sauvegarder avec un abandon.
    committedRef.current = true;

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

  /**
   * Fichiers uploadés pendant cette session d'édition mais jamais enregistrés.
   *
   * `AudioAttachField` téléverse dès le choix du fichier, avant tout
   * enregistrement du formulaire : abandonner la page laisse ces fichiers
   * dans `Phono/Catalogue` sans qu'aucune version en base ne les référence.
   * `pruneOrphanAudio` finit par les ramasser, mais seulement après son
   * sursis d'1h — pensé pour un dialogue resté ouvert, pas pour un abandon
   * explicite où l'intention de l'artiste est déjà connue. On compare à
   * `initialForm` (l'état chargé, avant toute saisie) plutôt qu'à `track` :
   * une version dont l'`audioPath` n'a pas changé depuis le chargement était
   * déjà enregistrée, ce n'est pas cette session qui l'a mise en ligne.
   */
  const unsavedUploadedPaths = () => {
    const initialByVersionId = new Map(
      initialForm.versions.map((v) => [v.id, v])
    );
    const paths: string[] = [];
    for (const v of form.versions) {
      if (v.audioSource !== "upload" || !v.audioPath) continue;
      const before = initialByVersionId.get(v.id);
      if (!before || before.audioPath !== v.audioPath) paths.push(v.audioPath);
    }
    return paths;
  };
  // Toujours à jour pour l'effet de nettoyage au démontage, déclaré plus haut
  // (avant que cette fonction existe) avec des dépendances vides. Un effet,
  // pas une écriture directe en cours de rendu : React l'interdit pour un ref.
  useEffect(() => {
    unsavedUploadedPathsRef.current = unsavedUploadedPaths;
  });

  const handleCancel = () => {
    if (dirty && !window.confirm(UNSAVED_CHANGES_MESSAGE)) return;
    // Le nettoyage lui-même a lieu au démontage (effet ci-dessus), commun à
    // toutes les sorties de page — inutile de le dupliquer ici.
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
        // Même chemin que le bouton « Annuler » du pied de page : confirmation
        // si des modifications sont en attente, et nettoyage d'un éventuel
        // fichier audio téléversé puis abandonné. Un `router.push` direct ici
        // contournait les deux, silencieusement.
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
        {track ? track.title || "Titre sans nom" : "Nouveau titre"}
      </h1>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <TrackEditForm
          form={form}
          patch={patch}
          dateInvalid={dateInvalid}
          draftTrack={draftTrack}
          savedVersions={track?.versions ?? []}
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
