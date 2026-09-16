"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useListeningData } from "@/hooks/useListeningData";
import { formatDuration } from "@/lib/audio-peaks";
import type { ListeningItem, ListeningLink } from "@/lib/listening-types";
import type { Track } from "@/lib/sidekick-store";
import { normalizeTrackGuests } from "@/modules/phono/lib/track";
import { ProtectionSummary } from "./listening/ProtectionSummary";

type DraftItem = Omit<ListeningItem, "id">;

interface Props {
  link: ListeningLink | null;
  onClose: () => void;
}

export function ListeningLinkComposer({ link, onClose }: Props) {
  const { tracks, albums } = usePhonoData();
  const { createLink, updateLink } = useListeningData();

  const [title, setTitle] = useState(link?.title ?? "");
  const [introMessage, setIntroMessage] = useState(link?.introMessage ?? "");
  const [password, setPassword] = useState("");
  const [removePassword, setRemovePassword] = useState(false);
  const [expiresAt, setExpiresAt] = useState(link?.expiresAt?.slice(0, 10) ?? "");
  const [allowDownload, setAllowDownload] = useState(link?.allowDownload ?? false);
  const [presskitUrl, setPresskitUrl] = useState(link?.presskitUrl ?? "");
  // L'identifiant de ligne n'est pas repris : les items sont réécrits en bloc
  // à l'enregistrement, avec une position recalculée depuis l'ordre affiché.
  const [items, setItems] = useState<DraftItem[]>(() =>
    (link?.items ?? []).map((item) => ({
      position: item.position,
      groupLabel: item.groupLabel,
      kind: item.kind,
      sourceId: item.sourceId,
      versionId: item.versionId,
      snapshot: item.snapshot,
      audioPath: item.audioPath,
      durationMs: item.durationMs,
      peaks: item.peaks,
    }))
  );
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Construit un item à partir d'une version précise, en figeant le snapshot. */
  function buildItem(
    track: Track,
    versionId: string,
    groupLabel?: string
  ): DraftItem | null {
    const version = (track.versions ?? []).find((v) => v.id === versionId);
    if (!version?.audioPath) return null;
    return {
      position: 0,
      groupLabel,
      kind: "track",
      sourceId: track.id,
      versionId: version.id,
      snapshot: {
        title: track.title,
        mainArtist: track.mainArtist,
        guestArtists: normalizeTrackGuests(track.guestArtists).map((g) =>
          g.role ? `${g.name} – ${g.role}` : g.name
        ),
        versionLabel: version.label,
        isrc: track.isrc || undefined,
        role: track.role,
        label: track.label,
        releaseDate: track.releaseDate || undefined,
        genre: track.genre,
        cover: track.cover,
      },
      audioPath: version.audioPath,
      durationMs: version.durationMs ?? 0,
      peaks: version.peaks ?? [],
    };
  }

  /** Un titre n'est proposable que si au moins une version porte un fichier. */
  const playableTracks = useMemo(
    () => tracks.filter((t) => (t.versions ?? []).some((v) => Boolean(v.audioPath))),
    [tracks]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return playableTracks;
    return playableTracks.filter((t) => t.title.toLowerCase().includes(q));
  }, [playableTracks, search]);

  function addTrack(track: Track, groupLabel?: string) {
    const firstPlayable = (track.versions ?? []).find((v) => v.audioPath);
    if (!firstPlayable) return;
    const item = buildItem(track, firstPlayable.id, groupLabel);
    if (item) setItems((prev) => [...prev, item]);
  }

  /**
   * Un album ajouté en bloc est éclaté en items partageant le même
   * `groupLabel` : c'est ce qui permet de mélanger un EP entier, deux titres
   * isolés et un podcast dans une seule page cohérente.
   */
  function addAlbum(albumId: string) {
    const album = albums.find((a) => a.id === albumId);
    if (!album) return;
    const added: DraftItem[] = [];
    for (const trackId of album.trackIds ?? []) {
      const track = playableTracks.find((t) => t.id === trackId);
      if (!track) continue;
      const firstPlayable = (track.versions ?? []).find((v) => v.audioPath);
      if (!firstPlayable) continue;
      const item = buildItem(track, firstPlayable.id, album.title);
      if (item) added.push(item);
    }
    if (added.length > 0) setItems((prev) => [...prev, ...added]);
  }

  function changeVersion(index: number, versionId: string) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const track = tracks.find((t) => t.id === item.sourceId);
        if (!track) return item;
        const rebuilt = buildItem(track, versionId, item.groupLabel);
        return rebuilt ?? item;
      })
    );
  }

  function move(index: number, delta: number) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const input = {
        title,
        introMessage,
        password: removePassword ? null : password.length > 0 ? password : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        allowDownload,
        presskitUrl: presskitUrl || null,
        items: items.map((item, index) => ({ ...item, position: index })),
      };
      if (link) await updateLink(link.id, input);
      else await createLink(input);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // Un titre sans fichier ne doit jamais partir chez un label : la publication
  // est bloquée, pas seulement signalée.
  const canPublish = items.length > 0 && items.every((i) => i.audioPath.length > 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {link ? "Modifier le lien d'écoute" : "Nouveau lien d'écoute"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Colonne gauche : la sélection */}
          <div className="space-y-3">
            <Label>Sélection</Label>
            {items.length === 0 ? (
              <p className="text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
                Aucun titre pour l&apos;instant. Cherchez dans votre catalogue
                ci-dessous pour composer votre sélection.
              </p>
            ) : (
              <ul className="space-y-2">
                {items.map((item, index) => {
                  const track = tracks.find((t) => t.id === item.sourceId);
                  const versions = (track?.versions ?? []).filter((v) => v.audioPath);
                  return (
                    <li
                      key={`${item.sourceId}-${item.versionId}-${index}`}
                      className="flex items-center gap-2 rounded p-2"
                      style={{ border: "1px solid rgba(245,245,245,0.12)" }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{item.snapshot.title}</p>
                        <p
                          className="text-xs"
                          style={{ color: "rgba(245,245,245,0.7)" }}
                        >
                          {item.groupLabel ? `${item.groupLabel} · ` : ""}
                          {formatDuration(item.durationMs)}
                        </p>
                      </div>
                      {versions.length > 1 && (
                        <Select
                          value={item.versionId}
                          onValueChange={(v) => changeVersion(index, v)}
                        >
                          <SelectTrigger className="w-36 shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {versions.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.label || "Version"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => move(index, -1)}
                        aria-label="Monter"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => move(index, 1)}
                        aria-label="Descendre"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Retirer"
                        onClick={() =>
                          setItems((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}

            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Chercher un titre dans le catalogue"
            />

            {filtered.length === 0 && (
              <p className="text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
                Aucun titre ne correspond.{" "}
                <button
                  type="button"
                  className="underline"
                  style={{ color: "#F0FF00" }}
                  onClick={() => setSearch("")}
                >
                  Effacer la recherche
                </button>
              </p>
            )}

            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {filtered.map((track) => (
                <li key={track.id} className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => addTrack(track)}
                    aria-label={`Ajouter ${track.title}`}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <span className="truncate text-sm">{track.title}</span>
                </li>
              ))}
            </ul>

            {albums.length > 0 && (
              <Select onValueChange={addAlbum}>
                <SelectTrigger>
                  <SelectValue placeholder="Ajouter un projet entier" />
                </SelectTrigger>
                <SelectContent>
                  {albums.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Colonne droite : les réglages */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lk-title">Titre</Label>
              <Input
                id="lk-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Promo EP — automne 2026"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lk-intro">Mot d&apos;introduction</Label>
              <Textarea
                id="lk-intro"
                value={introMessage}
                onChange={(e) => setIntroMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lk-pwd">Mot de passe</Label>
              <Input
                id="lk-pwd"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setRemovePassword(false);
                }}
                placeholder={link?.hasPassword ? "Inchangé" : "Aucun"}
              />
              <p className="text-xs" style={{ color: "rgba(245,245,245,0.7)" }}>
                Un lien transféré sans le code reste inutilisable.
              </p>
              {link?.hasPassword && (
                <label
                  className="flex items-center gap-2 text-xs"
                  style={{ color: "rgba(245,245,245,0.7)" }}
                >
                  <input
                    type="checkbox"
                    checked={removePassword}
                    onChange={(e) => setRemovePassword(e.target.checked)}
                  />
                  Retirer le mot de passe
                </label>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lk-exp">Date d&apos;expiration</Label>
              <Input
                id="lk-exp"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
              <p className="text-xs" style={{ color: "rgba(245,245,245,0.7)" }}>
                Passée cette date, la page ne diffuse plus rien, même pour ceux
                qui ont déjà le lien.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="lk-dl">Autoriser le téléchargement</Label>
                <Switch
                  id="lk-dl"
                  checked={allowDownload}
                  onCheckedChange={setAllowDownload}
                />
              </div>
              {allowDownload && (
                <p className="text-xs" style={{ color: "#ff6b6b" }}>
                  Le destinataire obtient le fichier. Vous perdez tout contrôle
                  dessus.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lk-pk">Lien presskit</Label>
              <Input
                id="lk-pk"
                value={presskitUrl}
                onChange={(e) => setPresskitUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>

            <ProtectionSummary
              hasPassword={
                password.length > 0 || (Boolean(link?.hasPassword) && !removePassword)
              }
              expiresAt={expiresAt || null}
              allowDownload={allowDownload}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm" style={{ color: "#ff6b6b" }}>
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={() => void save()} disabled={busy || !canPublish}>
            {busy ? "Enregistrement…" : link ? "Enregistrer" : "Créer le lien"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
