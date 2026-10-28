import type { UpdateSpendingAreaInput } from "@openmonetis/validators/spending-areas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { incomePlanKeys } from "@/features/income-plans/income-plans.queries";
import { createSpendingArea, deleteSpendingArea, updateSpendingArea } from "./spending-areas.api";
import { spendingAreaKeys } from "./spending-areas.queries";

function useRefreshAreas() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: spendingAreaKeys.all }),
      client.invalidateQueries({ queryKey: incomePlanKeys.all }),
    ]);
}

export function useCreateSpendingAreaMutation() {
  const refresh = useRefreshAreas();
  return useMutation({ mutationFn: createSpendingArea, onSuccess: refresh });
}

export function useUpdateSpendingAreaMutation() {
  const refresh = useRefreshAreas();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSpendingAreaInput }) =>
      updateSpendingArea(id, input),
    onSuccess: refresh,
  });
}

export function useDeleteSpendingAreaMutation() {
  const refresh = useRefreshAreas();
  return useMutation({ mutationFn: deleteSpendingArea, onSuccess: refresh });
}
