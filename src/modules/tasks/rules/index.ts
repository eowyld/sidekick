import { liveRules } from "./live";
import { adminRules } from "./admin";
import { incomesRules } from "./incomes";
import type { Rule } from "./types";

export const allRules: Rule[] = [
  ...liveRules,
  ...adminRules,
  ...incomesRules,
];
