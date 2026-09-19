# Changelog — depuis la 1ʳᵉ revue

État au **2026-09-04**. Ce document liste ce qui a bougé sur la landing depuis
ta première passe, pour que tu n'aies pas à re-signaler ce qui est déjà traité.
Le texte à jour est dans `01-COPY-DECK.md`, le code dans `04-SOURCES.md`.

---

## 1. Retours traités

### « Tes données t'appartiennent » — affirmation non étayée

- Ligne d'appui ajoutée (footer, au-dessus du copyright) :
  « Tes données t'appartiennent : export de toutes tes données sur simple
  demande, hébergement en Europe. »
- Dans le hero, la puce « Tes données t'appartiennent » devient un **lien** vers
  `/confidentialite`.
- **Page `/confidentialite` créée** : responsable de traitement, données
  collectées, finalités + bases légales, hébergement / sous-traitants (Supabase,
  Vercel, PostHog, Brevo), durées, droits RGPD dont l'export sous 30 j,
  cookies. **Brouillon** — les mentions légales précises sont `[à compléter]`.
- **Colonne « Légal » ajoutée au footer** (→ Confidentialité). Le footer passe à
  4 colonnes. Ancres du footer préfixées `/` pour fonctionner depuis les pages
  hors landing.
- Formulation prudente : « export **sur simple demande** » (obligation RGPD,
  aucune fonctionnalité self-service promise).

### Capture du dashboard illisible en mobile

- Le recadrage mobile ne montre plus le dashboard entier mais **la seule zone
  « ce qui est urgent »** (salut + date + tâches urgentes / événements de la
  semaine). Changement fait dans `scripts/shots.mjs`.
- ⚠️ **L'image `dashboard-mobile.png` doit être régénérée** (script de capture à
  relancer). Idem pour toutes les captures du dossier `landing-review/`, datées
  du 03/09.

### Le H1 casse mal en mobile (« DANS 10 / APPLIS. »)

- **H1 réécrit** : « TOUTE TA CARRIÈRE. / UN SEUL ENDROIT. » — tout le segment
  jaune est d'un bloc, donc plus de coupure disgracieuse.
- `text-balance` ajouté pour équilibrer les lignes sous 640 px.

### Badge de dev Next.js sur les captures

- Confirmé : cet indicateur est **dev-only**, il n'apparaît jamais dans un
  `next build` / `next start`.
- `devIndicators: false` ajouté à `next.config.mjs` pour qu'il disparaisse aussi
  en dev — donc des futures captures.

### Section « preuve produit » à moitié redondante

- **Section entièrement réécrite.** Ancienne : eyebrow « Ce qui est déjà là »,
  titre « Regarde par toi-même », 3 chiffres (10 modules / 1 saisie / 0 €) +
  grille de 6 capacités.
- Nouvelle : eyebrow « Pensé d'ici », titre **« FAIT POUR LA RÉALITÉ DU MARCHÉ
  FRANÇAIS. »**, 3 faits distincts :
  - **Intermittence · URSSAF — droits, charges et statuts** : « Cachets et heures
    d'intermittence, statuts juridiques, échéances URSSAF, France Travail et TVA
    — suivis au même endroit que tes revenus. » *(Une tuile « IA » a d'abord
    occupé cette place puis a été retirée : l'IA réellement en prod est trop
    mince pour un argument de tête.)*
  - **Factur-X — facturation électronique** : remonté en tête (il était 3ᵉ sur
    6). « Aucun outil anglophone ne le couvre. »
  - **UE — hébergement** : « Tes données restent en Europe, exportables sur
    simple demande. »
- « 10 modules » et « 0 € pendant l'alpha » retirés (déjà dits deux fois
  ailleurs). **Grille de 6 capacités supprimée** (redondante avec le showcase et
  la grille de modules).

### Hiérarchie de titres trop plate

- Les intitulés des **3 pain points**, des **6 chantiers de roadmap** et des
  capacités sont passés de `<p>` à `<h3>`, imbriqués sous le `<h2>` de leur
  section. Balisage seul, aucun changement visuel (Preflight neutralise le style
  par défaut des headings).

### Aucun style de focus clavier

- Token partagé `focusRing` (`focus-visible:ring-2 ring-[#F0FF00] ring-offset-2`)
  posé sur **tous les éléments interactifs nus** : logo, bouton Modules, liens de
  nav, burger mobile, liens du méga-menu et du menu mobile, liens du hero
  (« Confidentialité », « Lire pourquoi »), tuiles de modules (anneau intérieur),
  bouton de fermeture du panneau, liens du footer, « Voir les tarifs » du
  comparatif.
- La `Checkbox` du comparatif passe son anneau de focus en jaune `#F0FF00`.
- Les primitives `Button` / `Checkbox` avaient déjà un anneau — les CTA étaient
  donc couverts.

---

## 2. Autres changements depuis la revue (non issus de tes retours)

- **Section « Inscription » réécrite en mot du fondateur** : eyebrow « Qui est
  derrière », titre « JE SUIS ARTISTE. / COMME TOI. », deux paragraphes signés
  « Eliott — artiste et fondateur de SIDEKICK », puis la checklist + les CTA.
  C'est l'argument le moins copiable de la page, placé juste avant le bouton.
- **Familles de modules** renommées et réordonnées pour coller à la sidebar de
  l'app : Organisation / Artistique / Business (au lieu de Pilotage / Business /
  Création / Diffusion). Ordre des tuiles : Calendrier, Tâches, Contacts,
  Projets, Live, Phono, Édition, Revenus, Admin, Marketing.
- **FAQ** : le bloc (statut « rédigé, pas intégré » à la revue) est désormais une
  **page `/faq` autonome**, liée depuis la nav et le footer.
- **Nav** : lien « FAQ » ajouté (Modules / Tarifs / FAQ / Blog).
- **Méga-menu Modules** : les liens ouvrent maintenant directement le panneau de
  détail du module visé (un bug empêchait l'ouverture depuis la nav).
- **Comparatif** : 10ᵉ ligne « Ou tout à la main, dans Notion et un tableur »
  (coût affiché en temps, ≈ 3 h / semaine, décochée par défaut, hors total) ;
  titre et ligne d'économies devenus dynamiques.
- **Roadmap** : le badge « En développement » répété sur chaque carte a été
  retiré (il doublonnait l'eyebrow de section).

---

## 3. Encore ouvert (dépendances hors landing)

- **Région du projet Supabase à confirmer (UE).** Les affirmations « hébergement
  en Europe » (tuile, footer, page confidentialité) n'ont de valeur que si le
  projet tourne bien sur une région européenne. PostHog est confirmé en UE.
- **`/confidentialite` : mentions `[à compléter]`** — identité de l'éditeur /
  SIRET, région Supabase exacte, durées de conservation, position sur le
  consentement cookies, date de mise à jour.
- **Captures du dossier à régénérer** (datées du 03/09, antérieures à toutes ces
  modifs). Sections dont le rendu a changé : Hero, Preuve produit → « Marché
  français », Inscription → « Qui est derrière », Footer, méga-menu Modules,
  capture dashboard mobile.
- **Route `hero-phrase`** (phrase d'accueil IA du dashboard) : ne compile pas en
  l'état (dépendances `ai` + `@ai-sdk/anthropic` non installées). Tant qu'elle
  n'est pas en prod, la seule IA réellement visible est indisponible — à
  arbitrer avant de trop appuyer sur l'angle IA.
