// src/modules/incomes/components/CopyrightHistorique.tsx
"use client"

import { Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { CopyrightReleve } from "../parsers/copyright-types"
import { formatEUR } from "../parsers/copyright-types"

interface CopyrightHistoriqueProps {
  releves: CopyrightReleve[]
  onDelete: (id: string) => void
}

export function CopyrightHistorique({ releves, onDelete }: CopyrightHistoriqueProps) {
  return (
    <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.72)] text-[#f5f5f5] backdrop-blur-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.5)]">
          Historique des relevés
        </CardTitle>
      </CardHeader>
      <CardContent>
        {releves.length === 0 ? (
          <div className="py-8 text-center text-sm text-[rgba(245,245,245,0.4)]">
            Aucun relevé importé.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[rgba(245,245,245,0.08)]">
                  <th className="pb-2 pr-4 text-left text-[9px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.4)]">
                    Fichier
                  </th>
                  <th className="pb-2 pr-4 text-left text-[9px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.4)]">
                    Période
                  </th>
                  <th className="pb-2 pr-4 text-left text-[9px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.4)]">
                    Importé le
                  </th>
                  <th className="pb-2 pr-4 text-right text-[9px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.4)]">
                    Entrées
                  </th>
                  <th className="pb-2 pr-4 text-right text-[9px] font-semibold uppercase tracking-wide text-[rgba(245,245,245,0.4)]">
                    Total
                  </th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {releves.map(releve => {
                  const total = releve.entries.reduce((s, e) => s + e.montant, 0)
                  const importedAt = new Date(releve.importedAt).toLocaleDateString(
                    "fr-FR",
                    { day: "numeric", month: "long", year: "numeric" },
                  )
                  return (
                    <tr
                      key={releve.id}
                      className="border-b border-[rgba(245,245,245,0.04)] last:border-0"
                    >
                      <td className="py-2.5 pr-4 font-mono text-[rgba(245,245,245,0.7)]">
                        {releve.filename}
                      </td>
                      <td className="py-2.5 pr-4 text-[#f5f5f5]">{releve.periodeLabel}</td>
                      <td className="py-2.5 pr-4 text-[rgba(245,245,245,0.5)]">{importedAt}</td>
                      <td className="py-2.5 pr-4 text-right text-[rgba(245,245,245,0.5)]">
                        {releve.entries.length}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-semibold text-[#F0FF00]">
                        {formatEUR(total)}
                      </td>
                      <td className="py-2.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-[rgba(245,245,245,0.4)] hover:text-red-400"
                          onClick={() => onDelete(releve.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
