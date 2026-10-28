import type { SaveIncomePlanInput } from "@openmonetis/validators/income-plans";
import type { SpendingAreaOutput } from "@openmonetis/validators/spending-areas";
import { useQuery } from "@tanstack/react-query";
import { Copy, Layers, Pencil, PieChart, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { MoneyValue } from "@/components/money-value";
import { MonthNavigation } from "@/components/month-navigation";
import { Navbar } from "@/components/navigation/navbar";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { categoriesQueryOptions } from "@/features/categories/categories.queries";
import { SpendingAreaDialog } from "@/features/spending-areas/components/spending-area-dialog";
import {
  useCreateSpendingAreaMutation,
  useDeleteSpendingAreaMutation,
  useUpdateSpendingAreaMutation,
} from "@/features/spending-areas/spending-areas.mutations";
import { getSpendingAreaColorValue } from "@/features/spending-areas/spending-areas.presentation";
import { spendingAreasQueryOptions } from "@/features/spending-areas/spending-areas.queries";
import { ApiClientError } from "@/lib/api-client";
import {
  useCopyPreviousIncomePlanMutation,
  useSaveIncomePlanMutation,
} from "../income-plans.mutations";
import { formatPlanPercentage, getIncomePlanErrorMessage } from "../income-plans.presentation";
import { incomePlanQueryOptions } from "../income-plans.queries";
import { IncomePlanAreaRow } from "./income-plan-area-row";
import { IncomePlanDialog } from "./income-plan-dialog";
import { IncomePlanDonut } from "./income-plan-donut";

type IncomePlansPageProps = {
  onPeriodChange: (period: string) => void;
  period: string;
};

export function IncomePlansPage({ onPeriodChange, period }: IncomePlansPageProps) {
  const planQuery = useQuery(incomePlanQueryOptions(period));
  const areasQuery = useQuery(spendingAreasQueryOptions());
  const categoriesQuery = useQuery(categoriesQueryOptions());
  const saveMutation = useSaveIncomePlanMutation();
  const copyMutation = useCopyPreviousIncomePlanMutation();
  const createAreaMutation = useCreateSpendingAreaMutation();
  const updateAreaMutation = useUpdateSpendingAreaMutation();
  const deleteAreaMutation = useDeleteSpendingAreaMutation();
  const [planOpen, setPlanOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<SpendingAreaOutput | null>(null);
  const plan = planQuery.data ?? null;
  const areas = areasQuery.data ?? [];
  const loading = planQuery.isLoading || areasQuery.isLoading || categoriesQuery.isLoading;
  const failed = planQuery.isError || areasQuery.isError || categoriesQuery.isError;

  async function savePlan(input: SaveIncomePlanInput) {
    await saveMutation.mutateAsync({ period, input });
    toast.success("Planejamento salvo");
  }

  async function copyPrevious() {
    try {
      await copyMutation.mutateAsync(period);
      toast.success("Planejamento copiado do mês anterior");
    } catch (error) {
      toast.error(
        getIncomePlanErrorMessage(error instanceof ApiClientError ? error.code : undefined),
      );
    }
  }

  async function saveArea(input: {
    name: string;
    color: SpendingAreaOutput["color"];
    categoryIds: string[];
  }) {
    if (editingArea) {
      await updateAreaMutation.mutateAsync({ id: editingArea.id, input });
      toast.success("Área atualizada");
      return;
    }
    await createAreaMutation.mutateAsync(input);
    toast.success("Área criada");
  }

  async function removeArea(area: SpendingAreaOutput) {
    try {
      await deleteAreaMutation.mutateAsync(area.id);
      toast.success("Área removida");
    } catch {
      toast.error("Não foi possível remover a área.");
    }
  }

  function openArea(area: SpendingAreaOutput | null) {
    setEditingArea(area);
    setAreaOpen(true);
  }

  return (
    <ProtectedRoute>
      <main className="min-h-svh bg-background">
        <Navbar />
        <section className="app-page project-container">
          <PageHeader
            actions={
              <Button
                disabled={loading || areas.length === 0}
                onClick={() => setPlanOpen(true)}
                type="button"
              >
                {plan ? (
                  <Pencil aria-hidden="true" className="size-4" />
                ) : (
                  <Plus aria-hidden="true" className="size-4" />
                )}
                {plan ? "Editar planejamento" : "Criar planejamento"}
              </Button>
            }
            breadcrumbs={[
              { label: "Visão geral", href: "/dashboard" },
              { label: "Finanças" },
              { label: "Planejamento" },
            ]}
            description="Divida a renda do mês entre as suas áreas e acompanhe o realizado."
            icon={<PieChart aria-hidden="true" className="size-5" />}
            title="Planejamento"
          />

          <MonthNavigation
            className="sticky top-20 z-20"
            onPeriodChange={onPeriodChange}
            period={period}
          />

          {loading ? (
            <div aria-label="Carregando planejamento" className="grid gap-4" role="status">
              <Skeleton className="h-80 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          ) : null}

          {failed ? (
            <Card className="grid min-h-52 place-items-center border p-6 text-center">
              <div>
                <p className="font-medium">Não foi possível carregar o planejamento</p>
                <p className="mt-1 text-muted-foreground text-sm">
                  Verifique sua conexão e tente novamente.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    void planQuery.refetch();
                    void areasQuery.refetch();
                    void categoriesQuery.refetch();
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <RefreshCw aria-hidden="true" />
                  Tentar novamente
                </Button>
              </div>
            </Card>
          ) : null}

          {!loading && !failed ? (
            <div className="grid gap-6">
              {plan ? (
                <Card className="border">
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-baseline justify-between gap-2">
                      <span>Renda planejada</span>
                      <MoneyValue amount={plan.incomeAmount} className="text-2xl" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid items-center gap-6 md:grid-cols-[18rem_1fr]">
                    <IncomePlanDonut plan={plan} />
                    <ul className="grid gap-2">
                      {plan.areas.map((area) => (
                        <IncomePlanAreaRow area={area} key={area.areaId} />
                      ))}
                      {plan.unallocatedAmount > 0 ? (
                        <li className="flex items-center gap-3 rounded-lg border border-dashed p-3 text-sm">
                          <span aria-hidden="true" className="size-3 rounded-full bg-muted" />
                          <span className="flex-1">Não alocado</span>
                          <span className="tabular-nums">
                            <MoneyValue amount={plan.unallocatedAmount} />
                            <span className="text-muted-foreground">
                              {" "}
                              · {formatPlanPercentage(plan.unallocatedPercentage)}
                            </span>
                          </span>
                        </li>
                      ) : null}
                    </ul>
                  </CardContent>
                </Card>
              ) : (
                <Card className="grid min-h-60 place-items-center border p-6 text-center">
                  <div className="max-w-md">
                    <span className="mx-auto grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
                      <PieChart aria-hidden="true" className="size-5" />
                    </span>
                    <p className="mt-4 font-medium">Nenhum planejamento neste mês</p>
                    <p className="mt-1 text-muted-foreground text-sm">
                      {areas.length === 0
                        ? "Crie suas áreas primeiro, por exemplo Reserva, Moradia e Lazer."
                        : "Informe a renda do mês e divida entre as áreas."}
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {areas.length === 0 ? (
                        <Button onClick={() => openArea(null)} size="sm" type="button">
                          <Plus aria-hidden="true" />
                          Criar área
                        </Button>
                      ) : (
                        <>
                          <Button onClick={() => setPlanOpen(true)} size="sm" type="button">
                            <Plus aria-hidden="true" />
                            Criar planejamento
                          </Button>
                          <Button
                            disabled={copyMutation.isPending}
                            onClick={() => void copyPrevious()}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <Copy aria-hidden="true" />
                            Copiar do mês anterior
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              <section aria-labelledby="spending-areas-title" className="grid gap-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-lg" id="spending-areas-title">
                      Áreas
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Cada área agrupa categorias de despesa para medir o realizado.
                    </p>
                  </div>
                  <Button onClick={() => openArea(null)} type="button" variant="outline">
                    <Layers aria-hidden="true" className="size-4" />
                    Nova área
                  </Button>
                </div>
                <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {areas.map((area) => (
                    <li className="flex items-start gap-3 rounded-lg border p-3" key={area.id}>
                      <span
                        aria-hidden="true"
                        className="mt-1 size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: getSpendingAreaColorValue(area.color) }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">{area.name}</p>
                        <p className="truncate text-muted-foreground text-xs">
                          {area.categories.length > 0
                            ? area.categories.map((category) => category.name).join(", ")
                            : "Sem categorias"}
                        </p>
                      </div>
                      <Button
                        aria-label={`Editar ${area.name}`}
                        onClick={() => openArea(area)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                      </Button>
                      <Button
                        aria-label={`Remover ${area.name}`}
                        disabled={deleteAreaMutation.isPending}
                        onClick={() => void removeArea(area)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : null}
        </section>
      </main>

      <IncomePlanDialog
        areas={areas}
        key={`${period}-${plan?.updatedAt ?? "new"}-${planOpen ? "open" : "closed"}`}
        onOpenChange={setPlanOpen}
        onSubmit={savePlan}
        open={planOpen}
        plan={plan}
      />

      <SpendingAreaDialog
        area={editingArea}
        areas={areas}
        categories={categoriesQuery.data ?? []}
        key={`${editingArea?.id ?? "new"}-${areaOpen ? "open" : "closed"}`}
        onOpenChange={setAreaOpen}
        onSubmit={saveArea}
        open={areaOpen}
      />
    </ProtectedRoute>
  );
}
