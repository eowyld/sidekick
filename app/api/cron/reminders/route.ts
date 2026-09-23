import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { escapeHtml, sendEmail } from "@/lib/brevo";
import { SITE_URL } from "@/lib/site";
import type { AdminProcedure } from "@/lib/sidekick-store";
import { applyAllRecurringRollovers } from "@/modules/admin/lib/procedure-recurrence";

/** Une démarche est rappelée quand son échéance tombe dans cette fenêtre. */
const HORIZON_DAYS = 14;

/** Deux envois ne peuvent pas se suivre à moins de 20 h, même si le cron est rejoué. */
const MIN_INTERVAL_MS = 20 * 60 * 60 * 1000;

/** Taille d'une page de lecture, égale au plafond par défaut de PostgREST. */
const PAGE_SIZE = 1000;

/** Durée maximale d'une fonction Vercel pour cette route. */
export const maxDuration = 300;

/** On cesse de démarrer de nouveaux envois passé ce délai, pour finir proprement. */
const TIME_BUDGET_MS = 240 * 1000;

/** Envois simultanés : assez pour tenir le budget, peu pour rester poli avec Brevo. */
const CONCURRENCY = 5;

/**
 * Plafond d'emails par passage. Le plan gratuit de Brevo autorise 300 envois par
 * jour, partagés avec les notifications d'inscription et le formulaire de
 * contact : on garde de la marge. Surchargeable quand le plan change.
 */
const MAX_EMAILS_PER_RUN = Number(process.env.REMINDERS_MAX_PER_RUN) || 250;

type ProcedureRow = {
  id: string;
  user_id: string;
  label: string;
  data: Record<string, unknown> | null;
};

type DueProcedure = {
  label: string;
  organisme?: string;
  dueDate: string;
  daysLeft: number;
};

