import { queryOptions } from "@tanstack/react-query";
import { getSpendingAreas } from "./spending-areas.api";

export const spendingAreaKeys = {
  all: ["spending-areas"] as const,
};

export function spendingAreasQueryOptions() {
  return queryOptions({ queryKey: spendingAreaKeys.all, queryFn: getSpendingAreas });
}
