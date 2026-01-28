import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardPage() {
  // TODO: remplacer les données mockées par de vraies données
  // depuis les modules Tâches et Calendrier (Supabase).
  const todaysTasks = [
    { id: 1, title: "Envoyer facture concert Paris", due: "Aujourd’hui" },
    { id: 2, title: "Relancer label pour single", due: "Demain" }
  ];

  const upcomingEvents = [
    { id: 1, title: "Concert – Marseille", date: "Samedi 20/02" },
    { id: 2, title: "Session studio – Mix EP", date: "Lundi 23/02" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">
          Tableau de bord
        </h1>
        <p className="text-sm text-muted-foreground">
          Vue rapide sur ce qui demande ton attention aujourd’hui.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tâches du jour</CardTitle>
          </CardHeader>
          <CardContent>
            {todaysTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune tâche urgente pour aujourd’hui.
              </p>
            ) : (
              <ul className="space-y-2">
                {todaysTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm"
                  >
                    <span className="line-clamp-2">{task.title}</span>
                    <span className="ml-3 text-xs text-muted-foreground">
                      {task.due}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Événements à venir</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun événement planifié dans le calendrier.
              </p>
            ) : (
              <ul className="space-y-2">
                {upcomingEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm"
                  >
                    <span className="line-clamp-2">{event.title}</span>
                    <span className="ml-3 text-xs text-muted-foreground">
                      {event.date}
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

