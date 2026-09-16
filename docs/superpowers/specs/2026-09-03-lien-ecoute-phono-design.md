# Lien d'écoute — spec de conception

Date : 2026-09-03
Module : `phono`
Statut : validé, prêt pour plan d'implémentation

## Intention

Permettre à l'artiste d'envoyer une page d'écoute privée à un label, un
programmateur ou un tourneur, directement composée depuis le catalogue phono.

Le registre est **commercial B2B**, pas marketing : la page doit être sobre,
rapide à parcourir, et donner au pro exactement ce qu'il cherche — écouter,
vérifier les crédits, éventuellement télécharger. Elle ne cherche pas à séduire,
elle cherche à ne pas faire perdre de temps.

Contrainte structurante : une partie des titres envoyés ne sont **pas encore
sortis**. La protection contre la fuite n'est pas une option secondaire.

## Décisions d'architecture

### Référence vivante + copie de sécurité (approche C)

Un lien d'écoute référence les entités du catalogue (il reste donc éditable et
republiable sans changer d'URL), mais **chaque ligne dénormalise à l'ajout** tout
ce dont la page publique a besoin : titre, artiste, label de version, ISRC,
chemin du fichier, durée, peaks de waveform.

Conséquences :
- modifier ou supprimer une entrée du catalogue ne casse jamais un lien déjà
  en circulation chez un label ;
- on garde une trace de ce qui a réellement été envoyé ;
- on peut mettre à jour un lien envoyé sans générer une nouvelle URL.

Le coût est une colonne `jsonb` supplémentaire.

### L'audio vit sur la version, pas sur le titre

`TrackVersion` passe de `{ id, label }` à :

```ts
export interface TrackVersion {
  id: string;
  label: string;
  audioPath?: string;                    // chemin dans le bucket drive
  audioSource?: "upload" | "drive";
  audioName?: string;
  durationMs?: number;
  sizeBytes?: number;
  peaks?: number[];                      // ~400 valeurs 0..1
}
```

La colonne `versions` de `user_phono_tracks` est déjà `jsonb` : **aucune nouvelle
table n'est nécessaire pour l'audio**. L'upload direct et le rattachement d'un
fichier du Drive alimentent le même champ, avec `audioSource` pour distinguer
l'origine.

Les peaks sont calculés **dans le navigateur** à l'ajout du fichier
(`AudioContext.decodeAudioData` puis sous-échantillonnage à ~400 points).
Aucun traitement audio serveur, aucun transcodage : l'artiste sert le fichier
qu'il a choisi de servir.

### Analytics agrégées, pas événementielles

Une ligne par couple (session, titre), mise à jour par `upsert` sur un heartbeat
toutes les 10 secondes de lecture. On évite d'empiler des milliers de lignes
d'événements tout en conservant l'information utile : pourcentage écouté,
position d'abandon, nombre de réécoutes, téléchargement.

## Modèle de données

### `user_listening_links`

| Colonne | Type | Note |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid | RLS |
| `slug` | text unique | aléatoire, non devinable (≥ 16 caractères URL-safe) |
| `title` | text | ex. « Promo EP — automne 2026 » |
| `intro_message` | text | 2-3 lignes affichées en tête |
| `cover_path` | text null | artwork de la page |
| `password_hash` | text null | null = pas de mot de passe |
| `expires_at` | timestamptz null | modifiable à tout moment |
| `allow_download` | bool | défaut `false` |
| `presskit_url` | text null | |
| `is_active` | bool | kill switch |
| `created_at` / `updated_at` | timestamptz | |

### `user_listening_link_items`

| Colonne | Type | Note |
|---|---|---|
| `id` | uuid pk | |
| `link_id` | uuid fk cascade | |
| `position` | int | ordre d'affichage |
| `group_label` | text null | nom de l'album/projet → intertitre de section |
| `kind` | text | `track` \| `podcast` |
| `source_id` | text | id catalogue (indicatif, jamais requis au rendu) |
| `version_id` | text null | version choisie |
| `snapshot` | jsonb | titre, artiste, invités, label de version, ISRC, rôle, label, date, genre |
| `audio_path` | text | chemin bucket |
| `duration_ms` | int | |
| `peaks` | jsonb | |

