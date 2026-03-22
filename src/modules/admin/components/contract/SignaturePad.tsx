"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

function getCanvas2D(canvas: HTMLCanvasElement | null) {
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  return ctx;
}

function dataUrlToFile(dataUrl: string, fileName: string) {
  const [meta, b64] = dataUrl.split(",");
  const mimeMatch = /data:(.*);base64/.exec(meta);
  const mime = mimeMatch?.[1] ?? "image/png";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], fileName, { type: mime });
}

async function convertImageFileToPngFile(file: File): Promise<File> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Impossible de lire le fichier"));
    reader.readAsDataURL(file);
  });

  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Impossible de charger l'image"));
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.width || 800;
  canvas.height = img.height || 400;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.drawImage(img, 0, 0);

  const pngDataUrl = canvas.toDataURL("image/png");
  return dataUrlToFile(pngDataUrl, file.name.replace(/\.[a-zA-Z0-9]+$/, "") + ".png");
}

export function SignaturePad(props: { onFileReady: (file: File | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);

  // Ajuste le canvas à la taille du conteneur (pour une meilleure qualité).
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(320, Math.floor(rect.width)) * dpr;
      canvas.height = 140 * dpr;
      canvas.style.width = `${Math.max(320, Math.floor(rect.width))}px`;
      canvas.style.height = "140px";

      const ctx = getCanvas2D(canvas);
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#111111";
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Dessin
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = getCanvas2D(canvas);
    if (!ctx) return;

    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    let last: { x: number; y: number } | null = null;

    const onPointerDown = (e: PointerEvent) => {
      setIsDrawing(true);
      last = getPos(e);
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawing) return;
      if (!last) last = getPos(e);
      const p = getPos(e);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
    };

    const onPointerUp = () => {
      setIsDrawing(false);
      last = null;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isDrawing]);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = getCanvas2D(canvas);
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setLocalFile(null);
    setSelectedFilePreview(null);
    props.onFileReady(null);
  };

  const commitDrawingAsFile = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pngDataUrl = canvas.toDataURL("image/png");
    const file = dataUrlToFile(pngDataUrl, `signature-${Date.now()}.png`);
    setLocalFile(file);
    setSelectedFilePreview(pngDataUrl);
    props.onFileReady(file);
  };

  const handleImport = async (file: File) => {
    const pngFile = await convertImageFileToPngFile(file);
    const dataUrl = URL.createObjectURL(pngFile);
    setLocalFile(pngFile);
    setSelectedFilePreview(dataUrl);
    props.onFileReady(pngFile);
  };

  return (
    <div className="grid gap-3">
      <div ref={containerRef} className="rounded-md border bg-background p-2">
        <canvas ref={canvasRef} className="block touch-none" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={clear}>
          Effacer
        </Button>
        <Button type="button" variant="secondary" onClick={commitDrawingAsFile}>
          Valider le dessin
        </Button>
        <label className="ml-auto inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
          <Upload className="h-4 w-4" />
          Importer
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              await handleImport(f);
            }}
          />
        </label>
      </div>

      {selectedFilePreview && (
        <div className="rounded-md border bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground mb-2">Aperçu :</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selectedFilePreview} alt="Signature" className="max-h-32 w-auto" />
        </div>
      )}
    </div>
  );
}

