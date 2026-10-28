import type { SaveIncomePlanInput } from "@openmonetis/validators/income-plans";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { copyPreviousIncomePlan, deleteIncomePlan, saveIncomePlan } from "./income-plans.api";
import { incomePlanKeys } from "./income-plans.queries";

function useRefreshPlans() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: incomePlanKeys.all });
}

export function useSaveIncomePlanMutation() {
  const refresh = useRefreshPlans();
  return useMutation({
    mutationFn: ({ period, input }: { period: string; input: SaveIncomePlanInput }) =>
      saveIncomePlan(period, input),
    onSuccess: refresh,
  });
}

export function useCopyPreviousIncomePlanMutation() {
  const refresh = useRefreshPlans();
  return useMutation({ mutationFn: copyPreviousIncomePlan, onSuccess: refresh });
}

export function useDeleteIncomePlanMutation() {
  const refresh = useRefreshPlans();
  return useMutation({ mutationFn: deleteIncomePlan, onSuccess: refresh });
}
