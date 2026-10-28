import { db, incomePlanAllocations, incomePlans } from "@openmonetis/db";
import { and, eq } from "drizzle-orm";
import type { IncomePlansRepository } from "../services/income-plans.service";

export const incomePlansRepository = {
  async findByPeriodForUser(period, userId) {
    const [plan] = await db
      .select()
      .from(incomePlans)
      .where(and(eq(incomePlans.period, period), eq(incomePlans.userId, userId)))
      .limit(1);
    if (!plan) return null;
    const allocations = await db
      .select({ areaId: incomePlanAllocations.areaId, amount: incomePlanAllocations.amount })
      .from(incomePlanAllocations)
      .where(
        and(eq(incomePlanAllocations.planId, plan.id), eq(incomePlanAllocations.userId, userId)),
      );
    return {
      period: plan.period,
      incomeAmount: plan.incomeAmount,
      note: plan.note,
      updatedAt: plan.updatedAt,
      allocations,
    };
  },

  replaceForUser(userId, period, data) {
    return db.transaction(async (transaction) => {
      const [plan] = await transaction
        .insert(incomePlans)
        .values({ userId, period, incomeAmount: data.incomeAmount, note: data.note })
        .onConflictDoUpdate({
          target: [incomePlans.userId, incomePlans.period],
          set: { incomeAmount: data.incomeAmount, note: data.note, updatedAt: new Date() },
        })
        .returning({ id: incomePlans.id });
      if (!plan) throw new Error("Income plan upsert returned no row");
      await transaction
        .delete(incomePlanAllocations)
        .where(
          and(eq(incomePlanAllocations.planId, plan.id), eq(incomePlanAllocations.userId, userId)),
        );
      if (data.allocations.length > 0) {
        await transaction.insert(incomePlanAllocations).values(
          data.allocations.map((allocation) => ({
            planId: plan.id,
            areaId: allocation.areaId,
            userId,
            amount: allocation.amount.toFixed(2),
          })),
        );
      }
    });
  },

  async deleteByPeriodForUser(period, userId) {
    const deleted = await db
      .delete(incomePlans)
      .where(and(eq(incomePlans.period, period), eq(incomePlans.userId, userId)))
      .returning({ id: incomePlans.id });
    return deleted.length > 0;
  },
} satisfies IncomePlansRepository;
