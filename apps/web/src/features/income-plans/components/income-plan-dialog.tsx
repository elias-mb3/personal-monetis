import {
  type IncomePlanOutput,
  type SaveIncomePlanInput,
  SaveIncomePlanInputSchema,
} from "@openmonetis/validators/income-plans";
import type { SpendingAreaOutput } from "@openmonetis/validators/spending-areas";
import { useForm } from "@tanstack/react-form";
import { useId, useState } from "react";
import { MobileFormContent as DialogContent } from "@/components/forms/mobile-form-content";
import { MobileFormDialog as Dialog } from "@/components/forms/mobile-form-dialog";
import { MobileFormState } from "@/components/forms/mobile-form-state";
import { MoneyValue } from "@/components/money-value";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSpendingAreaColorValue } from "@/features/spending-areas/spending-areas.presentation";
import { ApiClientError } from "@/lib/api-client";
import { showInvalidFormToast } from "@/lib/form-feedback";
import { cn } from "@/lib/utils";
import {
  type AllocationInputMode,
  formatPlanPercentage,
  getIncomePlanErrorMessage,
  previewAllocationAmount,
  previewAllocationPercentage,
} from "../income-plans.presentation";

type IncomePlanDialogProps = {
  areas: SpendingAreaOutput[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: SaveIncomePlanInput) => Promise<void>;
  open: boolean;
  plan: IncomePlanOutput | null;
};

type AllocationDraft = { areaId: string; mode: AllocationInputMode; value: string };

