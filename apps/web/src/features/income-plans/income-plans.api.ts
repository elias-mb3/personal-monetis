import type { IncomePlanOutput, SaveIncomePlanInput } from "@openmonetis/validators/income-plans";
import { requestApiWithResponseMessage as request } from "@/lib/api-client";

export function getIncomePlan(period: string) {
  return request<IncomePlanOutput | null>(`/income-plans/${period}`);
}

export function saveIncomePlan(period: string, input: SaveIncomePlanInput) {
  return request<IncomePlanOutput>(`/income-plans/${period}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function copyPreviousIncomePlan(period: string) {
  return request<IncomePlanOutput>(`/income-plans/${period}/copy-previous`, { method: "POST" });
}

export function deleteIncomePlan(period: string) {
  return request<{ period: string }>(`/income-plans/${period}`, { method: "DELETE" });
}
