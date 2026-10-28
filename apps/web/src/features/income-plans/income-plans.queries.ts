import { queryOptions } from "@tanstack/react-query";
import { getIncomePlan } from "./income-plans.api";

export const incomePlanKeys = {
  all: ["income-plans"] as const,
  detail: (period: string) => [...incomePlanKeys.all, period] as const,
};

export function incomePlanQueryOptions(period: string) {
  return queryOptions({
    queryKey: incomePlanKeys.detail(period),
    queryFn: () => getIncomePlan(period),
  });
}
