"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSidekickData } from "@/hooks/useSidekickData";
import { useContractsData } from "@/hooks/useContractsData";

export function AdminOverviewPage() {
  const { data } = useSidekickData();
  const { statuses, procedures, documents } = data.admin;
  const { contracts } = useContractsData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">
          Admin – Vue d&apos;ensemble
        </h1>
        <p className="text-sm text-muted-foreground">
          Synthèse de ton administratif : statuts, démarches et documents.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Mes statuts</CardTitle>
            <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
              <Link href="/admin/statuts">Gérer mes statuts</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-2xl font-semibold tabular-nums">
              {statuses.length}
            </p>
            <p className="text-sm text-muted-foreground">
              Intermittent, société, auto-entrepreneur… Suivi de tes statuts
              administratifs.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Mes démarches</CardTitle>
            <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
              <Link href="/admin/demarches">Gérer les démarches</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-2xl font-semibold tabular-nums">
              {procedures.length}
            </p>
            <p className="text-sm text-muted-foreground">
              Procédures et dossiers en cours (carte d&apos;intermittent, déclarations…).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Documents</CardTitle>
            <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
              <Link href="/admin/documents">Voir les documents</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-2xl font-semibold tabular-nums">
              {documents.length}
            </p>
            <p className="text-sm text-muted-foreground">
              Contrats, attestations, pièces administratives centralisées.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Mes contrats</CardTitle>
            <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
              <Link href="/admin/contrats">Voir les contrats</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-2xl font-semibold tabular-nums">
              {contracts.length}
            </p>
            <p className="text-sm text-muted-foreground">
              Modèles, contrats spécifiques, signatures et suivi d&apos;avancement.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accès rapide</CardTitle>
          <p className="text-sm text-muted-foreground">
            Toutes les pages du module Admin.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" size="sm" asChild>
              <Link href="/admin">Vue d&apos;ensemble</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/statuts">Mes statuts</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/demarches">Mes démarches</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/documents">Espace Documents</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/contrats">Mes contrats</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
