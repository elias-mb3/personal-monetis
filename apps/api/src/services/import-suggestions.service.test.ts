import assert from "node:assert/strict";
import test from "node:test";
import { createImportSuggestionsService } from "./import-suggestions.service";

const transport = "11111111-1111-4111-8111-111111111111";
const food = "22222222-2222-4222-8222-222222222222";

function createService(llmCategories: string[]) {
  const prompts: string[] = [];
  const service = createImportSuggestionsService(
    {
      listSuggestableCategoriesForUser: async () => [
        { id: transport, type: "expense", label: "Transporte > Corridas (Uber/99)" },
        { id: food, type: "expense", label: "Restaurantes" },
      ],
      listCategorizedHistoryForUser: async () => [
        { name: "UBER *TRIP", categoryId: transport, type: "expense", uses: 12 },
      ],
      listTransactionsForDuplicateCheck: async () => [
        { name: "Total Pass", amount: "109.90", purchaseDate: "2026-11-14" },
      ],
    } as never,
    {
      model: "fake",
      async generateJson<T>(_system: string, prompt: string) {
        prompts.push(prompt);
        return { categories: llmCategories } as T;
      },
    },
  );
  return { service, prompts };
}

const row = (name: string, amount = 10) => ({
  name,
  amount,
  type: "expense" as const,
  purchaseDate: "2026-11-15",
});

test("history matches skip the model and codes map back in prompt order", async () => {
  const { service, prompts } = createService(["c2", "none"]);
  const result = await service.suggestCategories(
    [row("Uber *Trip 8812"), row("Outback Steakhouse"), row("Loja XPTO")],
    "user",
  );
  assert.deepEqual(
    result.map((item) => [item.categoryId, item.source]),
    [
      [transport, "history"],
      [food, "ai"],
      [null, null],
    ],
  );
  assert.equal(prompts.length, 1);
  assert.match(prompts[0] as string, /1\. \[despesa\] "Outback Steakhouse"/);
  assert.equal(result[1]?.confidence, null);
});

test("possible duplicates require same amount, close date and similar name", async () => {
  const { service } = createService([]);
  const result = await service.findPossibleDuplicates(
    [row("TOTALPASS*Total Pass", 109.9), row("Total Pass", 50), row("Cacau Show", 109.9)],
    "user",
  );
  assert.deepEqual(result, [true, false, false]);
});
