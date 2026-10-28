import { z } from "@hono/zod-openapi";
import { spendingAreaColors, spendingAreaLimit } from "@openmonetis/domain/spending-areas";

export { spendingAreaColors } from "@openmonetis/domain/spending-areas";

const nameSchema = z.string().trim().min(1).max(60);
const categoryIdsSchema = z
  .array(z.uuid())
  .max(100)
  .refine((ids) => new Set(ids).size === ids.length, "Category IDs must be unique");

export const CreateSpendingAreaInputSchema = z
  .object({
    name: nameSchema,
    color: z.enum(spendingAreaColors),
    categoryIds: categoryIdsSchema,
  })
  .openapi("CreateSpendingAreaInput");

export const UpdateSpendingAreaInputSchema = z
  .object({
    name: nameSchema.optional(),
    color: z.enum(spendingAreaColors).optional(),
    sortOrder: z.number().int().min(0).max(spendingAreaLimit).optional(),
    categoryIds: categoryIdsSchema.optional(),
  })
  .refine((input) => Object.keys(input).length > 0, "Provide at least one field to update")
  .openapi("UpdateSpendingAreaInput");

export const SpendingAreaParamsSchema = z
  .object({ id: z.uuid().openapi({ param: { name: "id", in: "path" } }) })
  .openapi("SpendingAreaParams");

export const SpendingAreaOutputSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    color: z.enum(spendingAreaColors),
    sortOrder: z.number().int().nonnegative(),
    categories: z.array(z.object({ id: z.uuid(), name: z.string(), icon: z.string().nullable() })),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi("SpendingArea");

export type CreateSpendingAreaInput = z.infer<typeof CreateSpendingAreaInputSchema>;
export type UpdateSpendingAreaInput = z.infer<typeof UpdateSpendingAreaInputSchema>;
export type SpendingAreaOutput = z.infer<typeof SpendingAreaOutputSchema>;
