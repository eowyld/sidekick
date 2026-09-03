import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { escapeHtml, sendEmail } from "@/lib/brevo";

/** Une démarche est rappelée quand son échéance tombe dans cette fenêtre. */
const HORIZON_DAYS = 14;

/** Deux envois ne peuvent pas se suivre à moins de 20 h, même si le cron est rejoué. */
const MIN_INTERVAL_MS = 20 * 60 * 60 * 1000;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://sidekick.tools";

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

  const { data: procedures, error: proceduresError } = await supabase
    .from("user_admin_procedures")
    .select("id, user_id, label, data");

  if (proceduresError) {
    console.error("[cron/reminders] lecture des démarches impossible", proceduresError);
    return NextResponse.json({ ok: false, error: "read_failed" }, { status: 500 });
  }

  // Regroupement par utilisateur : un seul email par personne, jamais un par
  // démarche — c'est la différence entre un rappel utile et du harcèlement.
  const byUser = new Map<string, DueProcedure[]>();

  for (const row of (procedures ?? []) as ProcedureRow[]) {
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

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    const email = userData?.user?.email;
    if (userError || !email) {
      console.error("[cron/reminders] email introuvable", userId, userError);
      skipped += 1;
      continue;
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
        Pour ne plus recevoir ces rappels : Réglages &gt; Personnalisation.
      </p>
    `;

    const result = await sendEmail({
      to: email,
      subject: `SIDEKICK — ${subject}`,
      text: `${text}\n\n${SITE_URL}/admin/demarches`,
      html,
    });

    if (!result.ok) {
      skipped += 1;
      continue;
    }

    // Horodaté seulement après un envoi réussi : un échec doit pouvoir être
    // rattrapé au passage suivant.
    await supabase
      .from("user_preferences")
      .upsert({
        user_id: userId,
        reminders_last_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    sent += 1;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
