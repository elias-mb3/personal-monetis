import { categories, db, transactions } from "@openmonetis/db";
import { invoicePaymentCategoryName } from "@openmonetis/domain/categories";
import { and, between, count, desc, eq, isNotNull, max, sql } from "drizzle-orm";

export async function listSuggestableCategoriesForUser(userId: string) {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      type: categories.type,
      parentId: categories.parentId,
      isSystem: categories.isSystem,
    })
    .from(categories)
    .where(eq(categories.userId, userId));
  const namesById = new Map(rows.map((row) => [row.id, row.name]));
  return rows
    .filter((row) => !(row.isSystem && row.name === invoicePaymentCategoryName))
    .map((row) => ({
      id: row.id,
      type: row.type,
      label: row.parentId ? `${namesById.get(row.parentId) ?? ""} > ${row.name}` : row.name,
    }));
}

/** Distinct categorized descriptions, most used first, used as the user's own training data. */
export async function listCategorizedHistoryForUser(userId: string, limit = 3000) {
  return db
    .select({
      name: transactions.name,
      categoryId: transactions.categoryId,
      type: categories.type,
      uses: count(),
      lastUsed: max(transactions.purchaseDate),
    })
    .from(transactions)
    .innerJoin(
      categories,
      and(eq(transactions.categoryId, categories.id), eq(categories.userId, userId)),
    )
    .where(and(eq(transactions.userId, userId), isNotNull(transactions.categoryId)))
    .groupBy(transactions.name, transactions.categoryId, categories.type)
    .orderBy(desc(count()), desc(max(transactions.purchaseDate)))
    .limit(limit) as Promise<
    Array<{ name: string; categoryId: string; type: "income" | "expense"; uses: number }>
  >;
}

export async function listTransactionsForDuplicateCheck(userId: string, from: string, to: string) {
  return db
    .select({
      name: transactions.name,
      amount: sql<string>`abs(${transactions.amount})`,
      purchaseDate: sql<string>`${transactions.purchaseDate}::text`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        between(
          transactions.purchaseDate,
          new Date(`${from}T00:00:00Z`),
          new Date(`${to}T00:00:00Z`),
        ),
      ),
    );
}
