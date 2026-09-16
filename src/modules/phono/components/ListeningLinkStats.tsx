"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDuration } from "@/lib/audio-peaks";
import { useListeningData } from "@/hooks/useListeningData";
import type {
  ListeningLink,
  ListeningLinkStats as Stats,
} from "@/lib/listening-types";

interface Props {
  link: ListeningLink;
  onClose: () => void;
}

export function ListeningLinkStats({ link, onClose }: Props) {
  const { loadStats } = useListeningData();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void loadStats(link.id).then(setStats);
  }, [link.id, loadStats]);

  const itemTitle = (itemId: string) =>
    link.items.find((i) => i.id === itemId)?.snapshot.title ?? "Titre retiré";

  const itemDuration = (itemId: string) =>
    link.items.find((i) => i.id === itemId)?.durationMs ?? 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{link.title || "Sans titre"}</DialogTitle>
        </DialogHeader>

        {!stats ? (
          <p style={{ color: "rgba(245,245,245,0.7)" }}>Chargement…</p>
        ) : stats.sessionCount === 0 ? (
          <div className="py-8 text-center">
            <p className="font-medium">Pas encore d&apos;écoute</p>
            <p className="mt-1 text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
              Lien créé le {new Date(link.createdAt).toLocaleDateString("fr-FR")}.
              Une tâche de relance apparaîtra automatiquement si un envoi reste
              sans ouverture.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Sessions" value={String(stats.sessionCount)} />
              <Stat
                label="Taux d'écoute moyen"
                value={`${Math.round(stats.averageCompletion * 100)} %`}
              />
              <Stat label="Téléchargements" value={String(stats.downloadCount)} />
            </div>

            <section>
              <h3
                className="mb-2 text-sm uppercase tracking-wide"
                style={{ color: "rgba(245,245,245,0.7)" }}
              >
                Sessions identifiées
              </h3>
              {stats.identifiedSessions.length === 0 ? (
                <p className="text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
                  Personne ne s&apos;est identifié pour l&apos;instant.
                </p>
              ) : (
                <ul className="space-y-3">
                  {stats.identifiedSessions.map((session) => (
                    <li
                      key={session.id}
                      className="rounded p-3"
                      style={{ border: "1px solid rgba(245,245,245,0.12)" }}
                    >
                      <p className="text-sm font-medium">
                        {session.visitorName} ·{" "}
                        {new Date(session.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {session.plays.map((play) => {
                          const duration = itemDuration(play.itemId);
                          const percent =
                            duration > 0
                              ? Math.min(
                                  100,
                                  Math.round((play.listenedMs / duration) * 100)
                                )
                              : 0;
                          return (
                            <li
                              key={play.itemId}
                              className="text-xs"
                              style={{ color: "rgba(245,245,245,0.7)" }}
                            >
                              {itemTitle(play.itemId)} — écouté à {percent} %
                              {play.completed
                                ? ""
                                : `, passé à ${formatDuration(play.maxPositionMs)}`}
                              {play.playCount > 1
                                ? `, réécouté ${play.playCount} fois`
                                : ""}
                              {play.downloaded ? ", téléchargé" : ""}
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3
                className="mb-2 text-sm uppercase tracking-wide"
                style={{ color: "rgba(245,245,245,0.7)" }}
              >
                Écoutes anonymes
              </h3>
              {stats.anonymousSessionCount === 0 ? (
                <p className="text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
                  Aucune écoute anonyme.
                </p>
              ) : (
                <>
                  <p className="text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
                    {stats.anonymousSessionCount} session
                    {stats.anonymousSessionCount > 1 ? "s" : ""} sans
                    identification.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {Object.entries(stats.anonymousListenedMsByItem)
                      .sort((a, b) => b[1] - a[1])
                      .map(([itemId, ms]) => (
                        <li
                          key={itemId}
                          className="text-xs"
                          style={{ color: "rgba(245,245,245,0.7)" }}
                        >
                          {itemTitle(itemId)} — {formatDuration(ms)} écoutées au
                          total
                        </li>
                      ))}
                  </ul>
                </>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded p-3" style={{ border: "1px solid rgba(245,245,245,0.12)" }}>
      <p className="text-xs" style={{ color: "rgba(245,245,245,0.7)" }}>
        {label}
      </p>
      <p className="text-xl font-medium">{value}</p>
    </div>
  );
}
