export * from "@/domain/types";

import type { CalculationInput } from "@/domain/types";

export type RouteState = {
  "/result"?: { input: CalculationInput } | { recordId: string } | null;
  "/history/:id"?: { from?: "list" | "result" } | null;
  "/"?: { prefill?: Partial<CalculationInput> } | null;
  "/stats"?: null;
};
