import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { createServerSupabase } from "@/lib/supabase-server";
import { DRIVE_BUCKET } from "@/lib/drive-db";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

const FFMPEG = process.env.FFMPEG_PATH?.trim() || "/usr/local/bin/ffmpeg";

/**
 * Écriture des métadonnées dans les fichiers audio — désactivée par défaut.
 *
 * La route dépend d'un binaire ffmpeg installé sur la machine, absent de
 * l'environnement de production : la fonctionnalité y est cassée depuis
 * toujours. Elle acceptait par ailleurs des fichiers de n'importe qui, sans
 * authentification.
 *
 * Le code reste en place et fonctionne en local en posant
 * `PHONO_METADATA_ENABLED=true` (et `FFMPEG_PATH` si besoin).
 */
const METADATA_ENABLED = process.env.PHONO_METADATA_ENABLED === "true";

type IncomingMetadata = {
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  trackNumber?: number;
  trackTotal?: number;
  genre?: string;
  label?: string;
  copyright?: string;
  year?: number;
  fullDate?: string;
  composers?: string;
  isrc?: string;
  comment?: string;
};

export async function POST(req: NextRequest) {
  // Une route qui reçoit des fichiers doit savoir de qui ils viennent : sans
  // cette vérification, n'importe qui pouvait téléverser sur le serveur.
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!METADATA_ENABLED) {
    return Response.json(
      { error: "feature_disabled", detail: "L'écriture des métadonnées n'est pas disponible." },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const audioPathRaw = form.get("audioPath");
  const metadataRaw = form.get("metadata");
  const coverFile = form.get("cover");

  // Deux sources d'entrée, convergées ici vers un même `Blob` et un même nom :
  // soit un fichier téléversé (`file`), soit un `audioPath` dans le bucket
  // `drive` que le serveur télécharge lui-même — un album de WAV n'a alors pas
  // à redescendre puis remonter par le navigateur.
  let audioBlob: Blob;
  let sourceName: string;

  if (file instanceof File) {
    audioBlob = file;
    sourceName = file.name;
  } else if (typeof audioPathRaw === "string" && audioPathRaw.length > 0) {
    // Le premier segment du chemin est l'id du propriétaire. Le vérifier ici
    // évite qu'un utilisateur tague le fichier d'un autre : `download` appelé
    // côté serveur ne passe pas par les policies RLS.
    if (audioPathRaw.split("/")[0] !== user.id) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    const { data: blob, error } = await supabase.storage
      .from(DRIVE_BUCKET)
      .download(audioPathRaw);
    if (error || !blob) {
      return Response.json(
        { error: "not_found", detail: "Fichier audio introuvable." },
        { status: 404 }
      );
    }
    audioBlob = blob;
    sourceName = audioPathRaw.split("/").pop() || "audio";
  } else {
    return Response.json(
      {
        error: "missing_input",
        detail: "Aucun fichier audio fourni : renseigne « file » ou « audioPath ».",
      },
      { status: 400 }
    );
  }

  if (typeof metadataRaw !== "string") {
    return new Response("Missing metadata", { status: 400 });
  }

  let metadata: IncomingMetadata;
  try {
    metadata = JSON.parse(metadataRaw) as IncomingMetadata;
  } catch {
    return new Response("Invalid metadata JSON", { status: 400 });
  }

  const tmpDir = path.join(os.tmpdir(), "sidekick-phono");
  await fs.mkdir(tmpDir, { recursive: true });

  // L'extension vient de `file.name` ou, pour un `audioPath`, du chemin lui-même.
  // Elle décide si la cover peut être embarquée et nomme le fichier temporaire.
  const extMatch = /\.[^.]+$/.exec(sourceName);
  const ext = extMatch ? extMatch[0].toLowerCase() : "";
  const id = randomUUID();
  const inputPath = path.join(tmpDir, `${id}-input${ext || ".audio"}`);
  const outputPath = path.join(tmpDir, `${id}-output${ext || ".audio"}`);
  let coverPath: string | null = null;

  try {
    const arrayBuf = await audioBlob.arrayBuffer();
    await fs.writeFile(inputPath, new Uint8Array(arrayBuf));

    const supportsCover = [".mp3", ".flac", ".ogg", ".opus", ".m4a", ".aac", ".mp4"].includes(ext);

    if (coverFile instanceof File && supportsCover) {
      const coverExt = coverFile.name?.match(/\.[^.]+$/)?.[0] || ".jpg";
      coverPath = path.join(tmpDir, `${id}-cover${coverExt}`);
      const coverBuf = await coverFile.arrayBuffer();
      await fs.writeFile(coverPath, new Uint8Array(coverBuf));
    }

    const args: string[] = ["-i", inputPath];

    if (coverPath) {
      args.push("-i", coverPath);
      args.push("-map", "0:a", "-map", "1:v");
      args.push("-c:a", "copy", "-c:v", "mjpeg");
      args.push("-disposition:v", "attached_pic");
      args.push("-metadata:s:v", "title=Album cover");
      args.push("-metadata:s:v", "comment=Cover (front)");
    } else {
      args.push("-c", "copy");
    }

    args.push("-map_metadata", "-1");

    if (metadata.title) {
      args.push("-metadata", `title=${metadata.title}`);
    }
    if (metadata.artist) {
      args.push("-metadata", `artist=${metadata.artist}`);
    }
    if (metadata.album) {
      args.push("-metadata", `album=${metadata.album}`);
    }
    if (metadata.albumArtist) {
      args.push("-metadata", `album_artist=${metadata.albumArtist}`);
    }
    if (metadata.trackNumber) {
      const tn = metadata.trackNumber;
      const tt = metadata.trackTotal;
      args.push(
        "-metadata",
        `track=${tn}${tt && tt > 0 ? `/${tt}` : ""}`
      );
    }
    if (metadata.genre) {
      args.push("-metadata", `genre=${metadata.genre}`);
    }
    if (metadata.label) {
      // ffmpeg mappe "publisher"/"label" vers les bons tags selon le conteneur (ID3, RIFF INFO, Vorbis...)
      args.push("-metadata", `publisher=${metadata.label}`);
      args.push("-metadata", `label=${metadata.label}`);
    }
    if (metadata.copyright) {
      args.push("-metadata", `copyright=${metadata.copyright}`);
    }
    if (metadata.composers) {
      // "composer" est standard et sera mappé automatiquement (TCOM en ID3, etc.)
      args.push("-metadata", `composer=${metadata.composers}`);
    }
    if (metadata.isrc) {
      args.push("-metadata", `TSRC=${metadata.isrc}`);
      args.push("-metadata", `ISRC=${metadata.isrc}`);
    }
    if (metadata.comment) {
      args.push("-metadata", `comment=${metadata.comment}`);
    }

    if (metadata.fullDate || metadata.year) {
      let dateString = "";
      if (metadata.fullDate) {
        const d = metadata.fullDate.trim();
        if (d.includes("/")) {
          const [dd, mm, yyyy] = d.split("/");
          if (dd && mm && yyyy) {
            dateString = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
          }
        } else {
          dateString = d;
        }
      }
      if (!dateString && metadata.year) {
        dateString = String(metadata.year);
      }
      if (dateString) {
        args.push("-metadata", `date=${dateString}`);
      }
    }

    args.push("-y", outputPath);

    await execFileAsync(FFMPEG, args);

    const outBytes = await fs.readFile(outputPath);
    const outName =
      metadata.title?.trim() ||
      sourceName.replace(/\.[^.]+$/, "") ||
      `audio-${id.slice(0, 8)}`;

    return new Response(outBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": audioBlob.type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${outName}${ext || ""}"`,
      },
    });
  } catch (err) {
    console.error("ffmpeg metadata error:", err);
    return new Response(
      "Erreur lors de l'application des métadonnées au fichier audio.",
      { status: 500 }
    );
  } finally {
    try { await fs.unlink(inputPath); } catch {}
    try { await fs.unlink(outputPath); } catch {}
    if (coverPath) { try { await fs.unlink(coverPath); } catch {} }
  }
}
