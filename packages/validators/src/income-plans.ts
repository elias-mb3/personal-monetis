import { z } from "@hono/zod-openapi";
import { budgetStatuses } from "@openmonetis/domain/budgets";
import { spendingAreaColors, spendingAreaLimit } from "@openmonetis/domain/spending-areas";

const periodSchema = z.string().regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/);
const moneySchema = z.number().finite().multipleOf(0.01).nonnegative().max(9_999_999_999.99);

export const IncomePlanParamsSchema = z
  .object({
    period: periodSchema.openapi({ param: { name: "period", in: "path" }, example: "2026-11" }),
  })
  .openapi("IncomePlanParams");

export const SaveIncomePlanInputSchema = z
  .object({
    incomeAmount: moneySchema,
    note: z.string().trim().max(500).nullable().optional(),
    allocations: z
      .array(
        z.union([
          z.object({ areaId: z.uuid(), amount: moneySchema }),
          z.object({ areaId: z.uuid(), percentage: z.number().finite().min(0).max(100) }),
        ]),
      )
      .max(spendingAreaLimit)
      .refine(
        (items) => new Set(items.map((item) => item.areaId)).size === items.length,
        "Area IDs must be unique",
      ),
  })
  .openapi("SaveIncomePlanInput");

export const IncomePlanAreaOutputSchema = z
  .object({
    areaId: z.uuid(),
    name: z.string(),
    color: z.enum(spendingAreaColors),
    categoryIds: z.array(z.uuid()),
    plannedAmount: z.number().nonnegative(),
    plannedPercentage: z.number().nonnegative(),
    isTracked: z.boolean(),
    committedAmount: z.number().nonnegative(),
    remainingAmount: z.number().nonnegative(),
    exceededAmount: z.number().nonnegative(),
    usagePercentage: z.number().nonnegative(),
    status: z.enum(budgetStatuses),
  })
  .openapi("IncomePlanArea");

export const IncomePlanOutputSchema = z
  .object({
    period: periodSchema,
    incomeAmount: z.number().nonnegative(),
    note: z.string().nullable(),
    allocatedAmount: z.number().nonnegative(),
    allocatedPercentage: z.number().nonnegative(),
    unallocatedAmount: z.number().nonnegative(),
    unallocatedPercentage: z.number().nonnegative(),
    areas: z.array(IncomePlanAreaOutputSchema),
    updatedAt: z.iso.datetime(),
  })
  .openapi("IncomePlan");

export type SaveIncomePlanInput = z.infer<typeof SaveIncomePlanInputSchema>;
export type IncomePlanOutput = z.infer<typeof IncomePlanOutputSchema>;
export type IncomePlanAreaOutput = z.infer<typeof IncomePlanAreaOutputSchema>;
