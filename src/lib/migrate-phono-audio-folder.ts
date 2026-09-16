// src/lib/migrate-phono-audio-folder.ts

import { createClient, getSessionUser } from "@/lib/supabase";
import { DRIVE_BUCKET } from "@/lib/drive-db";
import type { Track } from "@/lib/sidekick-store";

// Drapeau renommé à chaque changement de `NEW_PREFIX` : les comptes déjà
// migrés vers un ancien préfixe doivent repasser une fois.
const FLAG = "phono_audio_folder_migrated_v3";
// Storage est sensible à la casse : chaque variante est un dossier distinct.
const OLD_PREFIXES = ["phono/audio", "phono/catalogue", "phono/Catalogue", "Phono/audio", "Phono/catalogue"];
const NEW_PREFIX = "Phono/Catalogue";

function migratedPath(path: string, userId: string): string | null {
  for (const oldPrefix of OLD_PREFIXES) {
    const marker = `${userId}/${oldPrefix}/`;
    if (path.startsWith(marker)) return `${userId}/${NEW_PREFIX}/${path.slice(marker.length)}`;
  }
  return null;
}

/**
 * Migration one-shot : les dossiers Storage `phono/audio` puis
 * `phono/catalogue` (toutes casses confondues) sont renommés `Phono/Catalogue`
 * (voir `audio-gc.ts` et `AudioAttachField.tsx`). Cette fonction déplace les
 * fichiers déjà présents sous les anciens préfixes et répercute le nouveau chemin sur les versions de titres, les mix et les
 * liens d'écoute qui le référencent — sans ça, le catalogue continuerait de
 * pointer vers des fichiers qui n'existent plus à cette adresse.
 *
 * Idempotente : ne fait rien si déjà migrée pour cet utilisateur. La passe de
 * répercussion en base tourne à chaque exécution tant que le drapeau n'est
 * pas posé, même si aucun fichier n'est trouvé sous l'ancien préfixe — un run
 * précédent a pu déplacer les fichiers sans finir de mettre à jour toutes les
 * références, et il ne faut pas que cette étape soit sautée dans ce cas.
 * `migratedPath` renvoie `null` pour un chemin déjà migré, donc relire des
 * lignes déjà à jour ne les modifie pas une seconde fois. Un échec à
 * n'importe quelle étape (déplacement de fichier ou mise à jour d'une ligne)
 * laisse le drapeau non posé : la migration sera retentée au prochain
 * chargement plutôt que de laisser le catalogue dans un état à moitié migré.
 */
export async function migratePhonoAudioFolder(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(FLAG) === "done") return;

  const supabase = createClient();
  const {
    data: { user },
  } = await getSessionUser(supabase);
  if (!user) return;

  for (const oldPrefix of OLD_PREFIXES) {
    const oldFolder = `${user.id}/${oldPrefix}`;
    const { data: files, error: listError } = await supabase.storage
      .from(DRIVE_BUCKET)
      .list(oldFolder, { limit: 1000 });
    if (listError) return;

    const names = (files ?? []).filter((f) => f.name && f.metadata).map((f) => f.name);

    for (const name of names) {
      const { error } = await supabase.storage
        .from(DRIVE_BUCKET)
        .move(`${oldFolder}/${name}`, `${user.id}/${NEW_PREFIX}/${name}`);
      if (error) return; // état intermédiaire toléré : on réessaiera au prochain chargement
    }
  }

  const [tracks, mixes, items] = await Promise.all([
    supabase.from("user_phono_tracks").select("id, versions"),
    supabase.from("user_phono_mixes").select("id, audio_path"),
    supabase.from("user_listening_link_items").select("id, audio_path"),
  ]);
  if (tracks.error || mixes.error || items.error) return;

  for (const row of tracks.data ?? []) {
    const versions = (row.versions as Track["versions"]) ?? [];
    let changed = false;
    const nextVersions = versions.map((v) => {
      const next = v.audioPath ? migratedPath(v.audioPath, user.id) : null;
      if (!next) return v;
      changed = true;
      return { ...v, audioPath: next };
    });
    if (changed) {
      const { error } = await supabase
        .from("user_phono_tracks")
        .update({ versions: nextVersions })
        .eq("id", row.id);
      if (error) return; // réessaiera au prochain chargement
    }
  }

  for (const row of mixes.data ?? []) {
    const audioPath = row.audio_path as string | null;
    const next = audioPath ? migratedPath(audioPath, user.id) : null;
    if (next) {
      const { error } = await supabase
        .from("user_phono_mixes")
        .update({ audio_path: next })
        .eq("id", row.id);
      if (error) return;
    }
  }

  for (const row of items.data ?? []) {
    const audioPath = row.audio_path as string | null;
    const next = audioPath ? migratedPath(audioPath, user.id) : null;
    if (next) {
      const { error } = await supabase
        .from("user_listening_link_items")
        .update({ audio_path: next })
        .eq("id", row.id);
      if (error) return;
    }
  }

  localStorage.setItem(FLAG, "done");
}
