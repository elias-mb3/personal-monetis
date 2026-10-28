import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../utils/errors";
import { createIncomePlansService, type IncomePlansRepository } from "./income-plans.service";

function fixture() {
  const plans = new Map<
    string,
    Awaited<ReturnType<IncomePlansRepository["findByPeriodForUser"]>>
  >();
  const repository: IncomePlansRepository = {
    async findByPeriodForUser(period, userId) {
      return plans.get(`${userId}:${period}`) ?? null;
    },
    async replaceForUser(userId, period, data) {
      plans.set(`${userId}:${period}`, {
        period,
        incomeAmount: data.incomeAmount,
        note: data.note,
        updatedAt: new Date("2026-10-28T00:00:00Z"),
        allocations: data.allocations.map((item) => ({
          areaId: item.areaId,
          amount: item.amount.toFixed(2),
        })),
      });
    },
    async deleteByPeriodForUser(period, userId) {
      return plans.delete(`${userId}:${period}`);
    },
  };
  const service = createIncomePlansService(
    repository,
    {
      async listAreasForUser(userId) {
        return userId === "owner"
          ? [
              { id: "savings", name: "Reserva", color: "chart1", sortOrder: 0, categoryIds: [] },
              { id: "fun", name: "Lazer", color: "chart2", sortOrder: 1, categoryIds: ["bars"] },
            ]
          : [];
      },
    },
    {
      async listSpendingEntries() {
        return [{ categoryId: "bars", origin: "regular", type: "expense", amount: "-120.00" }];
      },
      async listRecurringRules() {
        return [];
      },
    },
  );
  return { service, plans };
}

async function rejectsWithCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error) => error instanceof ApiError && error.code === code);
}

test("returns null for a month without plan", async () => {
  assert.equal(await fixture().service.get("2026-11", "owner"), null);
});

test("saves a plan and summarizes allocations with actual spending", async () => {
  const { service } = fixture();
  const plan = await service.save("2026-11", "owner", {
    incomeAmount: 3500,
    allocations: [
      { areaId: "savings", amount: 700 },
      { areaId: "fun", amount: 350 },
    ],
  });
  assert.equal(plan.allocatedPercentage, 30);
  assert.equal(plan.unallocatedAmount, 2450);
  assert.equal(plan.areas[1]?.committedAmount, 120);
  assert.equal(plan.areas[0]?.isTracked, false);
});

test("saving twice replaces the plan instead of duplicating it", async () => {
  const { service } = fixture();
  await service.save("2026-11", "owner", {
    incomeAmount: 3500,
    allocations: [{ areaId: "savings", amount: 700 }],
  });
  const plan = await service.save("2026-11", "owner", { incomeAmount: 4000, allocations: [] });
  assert.equal(plan.incomeAmount, 4000);
  assert.equal(plan.allocatedAmount, 0);
});

test("rejects allocations above income and areas from another user", async () => {
  const { service } = fixture();
  await rejectsWithCode(
    service.save("2026-11", "owner", {
      incomeAmount: 1000,
      allocations: [{ areaId: "savings", amount: 1000.01 }],
    }),
    "allocations_exceed_income",
  );
  await rejectsWithCode(
    service.save("2026-11", "intruder", {
      incomeAmount: 1000,
      allocations: [{ areaId: "savings", amount: 10 }],
    }),
    "spending_area_not_found",
  );
});

test("copies the previous month only when the target month is empty", async () => {
  const { service } = fixture();
  await rejectsWithCode(service.copyPrevious("2026-12", "owner"), "previous_plan_not_found");
  await service.save("2026-11", "owner", {
    incomeAmount: 3500,
    allocations: [{ areaId: "savings", amount: 700 }],
  });
  const copied = await service.copyPrevious("2026-12", "owner");
  assert.equal(copied.period, "2026-12");
  assert.equal(copied.areas[0]?.plannedAmount, 700);
  await rejectsWithCode(service.copyPrevious("2026-12", "owner"), "income_plan_already_exists");
});

test("removes only an existing plan", async () => {
  const { service } = fixture();
  await rejectsWithCode(service.remove("2026-11", "owner"), "income_plan_not_found");
  await service.save("2026-11", "owner", { incomeAmount: 100, allocations: [] });
  assert.deepEqual(await service.remove("2026-11", "owner"), { period: "2026-11" });
});

test("accepts allocations informed as percentage of income", async () => {
  const { service } = fixture();
  const plan = await service.save("2026-11", "owner", {
    incomeAmount: 3500,
    allocations: [{ areaId: "savings", percentage: 20 }],
  });
  assert.equal(plan.areas[0]?.plannedAmount, 700);
});
