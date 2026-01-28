export function LiveOverviewPage() {
  return (
    <div className="p-6 space-y-2">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Live</h1>
      <p className="text-sm text-muted-foreground">
        Module live réinitialisé. Nous allons y reconstruire tournée, répétitions et prospection.
      </p>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function LiveOverviewPage() {
  // TODO: remplacer ces données mockées par de vraies données (Supabase)
  const nextShows = [
    { id: 1, city: "Paris", venue: "La Cigale", date: "Ven 14/03", status: "Confirmé" },
    { id: 2, city: "Lyon", venue: "Le Transbordeur", date: "Sam 22/03", status: "En option" }
  ];

  const upcomingRehearsals = [
    { id: 1, label: "Répétition set festival", date: "Lun 10/03", location: "Studio Bleu – 2h" },
    { id: 2, label: "Balance son + lumière", date: "Jeu 13/03", location: "Salle – 1h" }
  ];

  const prospectionStatus = {
    contacted: 18,
    inDiscussion: 5,
    confirmed: 3
  };

  const equipmentAlerts = [
    { id: 1, label: "Réparer footswitch ampli guitare", priority: "Haute" },
    { id: 2, label: "Vérifier stock piles / in-ears", priority: "Moyenne" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Live – vue d&apos;ensemble</h1>
        <p className="text-sm text-muted-foreground">
          Synthèse rapide de ta tournée : dates, répétitions, prospection et matériel.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Prochaines dates</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild>
              <a href="/live/dates-de-tournee">Voir le calendrier</a>
            </Button>
          </CardHeader>
          <CardContent>
            {nextShows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune date à venir. Commence par ajouter une tournée.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {nextShows.map((show) => (
                  <li
                    key={show.id}
                    className="flex items-center justify-between rounded-md bg-muted px-3 py-2"
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium">
                        {show.city} – {show.venue}
                      </p>
                      <p className="text-xs text-muted-foreground">{show.date}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {show.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Répétitions à venir</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild>
              <a href="/live/repetitions">Gérer les répétitions</a>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingRehearsals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune répétition prévue. Planifie-en une avant la prochaine date.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {upcomingRehearsals.map((rehearsal) => (
                  <li
                    key={rehearsal.id}
                    className="flex items-center justify-between rounded-md bg-muted px-3 py-2"
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium">{rehearsal.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {rehearsal.date} • {rehearsal.location}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Prospection tournée</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild>
              <a href="/live/prospection">Ouvrir la prospection</a>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Lieux contactés</p>
                <p className="text-lg font-semibold">{prospectionStatus.contacted}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">En discussion</p>
                <p className="text-lg font-semibold">{prospectionStatus.inDiscussion}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Confirmés</p>
                <p className="text-lg font-semibold">{prospectionStatus.confirmed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Matériel & alertes</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild>
              <a href="/live/materiel">Voir le matériel</a>
            </Button>
          </CardHeader>
          <CardContent>
            {equipmentAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun problème signalé sur le matériel.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {equipmentAlerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="flex items-center justify-between rounded-md bg-muted px-3 py-2"
                  >
                    <span className="line-clamp-2">{alert.label}</span>
                    <span className="ml-3 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                      {alert.priority}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

