import assert from "node:assert/strict";
import test from "node:test";
import { createImportSuggestionsService } from "./import-suggestions.service";

const transport = "11111111-1111-4111-8111-111111111111";
const food = "22222222-2222-4222-8222-222222222222";

function createService(llmItems: Array<{ index: number; category: string; confidence: number }>) {
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
        return { items: llmItems } as T;
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

test("history matches skip the model and low-confidence answers are dropped", async () => {
  const { service, prompts } = createService([
    { index: 1, category: "c2", confidence: 0.9 },
    { index: 2, category: "c1", confidence: 0.1 },
  ]);
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
  assert.doesNotMatch(prompts[0] as string, /0\. \[despesa\]/);
});

test("possible duplicates require same amount, close date and similar name", async () => {
  const { service } = createService([]);
  const result = await service.findPossibleDuplicates(
    [row("TOTALPASS*Total Pass", 109.9), row("Total Pass", 50), row("Cacau Show", 109.9)],
    "user",
  );
  assert.deepEqual(result, [true, false, false]);
});
