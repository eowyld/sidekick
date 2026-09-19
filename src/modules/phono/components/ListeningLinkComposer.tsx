"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, CalendarDays, Check, Disc3, Download, Eye, EyeOff, Headphones, ListMusic, Lock, Music2, Plus, Search, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useListeningData } from "@/hooks/useListeningData";
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { formatDuration } from "@/lib/audio-peaks";
import type { ListeningItem, ListeningLink } from "@/lib/listening-types";
import type { Mix, Track } from "@/lib/sidekick-store";
import { albumTrackVersions } from "@/modules/phono/lib/album";
import { normalizeTrackGuests } from "@/modules/phono/lib/track";
import { mixFormatLabel, normalizeMix } from "@/modules/phono/lib/mix";
import { ProtectionSummary } from "./listening/ProtectionSummary";
import { cn, focusRing } from "@/lib/utils";

type DraftItem = Omit<ListeningItem, "id">;
type CatalogTab = "tracks" | "albums" | "mixes";

const CATALOG_TABS: Array<{ key: CatalogTab; label: string }> = [
  { key: "tracks", label: "Titres" },
  { key: "albums", label: "Albums & EP" },
  { key: "mixes", label: "Mixes" },
];

export function ListeningLinkComposer({ link }: { link: ListeningLink | null }) {
  const router = useRouter();
  const { tracks, albums, mixes: mixesRaw } = usePhonoData();
  const { createLink, updateLink } = useListeningData();
  const [title, setTitle] = useState(link?.title ?? "");
  const [introMessage, setIntroMessage] = useState(link?.introMessage ?? "");
  const [passwordEnabled, setPasswordEnabled] = useState(Boolean(link?.hasPassword));
  const [password, setPassword] = useState("");
  // Mot de passe en clair par défaut : c'est un code à recopier et à transmettre,
  // pas un secret personnel — le masquer ne protège rien et cache les fautes de frappe.
  const [showPassword, setShowPassword] = useState(true);
  const [expiryEnabled, setExpiryEnabled] = useState(Boolean(link?.expiresAt));
  const [expiresAt, setExpiresAt] = useState(link?.expiresAt?.slice(0, 10) ?? "");
  const [allowDownload, setAllowDownload] = useState(link?.allowDownload ?? false);
  const [presskitUrl, setPresskitUrl] = useState(link?.presskitUrl ?? "");
  const [items, setItems] = useState<DraftItem[]>(() =>
    (link?.items ?? []).map(({ position, groupLabel, kind, sourceId, versionId, snapshot, audioPath, durationMs, peaks }) => ({ position, groupLabel, kind, sourceId, versionId, snapshot, audioPath, durationMs, peaks }))
  );
  const [search, setSearch] = useState("");
  const [catalogTab, setCatalogTab] = useState<CatalogTab>("tracks");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mixes = useMemo(() => mixesRaw.map(normalizeMix), [mixesRaw]);
  const initialSignature = useMemo(() => JSON.stringify({
    title: link?.title ?? "", introMessage: link?.introMessage ?? "", expiresAt: link?.expiresAt?.slice(0, 10) ?? "",
    allowDownload: link?.allowDownload ?? false, presskitUrl: link?.presskitUrl ?? "",
    items: (link?.items ?? []).map((item) => ({
      position: item.position,
      groupLabel: item.groupLabel,
      kind: item.kind,
      sourceId: item.sourceId,
      versionId: item.versionId,
      snapshot: item.snapshot,
      audioPath: item.audioPath,
      durationMs: item.durationMs,
      peaks: item.peaks,
    })),
  }), [link]);
  const effectiveExpiresAt = expiryEnabled ? expiresAt : "";
  const effectiveHasPassword = passwordEnabled && (Boolean(password) || Boolean(link?.hasPassword));
  const dirty = JSON.stringify({ title, introMessage, expiresAt: effectiveExpiresAt, allowDownload, presskitUrl, items }) !== initialSignature
    || password !== ""
    || passwordEnabled !== Boolean(link?.hasPassword);
  useUnsavedChangesGuard(dirty && !busy);

  function buildItem(track: Track, versionId: string, groupLabel?: string): DraftItem | null {
    const version = (track.versions ?? []).find((candidate) => candidate.id === versionId);
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
        guestArtists: normalizeTrackGuests(track.guestArtists).map((guest) => guest.role ? `${guest.name} – ${guest.role}` : guest.name),
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

  function buildMix(mix: Mix): DraftItem | null {
    if (!mix.audioPath) return null;
    return {
      position: 0,
      groupLabel: mixFormatLabel(mix.format),
      kind: "mix",
      sourceId: mix.id,
      snapshot: {
        title: mix.title,
        mainArtist: mix.artists,
        guestArtists: [],
        releaseDate: mix.releaseDate || undefined,
        cover: mix.cover,
      },
      audioPath: mix.audioPath,
      durationMs: mix.durationMs ?? 0,
      peaks: mix.peaks ?? [],
    };
  }

  const playableTracks = useMemo(() => tracks.filter((track) => (track.versions ?? []).some((version) => Boolean(version.audioPath))), [tracks]);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return query ? playableTracks.filter((track) => `${track.title} ${track.mainArtist}`.toLocaleLowerCase("fr").includes(query)) : playableTracks;
  }, [playableTracks, search]);
  const playableMixes = useMemo(() => mixes.filter((mix) => Boolean(mix.audioPath)), [mixes]);
  const filteredMixes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return query ? playableMixes.filter((mix) => `${mix.title} ${mix.artists}`.toLocaleLowerCase("fr").includes(query)) : playableMixes;
  }, [playableMixes, search]);
  const filteredAlbums = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return query ? albums.filter((album) => `${album.title} ${album.artist ?? ""}`.toLocaleLowerCase("fr").includes(query)) : albums;
  }, [albums, search]);

  function addTrack(track: Track, groupLabel?: string) {
    const selectedVersionIds = new Set(
      items
        .filter((item) => item.kind === "track" && item.sourceId === track.id)
        .map((item) => item.versionId)
    );
    const nextPlayable = (track.versions ?? []).find(
      (version) => version.audioPath && !selectedVersionIds.has(version.id)
    );
    if (!nextPlayable) return;
    const item = buildItem(track, nextPlayable.id, groupLabel);
    if (item) setItems((previous) => [...previous, item]);
  }

  function addAlbum(albumId: string) {
    const album = albums.find((candidate) => candidate.id === albumId);
    if (!album) return;
    const selectedKeys = new Set(
      items.map((item) => `${item.kind}:${item.sourceId}:${item.versionId ?? ""}`)
    );
    const added: DraftItem[] = [];
    for (const trackId of album.trackIds ?? []) {
      const track = playableTracks.find((candidate) => candidate.id === trackId);
      if (!track) continue;
      for (const version of albumTrackVersions(album, track)) {
        if (!version.audioPath) continue;
        const key = `track:${track.id}:${version.id}`;
        if (selectedKeys.has(key)) continue;
        const item = buildItem(track, version.id, album.title);
        if (item && !item.snapshot.cover && album.cover) item.snapshot.cover = album.cover;
        if (item) {
          added.push(item);
          selectedKeys.add(key);
        }
      }
    }
    if (added.length) setItems((previous) => [...previous, ...added]);
  }


  function addMix(mix: Mix) {
    if (items.some((item) => item.kind === "mix" && item.sourceId === mix.id)) return;
    const item = buildMix(mix);
    if (item) setItems((previous) => [...previous, item]);
  }

  function changeVersion(index: number, versionId: string) {
    const current = items[index];
    if (
      current &&
      items.some(
        (item, itemIndex) =>
          itemIndex !== index &&
          item.kind === "track" &&
          item.sourceId === current.sourceId &&
          item.versionId === versionId
      )
    ) return;
    setItems((previous) => previous.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const track = tracks.find((candidate) => candidate.id === item.sourceId);
      return track ? buildItem(track, versionId, item.groupLabel) ?? item : item;
    }));
  }

  function move(index: number, delta: number) {
    setItems((previous) => {
      const target = index + delta;
      if (target < 0 || target >= previous.length) return previous;
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const input = {
        title: title.trim(),
        introMessage: introMessage.trim(),
        password: passwordEnabled ? (password ? password : undefined) : null,
        expiresAt: effectiveExpiresAt ? new Date(effectiveExpiresAt).toISOString() : null,
        allowDownload,
        presskitUrl: presskitUrl.trim() || null,
        coverPath: cover || undefined,
        items: items.map((item, index) => ({ ...item, position: index })),
      };
      if (link) await updateLink(link.id, input);
      else await createLink(input);
      router.push("/phono/liens-ecoute");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  const canPublish = title.trim().length > 0 && items.length > 0 && items.every((item) => item.audioPath);
  const cover = items.find((item) => item.snapshot.cover)?.snapshot.cover;

  function leave() {
    if (dirty && !window.confirm(UNSAVED_CHANGES_MESSAGE)) return;
    router.push("/phono/liens-ecoute");
  }

  return (
    <div>
      <button type="button" onClick={leave} className="mb-4 flex items-center gap-2 text-xs text-[#F5F5F5]/70 transition-colors hover:text-[#F5F5F5]">
        <ArrowLeft className="h-4 w-4" /> Liens d&apos;écoute
      </button>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#F5F5F5]/40">Phono</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{link ? "Modifier le lien d’écoute" : "Nouveau lien d’écoute"}</h1>
          <p className="mt-1 text-sm text-[#F5F5F5]/50">Prépare une écoute claire et professionnelle avant de la partager.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={leave}>Annuler</Button>
          <Button className="btn-glow" onClick={() => void save()} disabled={busy || !canPublish}>{busy ? "Enregistrement…" : link ? "Enregistrer" : "Créer le lien"}</Button>
        </div>
      </div>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <Section number="01" title="Contenu" description="Choisis les titres et leur ordre d'écoute.">
            <div>
              <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F5F5F5]/35" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un titre ou un artiste" /></div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {CATALOG_TABS.map((tab) => {
                  const count = tab.key === "tracks" ? playableTracks.length : tab.key === "albums" ? albums.length : playableMixes.length;
                  const active = catalogTab === tab.key;
                  return <button key={tab.key} type="button" onClick={() => setCatalogTab(tab.key)} aria-pressed={active} className={cn("rounded border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.06em] transition-colors", focusRing, active ? "border-[#F0FF00]/50 bg-[#F0FF00]/10 text-[#F0FF00]" : "border-white/10 text-[#F5F5F5]/45 hover:text-[#F5F5F5]/70")}>{tab.label}<span className={cn("ml-2 tabular-nums", active ? "text-[#F0FF00]/60" : "text-[#F5F5F5]/30")}>{count}</span></button>;
                })}
              </div>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/40">{CATALOG_TABS.find((tab) => tab.key === catalogTab)?.label}</p>
                <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
                  {catalogTab === "tracks" && filtered.map((track) => {
                    const playable = (track.versions ?? []).filter((version) => version.audioPath);
                    const selected = new Set(items.filter((item) => item.kind === "track" && item.sourceId === track.id).map((item) => item.versionId));
                    const selectedCount = playable.filter((version) => selected.has(version.id)).length;
                    return <SourceRow key={track.id} title={track.title} subtitle={`${track.mainArtist || "Artiste"} · ${selectedCount}/${playable.length} version${playable.length > 1 ? "s" : ""}`} cover={track.cover} icon={Music2} disabled={selectedCount >= playable.length} onAdd={() => addTrack(track)} />;
                  })}
                  {catalogTab === "albums" && filteredAlbums.map((album) => {
                    const albumItems = (album.trackIds ?? []).flatMap((trackId) => {
                      const track = playableTracks.find((candidate) => candidate.id === trackId);
                      return track ? albumTrackVersions(album, track).filter((version) => version.audioPath).map((version) => ({ trackId, versionId: version.id })) : [];
                    });
                    const selectedCount = albumItems.filter(({ trackId, versionId }) => items.some((item) => item.kind === "track" && item.sourceId === trackId && item.versionId === versionId)).length;
                    return <SourceRow key={album.id} title={album.title} subtitle={`${album.artist || "Artiste"} · ${selectedCount}/${albumItems.length} piste${albumItems.length > 1 ? "s" : ""}`} cover={album.cover} icon={Disc3} disabled={albumItems.length === 0 || selectedCount >= albumItems.length} onAdd={() => addAlbum(album.id)} />;
                  })}
                  {catalogTab === "mixes" && filteredMixes.map((mix) => {
                    const selected = items.some((item) => item.kind === "mix" && item.sourceId === mix.id);
                    return <SourceRow key={mix.id} title={mix.title} subtitle={`${mixFormatLabel(mix.format)} · ${mix.artists || "Artiste"}`} cover={mix.cover} icon={ListMusic} disabled={selected} onAdd={() => addMix(mix)} />;
                  })}
                  {((catalogTab === "tracks" && filtered.length === 0) || (catalogTab === "albums" && filteredAlbums.length === 0) || (catalogTab === "mixes" && filteredMixes.length === 0)) && <li className="py-8 text-center text-sm text-[#F5F5F5]/45">Aucun contenu audio ne correspond.</li>}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/40">Sélection · {items.length}</p>
                {items.length === 0 ? <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-white/10 p-5 text-center text-sm text-[#F5F5F5]/40">Ajoute les titres à faire écouter.</div> : <ul className="space-y-2">{items.map((item, index) => {
                  const allVersions = (tracks.find((track) => track.id === item.sourceId)?.versions ?? []).filter((version) => version.audioPath);
                  const selectableVersions = allVersions.filter((version) => version.id === item.versionId || !items.some((other, otherIndex) => otherIndex !== index && other.kind === "track" && other.sourceId === item.sourceId && other.versionId === version.id));
                  const startsGroup = item.kind === "track" && Boolean(item.groupLabel) && (index === 0 || items[index - 1]?.groupLabel !== item.groupLabel);
                  return <li key={`${item.sourceId}-${item.versionId}-${index}`}>{startsGroup && <div className="mb-2 mt-3 flex items-center gap-2 first:mt-0"><Disc3 className="h-3.5 w-3.5 text-[#F0FF00]" /><p className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/55">{item.groupLabel}</p><span className="text-[10px] tabular-nums text-[#F5F5F5]/30">{items.filter((candidate) => candidate.groupLabel === item.groupLabel).length} piste{items.filter((candidate) => candidate.groupLabel === item.groupLabel).length > 1 ? "s" : ""}</span></div>}<div className="rounded-lg border border-white/[0.08] bg-black/15 p-3"><div className="flex items-center gap-2"><CoverThumb cover={item.snapshot.cover} icon={item.kind === "mix" ? ListMusic : Music2} /><span className="w-5 text-xs tabular-nums text-[#F5F5F5]/30">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.snapshot.title}</p><p className="truncate text-xs text-[#F5F5F5]/40">{allVersions.length > 1 && item.snapshot.versionLabel ? `${item.snapshot.versionLabel} · ` : ""}{formatDuration(item.durationMs)}</p></div><Button variant="ghost" size="icon" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Monter"><ArrowUp className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="Descendre"><ArrowDown className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" onClick={() => setItems((previous) => previous.filter((_, itemIndex) => itemIndex !== index))} aria-label="Retirer"><X className="h-3.5 w-3.5" /></Button></div>{allVersions.length > 1 && <Select value={item.versionId} onValueChange={(value) => changeVersion(index, value)}><SelectTrigger className="mt-2 h-8"><SelectValue /></SelectTrigger><SelectContent>{selectableVersions.map((version) => <SelectItem key={version.id} value={version.id}>{version.label || "Version"}</SelectItem>)}</SelectContent></Select>}</div></li>;
                })}</ul>}
              </div>
            </div>
          </Section>

          <Section number="02" title="Présentation" description="Donne du contexte au destinataire.">
            <div className="space-y-2"><Label htmlFor="link-title">Titre du lien</Label><Input id="link-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Promo EP — automne 2026" aria-invalid={!title.trim()} /><p className="text-xs text-[#F5F5F5]/40">Visible en tête de la page d&apos;écoute.</p></div>
            <div className="space-y-2"><Label htmlFor="link-intro">Message d&apos;introduction</Label><Textarea id="link-intro" value={introMessage} onChange={(event) => setIntroMessage(event.target.value)} rows={4} placeholder="Bonjour, voici les titres dont nous avons parlé…" /></div>
            <div className="space-y-2"><Label htmlFor="link-presskit">Presskit associé <span className="text-[#F5F5F5]/35">— facultatif</span></Label><Input id="link-presskit" type="url" value={presskitUrl} onChange={(event) => setPresskitUrl(event.target.value)} placeholder="https://…" /></div>
          </Section>

          <Section number="03" title="Protection" description="Garde le contrôle après l'envoi.">
            <ToggleRow
              id="link-password-toggle"
              label="Protéger par un mot de passe"
              description="Le destinataire devra le saisir avant d'écouter."
              checked={passwordEnabled}
              onCheckedChange={(value) => { setPasswordEnabled(value); if (!value) { setPassword(""); setShowPassword(true); } }}
            >
              <div className="space-y-2">
                <Label htmlFor="link-password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="link-password"
                    type={showPassword ? "text" : "password"}
                    className="pr-10"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={link?.hasPassword ? "Inchangé" : "Choisis un mot de passe"}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                  />
                  <button type="button" onClick={() => setShowPassword((previous) => !previous)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} className={cn("absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#F5F5F5]/40 transition-colors hover:text-[#F5F5F5]/80", focusRing)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-[#F5F5F5]/40">{link?.hasPassword ? "Laisse vide pour conserver le mot de passe actuel." : "Communique-le au destinataire par un autre canal que le lien."}</p>
              </div>
            </ToggleRow>
            <ToggleRow
              id="link-expiry-toggle"
              label="Date d'expiration"
              description="Passé cette date, le lien ne s'ouvre plus."
              checked={expiryEnabled}
              onCheckedChange={(value) => { setExpiryEnabled(value); if (value && !expiresAt) setExpiresAt(defaultExpiry()); }}
            >
              <div className="space-y-2">
                <Label htmlFor="link-expiry" className="block">Expire le</Label>
                <DatePicker id="link-expiry" size="sm" className="w-44 justify-start" value={expiresAt} onChange={setExpiresAt} />
              </div>
            </ToggleRow>
            <ToggleRow
              id="link-download"
              label="Autoriser le téléchargement"
              description="Le destinataire pourra conserver les fichiers."
              checked={allowDownload}
              onCheckedChange={setAllowDownload}
            />
            <ProtectionSummary hasPassword={effectiveHasPassword} expiresAt={effectiveExpiresAt || null} allowDownload={allowDownload} />
          </Section>
          {error && <p className="rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300" role="alert">{error}</p>}
        </div>

        <div className="lg:sticky lg:top-6">
          <ListeningSummary title={title} items={items} cover={cover} expiresAt={effectiveExpiresAt} allowDownload={allowDownload} hasPassword={effectiveHasPassword} canPublish={canPublish} busy={busy} onSave={() => void save()} />
        </div>
      </div>
    </div>
  );
}

/** Date locale au format `YYYY-MM-DD` — `toISOString()` décalerait d'un jour le soir. */
function toDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Expiration proposée par défaut à l'activation : une semaine. */
function defaultExpiry() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return toDateInput(date);
}

function ToggleRow({ id, label, description, checked, onCheckedChange, children }: { id: string; label: string; description: string; checked: boolean; onCheckedChange: (value: boolean) => void; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-black/15 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor={id} className="cursor-pointer">{label}</Label>
          <p className="mt-1 text-xs text-[#F5F5F5]/40">{description}</p>
        </div>
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      </div>
      {checked && children && <div className="mt-4 border-t border-white/[0.06] pt-4">{children}</div>}
    </div>
  );
}

function Section({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-white/[0.08] bg-[rgba(44,44,46,0.5)] p-5"><div className="mb-5 flex items-start gap-3"><span className="pt-0.5 text-[10px] font-semibold tracking-[0.1em] text-[#F0FF00]">{number}</span><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-0.5 text-xs text-[#F5F5F5]/40">{description}</p></div></div><div className="space-y-4">{children}</div></section>;
}

function ListeningSummary({ title, items, cover, expiresAt, allowDownload, hasPassword, canPublish, busy, onSave }: { title: string; items: DraftItem[]; cover?: string; expiresAt: string; allowDownload: boolean; hasPassword: boolean; canPublish: boolean; busy: boolean; onSave: () => void }) {
  const safeCover = cover && /^(https?:|data:|blob:)/.test(cover) ? cover : null;
  return <aside className="overflow-hidden rounded-xl border border-white/[0.08] bg-[rgba(44,44,46,0.5)]">
    <div className="relative aspect-[16/9] overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(240,255,0,0.18),transparent_38%),linear-gradient(135deg,#292929,#101010)]">
      {safeCover ? (
        // L'aperçu accepte aussi les data/blob URLs des pochettes non publiées.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={safeCover} alt="" className="h-full w-full object-cover opacity-75" />
      ) : <Headphones className="absolute bottom-5 right-5 h-16 w-16 text-white/10" />}
      <div className="absolute inset-0 bg-gradient-to-t from-[#151515] via-transparent to-transparent" />
      <div className="absolute bottom-4 left-4 right-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F0FF00]">Résumé</p><h2 className="mt-1 truncate text-lg font-bold">{title || "Lien sans titre"}</h2></div>
    </div>
    <div className="p-4">
      <div className="flex flex-wrap gap-2 text-[10px] text-[#F5F5F5]/45">{hasPassword && <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Protégé</span>}{expiresAt && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Jusqu&apos;au {new Date(expiresAt).toLocaleDateString("fr-FR")}</span>}{allowDownload && <span className="flex items-center gap-1"><Download className="h-3 w-3" /> Téléchargement</span>}{!hasPassword && !expiresAt && !allowDownload && <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Lien privé</span>}</div>
      <div className="mt-4 flex items-center justify-between border-y border-white/[0.07] py-3"><span className="text-xs text-[#F5F5F5]/50">Contenu</span><span className="text-sm font-medium tabular-nums">{items.length} piste{items.length > 1 ? "s" : ""}</span></div>
      <ul className="mt-3 space-y-2">{items.slice(0, 4).map((item, index) => {
        const hasSeveralVersions = item.kind === "track" && items.filter((other) => other.kind === "track" && other.sourceId === item.sourceId).length > 1;
        return <li key={`${item.sourceId}-${index}`} className="flex items-center gap-2"><span className="w-4 text-[10px] tabular-nums text-[#F5F5F5]/30">{String(index + 1).padStart(2, "0")}</span><p className="min-w-0 flex-1 truncate text-xs">{item.snapshot.title}{hasSeveralVersions && item.snapshot.versionLabel ? <span className="text-[#F5F5F5]/40"> · {item.snapshot.versionLabel}</span> : null}</p><span className="text-[10px] text-[#F5F5F5]/35">{formatDuration(item.durationMs)}</span></li>;
      })}</ul>
      {items.length > 4 && <p className="mt-2 text-[10px] text-[#F5F5F5]/40">+ {items.length - 4} autre{items.length - 4 > 1 ? "s" : ""}</p>}
      {!canPublish && <p className="mt-4 text-xs text-[#F59E0B]">{!title.trim() ? "Ajoute un titre au lien." : "Ajoute au moins une piste audio."}</p>}
      <Button className="mt-4 w-full" onClick={onSave} disabled={!canPublish || busy}>{busy ? "Enregistrement…" : "Enregistrer le lien"}</Button>
    </div>
  </aside>;
}

function CoverThumb({ cover, icon: Icon }: { cover?: string; icon: typeof Music2 }) {
  const visible = cover && /^(https?:|data:|blob:)/.test(cover);
  // Les pochettes non publiées peuvent être des data/blob URLs locales.
  // eslint-disable-next-line @next/next/no-img-element
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.04]">{visible ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <Icon className="h-4 w-4 text-[#F5F5F5]/35" />}</span>;
}

function SourceRow({ title, subtitle, cover, icon, disabled = false, onAdd }: { title: string; subtitle: string; cover?: string; icon: typeof Music2; disabled?: boolean; onAdd: () => void }) {
  return <li><button type="button" onClick={onAdd} disabled={disabled} className="group flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left transition-colors hover:border-white/[0.08] hover:bg-white/[0.03] disabled:cursor-default disabled:opacity-45 disabled:hover:border-transparent disabled:hover:bg-transparent"><CoverThumb cover={cover} icon={icon} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{title}</p><p className="truncate text-xs text-[#F5F5F5]/40">{subtitle}</p></div><span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-[#F5F5F5]/50 transition-colors group-hover:border-[#F0FF00]/50 group-hover:bg-[#F0FF00] group-hover:text-black group-disabled:border-white/10 group-disabled:bg-transparent group-disabled:text-[#F0FF00]"><span className="sr-only">{disabled ? "Déjà ajouté" : "Ajouter"}</span>{disabled ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</span></button></li>;
}
