// src/modules/tasks/rules/types.ts
import type { Todo, Project } from "@/lib/sidekick-store";
import type { TourDate, RehearsalItem } from "@/hooks/useLiveData";
import type { AdminStructure, AdminProcedure } from "@/lib/sidekick-store";
import type { DistributorImport, Invoice } from "@/hooks/useIncomesData";
import type { ListeningInvite, ListeningLink } from "@/lib/listening-types";
import type { TaskSector } from "@/modules/tasks/components/TaskModal";
import type { Track, Work } from "@/lib/sidekick-store";
import type { Agreement } from "@/modules/edition/lib/agreement-types";

export interface RuleContext {
  tasks: Todo[];
  live: { tourDates: TourDate[]; rehearsals: RehearsalItem[] } | null;
  admin: { structures: AdminStructure[]; procedures: AdminProcedure[] } | null;
  incomes: { invoices: Invoice[]; imports: DistributorImport[] } | null;
  projects: Project[] | null;
  phono: { links: ListeningLink[]; invites: ListeningInvite[] } | null;
  /** Œuvres, accords, et ce qui dit leur vie hors d'Édition (titres Phono, dates Live). */
  edition: { works: Work[]; agreements: Agreement[]; tracks: Track[]; tourDates: TourDate[]; artistName: string } | null;
}

export interface RuleSuggestion {
  title: string;
  sector: TaskSector;
  reason: string;
  source: "rule";
}

export type Rule = (context: RuleContext) => RuleSuggestion | null;
