"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  getStorageKey,
  mergeWithDefaults,
  type SidekickData,
  type Todo,
} from "@/lib/sidekick-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Tasks ───────────────────────────────────────────────────────────────────

function todoToRow(todo: Todo, userId: string): Record<string, unknown> {
  return {
    id: todo.id,
    user_id: userId,
    title: todo.title,
    status: todo.status ?? "todo",
    today_focus: todo.todayFocus ?? false,
    description: todo.description ?? null,
    deadline: todo.deadline ?? null,
    sector: todo.sector ?? null,
    created_at: todo.createdAt ?? null,
    subtasks: todo.subtasks ?? [],
  };
}

// ─── Contacts ────────────────────────────────────────────────────────────────

type LocalContact = {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  city: string;
  email: string;
  instagram: string;
  phone: string;
  notes: string;
  createdAt?: string;
};

function contactToRow(contact: LocalContact, userId: string): Record<string, unknown> {
  return {
    id: String(contact.id),
    user_id: userId,
    first_name: contact.firstName,
    last_name: contact.lastName,
    role: contact.role ?? "",
    city: contact.city ?? "",
    email: contact.email ?? "",
    instagram: contact.instagram ?? "",
    phone: contact.phone ?? "",
    notes: contact.notes ?? "",
    created_at: contact.createdAt ?? null,
  };
}

// ─── Module card ─────────────────────────────────────────────────────────────

type ModuleStatus = "checking" | "ready" | "already_migrated" | "empty" | "migrating" | "done" | "error";