export function IncomePlanDialog({
  areas,
  onOpenChange,
  onSubmit,
  open,
  plan,
}: IncomePlanDialogProps) {
  const id = useId();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const plannedByArea = new Map(plan?.areas.map((area) => [area.areaId, area.plannedAmount]));
  const form = useForm({
    defaultValues: {
      incomeAmount: plan ? String(plan.incomeAmount) : "",
      allocations: areas.map(
        (area): AllocationDraft => ({
          areaId: area.id,
          mode: "percentage",
          value: plannedByArea.get(area.id)
            ? String(plan?.areas.find((item) => item.areaId === area.id)?.plannedPercentage ?? "")
            : "",
        }),
      ),
    },
    onSubmitInvalid: showInvalidFormToast,
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const result = SaveIncomePlanInputSchema.safeParse({
        incomeAmount: Number(value.incomeAmount),
        allocations: value.allocations
          .filter((allocation) => Number(allocation.value) > 0)
          .map((allocation) =>
            allocation.mode === "amount"
              ? { areaId: allocation.areaId, amount: Number(allocation.value) }
              : { areaId: allocation.areaId, percentage: Number(allocation.value) },
          ),
      });
      if (!result.success) {
        showInvalidFormToast();
        return;
      }
      try {
        await onSubmit(result.data);
        onOpenChange(false);
      } catch (error) {
        setSubmitError(
          getIncomePlanErrorMessage(error instanceof ApiClientError ? error.code : undefined),
        );
      }
    },
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent guarded>
        <DialogHeader>
          <DialogTitle>{plan ? "Editar planejamento" : "Novo planejamento"}</DialogTitle>
          <DialogDescription>
            Informe a renda do mês e quanto pretende destinar para cada área.
          </DialogDescription>
        </DialogHeader>

        <form
          data-mobile-page-form
          className="grid gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Subscribe
            selector={(state) => ({
              isDirty: !state.isDefaultValue,
              isSubmitting: state.isSubmitting,
            })}
          >
            {(state) => <MobileFormState {...state} />}
          </form.Subscribe>

          <form.Field
            name="incomeAmount"
            validators={{
              onBlur: ({ value }) =>
                SaveIncomePlanInputSchema.shape.incomeAmount.safeParse(Number(value)).success
                  ? undefined
                  : "Informe a renda do mês.",
            }}
          >
            {(field) => (
              <div className="grid gap-1.5">
                <Label htmlFor={`${id}-income`}>Renda planejada (100%)</Label>
                <CurrencyInput
                  aria-invalid={field.state.meta.errors.length > 0}
                  id={`${id}-income`}
                  onBlur={field.handleBlur}
                  onValueChange={field.handleChange}
                  placeholder="R$ 0,00"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <fieldset className="grid gap-2">
            <legend className="mb-2 font-medium text-sm">Divisão por área</legend>
            <form.Subscribe selector={(state) => Number(state.values.incomeAmount) || 0}>
              {(incomeAmount) =>
                areas.map((area, index) => (
                  <form.Field key={area.id} name={`allocations[${index}]`}>
                    {(field) => {
                      const draft = field.state.value;
                      const amount = previewAllocationAmount(incomeAmount, draft.mode, draft.value);
                      return (
                        <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border p-2">
                          <Label
                            className="flex min-w-0 items-center gap-2"
                            htmlFor={`${id}-${area.id}`}
                          >
                            <span
                              aria-hidden="true"
                              className="size-3 shrink-0 rounded-full"
                              style={{ backgroundColor: getSpendingAreaColorValue(area.color) }}
                            />
                            <span className="truncate">{area.name}</span>
                          </Label>
                          <div className="flex items-center gap-1">
                            {draft.mode === "amount" ? (
                              <CurrencyInput
                                className="w-32"
                                id={`${id}-${area.id}`}
                                onValueChange={(value) => field.handleChange({ ...draft, value })}
                                placeholder="R$ 0,00"
                                value={draft.value}
                              />
                            ) : (
                              <Input
                                className="w-24"
                                id={`${id}-${area.id}`}
                                inputMode="decimal"
                                max={100}
                                min={0}
                                onChange={(event) =>
                                  field.handleChange({
                                    ...draft,
                                    value: event.target.value.replace(",", "."),
                                  })
                                }
                                placeholder="0"
                                step="0.1"
                                type="number"
                                value={draft.value}
                              />
                            )}
                            <Button
                              aria-label={
                                draft.mode === "amount"
                                  ? "Informar em porcentagem"
                                  : "Informar em reais"
                              }
                              onClick={() =>
                                field.handleChange({
                                  areaId: draft.areaId,
                                  mode: draft.mode === "amount" ? "percentage" : "amount",
                                  value: "",
                                })
                              }
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              {draft.mode === "amount" ? "R$" : "%"}
                            </Button>
                          </div>
                          <p className="col-span-2 text-muted-foreground text-xs">
                            <MoneyValue amount={amount} /> ·{" "}
                            {formatPlanPercentage(
                              previewAllocationPercentage(incomeAmount, amount),
                            )}
                          </p>
                        </div>
                      );
                    }}
                  </form.Field>
                ))
              }
            </form.Subscribe>
          </fieldset>

          <form.Subscribe
            selector={(state) => {
              const incomeAmount = Number(state.values.incomeAmount) || 0;
              const allocated = state.values.allocations.reduce(
                (total, draft) =>
                  total + previewAllocationAmount(incomeAmount, draft.mode, draft.value),
                0,
              );
              return { incomeAmount, allocated };
            }}
          >
            {({ incomeAmount, allocated }) => {
              const exceeded = allocated > incomeAmount + 0.004;
              return (
                <>
                  <p
                    aria-live="polite"
                    className={cn(
                      "text-sm",
                      exceeded ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {exceeded ? (
                      "Total passa da renda."
                    ) : (
                      <>
                        {formatPlanPercentage(previewAllocationPercentage(incomeAmount, allocated))}{" "}
                        alocado · sobra{" "}
                        <MoneyValue amount={Math.max(incomeAmount - allocated, 0)} />
                      </>
                    )}
                  </p>
                  {submitError ? (
                    <p className="text-destructive text-sm" role="alert">
                      {submitError}
                    </p>
                  ) : null}
                  <form.Subscribe selector={(state) => state.isSubmitting}>
                    {(submitting) => (
                      <div
                        data-mobile-form-actions
                        className="grid w-full grid-cols-2 gap-2 [&>*]:w-full"
                      >
                        <Button
                          data-mobile-cancel
                          disabled={submitting}
                          onClick={() => onOpenChange(false)}
                          type="button"
                          variant="outline"
                        >
                          Cancelar
                        </Button>
                        <Button disabled={submitting || exceeded} type="submit">
                          {submitting ? "Salvando..." : "Salvar"}
                        </Button>
                      </div>
                    )}
                  </form.Subscribe>
                </>
              );
            }}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}
