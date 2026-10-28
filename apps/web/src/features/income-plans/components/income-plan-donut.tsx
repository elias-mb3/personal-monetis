import type { IncomePlanOutput } from "@openmonetis/validators/income-plans";
import { Cell, Pie, PieChart } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { getSpendingAreaColorValue } from "@/features/spending-areas/spending-areas.presentation";
import { formatCurrency } from "@/lib/money-presentation";
import { formatPlanPercentage } from "../income-plans.presentation";

const chartConfig = {} satisfies ChartConfig;

type Slice = { key: string; name: string; amount: number; percentage: number; fill: string };

export function IncomePlanDonut({ plan }: { plan: IncomePlanOutput }) {
  const slices: Slice[] = [
    ...plan.areas
      .filter((area) => area.plannedAmount > 0)
      .map((area) => ({
        key: area.areaId,
        name: area.name,
        amount: area.plannedAmount,
        percentage: area.plannedPercentage,
        fill: getSpendingAreaColorValue(area.color),
      })),
    ...(plan.unallocatedAmount > 0
      ? [
          {
            key: "unallocated",
            name: "Não alocado",
            amount: plan.unallocatedAmount,
            percentage: plan.unallocatedPercentage,
            fill: "var(--muted)",
          },
        ]
      : []),
  ];

  return (
    <div className="relative mx-auto aspect-square w-full max-w-72">
      <ChartContainer className="aspect-square w-full" config={chartConfig}>
        <PieChart accessibilityLayer>
          <ChartTooltip
            content={({ active, payload }) => {
              const slice = payload?.[0]?.payload as Slice | undefined;
              if (!active || !slice) return null;
              return (
                <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
                  <p className="font-medium">{slice.name}</p>
                  <p className="text-muted-foreground">
                    {formatCurrency(slice.amount)} · {formatPlanPercentage(slice.percentage)}
                  </p>
                </div>
              );
            }}
          />
          <Pie
            data={slices}
            dataKey="amount"
            innerRadius="62%"
            nameKey="name"
            outerRadius="100%"
            paddingAngle={slices.length > 1 ? 2 : 0}
            stroke="none"
          >
            {slices.map((slice) => (
              <Cell fill={slice.fill} key={slice.key} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
        <span className="font-semibold text-2xl">
          {formatPlanPercentage(plan.allocatedPercentage)}
        </span>
        <span className="text-muted-foreground text-xs">da renda alocada</span>
      </div>
    </div>
  );
}