Ajouter un album ou un EP **éclate** en items individuels partageant le même
`group_label`. C'est ce qui permet de mélanger « l'EP entier + 2 titres isolés +
un podcast » dans une page cohérente.

### `user_listening_invites`

Un envoi = une ligne. Porte le paramètre `?i=` du lien.

`id`, `link_id`, `contact_id` null, `contact_name`, `contact_email`, `sent_at`,
`first_opened_at` null.

### `user_listening_sessions`

`id`, `link_id`, `invite_id` null, `visitor_name` null (= anonyme),
`created_at`, `last_seen_at`, `user_agent`, `ip_hash`.

### `user_listening_plays`

Contrainte d'unicité sur `(session_id, item_id)`.

`id`, `session_id`, `item_id`, `listened_ms`, `max_position_ms`, `play_count`,
`completed` bool, `downloaded` bool, `updated_at`.

### RLS

Les cinq tables sont en RLS par `user_id` pour l'artiste. Les écritures publiques
(sessions, plays) passent **exclusivement** par les routes API serveur, qui
valident le slug et l'état du lien avant d'écrire.

## Page publique — `/ecoute/[slug]`

Hors app shell, sans `AuthGuard`, `noindex, nofollow`.

### Trois portes, dans cet ordre

1. **Porte technique** — lien supprimé, désactivé ou expiré : page sobre
   « Ce lien d'écoute n'est plus actif », nom de l'artiste, rien d'autre.
   Aucune fuite de tracklist.
2. **Porte mot de passe** (si `password_hash`) — écran unique, champ code,
   validation serveur. Succès → cookie signé `HttpOnly` scopé au chemin du slug,
   pour ne pas ressaisir le code au retour.
3. **Porte d'identification** — « Vous êtes ? », pré-rempli depuis `?i=`,
   sinon vide. **« Écouter sans m'identifier »** en dessous, discret mais
   parfaitement lisible. Jamais bloquante. Une ligne sous le champ indique
   franchement à quoi sert le nom (voir « Pédagogie de la confidentialité »).

### L'écoute

En-tête compact : artwork, nom d'artiste, titre du lien, mot d'intro, nombre de
titres.

Tracklist dense : numéro, titre, artistes invités, badge de version, durée. Les
`group_label` introduisent des sections par un simple intertitre.

Le titre en cours se déplie :
- **waveform cliquable** — peaks pré-calculés, rendu SVG, progression peinte en
  `#F0FF00` sur un tracé `rgba(245,245,245,0.25)` ;
- **bloc crédits** replié par défaut — ISRC, rôle, label, date de sortie, genre.

Lecture continue automatique. Barre de lecture ancrée en bas de page. Un seul
élément `<audio>` réutilisé pour toute la session (évite les fuites mémoire sur
une longue écoute).

Pied de page : bouton discret vers le presskit si renseigné, mention SIDEKICK
légère.

### Mobile

La barre de lecture passe en plein écran au tap, la waveform reste tactile.

### Protection du fichier

Aucune URL audio n'apparaît jamais dans le HTML. Au `play`, le client appelle
`POST /api/listening/[slug]/audio/[itemId]` ; la route revérifie
`is_active`, `expires_at` et le cookie mot de passe, puis renvoie une **URL
Supabase signée valable 5 minutes**. Une URL interceptée et repartagée est morte
avant d'arriver.

Le téléchargement passe par une route distincte qui refuse si `allow_download`
est faux. Le contrôle n'est jamais côté client.

## Routes API publiques

