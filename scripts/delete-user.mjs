// scripts/delete-user.mjs — suppression de compte, et balayage des dossiers orphelins.
//
//   node scripts/delete-user.mjs <email>            aperçu, ne supprime rien
//   node scripts/delete-user.mjs <email> --yes      exécute
//   node scripts/delete-user.mjs --sweep            liste les dossiers orphelins
//   node scripts/delete-user.mjs --sweep --yes      les supprime
//
// Pourquoi ce script existe : la procédure 4 du registre RGPD demande de vider
// le dossier `{userId}/` du bucket **avant** de supprimer l'utilisateur, parce
// qu'après on ne connaît plus l'identifiant et les fichiers deviennent
// introuvables. Fait à la main dans le dashboard Supabase, l'ordre s'oublie.
// Ici il est câblé, et le mode balayage rattrape les dossiers déjà abandonnés.
//
// La politique de confidentialité engage un effacement sous 30 jours à compter
// de la demande. Ce script est la partie automatisable de cet engagement ; les
// étapes chez les prestataires restent manuelles et sont rappelées à la fin.
//
// Voir docs/legal/registre-rgpd.md (procédure 4) et
// docs/legal/passation-durees-conservation.md.

import { createClient } from "@supabase/supabase-js";

const BUCKET = "drive";
const REMOVE_CHUNK = 1000;
const LIST_PAGE = 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

try {
  process.loadEnvFile(".env.local");
} catch {
  // Pas de .env.local : les variables viennent alors de l'environnement.
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "✗ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis " +
      "(.env.local ou environnement)."
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const confirmed = args.includes("--yes");
const sweep = args.includes("--sweep");
const email = args.find((a) => !a.startsWith("--"));

if (!sweep && !email) {
  console.error(
    "Usage :\n" +
      "  node scripts/delete-user.mjs <email> [--yes]\n" +
      "  node scripts/delete-user.mjs --sweep [--yes]"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Formate une taille en octets pour l'affichage. */
function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  const units = ["Ko", "Mo", "Go"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

/**
 * Liste une page de préfixe, en pagination complète : `list` plafonne à 1000
 * entrées par appel et un dossier de catalogue peut en contenir davantage.
 */
async function listPrefix(prefix) {
  const entries = [];
  for (let offset = 0; ; offset += LIST_PAGE) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: LIST_PAGE, offset });
    if (error) throw new Error(`list ${prefix || "/"} : ${error.message}`);
    const page = data ?? [];
    entries.push(...page);
    if (page.length < LIST_PAGE) break;
  }
  return entries;
}

/**
 * L'API Storage distingue un dossier d'un fichier par `id` et `metadata` à
 * null. Pas besoin d'une requête par élément.
 */
function isFolder(item) {
  return item.id == null && item.metadata == null;
}

/** Tous les objets sous un préfixe, récursivement, placeholders compris. */
async function listAllObjects(prefix) {
  const entries = await listPrefix(prefix);
  const objects = [];
  const subfolders = [];
  for (const item of entries) {
    if (!item.name) continue;
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (isFolder(item)) subfolders.push(path);
    else objects.push({ path, size: Number(item.metadata?.size) || 0 });
  }
  for (const sub of subfolders) {
    objects.push(...(await listAllObjects(sub)));
  }
  return objects;
}

/**
 * Vide un préfixe et vérifie que le bucket ne renvoie plus rien dessous.
 *
 * La vérification n'est pas décorative : `remove` renvoie la liste des objets
 * effectivement supprimés sans faire d'erreur sur ceux qu'il n'a pas pu
 * atteindre. Sans relecture, on annoncerait un effacement qui n'a pas eu lieu.
 */
async function wipePrefix(prefix, objects) {
  for (let i = 0; i < objects.length; i += REMOVE_CHUNK) {
    const chunk = objects.slice(i, i + REMOVE_CHUNK).map((o) => o.path);
    const { error } = await supabase.storage.from(BUCKET).remove(chunk);
    if (error) throw new Error(`remove ${prefix} : ${error.message}`);
  }
  const rest = await listAllObjects(prefix);
  if (rest.length > 0) {
    throw new Error(
      `${prefix} : ${rest.length} objet(s) subsistent après suppression. ` +
        "L'utilisateur n'a pas été supprimé, son identifiant reste connu."
    );
  }
}

/** Tous les comptes, en pagination — l'API plafonne à 1000 par page. */
async function listAllUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: LIST_PAGE,
    });
    if (error) throw new Error(`listUsers : ${error.message}`);
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < LIST_PAGE) break;
  }
  return users;
}

