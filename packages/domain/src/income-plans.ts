import { type BudgetSpending, type BudgetStatus, calculateBudgetProgress } from "./budgets";
import type { SpendingAreaColor } from "./spending-areas";
import { addMonthsToPeriod } from "./transactions";

export type IncomePlanAllocation = { areaId: string; amount: number };

export type IncomePlanArea = {
  id: string;
  name: string;
  color: SpendingAreaColor;
  sortOrder: number;
  categoryIds: string[];
};

export type IncomePlanAreaSummary = {
  areaId: string;
  name: string;
  color: SpendingAreaColor;
  categoryIds: string[];
  plannedAmount: number;
  plannedPercentage: number;
  isTracked: boolean;
  committedAmount: number;
  remainingAmount: number;
  exceededAmount: number;
  usagePercentage: number;
  status: BudgetStatus;
};

export type IncomePlanSummary = {
  incomeAmount: number;
  allocatedAmount: number;
  allocatedPercentage: number;
  unallocatedAmount: number;
  unallocatedPercentage: number;
  areas: IncomePlanAreaSummary[];
};

export type IncomePlanValidationError = "allocationsExceedIncome" | "duplicateArea";

export function percentageToAmount(incomeAmount: number, percentage: number) {
  return roundMoney((incomeAmount * percentage) / 100);
}

export function amountToPercentage(incomeAmount: number, amount: number) {
  return incomeAmount > 0 ? roundPercentage((amount / incomeAmount) * 100) : 0;
}

export type IncomePlanAllocationInput =
  | { areaId: string; amount: number }
  | { areaId: string; percentage: number };

export function resolveAllocationAmounts(
  incomeAmount: number,
  inputs: IncomePlanAllocationInput[],
): IncomePlanAllocation[] {
  return inputs.map((input) => ({
    areaId: input.areaId,
    amount:
      "amount" in input
        ? roundMoney(input.amount)
        : percentageToAmount(incomeAmount, input.percentage),
  }));
}

export function validateAllocations(
  incomeAmount: number,
  allocations: IncomePlanAllocation[],
): IncomePlanValidationError | null {
  if (new Set(allocations.map((allocation) => allocation.areaId)).size !== allocations.length) {
    return "duplicateArea";
  }
  return sumAllocations(allocations) > roundMoney(incomeAmount) ? "allocationsExceedIncome" : null;
}

export function buildIncomePlanSummary(
  incomeAmount: number,
  areas: IncomePlanArea[],
  allocations: IncomePlanAllocation[],
  spending: BudgetSpending,
): IncomePlanSummary {
  const plannedByArea = new Map(allocations.map((item) => [item.areaId, roundMoney(item.amount)]));
  const summaries = [...areas]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((area) => {
      const plannedAmount = plannedByArea.get(area.id) ?? 0;
      const committedAmount = area.categoryIds.reduce(
        (total, categoryId) =>
          total +
          Math.max(0, spending.actualByCategory.get(categoryId) ?? 0) +
          Math.max(0, spending.projectedByCategory.get(categoryId) ?? 0),
        0,
      );
      const progress = calculateBudgetProgress(plannedAmount, committedAmount);
      return {
        areaId: area.id,
        name: area.name,
        color: area.color,
        categoryIds: area.categoryIds,
        plannedAmount,
        plannedPercentage: amountToPercentage(incomeAmount, plannedAmount),
        isTracked: area.categoryIds.length > 0,
        committedAmount: progress.committedAmount,
        remainingAmount: progress.remainingAmount,
        exceededAmount: progress.exceededAmount,
        usagePercentage: progress.usagePercentage,
        status: progress.status,
      };
    });
  const allocatedAmount = sumAllocations(
    summaries.map((area) => ({ areaId: area.areaId, amount: area.plannedAmount })),
  );
  const unallocatedAmount = roundMoney(Math.max(incomeAmount - allocatedAmount, 0));

  return {
    incomeAmount: roundMoney(incomeAmount),
    allocatedAmount,
    allocatedPercentage: amountToPercentage(incomeAmount, allocatedAmount),
    unallocatedAmount,
    unallocatedPercentage: amountToPercentage(incomeAmount, unallocatedAmount),
    areas: summaries,
  };
}

export function getPreviousIncomePlanPeriod(period: string) {
  return addMonthsToPeriod(period, -1);
}

function sumAllocations(allocations: IncomePlanAllocation[]) {
  return roundMoney(allocations.reduce((total, allocation) => total + allocation.amount, 0));
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundPercentage(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}
