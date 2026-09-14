/**
 * Source unique des questions/réponses de la FAQ.
 *
 * Le bloc visible (`FaqSection`) et le balisage `FAQPage` (`FaqJsonLd`) lisent
 * ce même tableau : un écart entre le texte affiché et le JSON-LD enfreint les
 * consignes de Google, donc on ne duplique jamais le contenu.
 *
 * Chaque réponse se suffit à elle-même — elle sera lue hors contexte (extrait
 * de recherche, réponse d'assistant).
 */
export type FaqItem = { q: string; a: string };

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "C'est quoi SIDEKICK ?",
    a: "SIDEKICK est un outil de gestion de carrière pour les artistes musicaux indépendants en France : beatmakers, DJs, groupes, auteurs-compositeurs. Il réunit tes revenus (royalties, droits d'auteur, cachets, factures), ton catalogue de titres et d'œuvres, tes dates de concert, tes démarches administratives et ton presskit. Les modules sont reliés entre eux : une date de concert alimente tes revenus, un titre enregistré devient une œuvre déposable.",
  },
  {
    q: "En quoi c'est différent de Notion ?",
    a: "Notion est générique : tu construis toi-même chaque tableau, et rien ne communique avec le reste. SIDEKICK connaît le métier. Il sait ce qu'est un ISRC, une répartition SACEM, un cachet d'intermittent, un contrat de cession. Tu ne montes pas ton système, il est déjà là, avec le vocabulaire et les règles du marché français. La contrepartie : SIDEKICK est moins souple que Notion. Si tu aimes tout paramétrer toi-même, reste sur Notion.",
  },
  {
    q: "Est-ce que c'est gratuit ?",
    a: "Pendant l'alpha, tout est gratuit : accès complet, sans carte bancaire, sans engagement. Après l'alpha, à partir de 8 € par mois. La règle est simple : consulter et faire entrer tes données reste gratuit, tu paies pour ce qui sort du produit — émettre une facture, exporter une note de frais, écrire les métadonnées dans tes fichiers audio.",
  },
  {
    q: "Je suis intermittent ou auto-entrepreneur, est-ce que ça gère mon statut ?",
    a: "Oui. SIDEKICK est construit pour le cadre français. Il gère les statuts d'auto-entrepreneur, d'artiste-auteur et d'intermittent du spectacle, avec le suivi des démarches et des rappels quand une échéance approche : URSSAF, France Travail, TVA. Tes fiches de paie d'intermittence s'importent pour suivre tes heures. C'est ce qu'aucun outil anglophone ne fait.",
  },
  {
    q: "Est-ce que SIDEKICK remplace la SACEM ?",
    a: "Non. La SACEM collecte et répartit tes droits d'auteur, SIDEKICK ne s'y substitue pas. Ce qu'il fait : tenir à jour ton catalogue d'œuvres avec la répartition entre ayants droit, importer tes relevés pour que tu comprennes d'où vient ton argent, et te rappeler les démarches à faire. Tu restes adhérent, tu passes juste moins de temps à t'y retrouver.",
  },
  {
    q: "Je débute, est-ce que c'est pour moi ?",
    a: "SIDEKICK s'adresse aux artistes qui ont déjà une activité à gérer : des titres sortis, des dates, des revenus qui arrivent de plusieurs endroits. Si tu n'as pas encore sorti de morceau, l'outil t'apportera peu pour l'instant. Si tu jongles déjà entre un tableur, ta boîte mail et trois applis, c'est fait pour toi.",
  },
  {
    q: "Qui a créé SIDEKICK ?",
    a: "SIDEKICK est développé par un artiste indépendant français, qui a construit l'outil qu'il voulait avoir pour lui-même. Le projet est autofinancé, sans investisseur.",
  },
];