const MANUAL_STEPS = `
Reste à faire à la main (procédure 4 du registre) :
  • PostHog → Persons → rechercher l'email → Delete person and events
  • Brevo → Contacts → supprimer le contact s'il existe
  • Supprimer la notification d'inscription de la boîte SIGNUP_NOTIFY_TO
  • Confirmer la suppression par email (délai engagé : 30 jours)`;

async function deleteOneUser(targetEmail) {
  const users = await listAllUsers();
  const needle = targetEmail.trim().toLowerCase();
  const user = users.find((u) => (u.email ?? "").toLowerCase() === needle);

  if (!user) {
    console.error(`✗ Aucun compte pour ${targetEmail}.`);
    process.exit(1);
  }

  if (process.env.SHOT_EMAIL && needle === process.env.SHOT_EMAIL.toLowerCase()) {
    console.warn(
      "⚠️  C'est le compte de SHOT_EMAIL, celui dont scripts/shots.mjs tire " +
        "les captures de la landing. Le supprimer casse la génération des " +
        "visuels et, s'il s'agit du compte du fondateur, efface des données réelles."
    );
  }

  const objects = await listAllObjects(user.id);
  const total = objects.reduce((sum, o) => sum + o.size, 0);

  console.log(`Compte    : ${user.email}`);
  console.log(`Identifiant: ${user.id}`);
  console.log(`Créé le   : ${user.created_at}`);
  console.log(`Bucket    : ${objects.length} fichier(s), ${humanSize(total)}`);

  if (!confirmed) {
    console.log(
      "\nAperçu seulement, rien n'a été supprimé. " +
        `Relance avec --yes pour exécuter :\n  node scripts/delete-user.mjs ${user.email} --yes`
    );
    return;
  }

  if (objects.length > 0) {
    await wipePrefix(user.id, objects);
    console.log(`✓ ${objects.length} fichier(s) supprimé(s) du bucket.`);
  }

  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) {
    console.error(
      `✗ Suppression de l'utilisateur : ${error.message}\n` +
        "  Les fichiers sont déjà effacés. L'identifiant à reprendre est " +
        `${user.id}.`
    );
    process.exit(1);
  }
  console.log("✓ Utilisateur supprimé, les tables publiques suivent par cascade.");
  console.log(MANUAL_STEPS);
}

async function sweepOrphans() {
  const [rootEntries, users] = await Promise.all([listPrefix(""), listAllUsers()]);
  const known = new Set(users.map((u) => u.id));

  // Un dossier racine porte un identifiant d'utilisateur. Tout ce qui n'a pas
  // cette forme n'a pas été posé par l'application : on n'y touche pas, on le
  // signale.
  const unexpected = rootEntries
    .map((e) => e.name)
    .filter((n) => n && !UUID_RE.test(n));
  if (unexpected.length > 0) {
    console.warn(
      `⚠️  ${unexpected.length} entrée(s) à la racine du bucket sans forme ` +
        `d'identifiant, laissée(s) intacte(s) : ${unexpected.join(", ")}`
    );
  }

  const orphanIds = rootEntries
    .map((e) => e.name)
    .filter((n) => n && UUID_RE.test(n) && !known.has(n));

  if (orphanIds.length === 0) {
    console.log(
      `✓ Aucun dossier orphelin (${rootEntries.length} dossier(s) à la racine, ` +
        `${users.length} compte(s)).`
    );
    return;
  }

  let grandTotal = 0;
  const orphans = [];
  for (const id of orphanIds) {
    const objects = await listAllObjects(id);
    const size = objects.reduce((sum, o) => sum + o.size, 0);
    grandTotal += size;
    orphans.push({ id, objects, size });
    console.log(`  ${id} — ${objects.length} fichier(s), ${humanSize(size)}`);
  }
  console.log(
    `\n${orphans.length} dossier(s) orphelin(s), ${humanSize(grandTotal)} au total.`
  );

  if (!confirmed) {
    console.log(
      "\nAperçu seulement. Relance avec --yes pour supprimer :\n" +
        "  node scripts/delete-user.mjs --sweep --yes"
    );
    return;
  }

  for (const orphan of orphans) {
    if (orphan.objects.length === 0) continue;
    await wipePrefix(orphan.id, orphan.objects);
    console.log(`✓ ${orphan.id} vidé.`);
  }
  console.log(`✓ ${humanSize(grandTotal)} libérés.`);
}

try {
  if (sweep) await sweepOrphans();
  else await deleteOneUser(email);
} catch (err) {
  console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
