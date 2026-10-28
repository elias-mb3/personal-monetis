import { createFileRoute } from "@tanstack/react-router";
import { getCurrentPeriod } from "@/components/month-navigation";
import { IncomePlansPage } from "@/features/income-plans/components/income-plans-page";

export const Route = createFileRoute("/income-plans")({
  head: () => ({ meta: [{ title: "Planejamento · OpenMonetis" }] }),
  component: IncomePlansRoute,
  validateSearch: validateIncomePlansSearch,
});

function IncomePlansRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const period = search.period ?? getCurrentPeriod();

  return (
    <IncomePlansPage
      onPeriodChange={(nextPeriod) =>
        navigate({
          replace: true,
          search: (previous) => ({ ...previous, period: nextPeriod }),
        })
      }
      period={period}
    />
  );
}

function validateIncomePlansSearch(search: Record<string, unknown>) {
  return {
    period:
      typeof search.period === "string" && /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(search.period)
        ? search.period
        : undefined,
  };
}
