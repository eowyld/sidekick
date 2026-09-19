import { emptyTechnical } from "@/modules/live/lib/live-model";
import type { Sector } from "@/hooks/usePreferencesData";

/**
 * Jeu de données de démonstration.
 *
 * Règle juridique : aucune entité réelle nommée. Artiste, salles, labels,
 * studios, employeurs et contacts sont inventés. Les villes sont réelles (ce
 * sont des faits géographiques) et les organismes publics — URSSAF, SACEM,
 * France Travail — sont cités parce que le produit les nomme déjà dans ses
 * démarches administratives : ce sont des mentions descriptives, pas une
 * revendication d'affiliation. Aucun distributeur ni plateforme de streaming
 * n'est nommé : les revenus sont ventilés par canal générique.
 */

export const DEMO_ARTIST = "Nova Lumen";

/** Décale une date de N jours par rapport à aujourd'hui, au format ISO court. */
export function dayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Décale une date de N jours, au format `jj/mm/aaaa`.
 * À utiliser pour les colonnes texte que l'app écrit en date française
 * (`user_tour_dates.date`, `user_rehearsals.date`) : le module Live et le
 * calendrier parsent ces champs en `jj/mm/aaaa`, pas en ISO.
 */
export function dayOffsetFr(days: number): string {
  const [y, m, d] = dayOffset(days).split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Date d'un jour de la semaine courante (lundi → dimanche), au format ISO court.
 * `weekday` : 1 = lundi … 7 = dimanche. Le tableau de bord borne « cette
 * semaine » du lundi au dimanche ; ces ancres garantissent qu'un compte rempli
 * a toujours quelques entrées dans ce créneau, quel que soit le jour du seed.
 */
export function thisWeek(weekday: number): string {
  const d = new Date();
  const offsetToMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offsetToMonday + (weekday - 1));
  return d.toISOString().slice(0, 10);
}

/** Idem `thisWeek`, au format `jj/mm/aaaa` (champs texte de Live / calendrier). */
export function thisWeekFr(weekday: number): string {
  const [y, m, d] = thisWeek(weekday).split("-");
  return `${d}/${m}/${y}`;
}

/** Renvoie « YYYY-MM » pour le mois courant décalé de N mois. */
function monthOffset(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 7);
}

export type SeedRow = Record<string, unknown> & { id: string };

