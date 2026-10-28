import { categories, db, spendingAreaCategories, spendingAreas } from "@openmonetis/db";
import type { SpendingAreaColor } from "@openmonetis/domain/spending-areas";
import { and, asc, count, eq, inArray, ne } from "drizzle-orm";
import type { SpendingAreasRepository } from "../services/spending-areas.service";
import { categoryLabelSql } from "./categories.repository";

type AreaRow = typeof spendingAreas.$inferSelect;

async function withCategories(userId: string, areas: AreaRow[]) {
  if (areas.length === 0) return [];
  const rows = await db
    .select({
      areaId: spendingAreaCategories.areaId,
      id: categories.id,
      name: categoryLabelSql(categories),
      icon: categories.icon,
    })
    .from(spendingAreaCategories)
    .innerJoin(
      categories,
      and(eq(spendingAreaCategories.categoryId, categories.id), eq(categories.userId, userId)),
    )
    .where(
      and(
        eq(spendingAreaCategories.userId, userId),
        inArray(
          spendingAreaCategories.areaId,
          areas.map((area) => area.id),
        ),
      ),
    )
    .orderBy(asc(categories.name));

  return areas.map((area) => ({
    id: area.id,
    name: area.name,
    color: area.color as SpendingAreaColor,
    sortOrder: area.sortOrder,
    createdAt: area.createdAt,
    updatedAt: area.updatedAt,
    categories: rows
      .filter((row) => row.areaId === area.id)
      .map(({ id, name, icon }) => ({ id, name, icon })),
  }));
}

export const spendingAreasRepository = {
  async listForUser(userId) {
    const areas = await db
      .select()
      .from(spendingAreas)
      .where(eq(spendingAreas.userId, userId))
      .orderBy(asc(spendingAreas.sortOrder), asc(spendingAreas.name));
    return withCategories(userId, areas);
  },

  async findByIdForUser(id, userId) {
    const areas = await db
      .select()
      .from(spendingAreas)
      .where(and(eq(spendingAreas.id, id), eq(spendingAreas.userId, userId)))
      .limit(1);
    const [area] = await withCategories(userId, areas);
    return area ?? null;
  },

  async findByNameForUser(name, userId) {
    const [area] = await db
      .select({ id: spendingAreas.id })
      .from(spendingAreas)
      .where(and(eq(spendingAreas.name, name), eq(spendingAreas.userId, userId)))
      .limit(1);
    return area ?? null;
  },

  async countForUser(userId) {
    const [row] = await db
      .select({ total: count() })
      .from(spendingAreas)
      .where(eq(spendingAreas.userId, userId));
    return row?.total ?? 0;
  },

  async findAssignedCategories(userId, categoryIds, excludeAreaId) {
    if (categoryIds.length === 0) return [];
    return db
      .select({ categoryId: spendingAreaCategories.categoryId, areaName: spendingAreas.name })
      .from(spendingAreaCategories)
      .innerJoin(
        spendingAreas,
        and(eq(spendingAreaCategories.areaId, spendingAreas.id), eq(spendingAreas.userId, userId)),
      )
      .where(
        and(
          eq(spendingAreaCategories.userId, userId),
          inArray(spendingAreaCategories.categoryId, categoryIds),
          excludeAreaId ? ne(spendingAreaCategories.areaId, excludeAreaId) : undefined,
        ),
      );
  },

  insert(userId, { categoryIds, ...data }) {
    return db.transaction(async (transaction) => {
      const [area] = await transaction
        .insert(spendingAreas)
        .values({ ...data, userId })
        .returning({ id: spendingAreas.id });
      if (!area) throw new Error("Spending area insert returned no row");
      if (categoryIds.length > 0) {
        await transaction
          .insert(spendingAreaCategories)
          .values(categoryIds.map((categoryId) => ({ areaId: area.id, categoryId, userId })));
      }
      return area;
    });
  },

  updateForUser(id, userId, { categoryIds, ...data }) {
    return db.transaction(async (transaction) => {
      const [area] = await transaction
        .update(spendingAreas)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(spendingAreas.id, id), eq(spendingAreas.userId, userId)))
        .returning({ id: spendingAreas.id });
      if (!area) return false;
      if (categoryIds !== undefined) {
        await transaction
          .delete(spendingAreaCategories)
          .where(
            and(eq(spendingAreaCategories.areaId, id), eq(spendingAreaCategories.userId, userId)),
          );
        if (categoryIds.length > 0) {
          await transaction
            .insert(spendingAreaCategories)
            .values(categoryIds.map((categoryId) => ({ areaId: id, categoryId, userId })));
        }
      }
      return true;
    });
  },

  async deleteForUser(id, userId) {
    const deleted = await db
      .delete(spendingAreas)
      .where(and(eq(spendingAreas.id, id), eq(spendingAreas.userId, userId)))
      .returning({ id: spendingAreas.id });
    return deleted.length > 0;
  },
} satisfies SpendingAreasRepository;

export async function listIncomePlanAreasForUser(userId: string) {
  const areas = await spendingAreasRepository.listForUser(userId);
  return areas.map((area) => ({
    id: area.id,
    name: area.name,
    color: area.color,
    sortOrder: area.sortOrder,
    categoryIds: area.categories.map((category) => category.id),
  }));
}
