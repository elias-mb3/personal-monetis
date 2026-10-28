import type { CategoryOutput } from "@openmonetis/validators/categories";
import {
  CreateSpendingAreaInputSchema,
  type SpendingAreaOutput,
  spendingAreaColors,
} from "@openmonetis/validators/spending-areas";
import { useForm } from "@tanstack/react-form";
import { useId, useState } from "react";
import { MobileFormContent as DialogContent } from "@/components/forms/mobile-form-content";
import { MobileFormDialog as Dialog } from "@/components/forms/mobile-form-dialog";
import { MobileFormState } from "@/components/forms/mobile-form-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCategoryLabel } from "@/features/categories/categories.presentation";
import { CategoryIcon } from "@/features/categories/category-icons";
import { ApiClientError } from "@/lib/api-client";
import { showInvalidFormToast } from "@/lib/form-feedback";
import { cn } from "@/lib/utils";
import {
  getSpendingAreaColorValue,
  getSpendingAreaErrorMessage,
  spendingAreaColorLabels,
} from "../spending-areas.presentation";

type SpendingAreaInput = {
  name: string;
  color: SpendingAreaOutput["color"];
  categoryIds: string[];
};

type SpendingAreaDialogProps = {
  area: SpendingAreaOutput | null;
  areas: SpendingAreaOutput[];
  categories: CategoryOutput[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: SpendingAreaInput) => Promise<void>;
  open: boolean;
};

export function SpendingAreaDialog({
  area,
  areas,
  categories,
  onOpenChange,
  onSubmit,
  open,
}: SpendingAreaDialogProps) {
  const id = useId();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const assignedElsewhere = new Map(
    areas
      .filter((item) => item.id !== area?.id)
      .flatMap((item) => item.categories.map((category) => [category.id, item.name] as const)),
  );
  const expenseCategories = categories.filter(
    (category) => category.type === "expense" && !category.isSystem,
  );
  const form = useForm({
    defaultValues: {
      name: area?.name ?? "",
      color: area?.color ?? spendingAreaColors[areas.length % spendingAreaColors.length],
      categoryIds: area?.categories.map((category) => category.id) ?? [],
    } as SpendingAreaInput,
    onSubmitInvalid: showInvalidFormToast,
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const result = CreateSpendingAreaInputSchema.safeParse(value);
      if (!result.success) {
        showInvalidFormToast();
        return;
      }
      try {
        await onSubmit(result.data);
        onOpenChange(false);
      } catch (error) {
        setSubmitError(
          getSpendingAreaErrorMessage(error instanceof ApiClientError ? error.code : undefined),
        );
      }
    },
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent guarded>
        <DialogHeader>
          <DialogTitle>{area ? "Editar área" : "Nova área"}</DialogTitle>
          <DialogDescription>
            Agrupe categorias de despesa. Sem categorias, a área mostra só o planejado.
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
            name="name"
            validators={{
              onBlur: ({ value }) =>
                CreateSpendingAreaInputSchema.shape.name.safeParse(value).success
                  ? undefined
                  : "Informe um nome.",
            }}
          >
            {(field) => (
              <div className="grid gap-1.5">
                <Label htmlFor={`${id}-name`}>Nome</Label>
                <Input
                  aria-invalid={field.state.meta.errors.length > 0}
                  id={`${id}-name`}
                  maxLength={60}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Ex.: Reserva"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="color">
            {(field) => (
              <fieldset className="grid gap-1.5">
                <legend className="mb-1.5 font-medium text-sm">Cor</legend>
                <div className="flex flex-wrap gap-2">
                  {spendingAreaColors.map((color) => (
                    <button
                      aria-label={spendingAreaColorLabels[color]}
                      aria-pressed={field.state.value === color}
                      className={cn(
                        "size-8 rounded-full border-2 border-transparent transition",
                        field.state.value === color && "border-foreground",
                      )}
                      key={color}
                      onClick={() => field.handleChange(color)}
                      style={{ backgroundColor: getSpendingAreaColorValue(color) }}
                      type="button"
                    />
                  ))}
                </div>
              </fieldset>
            )}
          </form.Field>

          <form.Field name="categoryIds">
            {(field) => (
              <fieldset className="grid gap-1.5">
                <legend className="mb-1.5 font-medium text-sm">Categorias</legend>
                <div className="grid max-h-64 gap-1 overflow-y-auto rounded-lg border p-2">
                  {expenseCategories.map((category) => {
                    const fieldId = `${id}-category-${category.id}`;
                    const otherArea = assignedElsewhere.get(category.id);
                    const checked = field.state.value.includes(category.id);
                    return (
                      <div
                        className="flex items-center gap-2 rounded-md px-1 py-1"
                        key={category.id}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={Boolean(otherArea)}
                          id={fieldId}
                          onCheckedChange={(next) =>
                            field.handleChange(
                              next
                                ? [...field.state.value, category.id]
                                : field.state.value.filter((item) => item !== category.id),
                            )
                          }
                        />
                        <Label
                          className={cn(
                            "min-w-0 flex-1 gap-2 font-normal",
                            otherArea
                              ? "cursor-not-allowed text-muted-foreground"
                              : "cursor-pointer",
                          )}
                          htmlFor={fieldId}
                        >
                          <CategoryIcon className="size-4 shrink-0" name={category.icon} />
                          <span className="truncate">{getCategoryLabel(category)}</span>
                          {otherArea ? (
                            <span className="ml-auto text-xs">em {otherArea}</span>
                          ) : null}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            )}
          </form.Field>

          {submitError ? (
            <p className="text-destructive text-sm" role="alert">
              {submitError}
            </p>
          ) : null}

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(submitting) => (
              <div data-mobile-form-actions className="grid w-full grid-cols-2 gap-2 [&>*]:w-full">
                <Button
                  data-mobile-cancel
                  disabled={submitting}
                  onClick={() => onOpenChange(false)}
                  type="button"
                  variant="outline"
                >
                  Cancelar
                </Button>
                <Button disabled={submitting} type="submit">
                  {submitting ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}
