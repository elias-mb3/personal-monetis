import type {
  CreateSpendingAreaInput,
  SpendingAreaOutput,
  UpdateSpendingAreaInput,
} from "@openmonetis/validators/spending-areas";
import { requestApiWithResponseMessage as request } from "@/lib/api-client";

export function getSpendingAreas() {
  return request<SpendingAreaOutput[]>("/spending-areas");
}

export function createSpendingArea(input: CreateSpendingAreaInput) {
  return request<SpendingAreaOutput>("/spending-areas", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateSpendingArea(id: string, input: UpdateSpendingAreaInput) {
  return request<SpendingAreaOutput>(`/spending-areas/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteSpendingArea(id: string) {
  return request<{ id: string }>(`/spending-areas/${id}`, { method: "DELETE" });
}
