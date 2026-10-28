import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { ok } from "@openmonetis/shared/api";
import {
  IncomePlanOutputSchema,
  IncomePlanParamsSchema,
  SaveIncomePlanInputSchema,
} from "@openmonetis/validators/income-plans";
import type { IncomePlansService } from "../services/income-plans.service";
import type { ApiVariables } from "../types/context";
import { ErrorResponseSchema as ErrorSchema, validationHook } from "../utils/openapi";

const PlanResponseSchema = z.object({ data: IncomePlanOutputSchema, error: z.null() });
const OptionalPlanResponseSchema = z.object({
  data: IncomePlanOutputSchema.nullable(),
  error: z.null(),
});
const DeleteResponseSchema = z.object({
  data: z.object({ period: z.string() }),
  error: z.null(),
});
const unauthorized = {
  description: "Authentication required",
  content: { "application/json": { schema: ErrorSchema } },
};
const notFoundResponse = {
  description: "Plan or spending area not found",
  content: { "application/json": { schema: ErrorSchema } },
};

export function createIncomePlansRoute(service: IncomePlansService) {
  const route = new OpenAPIHono<{ Variables: ApiVariables }>({ defaultHook: validationHook });

  route.openapi(
    createRoute({
      method: "get",
      path: "/{period}",
      tags: ["Income plans"],
      request: { params: IncomePlanParamsSchema },
      responses: {
        200: {
          description: "Income plan summary for a period, or null when there is no plan",
          content: { "application/json": { schema: OptionalPlanResponseSchema } },
        },
        401: unauthorized,
      },
    }),
    async (context) => {
      const { period } = context.req.valid("param");
      return context.json(ok(await service.get(period, context.get("userId"))), 200);
    },
  );

  route.openapi(
    createRoute({
      method: "put",
      path: "/{period}",
      tags: ["Income plans"],
      request: {
        params: IncomePlanParamsSchema,
        body: {
          required: true,
          content: { "application/json": { schema: SaveIncomePlanInputSchema } },
        },
      },
      responses: {
        200: {
          description: "Saved income plan",
          content: { "application/json": { schema: PlanResponseSchema } },
        },
        400: {
          description: "Allocations exceed income",
          content: { "application/json": { schema: ErrorSchema } },
        },
        401: unauthorized,
        404: notFoundResponse,
      },
    }),
    async (context) => {
      const { period } = context.req.valid("param");
      return context.json(
        ok(await service.save(period, context.get("userId"), context.req.valid("json"))),
        200,
      );
    },
  );

  route.openapi(
    createRoute({
      method: "post",
      path: "/{period}/copy-previous",
      tags: ["Income plans"],
      request: { params: IncomePlanParamsSchema },
      responses: {
        201: {
          description: "Plan copied from the previous period",
          content: { "application/json": { schema: PlanResponseSchema } },
        },
        401: unauthorized,
        404: notFoundResponse,
        409: {
          description: "A plan already exists for this period",
          content: { "application/json": { schema: ErrorSchema } },
        },
      },
    }),
    async (context) => {
      const { period } = context.req.valid("param");
      return context.json(ok(await service.copyPrevious(period, context.get("userId"))), 201);
    },
  );

  route.openapi(
    createRoute({
      method: "delete",
      path: "/{period}",
      tags: ["Income plans"],
      request: { params: IncomePlanParamsSchema },
      responses: {
        200: {
          description: "Deleted income plan",
          content: { "application/json": { schema: DeleteResponseSchema } },
        },
        401: unauthorized,
        404: notFoundResponse,
      },
    }),
    async (context) => {
      const { period } = context.req.valid("param");
      return context.json(ok(await service.remove(period, context.get("userId"))), 200);
    },
  );

  return route;
}
