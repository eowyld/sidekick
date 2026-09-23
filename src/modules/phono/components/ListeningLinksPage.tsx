"use client";

import { useMemo, useState } from "react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { BarChart3, Check, Copy, Headphones, Plus, Power, Send, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoader } from "@/components/ui/page-loader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useListeningData, useListeningTopTracks } from "@/hooks/useListeningData";
import { formatDuration } from "@/lib/audio-peaks";
import { createListeningInvite, inviteUrl } from "@/lib/listening-invites";
import type { ListeningLink } from "@/lib/listening-types";
import { createClient } from "@/lib/supabase";
import { ListeningLinkStats } from "./ListeningLinkStats";
import { cn } from "@/lib/utils";
import { isUsableRefreshToken } from "@/lib/mail-refresh-error";
import { inviteEmailHtml } from "@/lib/listening-invite-email";
import { useArtistIdentity } from "@/hooks/useArtistIdentity";
import { logoFor } from "@/lib/artist-logo";
import { userErrorMessage } from "@/lib/user-error";

function publicOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
}

export function ListeningLinksPage() {
  const { confirm, confirmDialog } = useConfirm();
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
                      <Button variant="ghost" size="icon" aria-label="Supprimer le lien" onClick={async () => { if (await confirm({ title: "Supprimer ce lien ?", description: "La page d'écoute et ses statistiques seront définitivement effacées." })) void removeLink(link.id); }}><Trash2 className="h-4 w-4" /></Button>
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
      {confirmDialog}
    </div>
  );
}

/** Adresses d'envoi effectivement connectées dans Paramètres > Intégrations. */
function useConnectedSenders(): { addresses: string[]; loading: boolean } {
  const { data, isLoading } = useSWR("mail-senders", async () => {
    const { data: auth } = await createClient().auth.getUser();
    const meta = (auth.user?.user_metadata ?? {}) as Record<string, unknown>;
    const mailFrom = meta.mail_from as string | null | undefined;
    const gmail = (meta.gmail_email as string | null) ?? (mailFrom && String(mailFrom).includes("gmail") ? String(mailFrom) : null);
    const outlook = (meta.outlook_email as string | null) ?? (mailFrom && (String(mailFrom).includes("outlook") || String(mailFrom).includes("hotmail")) ? String(mailFrom) : null);
    const addresses: string[] = [];
    if (isUsableRefreshToken(meta.gmail_refresh_token) && gmail) addresses.push(gmail);
    if (isUsableRefreshToken(meta.outlook_refresh_token) && outlook) addresses.push(outlook);
    return addresses;
  }, { revalidateOnFocus: false });
  return { addresses: data ?? [], loading: isLoading };
}

