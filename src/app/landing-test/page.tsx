import Link from "next/link";
import { ArrowRight, CheckCircle2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LandingTestPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-24 pt-16 md:pt-24">
        {/* Hero */}
        <section className="grid items-center gap-12 md:grid-cols-[1.2fr,1fr]">
          <div className="space-y-6">
            <p className="inline-flex rounded-full bg-slate-900/60 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/40">
              Built for independent artists · Sidekick
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Transforme ton chaos admin
              <span className="text-emerald-300"> en carrière maîtrisée</span>.
            </h1>
            <p className="max-w-xl text-sm text-slate-300 sm:text-base">
              Sidekick centralise contrats, droits, live, marketing et tâches dans un seul
              espace. Tu récupères{" "}
              <span className="font-semibold text-emerald-200">
                des heures par semaine
              </span>{" "}
              pour écrire, répéter, jouer — pendant que l&apos;outil garde ton back-office
              sous contrôle.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                className="gap-2 bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                asChild
              >
                <Link href="/(auth)/login">
                  Commencer en 3 minutes
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-600 bg-slate-900/60 text-slate-50 hover:bg-slate-900"
                asChild
              >
                <Link href="/(app)/dashboard">Voir l&apos;espace de travail</Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-300" />
                <span>
                  Pensé avec des <span className="font-semibold">managers & tourneurs</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                <span>Aucune carte bancaire requise pour tester</span>
              </div>
            </div>
          </div>

          <Card className="border-slate-700/70 bg-slate-900/80 p-6 shadow-[0_0_80px_rgba(16,185,129,0.25)] backdrop-blur">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              Ton cockpit Sidekick
            </p>
            <div className="space-y-3 text-sm text-slate-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">Vue globale de ta carrière</p>
                  <p className="text-xs text-slate-400">
                    Admin, phono, live, marketing, contacts et finances au même endroit.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                  + clair
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">Rappels intelligents</p>
                  <p className="text-xs text-slate-400">
                    Échéances SACEM, sorties, campagnes, répétitions, factures… plus rien ne
                    tombe dans les fissures.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                  + serein
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">Pipeline revenus</p>
                  <p className="text-xs text-slate-400">
                    Visualise ce qui est signé, en négociation ou à sécuriser sur 6–12 mois.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                  + prévisible
                </span>
              </div>
            </div>
          </Card>
        </section>

        {/* Bénéfices clés */}
        <section className="space-y-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
            POUR QUI ?
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Pour les artistes qui refusent de choisir entre carrière et création.
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-slate-700/70 bg-slate-900/80 p-5">
              <p className="mb-2 text-sm font-semibold text-slate-100">
                Tu es ton propre manager (ou presque)
              </p>
              <p className="text-xs text-slate-400">
                Sidekick te donne la structure d&apos;un bureau de prod sans t&apos;imposer une
                usine à gaz d&apos;entreprise.
              </p>
            </Card>
            <Card className="border-slate-700/70 bg-slate-900/80 p-5">
              <p className="mb-2 text-sm font-semibold text-slate-100">
                Tu jongles entre plusieurs projets
              </p>
              <p className="text-xs text-slate-400">
                Garde une vision claire par projet : sorties, tournées, cashflow, équipe,
                sans multiplier les fichiers Excel.
              </p>
            </Card>
            <Card className="border-slate-700/70 bg-slate-900/80 p-5">
              <p className="mb-2 text-sm font-semibold text-slate-100">
                Tu veux professionnaliser ta structure
              </p>
              <p className="text-xs text-slate-400">
                Prépare plus sereinement tes demandes de subventions, rendez-vous labels,
                agents ou tourneurs.
              </p>
            </Card>
          </div>
        </section>

        {/* Preuve & différenciation */}
        <section className="space-y-6 border-y border-slate-800 py-10">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
                POURQUOI SIDEKICK ?
              </p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Un outil pensé pour la réalité des artistes, pas pour les directions juridiques.
              </h2>
            </div>
            <p className="max-w-md text-xs text-slate-400">
              On part de tes questions quotidiennes : &quot;Qu&apos;est-ce que je dois relancer
              cette semaine ?&quot;, &quot;Où j&apos;en suis sur mes droits ?&quot;,
              &quot;Qu&apos;est-ce qui tombe côté cachets & royalties dans les 3 prochains
              mois ?&quot;
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-semibold">Vue 360° de ta carrière</span>
              </div>
              <p className="text-xs text-slate-400">
                Admin, live, phono, marketing, tâches et finances sont déjà structurés. Tu
                n&apos;as plus à réinventer un système.
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-semibold">Pensé &quot;carrière d&apos;artiste&quot;</span>
              </div>
              <p className="text-xs text-slate-400">
                Les modules reflètent un vrai parcours : des premiers concerts aux tournées,
                des premières syncs à un catalogue structuré.
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-semibold">Actionnable dès le jour 1</span>
              </div>
              <p className="text-xs text-slate-400">
                En 30 minutes tu peux déjà rentrer ton catalogue live, tes sorties, tes
                prochaines échéances et voir clair sur 6 mois.
              </p>
            </div>
          </div>
        </section>

        {/* Call to action final */}
        <section className="space-y-5">
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-slate-950 to-slate-950 px-6 py-6 sm:flex-row sm:items-center sm:px-8">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-200">
                PROCHAIN PAS
              </p>
              <h3 className="text-lg font-semibold sm:text-xl">
                Bloque 30 minutes pour reprendre la main sur ta carrière.
              </h3>
              <p className="max-w-xl text-xs text-emerald-50/80 sm:text-sm">
                Connecte-toi, choisis un projet, renseigne tes prochaines dates, sorties et
                échéances clés. Sidekick te montre où agir dès cette semaine.
              </p>
            </div>
            <Button
              size="lg"
              className="w-full gap-2 bg-emerald-500 text-slate-950 hover:bg-emerald-400 sm:w-auto"
              asChild
            >
              <Link href="/(auth)/login">
                Créer mon espace Sidekick
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="text-[11px] text-slate-500">
            Pas un CRM générique, pas un tableur de plus. Un espace de travail taillé pour
            les artistes qui veulent traiter leur projet comme une vraie carrière.
          </p>
        </section>
      </div>
    </main>
  );
}

