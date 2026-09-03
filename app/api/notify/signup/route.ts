import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { escapeHtml, sendEmail } from "@/lib/brevo";

/** Destinataire de la notification : le fondateur. */
const NOTIFY_TO = process.env.SIGNUP_NOTIFY_TO?.trim() || "eliott.matton@gmail.com";

const SECTOR_LABELS: Record<string, string> = {
  live: "Live",
  phono: "Phono",
  edition: "Édition",
};

/**
 * La notification n'a de sens que dans la foulée d'une inscription. Passé ce
 * délai depuis la création du compte, on refuse : sans cette borne, n'importe
 * quel compte connecté pourrait rappeler la route en boucle et noyer la boîte
 * du fondateur comme le quota Brevo.
 *
 * On se base sur `created_at` de la session, et non sur `onboarding_completed_at` :
 * le client n'attend pas la fin de l'écriture des préférences avant d'appeler
 * cette route, et la course ferait perdre la notification.
 *
 * Cela borne la fenêtre, pas le nombre d'appels à l'intérieur — le vrai
 * limiteur de débit arrive avec le durcissement des routes API le 07/09.
 */
const NOTIFY_WINDOW_MS = 60 * 60 * 1000;


/**
 * POST /api/notify/signup — prévient le fondateur qu'un compte vient d'être
 * créé et configuré.
 *
 * Appelé à la fin de l'onboarding, seul moment où l'email ET les secteurs sont
 * connus. L'identité vient de la session côté serveur, jamais du corps de la
 * requête : un client ne doit pas pouvoir déclencher une notification au nom
 * de quelqu'un d'autre.
 *
 * Renvoie toujours 200 en cas d'échec d'envoi : l'onboarding de l'utilisateur
 * ne doit jamais dépendre de la disponibilité de Brevo.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const createdAt = user.created_at ? new Date(user.created_at).getTime() : null;
  if (createdAt === null || Date.now() - createdAt > NOTIFY_WINDOW_MS) {
    return NextResponse.json({ ok: false, error: "outside_signup_window" }, { status: 429 });
  }

  let sectors: string[] = [];
  let demoData = false;
  try {
    const body = (await request.json()) as {
      sectors?: unknown;
      demoData?: unknown;
    };
    if (Array.isArray(body.sectors)) {
      sectors = body.sectors.filter((s): s is string => typeof s === "string");
    }
    demoData = body.demoData === true;
  } catch {
    /* corps absent ou illisible : on notifie quand même, sans les secteurs */
  }

  const fullName =
    (user.user_metadata?.full_name as string | undefined)?.trim() || "—";
  const sectorLabels =
    sectors.length > 0
      ? sectors.map((s) => SECTOR_LABELS[s] ?? s).join(", ")
      : "aucun";
  const signedUpAt = new Date().toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
  });

  const lines = [
    `Email : ${user.email ?? "—"}`,
    `Nom : ${fullName}`,
    `Secteurs : ${sectorLabels}`,
    `Données d'exemple : ${demoData ? "oui" : "non"}`,
    `Inscrit le : ${signedUpAt} (heure de Paris)`,
  ];

  const result = await sendEmail({
    to: NOTIFY_TO,
    subject: `Nouvel inscrit — ${user.email ?? "compte créé"}`,
    text: lines.join("\n"),
    html: `<ul>${lines
      .map((l) => `<li>${escapeHtml(l)}</li>`)
      .join("")}</ul><p>Réponds directement à cet email pour lui écrire.</p>`,
    replyTo: user.email ?? undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason });
  }

  return NextResponse.json({ ok: true });
}
