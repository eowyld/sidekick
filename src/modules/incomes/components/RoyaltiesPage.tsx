"use client";

import { useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

type DistributorId = "distrokid" | "tunecore" | "soundcloud" | "autres";

type ImportedCsv = {
  fileName: string;
  importedAt: string; // ISO date
  headers: string[];
  rows: string[][];
};

const DISTRIBUTORS: { id: DistributorId; name: string; description: string }[] = [
  { id: "distrokid", name: "DistroKid", description: "Importer les données d'écoute depuis DistroKid (CSV)." },
  { id: "tunecore", name: "TuneCore", description: "Importer les données d'écoute depuis TuneCore (CSV)." },
  { id: "soundcloud", name: "SoundCloud", description: "Importer les données d'écoute depuis SoundCloud (CSV)." },
  { id: "autres", name: "Autres royalties", description: "Importer des royalties d'autres sources (CSV)." },
];

/** Parse une ligne CSV en gérant les guillemets (champs avec virgules). */
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      values.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += c;
    }
  }
  values.push(current.trim().replace(/^"|"$/g, ""));
  return values;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    rows.push(parseCsvLine(lines[i]));
  }
  return { headers, rows };
}

export function RoyaltiesPage() {
  const [imports, setImports] = useLocalStorage<Record<DistributorId, ImportedCsv | null>>(
    "incomes:royalties-imports",
    { distrokid: null, tunecore: null, soundcloud: null, autres: null }
  );
  const fileInputRefs = useRef<Record<DistributorId, HTMLInputElement | null>>({
    distrokid: null,
    tunecore: null,
    soundcloud: null,
    autres: null,
  });

  const handleFileChange = (distributorId: DistributorId, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const { headers, rows } = parseCsv(text);
      setImports((prev) => ({
        ...prev,
        [distributorId]: {
          fileName: file.name,
          importedAt: new Date().toISOString(),
          headers,
          rows,
        },
      }));
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const triggerFileInput = (distributorId: DistributorId) => {
    fileInputRefs.current[distributorId]?.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">
          Royalties
        </h1>
        <p className="text-sm text-muted-foreground">
          Importez les données de vos distributeurs (plateformes) pour ajouter les streams dans l&apos;appli.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {DISTRIBUTORS.map(({ id, name, description }) => {
          const data = imports[id];
          return (
            <Card key={id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                  {name}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  ref={(el) => { fileInputRefs.current[id] = el; }}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleFileChange(id, e)}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => triggerFileInput(id)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Importer un CSV
                </Button>
                {data && (
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{data.fileName}</p>
                    <p>
                      Importé le {new Date(data.importedAt).toLocaleDateString("fr-FR")} — {data.rows.length} ligne{data.rows.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
