import type { IncomePlanAreaOutput } from "@openmonetis/validators/income-plans";

export type AllocationInputMode = "percentage" | "amount";

export const incomePlanStatusLabels: Record<IncomePlanAreaOutput["status"], string> = {
  onTrack: "Dentro do planejado",
  warning: "Atenção",
  reached: "Planejado atingido",
  exceeded: "Acima do planejado",
};

export function formatPlanPercentage(value: number) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}%`;
}

export function previewAllocationAmount(
  incomeAmount: number,
  mode: AllocationInputMode,
  rawValue: string,
) {
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return mode === "amount" ? value : Math.round(incomeAmount * value) / 100;
}

export function previewAllocationPercentage(incomeAmount: number, amount: number) {
  return incomeAmount > 0 ? (amount / incomeAmount) * 100 : 0;
}

export function getPreviousPlanPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
}

export function getIncomePlanErrorMessage(code?: string) {
  if (code === "allocations_exceed_income") return "O total passa da renda planejada.";
  if (code === "spending_area_not_found") return "Uma das áreas não existe mais.";
  if (code === "income_plan_already_exists") return "Este mês já tem um plano.";
  if (code === "previous_plan_not_found") return "O mês anterior não tem plano.";
  return "Não foi possível salvar o plano.";
}
