import type { IncomePlanAreaOutput } from "@openmonetis/validators/income-plans";
import { MoneyValue } from "@/components/money-value";
import { Badge } from "@/components/ui/badge";
import { budgetProgressStyles, budgetStatusStyles } from "@/features/budgets/budgets.presentation";
import { getSpendingAreaColorValue } from "@/features/spending-areas/spending-areas.presentation";
import { cn } from "@/lib/utils";
import { formatPlanPercentage, incomePlanStatusLabels } from "../income-plans.presentation";

export function IncomePlanAreaRow({ area }: { area: IncomePlanAreaOutput }) {
  return (
    <li className="grid gap-2 rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: getSpendingAreaColorValue(area.color) }}
        />
        <span className="min-w-0 flex-1 truncate font-medium text-sm">{area.name}</span>
        <span className="text-sm tabular-nums">
          <MoneyValue amount={area.plannedAmount} />
          <span className="text-muted-foreground">
            {" "}
            · {formatPlanPercentage(area.plannedPercentage)}
          </span>
        </span>
      </div>
      {area.isTracked ? (
        <>
          <div
            aria-label={`${area.name}: ${formatPlanPercentage(area.usagePercentage)} do planejado`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.min(area.usagePercentage, 100)}
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
          >
            <div
              className={cn("h-full rounded-full", budgetProgressStyles[area.status])}
              style={{ width: `${Math.min(area.usagePercentage, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-muted-foreground text-xs">
            <span>
              <MoneyValue amount={area.committedAmount} /> de{" "}
              <MoneyValue amount={area.plannedAmount} />
            </span>
            <Badge className={budgetStatusStyles[area.status]} variant="secondary">
              {incomePlanStatusLabels[area.status]}
            </Badge>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground text-xs">Sem categorias vinculadas: só planejado.</p>
      )}
    </li>
  );
}
