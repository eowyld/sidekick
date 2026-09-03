import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { siretDigitsOnly } from "@/modules/admin/lib/siret";
import { mapRechercheEntreprisesJson } from "@/modules/admin/lib/recherche-entreprises-siret";

/**
 * Interroge l’API publique Recherche d’entreprises (data.gouv) pour pré-remplir une fiche statut.
 * Doc : https://api.gouv.fr/documentation/api-recherche-entreprises
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // L'API publique data.gouv est appelée en notre nom : on ne veut pas être
    // celui qui la martèle, ni se faire limiter côté amont.
    const limit = rateLimit({
      key: `siret:${user.id}`,
      limit: 30,
      windowMs: 60 * 1000,
    });
    if (!limit.allowed) {
      return tooManyRequests(limit.retryAfter);
    }

    const siretParam = req.nextUrl.searchParams.get("siret") ?? "";
    const digits = siretDigitsOnly(siretParam);
    if (digits.length !== 14) {
      return NextResponse.json({ error: "SIRET : 14 chiffres requis" }, { status: 400 });
    }

    const url = new URL("https://recherche-entreprises.api.gouv.fr/search");
    url.searchParams.set("q", digits);
    url.searchParams.set("page", "1");
    url.searchParams.set("per_page", "25");

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[siret-annuaire] upstream", res.status, text.slice(0, 200));
      return NextResponse.json({ error: "Annuaire indisponible" }, { status: 502 });
    }

    const json: unknown = await res.json();
    const mapped = mapRechercheEntreprisesJson(json, digits);
    if (!mapped.ok) {
      const messages: Record<typeof mapped.reason, string> = {
        not_found: "Aucun établissement trouvé pour ce SIRET.",
        non_diffusible:
          "Entité non diffusible : l’annuaire public ne permet pas de pré-remplir cette fiche.",
        no_exploitable_data:
          "Aucune donnée exploitable renvoyée pour ce SIRET (champs masqués ou incomplets).",
      };
      return NextResponse.json({ error: messages[mapped.reason] }, { status: 404 });
    }

    return NextResponse.json(mapped.data);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[siret-annuaire]", message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
