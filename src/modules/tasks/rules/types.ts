// src/modules/tasks/rules/types.ts
import type { Todo, Project } from "@/lib/sidekick-store";
import type { TourDate, RehearsalItem } from "@/hooks/useLiveData";
import type { AdminStructure, AdminProcedure } from "@/lib/sidekick-store";
import type { DistributorImport, Invoice } from "@/hooks/useIncomesData";
import type { TaskSector } from "@/modules/tasks/components/TaskModal";

export interface RuleContext {
  tasks: Todo[];
  live: { tourDates: TourDate[]; rehearsals: RehearsalItem[] } | null;
  admin: { structures: AdminStructure[]; procedures: AdminProcedure[] } | null;
  incomes: { invoices: Invoice[]; imports: DistributorImport[] } | null;
  projects: Project[] | null;
}

export interface RuleSuggestion {
  title: string;
  sector: TaskSector;
  reason: string;
  source: "rule";
}

export type Rule = (context: RuleContext) => RuleSuggestion | null;
