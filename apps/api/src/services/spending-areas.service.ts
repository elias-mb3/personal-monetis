import { type SpendingAreaColor, spendingAreaLimit } from "@openmonetis/domain/spending-areas";
import type {
  CreateSpendingAreaInput,
  SpendingAreaOutput,
  UpdateSpendingAreaInput,
} from "@openmonetis/validators/spending-areas";
import { badRequest, conflict, notFound } from "../utils/errors";

type SpendingAreaRecord = {
  id: string;
  name: string;
  color: SpendingAreaColor;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  categories: Array<{ id: string; name: string; icon: string | null }>;
};

type SpendingAreaWriteRecord = {
  name?: string;
  color?: SpendingAreaColor;
  sortOrder?: number;
  categoryIds?: string[];
};

export type SpendingAreasRepository = {
  listForUser(userId: string): Promise<SpendingAreaRecord[]>;
  findByIdForUser(id: string, userId: string): Promise<SpendingAreaRecord | null>;
  findByNameForUser(name: string, userId: string): Promise<{ id: string } | null>;
  countForUser(userId: string): Promise<number>;
  findAssignedCategories(
    userId: string,
    categoryIds: string[],
    excludeAreaId?: string,
  ): Promise<Array<{ categoryId: string; areaName: string }>>;
  insert(userId: string, data: Required<SpendingAreaWriteRecord>): Promise<{ id: string }>;
  updateForUser(id: string, userId: string, data: SpendingAreaWriteRecord): Promise<boolean>;
  deleteForUser(id: string, userId: string): Promise<boolean>;
};

type SpendingAreaCategoriesRepository = {
  findByIdForUser(
    id: string,
    userId: string,
  ): Promise<{ id: string; type: "income" | "expense"; isSystem: boolean } | null>;
};

export function createSpendingAreasService(
  repository: SpendingAreasRepository,
  categoriesRepository: SpendingAreaCategoriesRepository,
) {
  async function assertAssignableCategories(
    categoryIds: string[],
    userId: string,
    excludeAreaId?: string,
  ) {
    const categories = await Promise.all(
      categoryIds.map((id) => categoriesRepository.findByIdForUser(id, userId)),
    );
    if (categories.some((category) => category?.type !== "expense" || category.isSystem)) {
      throw notFound("Expense category not found", "expense_category_not_found");
    }
    const assigned = await repository.findAssignedCategories(userId, categoryIds, excludeAreaId);
    if (assigned.length > 0) {
      throw conflict(
        `Category already assigned to ${assigned[0]?.areaName}`,
        "category_already_assigned",
      );
    }
  }

  async function assertUniqueName(name: string, userId: string, currentId?: string) {
    const existing = await repository.findByNameForUser(name, userId);
    if (existing && existing.id !== currentId) {
      throw conflict("A spending area with this name already exists", "spending_area_exists");
    }
  }

  async function get(id: string, userId: string) {
    const area = await repository.findByIdForUser(id, userId);
    if (!area) throw notFound("Spending area not found", "spending_area_not_found");
    return toOutput(area);
  }

  return {
    get,

    async list(userId: string) {
      return (await repository.listForUser(userId)).map(toOutput);
    },

    async create(input: CreateSpendingAreaInput, userId: string) {
      if ((await repository.countForUser(userId)) >= spendingAreaLimit) {
        throw badRequest("Spending area limit reached", "spending_area_limit_reached");
      }
      await assertUniqueName(input.name, userId);
      await assertAssignableCategories(input.categoryIds, userId);
      const { id } = await repository.insert(userId, {
        name: input.name,
        color: input.color,
        sortOrder: await repository.countForUser(userId),
        categoryIds: input.categoryIds,
      });
      return get(id, userId);
    },

    async update(id: string, userId: string, input: UpdateSpendingAreaInput) {
      await get(id, userId);
      if (input.name !== undefined) await assertUniqueName(input.name, userId, id);
      if (input.categoryIds !== undefined) {
        await assertAssignableCategories(input.categoryIds, userId, id);
      }
      if (!(await repository.updateForUser(id, userId, input))) {
        throw notFound("Spending area not found", "spending_area_not_found");
      }
      return get(id, userId);
    },

    async remove(id: string, userId: string) {
      if (!(await repository.deleteForUser(id, userId))) {
        throw notFound("Spending area not found", "spending_area_not_found");
      }
      return { id };
    },
  };
}

function toOutput(area: SpendingAreaRecord): SpendingAreaOutput {
  return {
    id: area.id,
    name: area.name,
    color: area.color,
    sortOrder: area.sortOrder,
    categories: area.categories,
    createdAt: area.createdAt.toISOString(),
    updatedAt: area.updatedAt.toISOString(),
  };
}

export type SpendingAreasService = ReturnType<typeof createSpendingAreasService>;