/** Tables toujours peuplées, quels que soient les secteurs choisis. */
export function commonRows() {
  return {
    user_contacts: [
      {
        id: "demo-contact-1",
        first_name: "Camille",
        last_name: "Verane",
        role: "Programmateur",
        city: "Nantes",
        email: "camille.verane@exemple.fr",
        phone: "",
        instagram: "",
        notes: "Rencontrée en festival. Relancer pour la saison prochaine.",
        created_at: dayOffset(-120),
      },
      {
        id: "demo-contact-2",
        first_name: "Otto",
        last_name: "Brenner",
        role: "Ingénieur du son",
        city: "Lyon",
        email: "otto.brenner@exemple.fr",
        phone: "",
        instagram: "",
        notes: "Mix et mastering. Dispo en semaine.",
        created_at: dayOffset(-95),
      },
      {
        id: "demo-contact-3",
        first_name: "Salomé",
        last_name: "Ravier",
        role: "Attachée de presse",
        city: "Paris",
        email: "salome.ravier@exemple.fr",
        phone: "",
        instagram: "",
        notes: "A couvert la dernière sortie.",
        created_at: dayOffset(-60),
      },
      {
        id: "demo-contact-4",
        first_name: "Nils",
        last_name: "Achard",
        role: "Éditeur",
        city: "Paris",
        email: "nils.achard@exemple.fr",
        phone: "",
        instagram: "",
        notes: "Discussion en cours sur le catalogue.",
        created_at: dayOffset(-40),
      },
    ] as SeedRow[],

    user_tasks: [
      {
        id: "demo-task-1",
        title: "Envoyer les fichiers masterisés",
        status: "todo",
        today_focus: true,
        description: "Version finale + instrumental, avant la date de sortie.",
        deadline: dayOffset(3),
        sector: "Phono",
        created_at: dayOffset(-5),
        subtasks: [
          { id: "demo-st-1", title: "Vérifier le niveau LUFS", done: true },
          { id: "demo-st-2", title: "Exporter l'instrumental", done: false },
        ],
      },
      {
        id: "demo-task-2",
        title: "Déclaration trimestrielle URSSAF",
        status: "todo",
        today_focus: false,
        description: "Chiffre d'affaires du trimestre écoulé.",
        deadline: dayOffset(12),
        sector: "Admin",
        created_at: dayOffset(-8),
        subtasks: [],
      },
      {
        id: "demo-task-3",
        title: "Relancer la facture du festival",
        status: "todo",
        today_focus: true,
        description: "Échéance dépassée de deux semaines.",
        deadline: dayOffset(-4),
        sector: "Revenus",
        created_at: dayOffset(-30),
        subtasks: [],
      },
      {
        id: "demo-task-4",
        title: "Préparer le dossier de subvention",
        status: "todo",
        today_focus: false,
        description: "Budget prévisionnel et note d'intention.",
        deadline: dayOffset(25),
        sector: "Admin",
        created_at: dayOffset(-2),
        subtasks: [
          { id: "demo-st-3", title: "Budget prévisionnel", done: false },
          { id: "demo-st-4", title: "Note d'intention", done: false },
        ],
      },
    ] as SeedRow[],

    user_invoices: [
      {
        id: "demo-invoice-1",
        number: "2026-014",
        client: "Association Les Grands Vents",
        subject: "Concert du 14 mars",
        amount: "800",
        due_date: dayOffset(-18),
        status: "en_attente",
        income_type: "cachet",
        lines: [{ label: "Cachet artistique", quantity: 1, unitPrice: 800 }],
        notes: "",
        created_at: new Date().toISOString(),
      },
      {
        id: "demo-invoice-2",
        number: "2026-013",
        client: "Studio Meridian",
        subject: "Session d'enregistrement",
        amount: "450",
        due_date: dayOffset(-55),
        status: "payee",
        income_type: "prestation",
        encaissement_date: dayOffset(-48),
        lines: [{ label: "Prestation studio", quantity: 1, unitPrice: 450 }],
        notes: "",
        created_at: new Date().toISOString(),
      },
      {
        id: "demo-invoice-3",
        number: "2026-015",
        client: "Le Silo",
        subject: "Résidence de création",
        amount: "1200",
        due_date: thisWeek(5),
        status: "en_attente",
        income_type: "cachet",
        lines: [{ label: "Résidence, 4 jours", quantity: 4, unitPrice: 300 }],
        notes: "",
        created_at: new Date().toISOString(),
      },
    ] as SeedRow[],

    user_intermittence_missions: [
      {
        id: "demo-mission-1",
        date: dayOffset(-45),
        employer: "Association Les Grands Vents",
        type: "Concert",
        hours: 8,
        gross_amount: 420,
        charges: 96,
        net_amount: 324,
        notes: "",
      },
      {
        id: "demo-mission-2",
        date: dayOffset(-20),
        employer: "Le Petit Phare",
        type: "Répétition rémunérée",
        hours: 6,
        gross_amount: 300,
        charges: 69,
        net_amount: 231,
        notes: "",
      },
    ] as SeedRow[],

    user_admin_statuses: [
      {
        id: "demo-status-1",
        nom: "Auto-entrepreneur",
        type: "auto_entrepreneur",
        actif: true,
        date_debut: dayOffset(-400),
        notes: "Activité de prestation musicale.",
        data: {},
      },
      {
        id: "demo-status-2",
        nom: "Intermittent du spectacle",
        type: "intermittent",
        actif: true,
        date_debut: dayOffset(-250),
        notes: "Annexe 10.",
        data: {},
      },
    ] as SeedRow[],

    user_admin_procedures: [
      {
        id: "demo-procedure-1",
        label: "Déclaration trimestrielle URSSAF",
        data: { statut: "a_faire", echeance: dayOffset(12) },
      },
      {
        id: "demo-procedure-2",
        label: "Actualisation France Travail",
        data: { statut: "a_faire", echeance: dayOffset(6) },
      },
      {
        id: "demo-procedure-3",
        label: "Déclaration des œuvres à la SACEM",
        data: { statut: "fait", echeance: dayOffset(-30) },
      },
    ] as SeedRow[],
  };
}

