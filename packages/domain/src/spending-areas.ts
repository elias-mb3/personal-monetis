export const spendingAreaColors = ["chart1", "chart2", "chart3", "chart4", "chart5"] as const;
export type SpendingAreaColor = (typeof spendingAreaColors)[number];

export const spendingAreaLimit = 20;