| Route | Rôle |
|---|---|
| `GET /api/listening/[slug]` | métadonnées + items **sans URL audio** + drapeaux (mot de passe requis, expiré) |
| `POST /api/listening/[slug]/unlock` | vérifie le mot de passe, pose le cookie |
| `POST /api/listening/[slug]/session` | crée la session (nom optionnel), renvoie un token de session |
| `POST /api/listening/[slug]/audio/[itemId]` | URL signée 5 min |
| `POST /api/listening/[slug]/event` | upsert de progression (heartbeat 10 s) |
| `GET /api/listening/[slug]/download/[itemId]` | si `allow_download` |

## Côté artiste

### Page `/phono/liens-ecoute`

Ajouter l'entrée dans `phonoSubItems` de `src/components/layout/Sidebar.tsx`,
aux côtés de Catalogue et Sessions studio.

Liste : titre, nombre de titres, expiration, badges (🔒 protégé, ⬇ téléchargeable),
et surtout **dernière écoute + nombre de sessions**. Un lien jamais ouvert depuis
plusieurs jours se repère immédiatement.

Deux actions distinctes :
- **Désactiver** — coupe la page (404) en conservant l'historique d'écoute.
  Utile pour garder la preuve qu'un label a écouté avant de fermer l'accès.
- **Supprimer** — retire la page immédiatement et efface les statistiques en
  cascade. Confirmation explicite.

### Le composeur