/** Douze mois de revenus, pour que les graphes aient une histoire à raconter. */
export function royaltyRows(): SeedRow[] {
  const canaux = ["Streaming", "Téléchargement", "Playlist éditoriale"];
  const rows: SeedRow[] = [];

  for (let i = 11; i >= 0; i--) {
    const period = monthOffset(-i);
    canaux.forEach((store, idx) => {
      // Progression lente avec une pointe au 4e mois : une courbe plate
      // ne montrerait pas l'intérêt du graphe d'évolution.
      const base = 18 + (11 - i) * 3.5;
      const pic = i === 4 ? 120 : 0;
      const revenue = Number((base / (idx + 1) + pic / (idx + 1)).toFixed(2));

      rows.push({
        id: `demo-royalty-${period}-${idx}`,
        distributor: "manual",
        period,
        store,
        country: "FR",
        track_title: idx === 0 ? "Vertige" : "Halo",
        album: "Premières Lueurs",
        isrc: "",
        streams: Math.round(revenue * 240),
        revenue,
        currency: "EUR",
      });
    });
  }

  return rows;
}

/** Tables peuplées seulement si le secteur correspondant est coché. */
export function sectorRows(sector: Sector) {
  if (sector === "live") {
    const setlist = [
      { id: "demo-set-1", title: "Vertige", artist: DEMO_ARTIST, duration: "3:40", note: "Ouverture, lumière progressive." },
      { id: "demo-set-2", title: "Premières Lueurs", artist: DEMO_ARTIST, duration: "4:15", note: "Enchaîner sans pause." },
      { id: "demo-set-3", title: "À contretemps", artist: DEMO_ARTIST, duration: "3:50", note: "Final, interaction public." },
    ];
    const technical = { ...emptyTechnical(), team: "Chant, guitare, claviers / machines", sound: "2 micros voix, 2 DI stéréo, 2 retours de scène", contact: "Contact régie à confirmer", stage: "Espace 5 × 4 m minimum", supplied: "Guitare, pédalier et machines", provided: "Diffusion, micros et retours" };
    return {
      user_live_productions: [
        { id: "demo-live-show", title: "Premières Lueurs — Live", kind: "show", data: { description: "Un live entre chanson et textures électroniques.", setlist, technical, equipmentListIds: ["demo-live-kit"], preparation: { concept: "done", setlist: "done", team: "done", technical: "done" } } },
        { id: "demo-live-dj", title: "Afterglow — DJ set", kind: "dj", data: { description: "Une progression house et electronica pour la fin de soirée.", setlist: [], technical: emptyTechnical(), equipmentListIds: [], preparation: { concept: "done" } } },
        { id: "demo-live-tour", title: "La tournée des premières lueurs", kind: "tour", data: { description: "Trois villes pour faire vivre le spectacle.", productionId: "demo-live-show", setlist: [], technical, equipmentListIds: ["demo-live-kit"], preparation: { booking: "done" } } },
      ] as SeedRow[],
      user_equipment_lists: [{ id: "demo-live-kit", name: "Configuration concert", description: "Le nécessaire pour le spectacle Premières Lueurs", item_ids: ["demo-equip-1", "demo-equip-2", "demo-equip-3"] }] as SeedRow[],
      user_tour_dates: [
        {
          id: "demo-date-1",
          details: { productionId: "demo-live-show", tourId: "demo-live-tour", setlist, technical, equipmentListIds: ["demo-live-kit"], preparation: { schedule: "done", transport: "done", technical: "done", payment: "done" }, transports: [{ id: "demo-transport", type: "train", amount: "45", paymentMode: "self", details: "Arrivée à Nantes à 14h30." }] },
          city: "Nantes",
          venue: "Le Silo",
          date: thisWeekFr(6),
          status: "Signée",
          address: "Nantes",
          organisateur: "Association Les Grands Vents",
          note: "Balances à 16h.",
          transport: true,
          lodging: true,
          remuneration: true,
          equipment: false,
          timetable: [],
          invoice_ids: [],
          mission_ids: [],
        },
        {
          id: "demo-date-2",
          city: "Lyon",
          venue: "La Verrière",
          date: dayOffsetFr(32),
          status: "Confirmée",
          address: "Lyon",
          organisateur: "Scène Croix-Rousse",
          note: "",
          transport: true,
          lodging: false,
          remuneration: true,
          equipment: false,
          timetable: [],
          invoice_ids: [],
          mission_ids: [],
        },
        {
          id: "demo-date-3",
          city: "Bordeaux",
          venue: "Le Petit Phare",
          date: dayOffsetFr(54),
          status: "En option",
          address: "Bordeaux",
          organisateur: "",
          note: "Dossier envoyé, en attente de réponse.",
          transport: false,
          lodging: false,
          remuneration: false,
          equipment: false,
          timetable: [],
          invoice_ids: [],
          mission_ids: [],
        },
        {
          id: "demo-date-4",
          city: "Paris",
          venue: "Salle des Ondes",
          date: dayOffsetFr(-25),
          status: "Signée",
          address: "Paris",
          organisateur: "Salle des Ondes",
          note: "Complet.",
          transport: true,
          lodging: false,
          remuneration: true,
          equipment: true,
          timetable: [],
          invoice_ids: [],
          mission_ids: [],
        },
      ] as SeedRow[],

      user_rehearsals: [
        {
          id: "demo-rehearsal-1",
          details: { productionId: "demo-live-show", setlist, technical, equipmentListIds: ["demo-live-kit"], goals: "Travailler les transitions et le final du concert.", endTime: "17:00" },
          label: "Filage avant tournée",
          date: thisWeekFr(3),
          time: "14:00",
          location: "Local de répétition",
          city: "Nantes",
          address: "",
          note: "Passer le nouveau morceau en fin de set.",
          remunerations: [],
          equipments: [],
        },
        {
          id: "demo-rehearsal-2",
          label: "Répétition technique",
          date: dayOffsetFr(11),
          time: "18:30",
          location: "Local de répétition",
          city: "Nantes",
          address: "",
          note: "",
          remunerations: [],
          equipments: [],
        },
      ] as SeedRow[],

      user_equipment_inventory: [
        { id: "demo-equip-1", name: "Guitare électrique", quantity: 1, condition: "bon", comment: "" },
        { id: "demo-equip-2", name: "Pédalier d'effets", quantity: 1, condition: "bon", comment: "" },
        { id: "demo-equip-3", name: "Câbles jack 6m", quantity: 6, condition: "moyen", comment: "En racheter deux." },
        { id: "demo-equip-4", name: "Retour de scène", quantity: 2, condition: "bon", comment: "" },
      ] as SeedRow[],
    };
  }

  if (sector === "phono") {
    return {
      user_phono_tracks: [
        {
          id: "demo-track-1",
          title: "Vertige",
          main_artist: DEMO_ARTIST,
          role: "artiste_principal",
          guest_artists: [],
          isrc: "FRXXX2600001",
          release_date: dayOffset(-180),
          self_produced: true,
          label: "Halo Records",
          editor: "",
          versions: [],
          genre: "Pop alternative",
          distribution: "",
          notes: "",
          status: "publie",
          linked_work_id: "demo-work-1",
        },
        {
          id: "demo-track-2",
          title: "Halo",
          main_artist: DEMO_ARTIST,
          role: "artiste_principal",
          guest_artists: [],
          isrc: "FRXXX2600002",
          release_date: dayOffset(-90),
          self_produced: true,
          label: "Halo Records",
          editor: "",
          versions: [],
          genre: "Pop alternative",
          distribution: "",
          notes: "",
          status: "publie",
          linked_work_id: null,
        },
        {
          id: "demo-track-3",
          title: "Le Fil",
          main_artist: DEMO_ARTIST,
          role: "artiste_principal",
          guest_artists: ["Otto Brenner"],
          isrc: "",
          release_date: dayOffset(45),
          self_produced: true,
          label: "",
          editor: "",
          versions: [],
          genre: "Pop alternative",
          distribution: "",
          notes: "Mix en cours.",
          status: "en_production",
          linked_work_id: null,
        },
      ] as SeedRow[],

      user_phono_sessions: [
        {
          id: "demo-session-1",
          title: "Prise de voix — Le Fil",
          date: thisWeek(2),
          time: "10:00",
          location: "Studio Meridian",
          address: "Lyon",
          session_type: "prise",
          participants: [{ name: "Otto Brenner", role: "Ingénieur du son" }],
          note: "",
        },
        {
          id: "demo-session-2",
          title: "Mix — Halo",
          date: dayOffset(-70),
          time: "14:00",
          location: "Studio Meridian",
          address: "Lyon",
          session_type: "mix",
          participants: [{ name: "Otto Brenner", role: "Ingénieur du son" }],
          note: "",
        },
      ] as SeedRow[],
    };
  }

  return {
    user_edition_works: [
      {
        id: "demo-work-1",
        artist_name: DEMO_ARTIST,
        title: "Vertige",
        status: "registered-sacem",
        // Formes internes (blobs JSONB passés tels quels) : voir les types
        // Person / SplitEntry / SacemRepartition dans src/lib/sidekick-store.ts.
        persons: [
          { id: "demo-person-1", firstName: "", name: DEMO_ARTIST, pseudonym: "", roles: ["author", "composer"] },
          { id: "demo-person-2", firstName: "Otto", name: "Brenner", pseudonym: "", roles: ["arranger"] },
        ],
        dep_repartition: { authors: 33.33, composers: 33.34, publishers: 33.33 },
        drm_repartition: { authors: 25, composers: 25, publishers: 50 },
        splits_authors: [{ personId: "demo-person-1", pct: 100 }],
        splits_composers: [
          { personId: "demo-person-1", pct: 66.66 },
          { personId: "demo-person-2", pct: 33.34 },
        ],
        self_published: false,
        external_publishers: [
          { id: "demo-pub-1", name: "Perce-Neige Éditions", coad: "", pct: 100 },
        ],
        iswc: "",
        first_exploitation_date: dayOffset(-180),
        genre: "Pop alternative",
        duration: "3:42",
        files: {},
        exploitation_types: ["streaming", "live"],
        first_broadcaster: "",
        worldwide_rights: true,
        territories: [],
        notes: "",
        linked_track_ids: ["demo-track-1"],
      },
      {
        id: "demo-work-2",
        artist_name: DEMO_ARTIST,
        title: "Le Fil",
        status: "in-progress",
        persons: [
          { id: "demo-person-1", firstName: "", name: DEMO_ARTIST, pseudonym: "", roles: ["author", "composer"] },
        ],
        dep_repartition: { authors: 50, composers: 50, publishers: 0 },
        drm_repartition: { authors: 50, composers: 50, publishers: 0 },
        splits_authors: [{ personId: "demo-person-1", pct: 100 }],
        splits_composers: [{ personId: "demo-person-1", pct: 100 }],
        self_published: true,
        external_publishers: [],
        iswc: "",
        first_exploitation_date: "",
        genre: "Pop alternative",
        duration: "4:05",
        files: {},
        exploitation_types: ["streaming"],
        first_broadcaster: "",
        worldwide_rights: true,
        territories: [],
        notes: "Déclaration à faire après la sortie.",
        linked_track_ids: [],
      },
    ] as SeedRow[],
  };
}

/** Événements de calendrier propres au seed (les modules alimentent le reste). */
export function calendarRows(sectors: Sector[]) {
  const rows: (Record<string, unknown> & { id: string })[] = [
    {
      id: "demo-cal-1",
      date: thisWeek(4),
      end_date: thisWeek(4),
      time: "11:00",
      label: "Rendez-vous éditeur",
      sub_label: "Point sur le catalogue",
      sector: "Édition",
      type: "rendez-vous",
      place: "Paris",
      source_module: "custom",
    },
    {
      id: "demo-cal-2",
      date: dayOffset(16),
      end_date: dayOffset(16),
      time: "09:30",
      label: "Envoi du dossier de subvention",
      sub_label: "",
      sector: "Admin",
      type: "echeance",
      place: "",
      source_module: "custom",
    },
  ];

  if (sectors.includes("phono")) {
    rows.push({
      id: "demo-cal-3",
      date: dayOffset(45),
      end_date: dayOffset(45),
      time: "00:00",
      label: "Sortie — Le Fil",
      sub_label: "Single",
      sector: "Phono",
      type: "sortie",
      place: "",
      source_module: "custom",
    });
  }

  return rows;
}
