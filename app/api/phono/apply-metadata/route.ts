import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

const FFMPEG = "/usr/local/bin/ffmpeg";

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
  const form = await req.formData();
  const file = form.get("file");
  const metadataRaw = form.get("metadata");
  const coverFile = form.get("cover");

  if (!(file instanceof File)) {
    return new Response("Missing file", { status: 400 });
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

  const extMatch = /\.[^.]+$/.exec(file.name);
  const ext = extMatch ? extMatch[0].toLowerCase() : "";
  const id = randomUUID();
  const inputPath = path.join(tmpDir, `${id}-input${ext || ".audio"}`);
  const outputPath = path.join(tmpDir, `${id}-output${ext || ".audio"}`);
  let coverPath: string | null = null;

  try {
    const arrayBuf = await file.arrayBuffer();
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
      file.name.replace(/\.[^.]+$/, "") ||
      `audio-${id.slice(0, 8)}`;

    return new Response(outBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": file.type || "application/octet-stream",
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
