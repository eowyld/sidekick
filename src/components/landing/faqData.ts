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
    a: "SIDEKICK est un outil de gestion de carrière pour les artistes musicaux indépendants en France : beatmakers, DJs, groupes, auteurs-compositeurs. Il réunit tes revenus (royalties, droits d'auteur, cachets, factures), ton catalogue de titres et d'œuvres, tes dates de concert et tes démarches administratives. Les modules sont reliés entre eux : une date de concert alimente tes revenus, un titre enregistré devient une œuvre déposable.",
  },
  {
    q: "En quoi c'est différent de Notion ?",
    a: "Notion est générique : tu construis toi-même chaque tableau, et rien ne communique avec le reste. SIDEKICK connaît le métier. Il sait ce qu'est un ISRC, une répartition SACEM, un cachet d'intermittent, un contrat de cession. Tu ne montes pas ton système, il est déjà là, avec le vocabulaire et les règles du marché français. La contrepartie : SIDEKICK est moins souple que Notion. Si tu aimes tout paramétrer toi-même, reste sur Notion.",
  },
  {
    q: "Est-ce que c'est gratuit ?",
    a: "Pendant l'alpha, tout ce qui est ouvert est gratuit, sans carte bancaire et sans engagement. Après l'alpha, l'offre payante démarrera à partir de 8 € par mois. L'idée : consulter et faire entrer tes données reste gratuit, tu paies pour ce qui sort du produit, comme émettre une facture ou écrire les métadonnées dans tes fichiers audio.",
  },
  {
    q: "Je suis intermittent ou auto-entrepreneur, est-ce que ça gère mon statut ?",
    a: "Oui. SIDEKICK est construit pour le cadre français. Il gère les statuts d'auto-entrepreneur, d'intermittent du spectacle et d'association, avec le suivi des démarches et un rappel par email quand une échéance approche : déclaration URSSAF, CFE, actualisation France Travail, vérification des 507 heures. Tu saisis tes missions d'intermittence pour suivre tes heures. Les calculs restent indicatifs : vérifie toujours auprès de l'organisme concerné. C'est ce qu'aucun outil anglophone ne fait.",
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
    q: "Mes données sont-elles en sécurité, et à qui appartiennent-elles ?",
    a: "Elles t'appartiennent. Elles sont hébergées à Paris et ne sont ni vendues ni utilisées pour de la publicité. Tes fichiers (masters, contrats) n'ont aucune adresse publique : ils ne s'ouvrent que pour toi, connecté, via un lien qui expire au bout d'une minute. Tes liens d'écoute peuvent avoir un mot de passe, une date d'expiration, et être coupés à tout moment. La mesure d'audience n'est activée qu'avec ton accord. Tu peux obtenir une copie de toutes tes données ou supprimer ton compte sur simple email. Le détail est dans la politique de confidentialité.",
  },
  {
    q: "Que se passe-t-il à la fin de l'alpha ?",
    a: "Tu seras prévenu par email au moins 30 jours avant la fin de la gratuité. Aucun abonnement ne démarre sans que tu le choisisses : si tu ne fais rien, tu ne paies rien. Tes données restent à toi dans tous les cas, exportables avant de décider.",
  },
  {
    q: "Comment supprimer mon compte ?",
    a: "Écris à hello@sidekickartists.com depuis l'adresse de ton compte. La suppression est faite sous 30 jours et efface tes contenus. Pense à télécharger avant tes factures : la loi t'impose de les garder 10 ans.",
  },
  {
    q: "SIDEKICK me donne-t-il des conseils juridiques ou comptables ?",
    a: "Non. SIDEKICK est un outil d'organisation : il te rappelle des échéances et fait des calculs à partir de ce que tu saisis, mais il ne remplace ni un expert-comptable, ni un avocat, ni les organismes eux-mêmes. Pour une décision qui engage ton statut ou ton argent, vérifie auprès d'un professionnel.",
  },
  {
    q: "Qui a créé SIDEKICK ?",
    a: "SIDEKICK est développé par un artiste indépendant français, qui a construit l'outil qu'il voulait avoir pour lui-même. Le projet est autofinancé, sans investisseur.",
  },
];
