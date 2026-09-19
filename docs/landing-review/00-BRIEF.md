# Brief — analyse de la landing SIDEKICK

Ce dossier contient tout ce qu'il faut pour analyser la page d'accueil de
SIDEKICK sans accès au dépôt. Lis ce brief en premier : sans lui, une analyse
de landing page tombe vite dans les conseils génériques.

---

## Le produit

**SIDEKICK** — un outil de gestion tout-en-un pour les **artistes de musique
indépendants**. L'idée : un artiste qui s'autoproduit gère aujourd'hui sa
carrière dans dix outils qui ne se parlent pas (Notion pour les tâches, un Word
pour les factures, Dropbox pour les masters, un tableur pour les droits
d'auteur…). SIDEKICK réunit tout et **relie les données entre elles** — une date
de concert saisie une fois alimente le calendrier, les tâches et les revenus.

Dix modules, regroupés en trois familles (segmentation alignée sur la sidebar
de l'app depuis la 1ʳᵉ revue) :

| Famille | Modules |
|---|---|
| Organisation | Calendrier, Tâches, Contacts, Projets |
| Artistique | Live, Phono, Édition |
| Business | Revenus, Admin, Marketing |

## La cible

Artistes de musique **indépendants et autoproduits** en France : beatmakers, DJ,
musiciens, auteurs-compositeurs. Le profil type fait tout lui-même et n'a **pas**
de label, pas de manager, pas de comptable dédié.

Point de positionnement important, décidé explicitement : **on ne se compare pas
à un label et on ne critique pas le système actuel.** SIDEKICK se présente comme
une alternative pour ceux qui n'ont pas (encore) accès à ces structures, pas
comme une revanche contre elles. Toute formulation qui oppose l'artiste au
« système » est hors ton.

Beaucoup d'artistes cumulent plusieurs casquettes : à l'inscription, le choix du
profil est **multi-choix** (live / phono / édition), parce qu'un
auteur-compositeur qui tourne est les trois à la fois.

## Le stade

**Alpha, ouverture prévue le 14/09/2026.** L'alpha est **gratuite et ouverte à
tous** : inscription libre depuis la landing, sans carte bancaire, sans
engagement. Aucun paiement dans le périmètre — l'objectif est le **volume de
testeurs et le signal d'usage**, pas le chiffre d'affaires.

La tarification future (à partir de 8 €/mois) est annoncée en une ligne sous la
grille tarifaire, sans date. Le module **Marketing** et quelques fonctions
(synchronisation, comptabilité, contrats, presskit public) sont **fermés** pour
l'alpha et affichés « Bientôt ».

Développé par **une seule personne**, en pré-bêta. Pas encore d'utilisateurs :
aucun témoignage, aucun compteur d'usage n'est réel — d'où le parti pris de
prouver par des **faits vérifiables du produit** plutôt que par de la preuve
sociale inventée.

## L'objectif de la page

**Une seule conversion : créer un compte** (`/inscription`). Pas de démo à
réserver, pas de liste d'attente (elle a été supprimée), pas de contact
commercial. Le CTA « Créer mon compte » est répété dans la nav, le hero, la
section tarifs et la section finale.

## Contraintes de design

- **Dark-only**, aucune variante claire.
- Fond `#101010` (sections alternées avec `#0a0a0a`), texte `#f5f5f5`,
  accent unique **`#F0FF00`** (jaune-vert néon) pour les CTA et un mot par titre.
- Police d'affichage : **Archivo**. Titres de section en capitales, avec
  exactement **un segment en accent jaune**.
- Icônes : **Lucide** uniquement.
- Bordures `rgba(245,245,245,0.12)`, coins `rounded-sm` (angles quasi droits).
- Next.js 16, App Router, Tailwind.

## Ce qui a déjà été arbitré (ne pas reproposer)

- **Pas de preuve sociale inventée.** Ni témoignages, ni logos clients, ni
  « 2 000 artistes nous font confiance ». Il n'y a pas encore d'utilisateurs.
- **Pas de comparaison au label** (cf. cible).
- **Pas de roadmap datée.** Une date promise devient une dette dès qu'elle
  glisse.
- **Trois formules tarifaires → une seule offre alpha gratuite.** Afficher des
  prix qu'on ne peut pas encore payer faisait travailler le lecteur sur une
  décision qu'il n'a pas à prendre.
- Le comparatif de coûts cite des concurrents réels avec une mention légale
  (tarifs relevés, marques non affiliées) — c'est assumé.
- **Pas d'argument « IA » sur la landing.** L'IA réellement en prod se limite à
  la phrase d'accueil du dashboard (rédigée par un modèle, et la route ne
  compile pas en l'état) ; le reste est de l'automatisation déterministe
  (parsing de relevés, règles de suggestions). Une tuile « IA » a été testée
  dans la section « Marché français » puis retirée. Ne pas réintroduire de
  promesse IA tant que le socle n'est pas là.
- **Page de confidentialité créée** (`/confidentialite`), liée depuis le hero et
  le footer — brouillon, mentions légales `[à compléter]`.

---

## Contenu du dossier

| Fichier | Quoi |
|---|---|
| `00-BRIEF.md` | ce document |
| `01-COPY-DECK.md` | **tout le texte de la page dans l'ordre de lecture**, section par section, avec le rôle de chaque bloc — **mis à jour le 04/09** |
| `02-FAQ.md` | le contenu de la FAQ (désormais une page `/faq` autonome, liée depuis la nav et le footer) |
| `03-CHANGELOG.md` | **ce qui a changé depuis ta 1ʳᵉ revue**, retour par retour |
| `04-SOURCES.md` | le code source des 11 composants de la landing + pages liées, concaténé — **régénéré le 04/09** |
| `desktop-*.png` | captures **par section**, viewport 1440 px, 2× — ⚠️ **datées du 03/09, à re-capturer** (cf. `03-CHANGELOG.md`) |
| `mobile-*.png` | mêmes sections, viewport 390 px, 2× — ⚠️ **idem** |
| `_captures.txt` | index des captures avec leurs dimensions |

Les captures sont découpées par section volontairement : une capture pleine page
fait 1440 × 7929 px en desktop et 390 × 13095 px en mobile, illisible une fois
redimensionnée.

## Ordre des sections

1. Navigation (sticky, méga-menu Modules)
2. **Hero** — promesse + CTA + ligne « fondateur » + capture du tableau de bord
3. **Modules** (`#modules`) — grille de 10 tuiles cliquables, détail en panneau
4. **Comparatif** (`#comparatif`) — table interactive « ce que tu paies déjà »
5. **Showcase** — Live / Revenus / Édition en détail, texte + capture alternés
6. **Pain points** — trois situations reconnaissables
7. **Différenciation** — « Fait pour le marché français » : 3 faits (IA / Factur-X / UE). *Ancienne « Preuve produit » (3 chiffres + 6 capacités) réécrite.*
8. **En développement** (`#roadmap`) — 6 chantiers à venir, sans date
9. **Tarifs** (`#pricing`) — offre alpha unique à 0 €
10. **Qui est derrière** (`#inscription`) — mot du fondateur + dernier CTA. *Ancien « Prochain pas » réécrit.*
11. Footer (4 colonnes : Produit / Ressources / Compte / Légal)

## Ce sur quoi on veut ton avis

1. **Copy & positionnement** — la promesse est-elle claire en cinq secondes ? Le
   ton parle-t-il vraiment à un artiste indé français ? Quelles objections ne
   sont pas levées ?
2. **Design & UX** — hiérarchie visuelle, rythme des sections, densité,
   lisibilité, tenue en mobile.
3. **Conversion** — le parcours vers l'inscription, le placement des CTA, les
   points de friction, ce qui manque pour déclencher la création de compte.
4. **Technique** — structure des titres, sémantique, accessibilité (contrastes,
   focus clavier, `alt`), SEO on-page, poids des images.

Sois direct et spécifique : cite la section et la formulation exacte. Les
critiques structurelles sont plus utiles que les retouches de virgules.
