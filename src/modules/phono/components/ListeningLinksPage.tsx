"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, Lock, Plus, Power, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useListeningData, useListeningTopTracks } from "@/hooks/useListeningData";
import { createListeningInvite, inviteUrl } from "@/lib/listening-invites";
import { createClient } from "@/lib/supabase";
import { formatDuration } from "@/lib/audio-peaks";
import type { ListeningLink } from "@/lib/listening-types";
import { ListeningLinkComposer } from "./ListeningLinkComposer";
import { ListeningLinkStats } from "./ListeningLinkStats";

function publicOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
}

export function ListeningLinksPage() {
  const { tracks, albums, mixes } = usePhonoData();
  const { links, isLoading, toggleActive, removeLink } = useListeningData();

  const [composerLink, setComposerLink] = useState<ListeningLink | null | "new">(
    null
  );
  const [statsLink, setStatsLink] = useState<ListeningLink | null>(null);
  const [sendFor, setSendFor] = useState<ListeningLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const topTracks = useListeningTopTracks(links);

  const catalogueIsEmpty =
    tracks.length === 0 && albums.length === 0 && mixes.length === 0;

  // Un titre n'est diffusable que si l'une de ses versions porte un fichier.
  const hasAnyAudio = useMemo(
    () => tracks.some((t) => (t.versions ?? []).some((v) => Boolean(v.audioPath))),
    [tracks]
  );

  async function copyLink(link: ListeningLink) {
    await navigator.clipboard.writeText(`${publicOrigin()}/ecoute/${link.slug}`);
    setCopiedId(link.id);
    window.setTimeout(() => setCopiedId(null), 1500);
  }

  if (isLoading) {
    return <p style={{ color: "rgba(245,245,245,0.7)" }}>Chargement…</p>;
  }

  // Catalogue vide : le bouton de création est absent, pas désactivé. Un bouton
  // grisé laisserait croire à un blocage plutôt qu'à une étape manquante.
  if (catalogueIsEmpty) {
    return (
      <EmptyState
        title="Ajoutez d'abord des titres à votre catalogue"
        body="Un lien d'écoute se compose à partir de votre catalogue phono. Commencez par y ajouter vos titres, albums ou mixes."
        action={
          <Link href="/phono/catalogue">
            <Button>Aller au catalogue</Button>
          </Link>
        }
      />
    );
  }

  // Catalogue rempli mais aucun fichier audio : cas le plus probable au départ,
  // le catalogue préexiste et l'audio non.
  if (!hasAnyAudio) {
    return (
      <EmptyState
        title="Vos titres n'ont pas encore de fichier audio"
        body="Pour composer un lien d'écoute, rattachez un fichier audio à au moins une version de vos titres, depuis la fiche du titre dans le catalogue."
        action={
          <Link href="/phono/catalogue">
            <Button>Rattacher un fichier</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Liens d&apos;écoute</h1>
        <Button onClick={() => setComposerLink("new")}>
          <Plus className="mr-2 h-4 w-4" />
          Créer un lien d&apos;écoute
        </Button>
      </div>

      {links.length === 0 ? (
        <EmptyState
          title="Aucun lien d'écoute pour l'instant"
          body="Un lien d'écoute est une page privée qui regroupe les titres de votre choix, à envoyer à un label ou un programmateur."
          action={
            <Button onClick={() => setComposerLink("new")}>
              Créer un lien d&apos;écoute
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setStatsLink(link)}
                  >
                    <p className="truncate font-medium">
                      {link.title || "Sans titre"}
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "rgba(245,245,245,0.7)" }}
                    >
                      {link.items.length} titre{link.items.length > 1 ? "s" : ""}
                      {link.expiresAt
                        ? ` · expire le ${new Date(link.expiresAt).toLocaleDateString("fr-FR")}`
                        : ""}
                      {link.isActive ? "" : " · désactivé"}
                    </p>
                  </button>

                  {link.hasPassword && (
                    <Lock
                      className="h-4 w-4 shrink-0"
                      style={{ color: "rgba(245,245,245,0.7)" }}
                    />
                  )}
                  {link.allowDownload && (
                    <Download
                      className="h-4 w-4 shrink-0"
                      style={{ color: "rgba(245,245,245,0.7)" }}
                    />
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void copyLink(link)}
                    aria-label="Copier le lien"
                  >
                    {copiedId === link.id ? (
                      <Check className="h-4 w-4" style={{ color: "#F0FF00" }} />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Envoyer à un contact"
                    onClick={() => setSendFor(link)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={
                      link.isActive ? "Désactiver le lien" : "Réactiver le lien"
                    }
                    onClick={() => void toggleActive(link.id, !link.isActive)}
                  >
                    <Power
                      className="h-4 w-4"
                      style={{ color: link.isActive ? "#F0FF00" : undefined }}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Supprimer le lien"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Supprimer ce lien ? La page devient introuvable et les statistiques d'écoute sont effacées. Pour couper l'accès en gardant l'historique, désactivez-le plutôt."
                        )
                      ) {
                        void removeLink(link.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setComposerLink(link)}
                  >
                    Modifier
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {topTracks.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2
              className="mb-2 text-sm uppercase tracking-wide"
              style={{ color: "rgba(245,245,245,0.7)" }}
            >
              Titres les plus écoutés, tous liens confondus
            </h2>
            <ul className="space-y-1">
              {topTracks.map((t) => (
                <li key={t.title} className="flex justify-between text-sm">
                  <span className="truncate">{t.title}</span>
                  <span style={{ color: "rgba(245,245,245,0.7)" }}>
                    {formatDuration(t.ms)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {composerLink !== null && (
        <ListeningLinkComposer
          link={composerLink === "new" ? null : composerLink}
          onClose={() => setComposerLink(null)}
        />
      )}
      {statsLink && (
        <ListeningLinkStats link={statsLink} onClose={() => setStatsLink(null)} />
      )}
      {sendFor && (
        <SendDialog link={sendFor} onClose={() => setSendFor(null)} />
      )}
    </div>
  );
}

/**
 * Crée une invitation nominative et prépare l'envoi.
 *
 * Le module Mailing ne lit aucun paramètre d'URL : plutôt que de rediriger vers
 * un composeur qui ignorerait le lien, on copie l'adresse et on propose un
 * `mailto:` pré-rempli, qui fonctionne avec n'importe quel client mail.
 */
function SendDialog({
  link,
  onClose,
}: {
  link: ListeningLink;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const invite = await createListeningInvite(createClient(), link.id, {
        name: name.trim(),
        email: email.trim(),
      });
      const generated = inviteUrl(link.slug, invite.id, publicOrigin());
      await navigator.clipboard.writeText(generated).catch(() => {});
      setUrl(generated);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const mailto = url
    ? `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(
        link.title || "Écoute privée"
      )}&body=${encodeURIComponent(`Bonjour ${name.trim()},\n\n${url}\n\n`)}`
    : "";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Envoyer « {link.title || "Sans titre"} »</DialogTitle>
        </DialogHeader>

        {url ? (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
              Lien nominatif créé et copié. Le nom de {name.trim()} sera
              pré-rempli à l&apos;ouverture, et l&apos;écoute lui sera attribuée.
            </p>
            <p
              className="break-all rounded p-2 text-xs"
              style={{
                border: "1px solid rgba(245,245,245,0.12)",
                color: "rgba(245,245,245,0.7)",
              }}
            >
              {url}
            </p>
            <a href={mailto}>
              <Button className="w-full">Ouvrir dans mon client mail</Button>
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="send-name">Nom du destinataire</Label>
              <Input
                id="send-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ninja Tune — Marie"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="send-email">Adresse email</Label>
              <Input
                id="send-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@label.com"
              />
            </div>
            {error && (
              <p className="text-sm" style={{ color: "#ff6b6b" }}>
                {error}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {url ? "Fermer" : "Annuler"}
          </Button>
          {!url && (
            <Button
              onClick={() => void generate()}
              disabled={busy || name.trim().length === 0 || email.trim().length === 0}
            >
              {busy ? "Création…" : "Créer le lien nominatif"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="max-w-md text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
          {body}
        </p>
        {action}
      </CardContent>
    </Card>
  );
}
