# Copy deck — landing SIDEKICK

Tout le texte de la page **dans l'ordre de lecture**, extrait du rendu réel
(pas du code). Chaque section est précédée de son rôle dans la page.

> **Mis à jour le 2026-09-04** — état postérieur à la première revue (3 sept.).
> Ce qui a changé depuis, et pourquoi, est résumé dans `03-CHANGELOG.md`.
> Lire `00-BRIEF.md` d'abord pour le contexte produit, la cible et le stade.

---

## 0. Navigation (sticky)

Le lien « Modules » ouvre un méga-menu listant les 10 modules **par famille**
(Organisation, Artistique, Business). La barre est transparente en haut de page,
fond plein au scroll ou dès qu'un menu est ouvert.

```
Modules
Tarifs
FAQ
Blog
Connexion
Créer mon compte
```

---

## 1. Hero

Promesse principale + double CTA + réassurance + ligne « fondateur » + capture du
tableau de bord annotée de 3 légendes. C'est le seul écran vu par tout le monde.

```
BEATMAKER, DJ, MUSICIEN, AUTEUR-COMPOSITEUR

TOUTE TA CARRIÈRE.
UN SEUL ENDROIT.

Royalties, factures, démarches administratives, catalogue de tes titres, dates de tournée, presskit… Dix modules reliés entre eux, pensés pour les artistes qui font tout eux-mêmes.

Créer mon compte
Voir les modules

Gratuit pendant l'alpha
Aucune carte bancaire
Tes données t'appartiennent          → lien vers /confidentialite

Construit par un artiste indépendant, pour des artistes indépendants. Lire pourquoi   → ancre #inscription

Tableau de bord principal
01   Ce qui est urgent — Les tâches en retard et les événements de la semaine, dès l'ouverture.
02   Ta semaine en une ligne — Sept jours, tous modules confondus, sans ouvrir le calendrier.
03   Tes tâches par secteur — Live, phono, admin : chaque tâche porte son secteur et ses sous-étapes.
```

---

## 2. Modules (`#modules`)

Grille de 10 tuiles cliquables. Le clic ouvre un panneau de détail sous la grille
(contenu reproduit en annexe). Un lien `#module-<id>` (méga-menu, lien partagé)
déplie directement le panneau visé. Marketing porte un badge « Bientôt ».

```
MODULES

TOUT AU MÊME ENDROIT

Travaille avec les modules dont tu as besoin. Clique ci-dessous pour voir ce que chacun propose.

Calendrier
Tâches
Contacts
Projets
Live
Phono
Édition
Revenus
Admin
Marketing   BIENTÔT
```

---

## 3. Comparatif (`#comparatif`)

Table **interactive** : les 9 lignes d'abonnement sont cochées au départ, le
visiteur décoche ce qu'il ne paie pas et le total se recalcule. Une 10ᵉ ligne —
« tout à la main » — est **décochée par défaut** : elle affiche un coût en temps
(≈ 3 h / semaine), pas en euros, et n'entre pas dans le total. Le titre reprend
le nombre de lignes cochées en toutes lettres. Le prix affiché (8 €) est celui
d'après-alpha — comparer 0 € à 111 € ne comparerait rien — d'où la mention
« Gratuit pendant toute l'alpha » juste dessous.

```
CE QUE ÇA TE COÛTE DÉJÀ

NEUF ABONNEMENTS,
OU UN SEUL.
   (titre dynamique : « {N} ABONNEMENT(S), » selon les lignes cochées ; « TES ABONNEMENTS, » si zéro)

Coche ce que tu paies — ou ta façon de faire — aujourd'hui : le calcul suit. Chaque ligne est une chose que SIDEKICK fait nativement, chiffrée au tarif moyen par utilisateur de l'abonnement correspondant.

CE QUE TU FAIS                                    AUJOURD'HUI                PAR MOIS
Tâches et suivi de projets                        Notion, Asana, Monday…    10 €
Facturation et devis                             Freebe, Abby…             12 €
Suivi administratif et comptable                 Indy, Tiime…              12 €
Suivi des cachets et des heures d'intermittence  Movinmotion…             10 €
Planning de tournée et feuille de route          Master Tour, Muzeek…      15 €
Stockage et partage des fichiers                 Dropbox, WeTransfer Pro…  12 €
Hébergement et partage de démos                  SoundCloud Pro…           12 €
Mailing et liste de diffusion                    Mailchimp, Brevo…         13 €
Presskit et page artiste                         Bandzoogle, Squarespace… 15 €
Ou tout à la main, dans Notion et un tableur     Notion + Google Sheets   ≈ 3 h / semaine   (décochée par défaut, hors total)
9 abonnements                                                              111 €

AVEC SIDEKICK

8 € / mois

Gratuit pendant toute l'alpha.

Tout ça dans un seul abonnement, avec les données reliées entre elles. Une date de concert alimente ton calendrier, tes tâches et tes revenus sans que tu la ressaisisses.

103 € économisés par mois
   (ligne dynamique : « {saved} € économisés par mois » ; si seule « tout à la main » est cochée : « Et 3 h par semaine qui repassent dans la musique » ; si rien n'est coché : « Et tout le reste en prime »)
   (+ paragraphe si « tout à la main » ET économies : « Et si tu fais tout à la main aujourd'hui : les trois heures hebdo passées à recopier d'un outil à l'autre, en moins. »)

Créer mon compte
Voir les tarifs

Tarifs publics constatés pour les formules individuelles, relevés en septembre 2026. Les marques citées appartiennent à leurs éditeurs respectifs et ne sont pas affiliées à SIDEKICK.
```

