"use client";

import { useCallback, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { createClient, getSessionUser } from "@/lib/supabase";
import {
  DEFAULT_INVOICE_TEMPLATE,
  DEFAULT_SIDEKICK_DATA,
  type InvoiceTemplate,
} from "@/lib/sidekick-store";

const KEY = "user_preferences";

export type EnabledModules = {
  live: boolean;
  phono: boolean;
  admin: boolean;
  marketing: boolean;
  edition: boolean;
  revenus: boolean;
  projects: boolean;
};

/** Secteurs artistiques proposés au choix à l'inscription. */
export type Sector = "live" | "phono" | "edition";
export const SECTORS: Sector[] = ["live", "phono", "edition"];

const DEFAULT_ENABLED_MODULES = DEFAULT_SIDEKICK_DATA.preferences
  .enabledModules as EnabledModules;

/** Table → identifiants des lignes créées par le seed de démonstration. */
export type DemoManifest = Record<string, string[]>;

type PreferencesRow = {
  enabled_modules: Partial<EnabledModules>;
  onboarding_completed_at: string | null;
  onboarding_sectors: Sector[];
  demo_seed: DemoManifest | null;
  reminders_enabled: boolean;
  /** NULL tant que l'utilisateur n'a pas touché aux réglages de facturation. */
  invoice_template: InvoiceTemplate | null;
  invoice_footer_note: string | null;
};

/**
 * Une clé absente vaut "activé" — sémantique historique `enabledModules.x !== false`
 * sur laquelle reposent la Sidebar, les règles de tâches et les filtres de secteur.
 * L'onboarding doit donc écrire `false` explicitement pour les secteurs non choisis,
 * jamais omettre la clé.
 */
function mergeEnabled(stored: Partial<EnabledModules> | null | undefined): EnabledModules {
  return { ...DEFAULT_ENABLED_MODULES, ...(stored ?? {}) };
}

const BASE_COLUMNS = "enabled_modules, onboarding_completed_at, onboarding_sectors";
/** Code Postgres « undefined_column ». */
const UNDEFINED_COLUMN = "42703";

async function fetchPreferences(): Promise<PreferencesRow | null> {
  const supabase = createClient();

  // Les colonnes hors socle arrivent par migration. Tant qu'elles ne sont pas
  // appliquées, on relit avec une sélection plus courte plutôt que de laisser
  // tomber toutes les préférences — sinon la sidebar et les règles de tâches
  // perdent leur configuration.
  //
  // Le repli est progressif, de la sélection la plus riche à la plus pauvre :
  // une base à jour sur les rappels mais pas encore sur la facturation doit
  // continuer à servir `reminders_enabled` et `demo_seed`.
  const SELECTS = [
    `${BASE_COLUMNS}, demo_seed, reminders_enabled, invoice_template, invoice_footer_note`,
    `${BASE_COLUMNS}, demo_seed, reminders_enabled`,
    BASE_COLUMNS,
  ];

  let data: Record<string, unknown> | null = null;
  let error: { code?: string; message: string } | null = null;

  for (const columns of SELECTS) {
    ({ data, error } = await supabase.from("user_preferences").select(columns).maybeSingle());
    if (error?.code !== UNDEFINED_COLUMN) break;
  }

  if (error) throw new Error(error.message);
  if (!data) return null; // aucune ligne encore : l'utilisateur est sur les défauts
  return {
    enabled_modules: (data.enabled_modules as Partial<EnabledModules>) ?? {},
    onboarding_completed_at: (data.onboarding_completed_at as string) ?? null,
    onboarding_sectors: (data.onboarding_sectors as Sector[]) ?? [],
    demo_seed: (data.demo_seed as DemoManifest | null) ?? null,
    // Absence de valeur = rappels actifs, comme le défaut de la colonne.
    reminders_enabled: (data as { reminders_enabled?: boolean }).reminders_enabled !== false,
    invoice_template:
      ((data as { invoice_template?: InvoiceTemplate | null }).invoice_template) ?? null,
    invoice_footer_note:
      ((data as { invoice_footer_note?: string | null }).invoice_footer_note) ?? null,
  };
}

export function usePreferencesData() {
  const {
    data: row,
    isLoading,
    error: swrError,
    mutate: mutateLocal,
  } = useSWR<PreferencesRow | null>(KEY, fetchPreferences);

  const error = swrError ? (swrError as Error).message : null;

  // Référence stable tant que la ligne SWR ne change pas : `enabledModules` est
  // une dépendance de useMemo dans Tasks.tsx, un nouvel objet à chaque rendu y
  // relancerait le calcul des règles en boucle.
  const enabledModules = useMemo(() => mergeEnabled(row?.enabled_modules), [row]);

  /**
   * Toujours complet : le défaut comble les champs jamais renseignés. Mémoïsé
   * pour la même raison qu'`enabledModules` — c'est une dépendance de useMemo
   * dans l'éditeur de facture, qui recalcule l'aperçu PDF.
   */
  const invoiceTemplate = useMemo(
    () => ({ ...DEFAULT_INVOICE_TEMPLATE, ...(row?.invoice_template ?? {}) }),
    [row]
  );

  /**
   * Applique un patch optimiste sur la ligne locale, puis l'upsert. `payload`
   * ne porte que les colonnes réellement écrites ; `patch` est fusionné sur la
   * ligne courante, de sorte qu'ajouter une colonne ne demande pas de repasser
   * sur chaque setter.
   */
  const persist = useCallback(
    (patch: Partial<PreferencesRow>, payload: Record<string, unknown>) => {
      const snapshot = row ?? null;
      const nextRow: PreferencesRow = {
        enabled_modules: row?.enabled_modules ?? {},
        onboarding_completed_at: row?.onboarding_completed_at ?? null,
        onboarding_sectors: row?.onboarding_sectors ?? [],
        demo_seed: row?.demo_seed ?? null,
        reminders_enabled: row?.reminders_enabled ?? true,
        invoice_template: row?.invoice_template ?? null,
        invoice_footer_note: row?.invoice_footer_note ?? null,
        ...patch,
      };
      mutateLocal(nextRow, false);

      (async () => {
        const supabase = createClient();
        const {
          data: { user },
        } = await getSessionUser(supabase);
        if (!user) {
          mutateLocal(snapshot, false);
          return;
        }

        const { error: upsertError } = await supabase
          .from("user_preferences")
          .upsert({ user_id: user.id, updated_at: new Date().toISOString(), ...payload });

        if (upsertError) {
          mutateLocal(snapshot, false);
        } else {
          mutate(KEY);
        }
      })();
    },
    [row, mutateLocal]
  );

  const setEnabledModules = useCallback(
    (patch: Partial<EnabledModules>) => {
      const nextEnabled = { ...enabledModules, ...patch };
      persist({ enabled_modules: nextEnabled }, { enabled_modules: nextEnabled });
    },
    [enabledModules, persist]
  );

  /** Interrupteur des rappels de démarches envoyés par email. */
  const setRemindersEnabled = useCallback(
    (value: boolean) => {
      persist({ reminders_enabled: value }, { reminders_enabled: value });
    },
    [persist]
  );

  /** Modèle visuel des PDF de facture. Le patch est fusionné sur le défaut. */
  const setInvoiceTemplate = useCallback(
    (patch: Partial<InvoiceTemplate>) => {
      const next: InvoiceTemplate = {
        ...DEFAULT_INVOICE_TEMPLATE,
        ...(row?.invoice_template ?? {}),
        ...patch,
      };
      persist({ invoice_template: next }, { invoice_template: next });
    },
    [row, persist]
  );

  /** Pied de facture mémorisé, proposé par défaut aux factures suivantes. */
  const setInvoiceFooterNote = useCallback(
    (note: string) => {
      persist({ invoice_footer_note: note }, { invoice_footer_note: note });
    },
    [persist]
  );

  /**
   * Enregistre le manifeste des données d'exemple, ou l'efface après leur
   * suppression. Attend la réponse Supabase : l'appelant a besoin de savoir
   * si la trace est bien posée avant de rendre la main.
   */
  const setDemoSeed = useCallback(
    async (manifest: DemoManifest | null) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await getSessionUser(supabase);
      if (!user) throw new Error("not_authenticated");

      const { error: upsertError } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          demo_seed: manifest,
          updated_at: new Date().toISOString(),
        });

      if (upsertError) throw new Error(upsertError.message);
      await mutate(KEY);
    },
    []
  );

  /**
   * Clôture l'onboarding. Les secteurs non retenus sont écrits à `false`
   * explicitement (cf. mergeEnabled), sinon ils resteraient visibles.
   */
  const completeOnboarding = useCallback(
    (sectors: Sector[]) => {
      const nextEnabled: EnabledModules = {
        ...enabledModules,
        live: sectors.includes("live"),
        phono: sectors.includes("phono"),
        edition: sectors.includes("edition"),
      };
      const completedAt = new Date().toISOString();
      persist(
        {
          enabled_modules: nextEnabled,
          onboarding_completed_at: completedAt,
          onboarding_sectors: sectors,
        },
        {
          enabled_modules: nextEnabled,
          onboarding_completed_at: completedAt,
          onboarding_sectors: sectors,
        }
      );
    },
    [enabledModules, persist]
  );

  return {
    enabledModules,
    setEnabledModules,
    completeOnboarding,
    setDemoSeed,
    demoSeed: row?.demo_seed ?? null,
    remindersEnabled: row?.reminders_enabled ?? true,
    setRemindersEnabled,
    invoiceTemplate,
    setInvoiceTemplate,
    invoiceFooterNote: row?.invoice_footer_note ?? "",
    setInvoiceFooterNote,
    onboardingCompleted: Boolean(row?.onboarding_completed_at),
    onboardingSectors: row?.onboarding_sectors ?? [],
    /** false tant que le chargement n'a pas eu lieu — évite le flash de sidebar. */
    preferencesReady: !isLoading,
    error,
  };
}
