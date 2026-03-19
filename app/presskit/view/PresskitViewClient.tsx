"use client";

import { useMemo } from "react";
import {
  ExternalLink,
  Facebook,
  Instagram,
  Mail,
  MessageCircle,
  Music2
} from "lucide-react";
import { decodePresskitFromShare } from "@/modules/marketing/lib/presskit-share";
import type { PresskitProfile, StreamingPlatformKey } from "@/modules/marketing/data/presskit";

const STREAMING_PLATFORMS: Array<{ key: StreamingPlatformKey; label: string }> = [
  { key: "spotify", label: "Spotify" },
  { key: "deezer", label: "Deezer" },
  { key: "appleMusic", label: "Apple Music" },
  { key: "tidal", label: "Tidal" },
  { key: "qobuz", label: "Qobuz" },
  { key: "soundcloud", label: "SoundCloud" }
];

function buildWhatsAppLink(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits.replace(/^\+/, "")}`;
}

type Props = {
  payloadParam?: string | null;
  payloadDirect?: PresskitProfile | null;
};

export function PresskitViewClient({ payloadParam, payloadDirect }: Props) {
  const presskit = useMemo(() => {
    if (payloadDirect) return payloadDirect;
    return decodePresskitFromShare(payloadParam || "");
  }, [payloadParam, payloadDirect]);

  if (!presskit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <p className="text-muted-foreground">Lien invalide ou presskit introuvable.</p>
      </div>
    );
  }

  const profile = presskit as PresskitProfile;
  const filledCovers = (profile.covers || []).filter(
    (c) => (c.title && c.title.trim()) || (c.link && c.link.trim()) || (c.imageUrl && c.imageUrl.trim())
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <article className="mx-auto max-w-2xl px-4 py-16 md:py-20">
        <div className="flex flex-col gap-12 md:gap-14">
          <header className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              {profile.artistTitle || "Artiste"}
            </h1>
            {profile.hook && (
              <p className="text-xl text-muted-foreground md:text-2xl">{profile.hook}</p>
            )}
          </header>

          <section className="overflow-hidden rounded-xl border bg-card">
            {profile.mainPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.mainPhotoUrl}
                alt="Photo principale"
                className="h-80 w-full object-cover"
              />
            ) : (
              <div className="flex h-64 items-center justify-center bg-muted text-muted-foreground">
                Photo principale
              </div>
            )}
          </section>

          {profile.bio && (
            <section>
              <h2 className="mb-4 text-xl font-medium">Bio</h2>
              <p className="whitespace-pre-wrap text-muted-foreground">{profile.bio}</p>
            </section>
          )}

          {(profile.socials?.instagram || profile.socials?.facebook) && (
            <section>
              <h2 className="mb-4 text-xl font-medium">Réseaux sociaux</h2>
              <div className="flex flex-wrap gap-3">
                {profile.socials.instagram && (
                  <a
                    href={profile.socials.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted/50"
                  >
                    <Instagram className="h-4 w-4" />
                    Instagram
                  </a>
                )}
                {profile.socials.facebook && (
                  <a
                    href={profile.socials.facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted/50"
                  >
                    <Facebook className="h-4 w-4" />
                    Facebook
                  </a>
                )}
              </div>
            </section>
          )}

          {(Object.values(profile.streamingLinks || {}).some(Boolean) ||
            (profile.customStreamingLinks?.length ?? 0) > 0) && (
            <section>
              <h2 className="mb-4 text-xl font-medium">Liens d&apos;écoute</h2>
              <div className="flex flex-wrap gap-3">
                {STREAMING_PLATFORMS.map((platform) => {
                  const url = profile.streamingLinks?.[platform.key];
                  if (!url) return null;
                  return (
                    <a
                      key={platform.key}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted/50"
                    >
                      <Music2 className="h-4 w-4" />
                      {platform.label}
                    </a>
                  );
                })}
                {(profile.customStreamingLinks || []).map((item) => {
                  if (!item.url) return null;
                  return (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted/50"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {item.label || "Lien"}
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {filledCovers.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-medium">Dernières sorties</h2>
              <div
                className={`grid gap-6 ${
                  filledCovers.length === 1
                    ? "grid-cols-1 max-w-xs mx-auto"
                    : filledCovers.length === 2
                      ? "grid-cols-1 sm:grid-cols-2 max-w-md mx-auto"
                      : "grid-cols-1 sm:grid-cols-3"
                }`}
              >
                {filledCovers.map((cover) => (
                  <a
                    key={cover.id}
                    href={cover.link || "#"}
                    target={cover.link ? "_blank" : undefined}
                    rel={cover.link ? "noreferrer" : undefined}
                    className="overflow-hidden rounded-lg border"
                  >
                    <div className="aspect-square bg-muted">
                      {cover.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover.imageUrl}
                          alt={cover.title || "Cover"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          Cover
                        </div>
                      )}
                    </div>
                    <div className="border-t px-3 py-2">
                      <span className="font-medium">{cover.title || "Titre"}</span>
                      {cover.link && (
                        <ExternalLink className="ml-2 inline-block h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {profile.latest?.length > 0 && profile.latest.some((r) => r.title || r.description) && (
            <section>
              <h2 className="mb-4 text-xl font-medium">Dernières réalisations</h2>
              <div className="space-y-3">
                {profile.latest.map((item) => (
                  <div key={item.id} className="rounded-lg border p-4">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="font-medium">{item.title || "Réalisation"}</p>
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          Ouvrir
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {(profile.contact?.email || profile.contact?.whatsapp) && (
            <section>
              <h2 className="mb-4 text-xl font-medium">Contact</h2>
              <div className="flex flex-wrap gap-4">
                {profile.contact.email && (
                  <a
                    href={`mailto:${profile.contact.email}`}
                    className="inline-flex h-16 w-16 items-center justify-center rounded-full border hover:bg-muted/50"
                    title="Contacter par email"
                  >
                    <Mail className="h-7 w-7" />
                  </a>
                )}
                {profile.contact.whatsapp && buildWhatsAppLink(profile.contact.whatsapp) && (
                  <a
                    href={buildWhatsAppLink(profile.contact.whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-16 w-16 items-center justify-center rounded-full border hover:bg-muted/50"
                    title="Contacter sur WhatsApp"
                  >
                    <MessageCircle className="h-7 w-7" />
                  </a>
                )}
              </div>
            </section>
          )}
        </div>
      </article>
    </div>
  );
}