function ModuleCard({
  title,
  status,
  localCount,
  existingCount,
  migratedCount,
  errorMessage,
  onMigrate,
  onClean,
}: {
  title: string;
  status: ModuleStatus;
  localCount: number;
  existingCount: number;
  migratedCount: number;
  errorMessage: string | null;
  onMigrate: () => void;
  onClean: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "checking" && (
          <p className="text-sm text-[#F5F5F5]/60">Vérification en cours…</p>
        )}

        {status === "already_migrated" && (
          <div className="space-y-2">
            <p className="text-sm text-amber-400">
              Déjà migré — {existingCount} entrée{existingCount > 1 ? "s" : ""} en base.
            </p>
            <p className="text-xs text-[#F5F5F5]/40">
              La migration a déjà été effectuée. Relancer écraserait les données existantes.
            </p>
          </div>
        )}

        {status === "empty" && (
          <p className="text-xs text-[#F5F5F5]/40">Aucune donnée à migrer en localStorage.</p>
        )}

        {status === "ready" && (
          <div className="space-y-4">
            <p className="text-sm text-[#F5F5F5]/70">
              {localCount} entrée{localCount > 1 ? "s" : ""} trouvée{localCount > 1 ? "s" : ""} en localStorage, prête{localCount > 1 ? "s" : ""} à migrer.
            </p>
            <Button onClick={onMigrate}>Lancer la migration</Button>
          </div>
        )}

        {status === "migrating" && (
          <p className="text-sm text-[#F5F5F5]/60">Migration en cours…</p>
        )}

        {status === "done" && (
          <div className="space-y-4">
            <p className="text-sm text-green-400">
              ✓ {migratedCount} entrée{migratedCount > 1 ? "s" : ""} migrée{migratedCount > 1 ? "s" : ""} avec succès.
            </p>
            <Button variant="outline" onClick={onClean}>
              Nettoyer le localStorage
            </Button>
          </div>
        )}

        {status === "error" && (
          <p className="text-sm text-red-400">Erreur : {errorMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MigratePage() {
  const [userId, setUserId] = useState<string | null>(null);

  // Tasks state
  const [localTasks, setLocalTasks] = useState<Todo[]>([]);
  const [tasksExisting, setTasksExisting] = useState(0);
  const [tasksStatus, setTasksStatus] = useState<ModuleStatus>("checking");
  const [tasksMigrated, setTasksMigrated] = useState(0);
  const [tasksError, setTasksError] = useState<string | null>(null);

  // Contacts state
  const [localContacts, setLocalContacts] = useState<LocalContact[]>([]);
  const [contactsExisting, setContactsExisting] = useState(0);
  const [contactsStatus, setContactsStatus] = useState<ModuleStatus>("checking");
  const [contactsMigrated, setContactsMigrated] = useState(0);
  const [contactsError, setContactsError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);

      // --- Tasks ---
      const sidekickKey = getStorageKey(user.id);
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(sidekickKey) : null;
      const parsed = raw ? (JSON.parse(raw) as Partial<SidekickData>) : null;
      const merged = mergeWithDefaults(parsed);
      const tasks = merged.tasks ?? [];
      setLocalTasks(tasks);

      const { count: tasksCount } = await supabase
        .from("user_tasks")
        .select("id", { count: "exact", head: true });
      setTasksExisting(tasksCount ?? 0);
      setTasksStatus((tasksCount ?? 0) > 0 ? "already_migrated" : tasks.length === 0 ? "empty" : "ready");

      // --- Contacts ---
      const contactsRaw = typeof window !== "undefined" ? window.localStorage.getItem("contacts:list") : null;
      const contacts: LocalContact[] = contactsRaw ? (JSON.parse(contactsRaw) as LocalContact[]) : [];
      setLocalContacts(contacts);

      const { count: contactsCount } = await supabase
        .from("user_contacts")
        .select("id", { count: "exact", head: true });
      setContactsExisting(contactsCount ?? 0);
      setContactsStatus((contactsCount ?? 0) > 0 ? "already_migrated" : contacts.length === 0 ? "empty" : "ready");
    });
  }, []);

  // --- Tasks handlers ---

  const handleMigrateTasks = async () => {
    if (!userId || localTasks.length === 0) return;
    setTasksStatus("migrating");
    const supabase = createClient();
    const { error } = await supabase.from("user_tasks").insert(localTasks.map((t) => todoToRow(t, userId)));
    if (error) { setTasksError(error.message); setTasksStatus("error"); }
    else { setTasksMigrated(localTasks.length); setTasksStatus("done"); }
  };

  const handleCleanTasks = () => {
    if (!userId) return;
    const key = getStorageKey(userId);
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw) as SidekickData;
    parsed.tasks = [];
    window.localStorage.setItem(key, JSON.stringify(parsed));
    alert("localStorage nettoyé — tasks vidées.");
  };

  // --- Contacts handlers ---

  const handleMigrateContacts = async () => {
    if (!userId || localContacts.length === 0) return;
    setContactsStatus("migrating");
    const supabase = createClient();
    const { error } = await supabase.from("user_contacts").insert(localContacts.map((c) => contactToRow(c, userId)));
    if (error) { setContactsError(error.message); setContactsStatus("error"); }
    else { setContactsMigrated(localContacts.length); setContactsStatus("done"); }
  };

  const handleCleanContacts = () => {
    window.localStorage.removeItem("contacts:list");
    window.localStorage.removeItem("contacts:customRoles");
    alert("localStorage nettoyé — contacts vidés.");
  };

  return (
    <div className="space-y-6 p-6 max-w-xl">
      <div>
        <h1 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#F5F5F5]/40 mb-1">
          Admin
        </h1>
        <p className="text-xl font-bold tracking-tight text-[#F5F5F5]">Migration des données</p>
        <p className="text-sm text-[#F5F5F5]/50 mt-1">
          Migre les données du localStorage vers Supabase. À effectuer une seule fois par module.
        </p>
      </div>

      <ModuleCard
        title="Tasks → Supabase"
        status={tasksStatus}
        localCount={localTasks.length}
        existingCount={tasksExisting}
        migratedCount={tasksMigrated}
        errorMessage={tasksError}
        onMigrate={handleMigrateTasks}
        onClean={handleCleanTasks}
      />

      <ModuleCard
        title="Contacts → Supabase"
        status={contactsStatus}
        localCount={localContacts.length}
        existingCount={contactsExisting}
        migratedCount={contactsMigrated}
        errorMessage={contactsError}
        onMigrate={handleMigrateContacts}
        onClean={handleCleanContacts}
      />
    </div>
  );
}
