import type { SpendingAreaOutput } from "@openmonetis/validators/spending-areas";

export const spendingAreaColorLabels: Record<SpendingAreaOutput["color"], string> = {
  chart1: "Coral",
  chart2: "Azul",
  chart3: "Verde",
  chart4: "Lilás",
  chart5: "Grafite",
};

export function getSpendingAreaColorValue(color: SpendingAreaOutput["color"]) {
  return `var(--chart-${color.slice(-1)})`;
}

export function getSpendingAreaErrorMessage(code?: string) {
  if (code === "category_already_assigned") return "Uma categoria já está em outra área.";
  if (code === "spending_area_exists") return "Já existe uma área com esse nome.";
  if (code === "spending_area_limit_reached") return "Limite de áreas atingido.";
  return "Não foi possível salvar a área.";
}