Entrée depuis le catalogue (cocher des titres/albums/podcasts → « Créer un lien
d'écoute ») ou depuis une page vide avec recherche dans le catalogue.

Deux colonnes :
- **gauche** — la sélection, réordonnable par glisser-déposer, avec pour chaque
  titre un **sélecteur de version** (c'est là qu'on choisit d'envoyer le master
  plutôt que le rough mix) ;
- **droite** — titre, mot d'intro, mot de passe, expiration, téléchargement,
  lien presskit.

Un titre dont la version choisie n'a **pas** de fichier audio est signalé en
clair dans le composeur et bloque la publication tant qu'il n'est pas résolu ou
retiré. Jamais de titre publié silencieusement muet.

### Analytics par lien

Trois chiffres en tête : sessions, taux d'écoute moyen, téléchargements.

Puis deux blocs volontairement distincts :

- **Sessions identifiées** — nom saisi, date, détail titre par titre : écouté à
  92 %, passé à 0:18, réécouté 3 fois, téléchargé. C'est le matériau de la
  relance.
- **Écoutes anonymes** — agrégat seul : nombre de sessions, titres les plus
  écoutés. Le signal « ça circule », sans nom.

Une vue transverse **par titre**, tous liens confondus, indique quel morceau
retient réellement l'attention des pros.

### Diffusion

- **Copier le lien** — bouton simple.
- **Envoi via le module Mail** — crée une ligne `user_listening_invites` et
  insère le lien porteur de `?i=`. Nom pré-rempli côté destinataire, session
  nominative, et le tracking d'ouverture mail existant continue de fonctionner.
- **Relance automatique** — nouveau fichier `src/modules/tasks/rules/phono.ts`,
  branché sur `RuleContext` (ajouter le champ `phono` dans `types.ts`, appeler le
  hook dans `Tasks.tsx`). Fait apparaître « Relancer [contact] sur [lien] »
  quand un envoi n'a pas été ouvert après un délai.

## Pédagogie de la confidentialité

Deux publics, deux messages différents. Le principe commun : **dire ce que le
système fait vraiment, sans surpromettre**.

### Côté artiste — comprendre ce qu'il protège

Dans le composeur, un encart résume **dynamiquement** les protections actives du
lien en cours, et se met à jour à chaque réglage :

> Lien non devinable · Protégé par mot de passe · Expire le 12/10/2026 ·
> Téléchargement désactivé

Chaque réglage porte une explication d'une ligne, au moment où on le manipule :
- **Mot de passe** — « Un lien transféré sans le code reste inutilisable. »
- **Expiration** — « Passée cette date, la page ne diffuse plus rien, même pour
  ceux qui ont déjà le lien. »
- **Téléchargement** — activer ce réglage affiche un avertissement explicite :
  « Le destinataire obtient le fichier. Vous perdez tout contrôle dessus. » Le
  réglage reste désactivé par défaut.

Un court bloc « Comment ce lien est protégé », dépliable, expose la mécanique
sans jargon : URL impossible à deviner, page non indexée par les moteurs de
recherche, fichiers servis par des adresses temporaires qui expirent en quelques
minutes, désactivation possible à tout moment.

**Et il énonce aussi la limite, honnêtement** : aucun système ne peut empêcher
quelqu'un d'enregistrer un son qu'il est autorisé à écouter. La protection réduit
fortement le risque de rediffusion accidentelle — un lien transféré, une URL
copiée — mais elle ne remplace pas la confiance qu'on accorde au destinataire.
Surpromettre ici serait le pire service à rendre à un artiste qui envoie un album
non sorti.

### Côté destinataire — comprendre ce qu'on lui confie

Le ton est professionnel et bref, jamais anxiogène ni menaçant : un
programmateur reçoit des promos toute la journée, on ne le sermonne pas.

En tête de page, sous le titre, une ligne discrète avec une icône de cadenas :

> **Écoute privée** — titres non publiés, merci de ne pas rediffuser ce lien.

Quand une protection particulière est active, elle est mentionnée factuellement :
« Ce lien expire le 12 octobre. » C'est une information utile pour lui, pas une
mise en garde.

**Transparence sur le suivi d'écoute.** Sous le champ d'identification, une ligne
claire :

> Votre nom permet à l'artiste de savoir qui a écouté. L'écoute des titres est
> mesurée dans tous les cas, de façon anonyme si vous ne vous identifiez pas.

C'est une exigence RGPD — on mesure un comportement identifiable —, et c'est
aussi la bonne pratique : les plateformes B2B du secteur affichent toutes ce
suivi, les pros s'y attendent. Le dire ouvertement rend l'outil crédible plutôt
que suspect, alors qu'un tracking découvert après coup abîmerait durablement la
relation que l'artiste cherche à construire.

Aucune de ces mentions ne s'interpose entre le destinataire et la musique : ce
sont des lignes de texte, pas des modales à valider.

## États vides

| Situation | Comportement |
|---|---|
| **Catalogue vide** (aucun titre, album ni podcast) | La page Liens d'écoute affiche un état vide qui **renvoie vers le catalogue** : « Ajoutez d'abord des titres à votre catalogue pour composer un lien d'écoute », avec un bouton primaire vers `/phono/catalogue`. Le bouton « Créer un lien d'écoute » est absent, pas désactivé. |
| **Catalogue rempli, aucun lien** | État vide invitant à composer : explication d'une phrase de ce qu'est un lien d'écoute, bouton primaire « Créer un lien d'écoute ». |
| **Catalogue rempli, aucun fichier audio** | État vide spécifique : « Vos titres n'ont pas encore de fichier audio », bouton vers le catalogue pour en rattacher. C'est le cas le plus probable juste après la migration. |
| **Composeur, sélection vide** | Colonne gauche vide invitant à chercher dans le catalogue ; publication désactivée. |
| **Lien sans aucune écoute** | L'onglet analytics affiche « Pas encore d'écoute » avec la date d'envoi et, s'il existe un envoi non ouvert, un rappel de l'action de relance. |
| **Recherche catalogue sans résultat** | Message court et lien pour vider les filtres. |

## Hors périmètre v1

Chacun de ces points est une brique autonome, ajoutable plus tard sans rien
casser :

- commentaires horodatés du destinataire sur la waveform ;
- filigrane audio vocal (voice tag) ;
- streaming segmenté HLS ;
- transcodage serveur (l'artiste uploade ce qu'il veut servir) ;
- lien nominatif unique par destinataire (couvert par `?i=` + identification
  souple) ;
- expiration automatique du lien après N écoutes.
