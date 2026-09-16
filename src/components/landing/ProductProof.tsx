/**
 * Section « différenciation » : en alpha, aucun chiffre d'usage ni témoignage
 * n'est réel, donc on ne joue pas la preuve sociale. On tient trois arguments
 * qu'un outil pensé ailleurs ne sort pas — l'intermittence et les statuts
 * français, les clés de répartition SACEM, l'hébergement UE.
 *
 * La carte Factur-X a été retirée le 16/09 : la facturation électronique est
 * repoussée à la bêta et aucun export n'existe dans le code. Annoncer un format
 * qu'on ne produit pas est une pratique commerciale trompeuse (art. L121-2 du
 * Code de la consommation). Ne pas la remettre avant que l'export tourne.
 *
 * Chaque carte doit renvoyer à quelque chose d'ouvert dans le périmètre alpha :
 * les clés DEP/DRM sont calculées dans `WorksPage.tsx`, page ouverte. Ne pas y
 * mettre `/edition/sync`, qui est fermée.
 *
 * Le chapô n'argumente pas : le sur-titre et le titre affirment déjà « pensé
 * d'ici, pour le marché français », et une troisième affirmation du même ordre
 * sonnait creux. Il énumère puis annonce les cartes, rien de plus.
 */
const FACTS = [
  {
    value: "URSSAF",
    label: "droits, charges et statuts",
    detail:
      "Heures d'intermittence, statuts juridiques, échéances URSSAF et France Travail, suivis au même endroit que tes revenus.",
  },
  {
    value: "SACEM",
    label: "clés de répartition",
    detail:
      "Tes œuvres, tes co-auteurs et tes clés DEP et DRM calculées selon le barème.",
  },
  {
    value: "UE",
    label: "hébergement",
    detail:
      "Tes données restent en Europe, exportables sur simple demande.",
  },
];

export function ProductProof() {
  return (
    <section className="border-b border-[rgba(245,245,245,0.12)] py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
            Pensé d&apos;ici
          </p>
          <h2 className="font-display text-3xl sm:text-4xl">
            FAIT POUR LA RÉALITÉ DU{" "}
            <span className="text-[#F0FF00]">MARCHÉ FRANÇAIS.</span>
          </h2>
          <p className="text-sm leading-relaxed text-[#f5f5f5]/60">
            Intermittence, statuts, droits d&apos;auteur, hébergement européen.
            Concrètement, ça donne ça.
          </p>
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {FACTS.map((f) => (
            <div
              key={f.label}
              className="border-t-2 border-[#F0FF00] pt-5"
            >
              <p className="font-display text-5xl leading-none">{f.value}</p>
              <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-[#f5f5f5]/80">
                {f.label}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#f5f5f5]/55">
                {f.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
