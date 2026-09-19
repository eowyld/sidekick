"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Check, Copy, Headphones, Plus, Power, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoader } from "@/components/ui/page-loader";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useListeningData, useListeningTopTracks } from "@/hooks/useListeningData";
import { formatDuration } from "@/lib/audio-peaks";
import { createListeningInvite, inviteUrl } from "@/lib/listening-invites";
import type { ListeningLink } from "@/lib/listening-types";
import { createClient } from "@/lib/supabase";
import { ListeningLinkStats } from "./ListeningLinkStats";

function publicOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
}

export function ListeningLinksPage() {
  const router = useRouter();
  const { tracks, albums, mixes } = usePhonoData();
  const { links, isLoading, toggleActive, removeLink } = useListeningData();
  const [statsLink, setStatsLink] = useState<ListeningLink | null>(null);
  const [sendFor, setSendFor] = useState<ListeningLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const topTracks = useListeningTopTracks(links);
  const catalogueIsEmpty = tracks.length === 0 && albums.length === 0 && mixes.length === 0;
  const hasAnyAudio = useMemo(
    () => tracks.some((track) => (track.versions ?? []).some((version) => Boolean(version.audioPath))),
    [tracks]
  );

  async function copyLink(link: ListeningLink) {
    await navigator.clipboard.writeText(`${publicOrigin()}/ecoute/${link.slug}`);
    setCopiedId(link.id);
    window.setTimeout(() => setCopiedId(null), 1500);
  }

  if (isLoading) return <PageLoader />;

  if (catalogueIsEmpty) {
    return <EmptyState icon={Headphones} title="Ajoute d'abord des titres à ton catalogue" description="Un lien d'écoute se compose à partir de ton catalogue Phono. Commence par y ajouter des titres, albums ou mixes." action={{ label: "Aller au catalogue", onClick: () => router.push("/phono/catalogue") }} />;
  }

  if (!hasAnyAudio) {
    return <EmptyState icon={Headphones} title="Tes titres n'ont pas encore de fichier audio" description="Rattache un fichier audio à une version depuis la fiche du titre pour pouvoir la partager." action={{ label: "Rattacher un fichier", onClick: () => router.push("/phono/catalogue") }} />;
  }

  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#F5F5F5]/40">Phono</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F5F5F5]">Liens d&apos;écoute</h1>
          <p className="mt-1 max-w-xl text-sm text-[#F5F5F5]/50">Compose des écoutes privées, partage-les et suis l&apos;attention portée à chaque titre.</p>
        </div>
        <Button className="btn-glow" onClick={() => router.push("/phono/liens-ecoute/nouveau")}><Plus className="mr-2 h-4 w-4" />Nouveau lien</Button>
      </div>

      <div className="mt-6">
        {links.length === 0 ? (
          <EmptyState icon={Headphones} title="Aucun lien d'écoute pour l'instant" description="Regroupe les titres de ton choix dans une page privée à envoyer à un label, un programmateur ou un journaliste." action={{ label: "Créer un lien d'écoute", onClick: () => router.push("/phono/liens-ecoute/nouveau") }} />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {links.map((link) => (
              <li key={link.id}>
                <Card className="h-full overflow-hidden rounded-xl border-white/[0.08] bg-[rgba(44,44,46,0.5)] shadow-none">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/20"><Headphones className="h-5 w-5 text-[#F0FF00]" /></div>
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setStatsLink(link)}>
                        <div className="mb-1 flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 rounded-full ${link.isActive ? "bg-emerald-400" : "bg-[#F5F5F5]/25"}`} />
                          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/40">{link.isActive ? "Actif" : "Désactivé"}</span>
                        </div>
                        <p className="truncate text-base font-semibold">{link.title || "Sans titre"}</p>
                        <p className="mt-1 text-xs text-[#F5F5F5]/45">{link.items.length} titre{link.items.length > 1 ? "s" : ""}{link.expiresAt ? ` · expire le ${new Date(link.expiresAt).toLocaleDateString("fr-FR")}` : " · sans expiration"}</p>
                      </button>
                    </div>
                    <div className="mt-5 flex items-center gap-1 border-t border-white/[0.07] pt-4">
                      <Button variant="outline" size="sm" onClick={() => setStatsLink(link)}><BarChart3 className="mr-2 h-3.5 w-3.5" />Statistiques</Button>
                      <Button variant="ghost" size="icon" onClick={() => void copyLink(link)} aria-label="Copier le lien">{copiedId === link.id ? <Check className="h-4 w-4 text-[#F0FF00]" /> : <Copy className="h-4 w-4" />}</Button>
                      <Button variant="ghost" size="icon" aria-label="Envoyer à un contact" onClick={() => setSendFor(link)}><Send className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label={link.isActive ? "Désactiver le lien" : "Réactiver le lien"} onClick={() => void toggleActive(link.id, !link.isActive)}><Power className={`h-4 w-4 ${link.isActive ? "text-[#F0FF00]" : ""}`} /></Button>
                      <Button variant="ghost" size="icon" aria-label="Supprimer le lien" onClick={() => { if (window.confirm("Supprimer ce lien ? La page et ses statistiques seront définitivement effacées.")) void removeLink(link.id); }}><Trash2 className="h-4 w-4" /></Button>
                      <Button className="ml-auto" variant="ghost" size="sm" onClick={() => router.push(`/phono/liens-ecoute/${link.id}`)}>Modifier</Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      {topTracks.length > 0 && (
        <Card className="mt-6 rounded-xl border-white/[0.08] bg-[rgba(44,44,46,0.5)] shadow-none">
          <CardContent className="p-5">
            <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/40">Titres les plus écoutés</h2>
            <ul className="space-y-2">{topTracks.map((track, index) => <li key={track.title} className="flex items-center gap-3 text-sm"><span className="w-5 text-xs tabular-nums text-[#F5F5F5]/30">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1 truncate">{track.title}</span><span className="tabular-nums text-[#F5F5F5]/45">{formatDuration(track.ms)}</span></li>)}</ul>
          </CardContent>
        </Card>
      )}
      {statsLink && <ListeningLinkStats link={statsLink} onClose={() => setStatsLink(null)} />}
      {sendFor && <SendDialog link={sendFor} onClose={() => setSendFor(null)} />}
    </div>
  );
}

function SendDialog({ link, onClose }: { link: ListeningLink; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const invite = await createListeningInvite(createClient(), link.id, { name: name.trim(), email: email.trim() });
      const generated = inviteUrl(link.slug, invite.id, publicOrigin());
      await navigator.clipboard.writeText(generated).catch(() => {});
      setUrl(generated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  const mailto = url ? `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(link.title || "Écoute privée")}&body=${encodeURIComponent(`Bonjour ${name.trim()},\n\n${url}\n\n`)}` : "";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Envoyer « {link.title || "Sans titre"} »</DialogTitle></DialogHeader>
        {url ? (
          <div className="space-y-3"><p className="text-sm text-[#F5F5F5]/60">Lien nominatif créé et copié. Le nom de {name.trim()} sera pré-rempli et l&apos;écoute lui sera attribuée.</p><p className="break-all rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-[#F5F5F5]/60">{url}</p><a href={mailto}><Button className="w-full">Ouvrir dans mon client mail</Button></a></div>
        ) : (
          <div className="space-y-4"><div className="space-y-2"><Label htmlFor="send-name">Nom du destinataire</Label><Input id="send-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ninja Tune — Marie" autoFocus /></div><div className="space-y-2"><Label htmlFor="send-email">Adresse email</Label><Input id="send-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="contact@label.com" /></div>{error && <p className="text-sm text-red-400" role="alert">{error}</p>}</div>
        )}
        <DialogFooter><Button variant="ghost" onClick={onClose}>{url ? "Fermer" : "Annuler"}</Button>{!url && <Button onClick={() => void generate()} disabled={busy || !name.trim() || !email.trim()}>{busy ? "Création…" : "Créer le lien nominatif"}</Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
