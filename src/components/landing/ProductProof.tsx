/**
 * Section « différenciation » : en alpha, aucun chiffre d'usage ni témoignage
 * n'est réel, donc on ne joue pas la preuve sociale. On tient trois arguments
 * qu'un outil pensé ailleurs ne sort pas — l'intermittence et les statuts
 * français, la conformité Factur-X, l'hébergement UE.
 */
const FACTS = [
  {
    value: "URSSAF",
    label: "droits, charges et statuts",
    detail:
      "Cachets et heures d'intermittence, statuts juridiques, échéances URSSAF, France Travail et TVA — suivis au même endroit que tes revenus.",
  },
  {
    value: "Factur-X",
    label: "facturation électronique",
    detail:
      "Tes factures au format imposé par la réforme française. Aucun outil anglophone ne le couvre.",
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
            Intermittence, statuts, facturation électronique, hébergement
            européen. Pas l&apos;adaptation d&apos;un outil pensé ailleurs.
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
