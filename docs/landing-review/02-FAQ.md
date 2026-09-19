# Bloc FAQ + données structurées — landing SIDEKICK

Statut : **intégré** (depuis la 1ʳᵉ revue). C'est une **page `/faq` autonome**,
pas une section de la landing — liée depuis la nav et le footer. Le bloc visible
(`FaqSection`, réponses dans le DOM, sans accordéon) et le JSON-LD `FAQPage`
(`FaqJsonLd`) sont co-localisés sur cette page ; source commune
`src/components/landing/faqData.ts`.

Les 7 questions ci-dessous correspondent mot pour mot à `faqData.ts` au 04/09.

Pourquoi une page dédiée plutôt qu'une section :
1. Conversion — la question « pourquoi pas Notion, qui est gratuit ? » n'est
   levée nulle part ailleurs.
2. Citations IA — le format question/réponse est celui que les assistants
   extraient le mieux, et le contenu comparatif est le plus volontiers cité.

Ton : tutoiement, phrases courtes. Mots interdits : puissant, seamless,
optimise, centralise, solution.

---

## 1. Le bloc visible

Chaque question en `<h3>`, chaque réponse en `<p>` juste après.
Pas d'accordéon fermé par défaut : le texte doit être dans le DOM au
chargement, sinon il n'est ni indexé ni extrait.

Chaque réponse doit se suffire à elle-même — elle sera lue hors contexte.

### C'est quoi SIDEKICK ?

SIDEKICK est un outil de gestion de carrière pour les artistes musicaux
indépendants en France : beatmakers, DJs, groupes, auteurs-compositeurs. Il
réunit tes revenus (royalties, droits d'auteur, cachets, factures), ton
catalogue de titres et d'œuvres, tes dates de concert, tes démarches
administratives et ton presskit. Les modules sont reliés entre eux : une date
de concert alimente tes revenus, un titre enregistré devient une œuvre
déposable.

### En quoi c'est différent de Notion ?

Notion est générique : tu construis toi-même chaque tableau, et rien ne
communique avec le reste. SIDEKICK connaît le métier. Il sait ce qu'est un
ISRC, une répartition SACEM, un cachet d'intermittent, un contrat de cession.
Tu ne montes pas ton système, il est déjà là, avec le vocabulaire et les règles
du marché français. La contrepartie : SIDEKICK est moins souple que Notion. Si
tu aimes tout paramétrer toi-même, reste sur Notion.

### Est-ce que c'est gratuit ?

Pendant l'alpha, tout est gratuit : accès complet, sans carte bancaire, sans
engagement. Après l'alpha, à partir de 8 € par mois. La règle est simple :
consulter et faire entrer tes données reste gratuit, tu paies pour ce qui sort
du produit — émettre une facture, exporter une note de frais, écrire les
métadonnées dans tes fichiers audio.

### Je suis intermittent ou auto-entrepreneur, est-ce que ça gère mon statut ?

Oui. SIDEKICK est construit pour le cadre français. Il gère les statuts
d'auto-entrepreneur, d'artiste-auteur et d'intermittent du spectacle, avec le
suivi des démarches et des rappels quand une échéance approche : URSSAF, France
Travail, TVA. Tes fiches de paie d'intermittence s'importent pour suivre tes
heures. C'est ce qu'aucun outil anglophone ne fait.

### Est-ce que SIDEKICK remplace la SACEM ?

Non. La SACEM collecte et répartit tes droits d'auteur, SIDEKICK ne s'y
substitue pas. Ce qu'il fait : tenir à jour ton catalogue d'œuvres avec la
répartition entre ayants droit, importer tes relevés pour que tu comprennes
d'où vient ton argent, et te rappeler les démarches à faire. Tu restes
adhérent, tu passes juste moins de temps à t'y retrouver.

### Je débute, est-ce que c'est pour moi ?

SIDEKICK s'adresse aux artistes qui ont déjà une activité à gérer : des titres
sortis, des dates, des revenus qui arrivent de plusieurs endroits. Si tu n'as
pas encore sorti de morceau, l'outil t'apportera peu pour l'instant. Si tu
jongles déjà entre un tableur, ta boîte mail et trois applis, c'est fait pour
toi.

### Qui a créé SIDEKICK ?

SIDEKICK est développé par un artiste indépendant français, qui a construit
l'outil qu'il voulait avoir pour lui-même. Le projet est autofinancé, sans
investisseur.

---

## 2. Le JSON-LD

Un seul `<script type="application/ld+json">` dans app/layout.tsx.
Remplacer TON-DOMAINE et les slugs sociaux.

Le bloc FAQPage doit reprendre **mot pour mot** les réponses ci-dessus : un
écart entre le balisage et le texte visible enfreint les consignes de Google.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://TON-DOMAINE.fr/#organization",
      "name": "SIDEKICK",
      "url": "https://TON-DOMAINE.fr",
      "logo": "https://TON-DOMAINE.fr/images/logo-sidekick.png",
      "description": "Outil de gestion de carrière pour les artistes musicaux indépendants en France.",
      "foundingDate": "2026",
      "areaServed": { "@type": "Country", "name": "France" },
      "sameAs": [
        "https://www.linkedin.com/company/TON-SLUG",
        "https://www.instagram.com/TON-COMPTE",
        "https://www.tiktok.com/@TON-COMPTE"
      ]
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://TON-DOMAINE.fr/#app",
      "name": "SIDEKICK",
      "url": "https://TON-DOMAINE.fr",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "inLanguage": "fr-FR",
      "publisher": { "@id": "https://TON-DOMAINE.fr/#organization" },
      "description": "SIDEKICK réunit revenus, catalogue, dates de concert, démarches administratives et presskit des artistes musicaux indépendants français dans un seul espace, avec des modules reliés entre eux.",
      "featureList": [
        "Suivi des revenus multi-sources",
        "Catalogue phonographique et catalogue d'œuvres",
        "Gestion des dates de concert et de tournée",
        "Statuts et démarches administratives françaises",
        "Facturation et note de frais",
        "Presskit"
      ],
      "offers": {
        "@type": "Offer",
        "price": "8.00",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/PreOrder"
      }
    },
    {
      "@type": "FAQPage",
      "@id": "https://TON-DOMAINE.fr/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "C'est quoi SIDEKICK ?",
          "acceptedAnswer": { "@type": "Answer", "text": "REPRENDRE LE TEXTE VISIBLE" }
        }
      ]
    }
  ]
}
```

Note : le bloc `offers` est en `PreOrder` puisque rien n'est encaissé pendant
l'alpha. Si tu préfères ne rien annoncer, supprime-le entièrement — un prix
balisé mais non pratiqué est plus risqué qu'une absence de prix.

---

## 3. Title et meta description

À remplacer (aujourd'hui title et description se répètent) :

- **title** : SIDEKICK — Gestion de carrière pour artistes musicaux indépendants
- **description** : Royalties, factures, SACEM, statuts, dates de concert et
  presskit dans un seul outil pensé pour les artistes indépendants français.
  Beatmaker, DJ, en groupe ou auteur-compositeur.

Title, description et H1 doivent être différents les uns des autres.

---

## 4. Vérification robots.txt — 5 minutes, prioritaire

Contrôler que **GPTBot, ClaudeBot, Google-Extended, PerplexityBot et CCBot**
ne sont pas bloqués dans app/robots.ts. C'est le seul point de ce document qui
peut rendre le site définitivement invisible aux assistants.
