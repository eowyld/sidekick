import { FAQ_ITEMS } from "./faqData";
import { SITE_URL } from "@/lib/site";

/**
 * Bloc FAQ visible — pas d'accordéon : chaque réponse est dans le DOM au
 * chargement, sinon elle n'est ni indexée ni extraite par les assistants.
 * Chaque question est un <h3> (elle s'insère sous le <h1> de la page).
 */
export function FaqSection() {
  return (
    <div className="space-y-8">
      {FAQ_ITEMS.map((item) => (
        <div key={item.q}>
          <h3 className="font-display text-lg leading-snug sm:text-xl">
            {item.q}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#f5f5f5]/70">
            {item.a}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * Balisage `FAQPage` — co-localisé avec le bloc visible ci-dessus, jamais dans
 * un layout partagé : le JSON-LD ne doit apparaître que sur une page dont le
 * contenu principal est cette FAQ, et son texte doit reprendre mot pour mot les
 * réponses affichées (d'où la source commune `FAQ_ITEMS`).
 *
 * Le JSON est passé en enfant texte du <script> plutôt qu'en
 * `dangerouslySetInnerHTML` : les réponses ne contiennent ni `<` ni `&`, donc
 * l'échappement React ne les altère pas et on évite l'API risquée.
 */
export function FaqJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}/faq#faq`,
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  return (
    <script type="application/ld+json">{JSON.stringify(data)}</script>
  );
}
