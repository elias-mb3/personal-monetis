import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { ok } from "@openmonetis/shared/api";
import {
  CreateSpendingAreaInputSchema,
  SpendingAreaOutputSchema,
  SpendingAreaParamsSchema,
  UpdateSpendingAreaInputSchema,
} from "@openmonetis/validators/spending-areas";
import type { SpendingAreasService } from "../services/spending-areas.service";
import type { ApiVariables } from "../types/context";
import { ErrorResponseSchema as ErrorSchema, validationHook } from "../utils/openapi";

const AreaResponseSchema = z.object({ data: SpendingAreaOutputSchema, error: z.null() });
const AreaListResponseSchema = z.object({
  data: z.array(SpendingAreaOutputSchema),
  error: z.null(),
});
const DeleteResponseSchema = z.object({ data: z.object({ id: z.uuid() }), error: z.null() });
const unauthorized = {
  description: "Authentication required",
  content: { "application/json": { schema: ErrorSchema } },
};
const notFoundResponse = {
  description: "Spending area or category not found",
  content: { "application/json": { schema: ErrorSchema } },
};
const invalidResponse = {
  description: "Invalid request or limit reached",
  content: { "application/json": { schema: ErrorSchema } },
};
const conflictResponse = {
  description: "Duplicate name or category already assigned",
  content: { "application/json": { schema: ErrorSchema } },
};

export function createSpendingAreasRoute(service: SpendingAreasService) {
  const route = new OpenAPIHono<{ Variables: ApiVariables }>({ defaultHook: validationHook });

  route.openapi(
    createRoute({
      method: "get",
      path: "/",
      tags: ["Spending areas"],
      responses: {
        200: {
          description: "Spending areas with their categories",
          content: { "application/json": { schema: AreaListResponseSchema } },
        },
        401: unauthorized,
      },
    }),
    async (context) => context.json(ok(await service.list(context.get("userId"))), 200),
  );

  route.openapi(
    createRoute({
      method: "post",
      path: "/",
      tags: ["Spending areas"],
      request: {
        body: {
          required: true,
          content: { "application/json": { schema: CreateSpendingAreaInputSchema } },
        },
      },
      responses: {
        201: {
          description: "Created spending area",
          content: { "application/json": { schema: AreaResponseSchema } },
        },
        400: invalidResponse,
        401: unauthorized,
        404: notFoundResponse,
        409: conflictResponse,
      },
    }),
    async (context) =>
      context.json(ok(await service.create(context.req.valid("json"), context.get("userId"))), 201),
  );

  route.openapi(
    createRoute({
      method: "patch",
      path: "/{id}",
      tags: ["Spending areas"],
      request: {
        params: SpendingAreaParamsSchema,
        body: {
          required: true,
          content: { "application/json": { schema: UpdateSpendingAreaInputSchema } },
        },
      },
      responses: {
        200: {
          description: "Updated spending area",
          content: { "application/json": { schema: AreaResponseSchema } },
        },
        400: invalidResponse,
        401: unauthorized,
        404: notFoundResponse,
        409: conflictResponse,
      },
    }),
    async (context) => {
      const { id } = context.req.valid("param");
      return context.json(
        ok(await service.update(id, context.get("userId"), context.req.valid("json"))),
        200,
      );
    },
  );

  route.openapi(
    createRoute({
      method: "delete",
      path: "/{id}",
      tags: ["Spending areas"],
      request: { params: SpendingAreaParamsSchema },
      responses: {
        200: {
          description: "Deleted spending area",
          content: { "application/json": { schema: DeleteResponseSchema } },
        },
        401: unauthorized,
        404: notFoundResponse,
      },
    }),
    async (context) => {
      const { id } = context.req.valid("param");
      return context.json(ok(await service.remove(id, context.get("userId"))), 200);
    },
  );

  return route;
}