---

## 4. Showcase modules

Trois blocs Live / Revenus / Édition, texte et capture produit en alternance
gauche-droite. Pas de paragraphe d'accroche : titre + liste de features
détaillées (intitulé + une ligne concrète).

```
LIVE

TA TOURNÉE TIENT DANS UN ÉCRAN.

Suivi des dates — Répétitions et représentations, triées par statut, de la première idée à la date jouée.
Prospection — Un vrai accompagnement en amont : contacts, relances et suivi jusqu'à ce qu'un projet se concrétise.
Suivi admin — Transport, logement, contrat, rémunération : rattachés à chaque date.
Itinéraire sur carte — Les dates se placent seules dans l'ordre, la tournée se dessine sans rien saisir.
Inventaire du matériel — Ton parc et une liste dédiée pour chacun de tes dispositifs de tournée.

REVENUS

CE QUE TU GAGNES VRAIMENT.

Encaissé & à venir — Droits d'auteur, phono, facturation et intermittence sur une seule courbe, comparée à l'an dernier.
Factures & relances — Ce qui reste à encaisser et les relances à envoyer, sans rouvrir de tableur.
Intermittence & cachets — Missions, cachets et heures qui comptent pour tes droits, suivis à part.
Import des relevés   BIENTÔT — DistroKid, TuneCore, CD Baby, SoundCloud : les relevés se rangent tout seuls.

ÉDITION

TES DROITS, AU POURCENT PRÈS.

Ayants droit & rôles — Auteurs, compositeurs, arrangeurs, éditeur : la répartition de chaque œuvre, au pourcent près.
Répartition DEP / DRM — Droits d'exécution et de reproduction visualisés, prêts pour la déclaration.
Territoires & exploitations — Où et comment chaque œuvre peut être exploitée.
Pistes de synchronisation   BIENTÔT — Le suivi des opportunités de synchro, de la piste au contrat signé.
```

---

## 5. Pain points

Trois situations reconnaissables, numérotées, pleine largeur. Chaque intitulé est
un `<h3>`.

```
TU RECONNAIS ÇA ?

LA GESTION TE COUPE DE TA MUSIQUE

01   T'es encore en retard sur une déclaration
     URSSAF, TVA, actualisation France Travail : des échéances qui tombent sans prévenir, notées nulle part.

02   Ta facture, c'est un Word que tu modifies depuis deux ans
     Numérotation approximative, relances oubliées, TVA recalculée à la main.

03   Tu as renvoyé la mauvaise version du morceau. Encore.
     Parce que le master final s'appelle mix_v4_FINAL_ok2.wav dans un dossier partagé.
```

---

## 6. Différenciation — « Fait pour le marché français »

**Section entièrement réécrite depuis la revue.** Ancienne version : « Preuve
produit » = 3 chiffres + grille de 6 capacités. Nouvelle : trois arguments qu'un
outil pensé ailleurs ne sort pas. La grille de 6 capacités a été supprimée
(redondante avec le showcase et la grille de modules).

```
PENSÉ D'ICI

FAIT POUR LA RÉALITÉ DU MARCHÉ FRANÇAIS.

Intermittence, statuts, facturation électronique, hébergement européen. Pas l'adaptation d'un outil pensé ailleurs.

Intermittence · URSSAF
droits, charges et statuts
Cachets et heures d'intermittence, statuts juridiques, échéances URSSAF, France Travail et TVA — suivis au même endroit que tes revenus.

Factur-X
facturation électronique
Tes factures au format imposé par la réforme française. Aucun outil anglophone ne le couvre.

UE
hébergement
Tes données restent en Europe, exportables sur simple demande.
```

