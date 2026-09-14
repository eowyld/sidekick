const PAINS = [
  {
    title: "T'es encore en retard sur une déclaration",
    body: "URSSAF, TVA, actualisation France Travail : des échéances qui tombent sans prévenir, notées nulle part.",
  },
  {
    title: "Ta facture, c'est un Word que tu modifies depuis deux ans",
    body: "Numérotation approximative, relances oubliées, TVA recalculée à la main.",
  },
  {
    title: "Tu as renvoyé la mauvaise version du morceau. Encore.",
    body: "Parce que le master final s'appelle mix_v4_FINAL_ok2.wav dans un dossier partagé.",
  },
];

export function PainPoints() {
  return (
    <section className="border-b border-[rgba(245,245,245,0.12)] bg-[#0a0a0a] py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
            Tu reconnais ça ?
          </p>
          <h2 className="font-display text-3xl sm:text-4xl">
            LA GESTION TE <span className="text-[#F0FF00]">COUPE</span> DE TA
            MUSIQUE
          </h2>
        </div>

        {/*
          Liste-manifeste, pas un damier : trois constats numérotés, pleine
          largeur, aucun cadre. Le motif bordé « mosaïque » est réservé à la
          grille de modules — le réutiliser ici, à ProductProof et à Roadmap
          donnait trois sections qui se ressemblaient.
        */}
        <div className="mt-10 space-y-8">
          {PAINS.map((p, i) => (
            <div
              key={p.title}
              className="grid gap-x-5 gap-y-1 md:grid-cols-[3rem_1fr]"
            >
              <span className="font-display text-2xl leading-none tabular-nums text-[#F0FF00]/40">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                {/* h3 (sous le h2 de section) : lecteurs d'écran et indexation
                    ont besoin de la sous-structure. Preflight neutralise le
                    style par défaut du heading — rien ne bouge visuellement. */}
                <h3 className="font-display text-xl leading-snug">{p.title}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#f5f5f5]/60">
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
