// src/modules/phono/lib/audio-gc.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, getSessionUser } from "@/lib/supabase";
import { DRIVE_BUCKET, getUserStorageUsed } from "@/lib/drive-db";
import type { Track } from "@/lib/sidekick-store";

/** Dossier des fichiers téléversés depuis le catalogue, sous `<userId>/`. */
const AUDIO_PREFIX = "Phono/Catalogue";

/**
 * Sursis avant qu'un fichier soit considéré comme orphelin.
 *
 * `AudioAttachField` téléverse dès le choix du fichier, mais la version n'est
 * écrite en base qu'à l'enregistrement du dialogue : entre les deux, le fichier
 * n'est référencé nulle part sans être pour autant abandonné. Une heure couvre
 * largement un dialogue laissé ouvert, et reste sans effet sur le nettoyage des
 * vrais orphelins, qui ne redeviennent jamais référencés.
 */
const GRACE_MS = 60 * 60 * 1000;

/**
 * Chemins référencés par une version de titre ou par un mix — le catalogue au
 * sens strict, à l'exclusion des liens d'écoute publiés (voir `pruneOrphanAudio`
 * pour ceux-ci). Réutilisé par le nettoyeur automatique et par le verrouillage
 * des fichiers dans le Drive : les deux ont besoin de savoir si un fichier est
 * "dans le catalogue en ce moment", pas s'il est encore servi ailleurs.
 *
 * `null` si une des deux requêtes échoue — jamais un ensemble partiel silencieux,
 * pour que l'appelant décide lui-même du repli approprié (le GC s'abstient de
 * toucher au bucket, le verrouillage se contente de ne rien verrouiller).
 */
export async function getCatalogAudioPaths(
  supabase: SupabaseClient
): Promise<Set<string> | null> {
  const [tracks, mixes] = await Promise.all([
    supabase.from("user_phono_tracks").select("versions"),
    supabase.from("user_phono_mixes").select("audio_path"),
  ]);
  if (tracks.error || mixes.error) return null;

  const referenced = new Set<string>();
  for (const row of tracks.data ?? []) {
    const versions = (row.versions as Track["versions"]) ?? [];
    for (const v of versions) {
      if (v?.audioPath) referenced.add(v.audioPath);
    }
  }
  for (const row of mixes.data ?? []) {
    const path = row.audio_path as string | null;
    if (path) referenced.add(path);
  }
  return referenced;
}

/**
 * Supprime les fichiers audio que plus rien ne référence.
 *
 * Le catalogue ne doit pas accumuler de fichiers orphelins : détacher un
 * fichier d'une version, supprimer une version, un titre ou un mix laisse
 * derrière lui des octets qui comptent dans le quota de l'artiste sans qu'aucun
 * écran ne les montre. Plutôt que de câbler une suppression dans chacun de ces
 * chemins — et d'en oublier un au prochain ajout — on compare périodiquement le
 * contenu du dossier aux références réelles.
 *
 * Un fichier survit s'il apparaît dans `getCatalogAudioPaths()`, ou dans les
 * liens d'écoute publiés (`user_listening_link_items.audio_path`), qui
 * dénormalisent le chemin : un lien envoyé à un label continue de servir son
 * audio même après que la version a été supprimée du catalogue. Le supprimer
 * casserait un lien déjà dans la nature.
 *
 * Les fichiers rattachés depuis le Drive ne sont jamais concernés : ils vivent
 * en dehors de `<userId>/Phono/Catalogue`, donc hors du périmètre listé ici. Ce
 * sont des documents de l'artiste, pas des pièces jointes du catalogue.
 *
 * Sans effet de bord visible : en cas d'échec (réseau, session expirée), la
 * fonction renvoie 0 et le nettoyage aura lieu au prochain passage.
 *
 * @returns le nombre de fichiers supprimés.
 */
export async function pruneOrphanAudio(): Promise<number> {
  const supabase = createClient();

  const {
    data: { user },
  } = await getSessionUser(supabase);
  if (!user) return 0;

  const prefix = `${user.id}/${AUDIO_PREFIX}`;

  const [listed, items, catalogPaths] = await Promise.all([
    supabase.storage.from(DRIVE_BUCKET).list(prefix, { limit: 1000 }),
    supabase.from("user_listening_link_items").select("audio_path"),
    getCatalogAudioPaths(supabase),
  ]);

  // Une seule requête en échec et le référentiel est incomplet : supprimer sur
  // cette base effacerait des fichiers bel et bien référencés.
  if (listed.error || items.error || catalogPaths === null) return 0;

  const files = listed.data ?? [];
  if (files.length === 0) return 0;

  const referenced = new Set(catalogPaths);
  for (const row of items.data ?? []) {
    const path = row.audio_path as string | null;
    if (path) referenced.add(path);
  }

  const cutoff = Date.now() - GRACE_MS;
  const orphans = files
    .filter((f) => {
      if (!f.name) return false;
      // `list` remonte aussi les sous-dossiers, sans métadonnées de taille.
      if (!f.metadata) return false;
      if (referenced.has(`${prefix}/${f.name}`)) return false;
      const created = f.created_at ? Date.parse(f.created_at) : NaN;
      // Âge inconnu (`created_at` absent ou non parsable) : on s'abstient,
      // on ne le traite jamais comme expiré. L'inverse a déjà supprimé sans
      // sursis un fichier tout juste posé — la seule métadonnée qui protège
      // un dialogue encore ouvert s'est retrouvée absente en pratique, et
      // « âge inconnu » se comportait comme « déjà expiré » plutôt que comme
      // « à revérifier au prochain passage ».
      if (!Number.isFinite(created)) return false;
      return created < cutoff;
    })
    .map((f) => `${prefix}/${f.name}`);

  if (orphans.length === 0) return 0;

  const { error } = await supabase.storage.from(DRIVE_BUCKET).remove(orphans);
  if (error) return 0;

  // Recale le compteur `user_drive_storage`, qui vient d'être faussé de la
  // taille des fichiers supprimés : il est recalculé à partir du bucket.
  await getUserStorageUsed(supabase, user.id).catch(() => {});

  return orphans.length;
}
