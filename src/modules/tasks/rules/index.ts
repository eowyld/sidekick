import { liveRules } from "./live";
import { adminRules } from "./admin";
import { incomesRules } from "./incomes";
import { projectsRules } from "./projects";
import { phonoRules } from "./phono";
import { editionRules } from "./edition";
import type { Rule } from "./types";

export const allRules: Rule[] = [
  ...liveRules,
  ...adminRules,
  ...incomesRules,
  ...projectsRules,
  ...phonoRules,
  ...editionRules,
];
