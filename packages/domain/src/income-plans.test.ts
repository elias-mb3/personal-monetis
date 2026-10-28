import assert from "node:assert/strict";
import test from "node:test";
import {
  amountToPercentage,
  buildIncomePlanSummary,
  percentageToAmount,
  resolveAllocationAmounts,
  validateAllocations,
} from "./income-plans";

const emptySpending = {
  actualByCategory: new Map<string, number>(),
  projectedByCategory: new Map<string, number>(),
  uncategorizedActualAmount: 0,
  uncategorizedProjectedAmount: 0,
};

test("converts between percentage and amount with money rounding", () => {
  assert.equal(percentageToAmount(3500, 20), 700);
  assert.equal(percentageToAmount(3500, 33.33), 1166.55);
  assert.equal(amountToPercentage(3500, 700), 20);
  assert.equal(amountToPercentage(0, 700), 0);
});

test("rejects allocations above income and repeated areas", () => {
  assert.equal(validateAllocations(3500, [{ areaId: "a", amount: 3500 }]), null);
  assert.equal(
    validateAllocations(3500, [
      { areaId: "a", amount: 3000 },
      { areaId: "b", amount: 500.01 },
    ]),
    "allocationsExceedIncome",
  );
  assert.equal(
    validateAllocations(3500, [
      { areaId: "a", amount: 10 },
      { areaId: "a", amount: 10 },
    ]),
    "duplicateArea",
  );
});

test("summarizes planned, committed and unallocated amounts per area", () => {
  const summary = buildIncomePlanSummary(
    3500,
    [
      {
        id: "leisure",
        name: "Lazer",
        color: "chart2",
        sortOrder: 1,
        categoryIds: ["bars", "trips"],
      },
      { id: "savings", name: "Reserva", color: "chart1", sortOrder: 0, categoryIds: [] },
    ],
    [
      { areaId: "savings", amount: 700 },
      { areaId: "leisure", amount: 350 },
    ],
    {
      ...emptySpending,
      actualByCategory: new Map([
        ["bars", 250],
        ["trips", -20],
        ["groceries", 900],
      ]),
      projectedByCategory: new Map([["trips", 50]]),
    },
  );

  assert.deepEqual(
    summary.areas.map((area) => area.areaId),
    ["savings", "leisure"],
  );
  const [savings, leisure] = summary.areas;
  assert.equal(savings?.isTracked, false);
  assert.equal(savings?.plannedPercentage, 20);
  assert.equal(leisure?.committedAmount, 300);
  assert.equal(leisure?.usagePercentage, 85.7);
  assert.equal(leisure?.status, "warning");
  assert.equal(summary.allocatedAmount, 1050);
  assert.equal(summary.allocatedPercentage, 30);
  assert.equal(summary.unallocatedAmount, 2450);
  assert.equal(summary.unallocatedPercentage, 70);
});

test("marks an area exceeded and keeps unallocated at zero for a zero income", () => {
  const summary = buildIncomePlanSummary(
    0,
    [{ id: "home", name: "Moradia", color: "chart3", sortOrder: 0, categoryIds: ["rent"] }],
    [],
    { ...emptySpending, actualByCategory: new Map([["rent", 100]]) },
  );
  assert.equal(summary.areas[0]?.status, "exceeded");
  assert.equal(summary.areas[0]?.exceededAmount, 100);
  assert.equal(summary.unallocatedAmount, 0);
  assert.equal(summary.allocatedPercentage, 0);
});

test("resolves percentage allocations into amounts", () => {
  assert.deepEqual(
    resolveAllocationAmounts(3500, [
      { areaId: "savings", percentage: 20 },
      { areaId: "fun", amount: 350.004 },
    ]),
    [
      { areaId: "savings", amount: 700 },
      { areaId: "fun", amount: 350 },
    ],
  );
});
