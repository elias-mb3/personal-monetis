import {
  type BudgetRecurringRule,
  type BudgetSpendingEntry,
  calculateBudgetSpending,
} from "@openmonetis/domain/budgets";
import {
  buildIncomePlanSummary,
  getPreviousIncomePlanPeriod,
  type IncomePlanAllocation,
  type IncomePlanArea,
  resolveAllocationAmounts,
  validateAllocations,
} from "@openmonetis/domain/income-plans";
import { getPeriodEndDate } from "@openmonetis/domain/transactions";
import type { IncomePlanOutput, SaveIncomePlanInput } from "@openmonetis/validators/income-plans";
import { badRequest, conflict, notFound } from "../utils/errors";

type IncomePlanRecord = {
  period: string;
  incomeAmount: string;
  note: string | null;
  updatedAt: Date;
  allocations: Array<{ areaId: string; amount: string }>;
};

export type IncomePlansRepository = {
  findByPeriodForUser(period: string, userId: string): Promise<IncomePlanRecord | null>;
  replaceForUser(
    userId: string,
    period: string,
    data: { incomeAmount: string; note: string | null; allocations: IncomePlanAllocation[] },
  ): Promise<void>;
  deleteByPeriodForUser(period: string, userId: string): Promise<boolean>;
};

type IncomePlanAreasRepository = {
  listAreasForUser(userId: string): Promise<IncomePlanArea[]>;
};

type IncomePlanSpendingRepository = {
  listSpendingEntries(userId: string, period: string): Promise<BudgetSpendingEntry[]>;
  listRecurringRules(userId: string, periodEnd: Date): Promise<BudgetRecurringRule[]>;
};

export function createIncomePlansService(
  repository: IncomePlansRepository,
  areasRepository: IncomePlanAreasRepository,
  spendingRepository: IncomePlanSpendingRepository,
) {
  async function get(period: string, userId: string): Promise<IncomePlanOutput | null> {
    const plan = await repository.findByPeriodForUser(period, userId);
    if (!plan) return null;
    const [areas, entries, recurringRules] = await Promise.all([
      areasRepository.listAreasForUser(userId),
      spendingRepository.listSpendingEntries(userId, period),
      spendingRepository.listRecurringRules(userId, getPeriodEndDate(period)),
    ]);
    const summary = buildIncomePlanSummary(
      Number(plan.incomeAmount),
      areas,
      plan.allocations.map((item) => ({ areaId: item.areaId, amount: Number(item.amount) })),
      calculateBudgetSpending(entries, recurringRules, period),
    );
    return {
      period: plan.period,
      note: plan.note,
      updatedAt: plan.updatedAt.toISOString(),
      ...summary,
    };
  }

  async function savePlan(
    period: string,
    userId: string,
    incomeAmount: number,
    note: string | null,
    allocations: IncomePlanAllocation[],
  ) {
    const areaIds = new Set(
      (await areasRepository.listAreasForUser(userId)).map((area) => area.id),
    );
    if (allocations.some((allocation) => !areaIds.has(allocation.areaId))) {
      throw notFound("Spending area not found", "spending_area_not_found");
    }
    const error = validateAllocations(incomeAmount, allocations);
    if (error === "allocationsExceedIncome") {
      throw badRequest("Allocations exceed planned income", "allocations_exceed_income");
    }
    if (error === "duplicateArea") {
      throw badRequest("Area IDs must be unique", "duplicate_area");
    }
    await repository.replaceForUser(userId, period, {
      incomeAmount: incomeAmount.toFixed(2),
      note,
      allocations: allocations.filter((allocation) => allocation.amount > 0),
    });
    return get(period, userId) as Promise<IncomePlanOutput>;
  }

  return {
    get,

    save(period: string, userId: string, input: SaveIncomePlanInput) {
      return savePlan(
        period,
        userId,
        input.incomeAmount,
        input.note ?? null,
        resolveAllocationAmounts(input.incomeAmount, input.allocations),
      );
    },

    async copyPrevious(period: string, userId: string) {
      if (await repository.findByPeriodForUser(period, userId)) {
        throw conflict("A plan already exists for this period", "income_plan_already_exists");
      }
      const previous = await repository.findByPeriodForUser(
        getPreviousIncomePlanPeriod(period),
        userId,
      );
      if (!previous) throw notFound("No plan in the previous period", "previous_plan_not_found");
      return savePlan(
        period,
        userId,
        Number(previous.incomeAmount),
        previous.note,
        previous.allocations.map((item) => ({ areaId: item.areaId, amount: Number(item.amount) })),
      );
    },

    async remove(period: string, userId: string) {
      if (!(await repository.deleteByPeriodForUser(period, userId))) {
        throw notFound("Income plan not found", "income_plan_not_found");
      }
      return { period };
    },
  };
}

export type IncomePlansService = ReturnType<typeof createIncomePlansService>;
