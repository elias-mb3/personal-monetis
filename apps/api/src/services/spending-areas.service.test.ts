import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../utils/errors";
import { createSpendingAreasService, type SpendingAreasRepository } from "./spending-areas.service";

type Area = {
  id: string;
  userId: string;
  name: string;
  color: "chart1";
  sortOrder: number;
  categoryIds: string[];
};

function fixture() {
  const areas: Area[] = [];
  const categories = new Map([
    ["food", { id: "food", type: "expense" as const, isSystem: false }],
    ["rent", { id: "rent", type: "expense" as const, isSystem: false }],
    ["salary", { id: "salary", type: "income" as const, isSystem: false }],
    ["payments", { id: "payments", type: "expense" as const, isSystem: true }],
  ]);
  const toRecord = (area: Area) => ({
    id: area.id,
    name: area.name,
    color: area.color,
    sortOrder: area.sortOrder,
    createdAt: new Date("2026-10-28T00:00:00Z"),
    updatedAt: new Date("2026-10-28T00:00:00Z"),
    categories: area.categoryIds.map((id) => ({ id, name: id, icon: null })),
  });
  const repository: SpendingAreasRepository = {
    async listForUser(userId) {
      return areas.filter((area) => area.userId === userId).map(toRecord);
    },
    async findByIdForUser(id, userId) {
      const area = areas.find((item) => item.id === id && item.userId === userId);
      return area ? toRecord(area) : null;
    },
    async findByNameForUser(name, userId) {
      return areas.find((item) => item.name === name && item.userId === userId) ?? null;
    },
    async countForUser(userId) {
      return areas.filter((area) => area.userId === userId).length;
    },
    async findAssignedCategories(userId, categoryIds, excludeAreaId) {
      return areas
        .filter((area) => area.userId === userId && area.id !== excludeAreaId)
        .flatMap((area) =>
          area.categoryIds
            .filter((id) => categoryIds.includes(id))
            .map((categoryId) => ({ categoryId, areaName: area.name })),
        );
    },
    async insert(userId, data) {
      const area = { ...data, id: `area-${areas.length}`, userId, color: "chart1" as const };
      areas.push(area);
      return { id: area.id };
    },
    async updateForUser(id, userId, data) {
      const area = areas.find((item) => item.id === id && item.userId === userId);
      if (!area) return false;
      Object.assign(area, data);
      return true;
    },
    async deleteForUser(id, userId) {
      const index = areas.findIndex((item) => item.id === id && item.userId === userId);
      if (index < 0) return false;
      areas.splice(index, 1);
      return true;
    },
  };
  const service = createSpendingAreasService(repository, {
    async findByIdForUser(id, userId) {
      return userId === "owner" ? (categories.get(id) ?? null) : null;
    },
  });
  return { service };
}

async function rejectsWithCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error) => error instanceof ApiError && error.code === code);
}

test("creates an area with expense categories", async () => {
  const { service } = fixture();
  const area = await service.create(
    { name: "Moradia", color: "chart1", categoryIds: ["rent"] },
    "owner",
  );
  assert.deepEqual(
    area.categories.map((category) => category.id),
    ["rent"],
  );
  assert.equal(area.sortOrder, 0);
});

test("rejects income, system and foreign categories", async () => {
  const { service } = fixture();
  for (const categoryId of ["salary", "payments"]) {
    await rejectsWithCode(
      service.create(
        { name: `Área ${categoryId}`, color: "chart1", categoryIds: [categoryId] },
        "owner",
      ),
      "expense_category_not_found",
    );
  }
  await rejectsWithCode(
    service.create({ name: "Moradia", color: "chart1", categoryIds: ["rent"] }, "intruder"),
    "expense_category_not_found",
  );
});

test("keeps each category in a single area and names unique", async () => {
  const { service } = fixture();
  const home = await service.create(
    { name: "Moradia", color: "chart1", categoryIds: ["rent"] },
    "owner",
  );
  await rejectsWithCode(
    service.create({ name: "Casa", color: "chart1", categoryIds: ["rent"] }, "owner"),
    "category_already_assigned",
  );
  await rejectsWithCode(
    service.create({ name: "Moradia", color: "chart1", categoryIds: [] }, "owner"),
    "spending_area_exists",
  );
  const updated = await service.update(home.id, "owner", { categoryIds: ["rent", "food"] });
  assert.equal(updated.categories.length, 2);
});

test("does not expose or delete areas of another user", async () => {
  const { service } = fixture();
  const area = await service.create({ name: "Reserva", color: "chart1", categoryIds: [] }, "owner");
  await rejectsWithCode(service.get(area.id, "intruder"), "spending_area_not_found");
  await rejectsWithCode(service.remove(area.id, "intruder"), "spending_area_not_found");
  assert.deepEqual(await service.remove(area.id, "owner"), { id: area.id });
});