---

## 7. En développement (`#roadmap`)

6 chantiers à venir. Aucune date. Le badge « En développement » par carte a été
retiré (il répétait l'eyebrow de section) ; chaque intitulé est un `<h3>`.

```
EN DÉVELOPPEMENT

LA SUITE EST ÉCRITE.

Ces fonctionnalités arriveront au lancement officiel de l'application.

Distribution sur les plateformes — Envoyer tes sorties en streaming depuis SIDEKICK, sans repasser par un distributeur tiers.
Récupération de tes droits d'auteur — SIDEKICK va chercher ce qui te revient au lieu de te laisser courir après.
Suivi automatique de tes œuvres — Statistiques et revenus cumulés, par œuvre et par enregistrement, sans import manuel.
Génération de codes ISRC et UPC — Tes codes créés directement ici, au lieu d'être demandés ailleurs et recopiés à la main.
Smartlinks — Un lien unique vers toutes tes plateformes d'écoute et de téléchargement.
Gestion des contrats — Modèles, envoi et signature en ligne, rattachés à tes dates et à tes projets.
```

---

## 8. Tarifs (`#pricing`)

Une seule offre : l'alpha gratuite. Le tarif d'après-alpha tient en une ligne
sous la carte.

```
TARIFS

SIMPLE. FAIT POUR LES INDÉS.

L'alpha est gratuite et ouverte à tous. Pas de carte bancaire, pas d'engagement.

ALPHA OUVERTE

0 €

Accès complet au produit pendant toute l'alpha. Tu crées ton compte, tu choisis tes secteurs, tu commences.

Créer mon compte

CE QUI EST INCLUS

Tableau de bord, tâches et calendrier
Contacts et projets
Revenus : facturation, royalties, droits d'auteur
Intermittence et suivi des cachets
Live, Phono et Édition
Admin : statuts, démarches et rappels d'échéance

Après l'alpha, à partir de 8 € par mois. Sans engagement.
```

---

## 9. Qui est derrière + dernier CTA (`#inscription`)

**Section réécrite depuis la revue.** Ancienne version : « Prochain pas / Bloque
30 minutes ». Nouvelle : le mot du fondateur — le seul argument de la page
qu'aucun concurrent ne peut copier — juste avant le bouton d'inscription.

```
QUI EST DERRIÈRE

JE SUIS ARTISTE.
COMME TOI.

Je travaille dans la musique, et ma plus grosse barrière n'a jamais été la créativité : c'est la charge mentale. J'organise très bien la carrière des autres. Beaucoup moins la mienne.

SIDEKICK, c'est l'outil dont je rêvais : mes dates, mes titres, mes revenus et mes statuts au même endroit. Je l'ouvre à d'autres artistes. Ça te dit d'essayer ?

Eliott — artiste et fondateur de SIDEKICK

Compte créé et utilisable immédiatement
Gratuit pendant toute l'alpha, sans carte bancaire
Tu choisis tes secteurs, on masque le reste
Des données d'exemple si tu veux explorer sans rien saisir
Créer mon compte
J'ai déjà un compte
```

---

## 10. Footer

Quatre colonnes (ajout de « Légal ») + une ligne d'engagement données au-dessus
du copyright.

```
Un manager tout-en-un pour les artistes de musique indépendants. Phono, édition, live, marketing, revenus, administratif.

PRODUIT
Modules
Tarifs
Comparatif
En développement
Créer mon compte

RESSOURCES
FAQ
Blog

COMPTE
Connexion
Créer un compte

LÉGAL
Confidentialité

Tes données t'appartiennent : export de toutes tes données sur simple demande, hébergement en Europe. En savoir plus

© 2026 SIDEKICK. Alpha ouverte.
```

---

## Pages liées, hors landing

Atteignables depuis la nav et le footer, à réviser aussi :

- **`/faq`** — page FAQ autonome (le bloc était « rédigé, pas intégré » à la
  revue ; il est maintenant une page dédiée). Contenu détaillé dans `02-FAQ.md`.
- **`/confidentialite`** — politique de confidentialité. **Brouillon** : structure
  et engagements par défaut posés, mentions légales précises encore
  `[à compléter]`.

---

## Annexe — détail des modules

Contenu du panneau qui s'ouvre au clic sur une tuile de la section « Modules ».
Non visible au chargement : il faut cliquer. **Familles renommées** depuis la
revue : Organisation / Artistique / Business (au lieu de Pilotage / Business /
Création / Diffusion).

### Calendrier

```
ORGANISATION

CALENDRIER

Tu sais ce qui t'attend. Ce que tu saisis dans les autres modules atterrit ici, et ton agenda habituel reste à jour.

Concerts, répétitions, sessions studio, échéances et deadlines agrégés
Vue mensuelle et hebdomadaire
Flux iCal : abonne Google Agenda ou Apple Calendrier
```

### Tâches

```
ORGANISATION

TÂCHES

Tu avances sur ce qui compte au lieu d'essayer de te rappeler ce qu'il restait à faire. Rien ne passe à la trappe parce que c'était noté ailleurs.

Tâches par secteur, avec sous-étapes
Dates limites, avec alerte quand l'échéance approche ou est dépassée
Vue du jour et backlog
Suggestions de tâches à partir de tes autres modules   BIENTÔT
```

### Contacts

```
ORGANISATION

CONTACTS

Ton réseau devient un vrai carnet d'adresses, pas un fil de messages où tu fouilles. Tu retrouves la bonne personne au moment où tu en as besoin.

Fiches par métier et par structure
Recherche et filtre par métier
```

### Projets

```
ORGANISATION

PROJETS

Tu arrêtes de mener tes sorties à l'instinct. Chaque album, single ou tournée devient un projet que tu ouvres pour savoir où tu en es, ce qu'il reste à faire et ce que ça te coûte, avec une vue d'ensemble de chaque module.

Un projet par album, single, EP ou tournée
Onglets création, marketing, admin et budget
Budget prévisionnel vs dépenses réelles, revenus et balance en direct
Œuvres, titres, dates et tâches rattachés au projet
```

### Live

```
ARTISTIQUE

LIVE

Tu sais où en est chaque date : celles que tu relances, celles qui sont signées, celles qui approchent. Et ce que chacune te rapporte une fois les frais déduits.

Dates par statut : prospection, confirmée, signée
Prospection de lieux et suivi des relances
Itinéraire de tournée sur carte
Répétitions et plannings
Inventaire matériel et listes de départ
```

### Phono

```
ARTISTIQUE

PHONO

Ton catalogue devient présentable : plus un dossier de fichiers nommés à la main, mais quelque chose que tu peux envoyer tel quel à un distributeur, un label ou un ingé master.

Métadonnées écrites dans le fichier audio : ISRC, crédits, pochette
Crédits par rôle : compositeur, beatmaker, ingé mixage, mastering
Export d'un titre ou d'un album entier en ZIP
Statut de production : en cours, mixé, mastérisé, publié
Albums, EP, podcasts et sessions studio rattachés aux titres
```

### Édition

```
ARTISTIQUE

ÉDITION

Tes droits ne reposent plus sur ta mémoire ni sur un tableur. Qui a fait quoi, qui touche quoi : c'est écrit, à jour, et prêt le jour où il faut déclarer.

Ayants droit et rôles par œuvre : auteur, compositeur, arrangeur, éditeur
Répartition DEP et DRM en pourcentages
Territoires et types d'exploitation
Suivi des opportunités de synchronisation   BIENTÔT
```

### Revenus

```
BUSINESS

REVENUS

Tu sais enfin ce que ta musique te rapporte, et d'où ça vient. De quoi budgéter une sortie, négocier un cachet et arrêter de découvrir ton année chez le comptable.

Droits d'auteur, droits phono, facturation et intermittence dans un seul graphe
Encaissé, à venir, moyenne mensuelle et source principale
Factures : en attente, payées, relances
Évolution mensuelle comparée à l'an dernier
Import des relevés DistroKid, TuneCore, CD Baby, SoundCloud   BIENTÔT
```

### Admin

```
BUSINESS

ADMIN

L'administratif cesse d'être ce que tu repousses parce que c'est éparpillé. Tu vois où tu en es et ce qui tombe bientôt, sans ouvrir six espaces en ligne.

Statuts et structures juridiques
Démarches suivies par échéance : URSSAF, France Travail, TVA
Espace documents et stockage de fichiers
Suivi comptable   BIENTÔT
```

### Marketing

```
BUSINESS

MARKETING
DISPONIBLE BIENTÔT

Tu ne laisses plus une sortie passer inaperçue faute de temps. Annoncer un titre ou démarcher un programmateur redevient une routine, pas un chantier de trois soirées.

Liste de diffusion segmentée : fans, pros, presse
Campagnes email rattachées à un projet
Presskit en ligne, partagé par lien
Plan de com' d'une sortie dans le calendrier
```