function daysUntil(iso: string): number | null {
  const due = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyLabel(daysLeft: number): string {
  if (daysLeft < 0) return `en retard de ${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? "s" : ""}`;
  if (daysLeft === 0) return "aujourd'hui";
  if (daysLeft === 1) return "demain";
  return `dans ${daysLeft} jours`;
}

/**
 * GET /api/cron/reminders — digest quotidien des démarches administratives.
 *
 * C'est la seule chose qui fait revenir l'artiste sans qu'il y pense : les
 * démarches existent déjà en base avec leur échéance, mais personne ne les
 * lui signale s'il n'ouvre pas l'application.
 *
 * Déclenchée par le cron Vercel (voir vercel.json), qui envoie
 * `Authorization: Bearer $CRON_SECRET`. Sans ce secret, la route est publique
 * et n'importe qui peut déclencher des envois.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[cron/reminders] CRON_SECRET absent, exécution refusée");
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!serviceKey || !supabaseUrl) {
    console.error("[cron/reminders] configuration Supabase incomplète");
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
  }

  // Le cron lit les démarches de tous les utilisateurs : il n'a pas de session,
  // donc pas de RLS applicable. C'est le seul endroit du produit qui utilise la
  // clé de service pour parcourir plusieurs comptes.
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // PostgREST plafonne une réponse à 1 000 lignes : sans pagination, le cron
  // ignorerait silencieusement toutes les démarches au-delà.
  const rows: ProcedureRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: page, error: proceduresError } = await supabase
      .from("user_admin_procedures")
      .select("id, user_id, label, data")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (proceduresError) {
      console.error("[cron/reminders] lecture des démarches impossible", proceduresError);
      return NextResponse.json({ ok: false, error: "read_failed" }, { status: 500 });
    }

    rows.push(...((page ?? []) as ProcedureRow[]));
    if (!page || page.length < PAGE_SIZE) break;
  }

  // Fait avancer les échéances récurrentes avant de composer le digest — c'est
  // la seule exécution fiable pour l'artiste qui n'ouvre jamais
  // /admin/demarches : sans ce passage, ses rappels resteraient calés sur une
  // échéance déjà passée. Idempotent, par utilisateur (les séries ne se
  // mélangent pas entre comptes).
  const rowsByUser = new Map<string, ProcedureRow[]>();
  for (const row of rows) {
    const list = rowsByUser.get(row.user_id) ?? [];
    list.push(row);
    rowsByUser.set(row.user_id, list);
  }

  const rolledDataById = new Map<string, Record<string, unknown>>();
  for (const [, userRows] of rowsByUser) {
    const asProcedures = userRows.map(
      (row) => ({ id: row.id, label: row.label, ...(row.data ?? {}) }) as AdminProcedure
    );
    const rolled = applyAllRecurringRollovers(asProcedures);
    if (rolled === asProcedures) continue;
    rolled.forEach((p, i) => {
      if (p === asProcedures[i]) return;
      const { id, label: _label, ...rest } = p;
      void _label;
      rolledDataById.set(id, rest as Record<string, unknown>);
    });
  }

  if (rolledDataById.size > 0) {
    const updates = await Promise.all(
      [...rolledDataById.entries()].map(([id, data]) =>
        supabase.from("user_admin_procedures").update({ data }).eq("id", id)
      )
    );
    const failed = updates.filter((u) => u.error);
    if (failed.length > 0) {
      console.error("[cron/reminders] report de", failed.length, "démarche(s) échoué");
    }
    // Répercuté en mémoire pour composer le digest avec les dates à jour.
    for (const row of rows) {
      const patch = rolledDataById.get(row.id);
      if (patch) row.data = patch;
    }
  }

  // Regroupement par utilisateur : un seul email par personne, jamais un par
  // démarche — c'est la différence entre un rappel utile et du harcèlement.
  const byUser = new Map<string, DueProcedure[]>();

  for (const row of rows) {
    const data = row.data ?? {};
    if (String(data.status ?? "a_faire") === "termine") continue;

    const dueDate = typeof data.dateLimite === "string" ? data.dateLimite : null;
    if (!dueDate) continue;

    const daysLeft = daysUntil(dueDate);
    if (daysLeft === null || daysLeft > HORIZON_DAYS) continue;

    const list = byUser.get(row.user_id) ?? [];
    list.push({
      label: row.label,
      organisme: typeof data.organisme === "string" ? data.organisme : undefined,
      dueDate,
      daysLeft,
    });
    byUser.set(row.user_id, list);
  }

  if (byUser.size === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0 });
  }

  const { data: preferences, error: preferencesError } = await supabase
    .from("user_preferences")
    .select("user_id, reminders_enabled, reminders_last_sent_at")
    .in("user_id", [...byUser.keys()]);

  if (preferencesError) {
    console.error("[cron/reminders] lecture des préférences impossible", preferencesError);
    return NextResponse.json({ ok: false, error: "read_failed" }, { status: 500 });
  }

  const preferenceByUser = new Map(
    (preferences ?? []).map((p) => [p.user_id as string, p])
  );

  let sent = 0;
  let skipped = 0;
  const now = Date.now();

  // Préférences et délai minimal d'abord : ils s'appliquent sans appel réseau.
  const candidates: Array<[string, DueProcedure[]]> = [];
  for (const [userId, items] of byUser) {
    const preference = preferenceByUser.get(userId);

    // Absence de ligne = préférences par défaut, donc rappels actifs.
    if (preference && preference.reminders_enabled === false) {
      skipped += 1;
      continue;
    }

    const lastSent = preference?.reminders_last_sent_at
      ? new Date(preference.reminders_last_sent_at as string).getTime()
      : null;
    if (lastSent !== null && now - lastSent < MIN_INTERVAL_MS) {
      skipped += 1;
      continue;
    }

    candidates.push([userId, items]);
  }

  // Les plus en retard d'abord : si le plafond coupe la file, ce sont les
  // démarches les moins urgentes qui attendent le passage suivant.
  const mostUrgent = (items: DueProcedure[]) => Math.min(...items.map((i) => i.daysLeft));
  candidates.sort((a, b) => mostUrgent(a[1]) - mostUrgent(b[1]));

  const queue = candidates.slice(0, MAX_EMAILS_PER_RUN);
  const deferred = candidates.length - queue.length;

  /** Envoie le digest d'un utilisateur. `true` si le mail est parti. */
  async function remind(userId: string, items: DueProcedure[]): Promise<boolean> {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    const email = userData?.user?.email;
    if (userError || !email) {
      console.error("[cron/reminders] email introuvable", userId, userError);
      return false;
    }

    items.sort((a, b) => a.daysLeft - b.daysLeft);

    const late = items.filter((i) => i.daysLeft < 0).length;
    const subject =
      late > 0
        ? `${late} démarche${late > 1 ? "s" : ""} en retard`
        : `${items.length} démarche${items.length > 1 ? "s" : ""} à venir`;

    const text = items
      .map((i) => `- ${i.label}${i.organisme ? ` (${i.organisme})` : ""} — ${urgencyLabel(i.daysLeft)}`)
      .join("\n");

    const html = `
      <p>Voici tes démarches administratives à traiter.</p>
      <ul>
        ${items
          .map(
            (i) =>
              `<li><strong>${escapeHtml(i.label)}</strong>${
                i.organisme ? ` — ${escapeHtml(i.organisme)}` : ""
              } · ${escapeHtml(urgencyLabel(i.daysLeft))}</li>`
          )
          .join("")}
      </ul>
      <p><a href="${SITE_URL}/admin/demarches">Voir mes démarches</a></p>
      <p style="color:#888;font-size:12px">
        Pour ne plus recevoir ces rappels : Réglages &gt; Notifications.
      </p>
    `;

    const result = await sendEmail({
      to: email,
      subject: `SIDEKICK — ${subject}`,
      text: `${text}\n\n${SITE_URL}/admin/demarches`,
      html,
    });

    if (!result.ok) return false;

    // Horodaté seulement après un envoi réussi : un échec doit pouvoir être
    // rattrapé au passage suivant.
    await supabase
      .from("user_preferences")
      .upsert({
        user_id: userId,
        reminders_last_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    return true;
  }

  // Envois en parallèle borné, avec un budget de temps : une file trop longue
  // s'arrête proprement au lieu d'être coupée net par Vercel en plein envoi.
  const startedAt = Date.now();
  let cursor = 0;
  async function worker() {
    while (cursor < queue.length) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) return;
      const [userId, items] = queue[cursor++];
      if (await remind(userId, items)) sent += 1;
      else skipped += 1;
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Ni envoyés ni ignorés : ils restent éligibles, faute d'horodatage.
  const remaining = deferred + (queue.length - cursor);
  if (remaining > 0) {
    console.warn(
      `[cron/reminders] ${remaining} utilisateur(s) non traité(s) ce passage (plafond ${MAX_EMAILS_PER_RUN}, budget ${TIME_BUDGET_MS / 1000}s)`
    );
  }

  return NextResponse.json({ ok: true, sent, skipped, remaining });
}