function SendDialog({ link, onClose }: { link: ListeningLink; onClose: () => void }) {
  const router = useRouter();
  const { addresses, loading: sendersLoading } = useConnectedSenders();
  const { artistName, logo, logoExports } = useArtistIdentity();
  // Même route que la page d'écoute : compte et lien doivent tous deux l'autoriser.
  const logoUrl = link.showLogo && logoFor(logo, logoExports, "listening")
    ? `${publicOrigin()}/api/listening/${link.slug}/logo`
    : undefined;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState(link.title ? `Écoute privée : ${link.title}` : "Écoute privée");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Adresse de reconnexion, renseignée quand le fournisseur a révoqué le token. */
  const [reconnectHref, setReconnectHref] = useState<string | null>(null);
  /** `null` tant que l'utilisateur n'a rien saisi : le test part alors vers l'adresse d'envoi. */
  const [testTo, setTestTo] = useState<string | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [testSentTo, setTestSentTo] = useState<string | null>(null);

  const sender = from || addresses[0] || "";
  const testAddress = testTo ?? sender;
  const body = message.trim() || `Bonjour ${name.trim() || ""},\n\nVoici une écoute privée, avec le lien juste en dessous.`;
  const finalSubject = subject.trim() || "Écoute privée";

  /**
   * L'aperçu et le mail test pointent vers le lien public : le lien nominatif
   * n'existe qu'à l'envoi réel, et un test ne doit pas créer d'invitation qui
   * fausserait les statistiques du destinataire.
   */
  const publicUrl = `${publicOrigin()}/ecoute/${link.slug}`;
  const previewHtml = useMemo(
    () => inviteEmailHtml({ link, message: body, url: url ?? publicUrl, origin: publicOrigin(), artistName, recipientName: name, logoUrl }),
    [link, body, url, publicUrl, artistName, name, logoUrl]
  );

  /** Envoie un mail depuis la boîte connectée ; lève une erreur lisible sinon. */
  async function postMail(to: string, mailSubject: string, html: string) {
    const res = await fetch("/api/mail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject: mailSubject, html, fromEmail: sender }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string; code?: string; provider?: string };
      if (payload.code === "mail_reauth_required") {
        setReconnectHref(payload.provider === "gmail" ? "/api/mail/oauth/google/start" : "/settings/mail");
      }
      throw new Error(payload.error ?? "Envoi impossible.");
    }
  }

  async function sendTest() {
    setTestBusy(true);
    setError(null);
    setReconnectHref(null);
    setTestSentTo(null);
    try {
      await postMail(testAddress.trim(), `[Test] ${finalSubject}`, previewHtml);
      setTestSentTo(testAddress.trim());
    } catch (reason) {
      setError(userErrorMessage(reason, "L’email de test n’a pas pu partir. Réessaie."));
    } finally {
      setTestBusy(false);
    }
  }

  /** Crée l'invitation nominative et renvoie son URL. */
  async function createInvite(): Promise<string> {
    const invite = await createListeningInvite(createClient(), link.id, { name: name.trim(), email: email.trim() });
    const generated = inviteUrl(link.slug, invite.id, publicOrigin());
    setUrl(generated);
    return generated;
  }

  async function copyOnly() {
    setBusy(true);
    setError(null);
    try {
      const generated = await createInvite();
      await navigator.clipboard.writeText(generated).catch(() => {});
    } catch (reason) {
      setError(userErrorMessage(reason, "Impossible de créer le lien d’invitation. Réessaie."));
    } finally {
      setBusy(false);
    }
  }

  /**
   * Envoi direct depuis la boîte connectée de l'artiste. Le lien nominatif est
   * créé d'abord : si l'envoi échoue, l'invitation existe déjà et le lien reste
   * copiable, plutôt que de perdre la saisie.
   */
  async function sendMail() {
    setBusy(true);
    setError(null);
    setReconnectHref(null);
    try {
      const generated = url ?? (await createInvite());
      await postMail(
        email.trim(),
        finalSubject,
        inviteEmailHtml({ link, message: body, url: generated, origin: publicOrigin(), artistName, recipientName: name, logoUrl })
      );
      setSent(true);
    } catch (reason) {
      setError(userErrorMessage(reason, "L’invitation n’a pas pu partir. Le lien reste copiable."));
    } finally {
      setBusy(false);
    }
  }

  const mailto = url
    ? `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(subject.trim() || link.title || "Écoute privée")}&body=${encodeURIComponent(`${body}\n\n${url}\n\n`)}`
    : "";
  const ready = name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const testReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testAddress.trim());
  const canMail = addresses.length > 0 && !sent;
  /** Pas de boîte connectée : aucun champ, seulement le chemin vers les réglages. */
  const noMailbox = addresses.length === 0 && !sent;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", canMail ? "sm:max-w-5xl" : "max-w-lg")}>
        <DialogHeader><DialogTitle>Envoyer « {link.title || "Sans titre"} »</DialogTitle></DialogHeader>

        {noMailbox ? (
          sendersLoading ? (
            <p className="text-sm text-[#F5F5F5]/50">Recherche d&apos;une adresse d&apos;envoi…</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-[#F5F5F5]/80">Aucune boîte mail n&apos;est connectée.</p>
              <p className="text-sm text-[#F5F5F5]/55">Connecte ton adresse Gmail pour envoyer tes liens d&apos;écoute depuis SIDEKICK, avec la pochette et la liste des titres.</p>
            </div>
          )
        ) : sent ? (
          <div className="space-y-3">
            <p className="text-sm text-[#F5F5F5]/70">Mail envoyé à {email.trim()} depuis {sender}.</p>
            <p className="break-all rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-[#F5F5F5]/60">{url}</p>
            <p className="text-xs text-[#F5F5F5]/45">L&apos;écoute sera attribuée à {name.trim()}, sans qu&apos;il ait à saisir son nom.</p>
          </div>
        ) : (
          <div className={cn(canMail && "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]")}>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="send-name">Nom du destinataire</Label><Input id="send-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ninja Tune — Marie" autoFocus /></div>
              <div className="space-y-2"><Label htmlFor="send-email">Adresse email</Label><Input id="send-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="contact@label.com" /></div>
            </div>

            {addresses.length > 0 ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="send-from">Envoyer depuis</Label>
                  {addresses.length > 1 ? (
                    <Select value={sender} onValueChange={setFrom}>
                      <SelectTrigger id="send-from"><SelectValue /></SelectTrigger>
                      <SelectContent>{addresses.map((address) => <SelectItem key={address} value={address}>{address}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-[#F5F5F5]/70">{addresses[0]}</p>
                  )}
                </div>
                <div className="space-y-2"><Label htmlFor="send-subject">Objet</Label><Input id="send-subject" value={subject} onChange={(event) => setSubject(event.target.value)} /></div>
                <div className="space-y-2">
                  <Label htmlFor="send-message">Message</Label>
                  <Textarea id="send-message" rows={4} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={body} />
                  <p className="text-xs text-[#F5F5F5]/40">Le mail présente ensuite la pochette, les titres et un bouton vers le lien nominatif.</p>
                </div>
                <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
                  <Label htmlFor="send-test">Mail test</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="min-w-0 flex-1">
                      <Input id="send-test" type="email" value={testAddress} onChange={(event) => { setTestTo(event.target.value); setTestSentTo(null); }} />
                    </div>
                    <Button variant="outline" onClick={() => void sendTest()} disabled={testBusy || busy || !testReady || !sender}>
                      {testBusy ? "Envoi…" : "Envoyer un test"}
                    </Button>
                  </div>
                  <p className="text-xs text-[#F5F5F5]/40">
                    {testSentTo
                      ? `Test envoyé à ${testSentTo}. Vérifie la réception avant l'envoi réel.`
                      : "Le test pointe vers le lien public : aucune invitation n'est créée."}
                  </p>
                </div>
              </>
            ) : null}

            {url && !sent && <p className="break-all rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-[#F5F5F5]/60">{url}</p>}
            {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
            {reconnectHref && (
              <a href={reconnectHref}><Button variant="outline" size="sm">Reconnecter mon adresse</Button></a>
            )}
          </div>
          {canMail && (
            <div className="flex min-h-0 flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/50">Aperçu</p>
              <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0b0b0b]">
                <p className="truncate border-b border-white/10 px-3 py-2 text-xs text-[#F5F5F5]/60">
                  <span className="text-[#F5F5F5]/40">Objet : </span>{finalSubject}
                </p>
                {/* sandbox vide : pas de script ni de navigation depuis l'aperçu */}
                <iframe title="Aperçu du mail" srcDoc={previewHtml} sandbox="" className="block h-[60vh] w-full" />
              </div>
            </div>
          )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{sent ? "Fermer" : "Annuler"}</Button>
          {noMailbox && !sendersLoading && (
            <Button onClick={() => router.push("/settings/mail")}>
              <Settings className="mr-2 h-3.5 w-3.5" />
              Connecter ma boîte mail
            </Button>
          )}
          {!sent && !noMailbox && (
            <>
              {url ? (
                <a href={mailto}><Button variant="outline">Ouvrir dans mon client mail</Button></a>
              ) : (
                <Button variant="outline" onClick={() => void copyOnly()} disabled={busy || !ready}>Créer et copier le lien</Button>
              )}
              {addresses.length > 0 && (
                <Button onClick={() => void sendMail()} disabled={busy || !ready || !sender}>
                  <Send className="mr-2 h-3.5 w-3.5" />
                  {busy ? "Envoi…" : "Envoyer le mail"}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
