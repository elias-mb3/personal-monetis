import {
  cleanImportedDescription,
  type ImportedTransaction,
  importedDescriptionSimilarity,
} from "@openmonetis/domain/transactions";
import type { LocalLlm } from "../utils/ollama";

type ImportSuggestionsRepositoryModule =
  typeof import("../repositories/import-suggestions.repository");

export type ImportSuggestionsDependencies = Pick<
  ImportSuggestionsRepositoryModule,
  | "listCategorizedHistoryForUser"
  | "listSuggestableCategoriesForUser"
  | "listTransactionsForDuplicateCheck"
>;

export type ImportSuggestion = {
  categoryId: string | null;
  source: "history" | "ai" | null;
  confidence: number | null;
};

type SuggestionRow = Pick<ImportedTransaction, "name" | "type" | "amount" | "purchaseDate">;

const historyThreshold = 0.82;
const aiMinimumConfidence = 0.35;
const aiBatchSize = 20;

const categorizeSystemPrompt = [
  "Você classifica lançamentos financeiros pessoais brasileiros (cartão de crédito, conta e vale refeição/alimentação).",
  "Para cada lançamento escolha o código da categoria mais provável entre as categorias fornecidas.",
  "Use os exemplos do histórico do usuário como principal referência: o mesmo estabelecimento deve receber a mesma categoria.",
  'Se não houver categoria adequada, responda "none". Informe a confiança entre 0 e 1.',
  "Responda somente com o JSON solicitado.",
].join(" ");

const extractSystemPrompt = [
  "Você extrai lançamentos de extratos e faturas brasileiros a partir do texto de um PDF.",
  "Retorne cada compra, pagamento, estorno ou crédito com data (AAAA-MM-DD), descrição do estabelecimento como aparece,",
  'valor positivo e tipo "expense" (saída/compra) ou "income" (entrada/crédito/estorno).',
  "Ignore saldos, totais, limites, cabeçalhos e rodapés. Responda somente com o JSON solicitado.",
].join(" ");

export function createImportSuggestionsService(
  dependencies: ImportSuggestionsDependencies,
  llm: LocalLlm | null,
) {
  async function suggestCategories(
    rows: SuggestionRow[],
    userId: string,
  ): Promise<ImportSuggestion[]> {
    const empty: ImportSuggestion = { categoryId: null, source: null, confidence: null };
    if (!rows.length) return [];
    const [history, categories] = await Promise.all([
      dependencies.listCategorizedHistoryForUser(userId),
      dependencies.listSuggestableCategoriesForUser(userId),
    ]);
    const validCategoryIds = new Set(
      categories.map((category) => `${category.type}:${category.id}`),
    );
    const usableHistory = history
      .filter((item) => validCategoryIds.has(`${item.type}:${item.categoryId}`))
      .map((item) => ({ ...item, clean: cleanImportedDescription(item.name) }));

    const neighbors = rows.map((row) =>
      usableHistory
        .filter((item) => item.type === row.type && item.clean)
        .map((item) => ({ item, score: importedDescriptionSimilarity(row.name, item.name) }))
        .filter(({ score }) => score >= 0.3)
        .sort((left, right) => right.score - left.score || right.item.uses - left.item.uses)
        .slice(0, 3),
    );
    const suggestions: ImportSuggestion[] = rows.map((_, index) => {
      const best = neighbors[index]?.[0];
      return best && best.score >= historyThreshold
        ? { categoryId: best.item.categoryId, source: "history", confidence: round(best.score) }
        : empty;
    });

    const pending = rows.flatMap((_row, index) => (suggestions[index]?.categoryId ? [] : [index]));
    if (!llm || !pending.length || !categories.length) return suggestions;

    const codes = categories.map((category, index) => ({ ...category, code: `c${index + 1}` }));
    const idsByCode = new Map(codes.map((category) => [category.code, category]));
    const codeById = new Map(codes.map((category) => [category.id, category.code]));
    const categoryList = (type: "income" | "expense") =>
      codes
        .filter((category) => category.type === type)
        .map((category) => `${category.code}: ${category.label}`)
        .join("\n");

    for (let start = 0; start < pending.length; start += aiBatchSize) {
      const batch = pending.slice(start, start + aiBatchSize);
      const types = [...new Set(batch.map((index) => rows[index]?.type))];
      const examples = [
        ...new Map(
          batch
            .flatMap((index) => neighbors[index] ?? [])
            .map(({ item }) => [item.name, `"${item.name}" -> ${codeById.get(item.categoryId)}`]),
        ).values(),
      ].slice(0, 40);
      const prompt = [
        ...types.map(
          (type) =>
            `Categorias de ${type === "income" ? "receita" : "despesa"}:\n${categoryList(type as "income" | "expense")}`,
        ),
        examples.length ? `Exemplos do histórico do usuário:\n${examples.join("\n")}` : "",
        "Lançamentos para classificar:",
        ...batch.map((index) => {
          const row = rows[index] as SuggestionRow;
          return `${index}. [${row.type === "income" ? "receita" : "despesa"}] "${row.name}" R$ ${row.amount.toFixed(2)}`;
        }),
      ]
        .filter(Boolean)
        .join("\n\n");
      try {
        const result = await llm.generateJson<{
          items?: Array<{ index: number; category: string; confidence: number }>;
        }>(categorizeSystemPrompt, prompt, {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "integer", enum: batch },
                  category: { type: "string", enum: [...codes.map((c) => c.code), "none"] },
                  confidence: { type: "number" },
                },
                required: ["index", "category", "confidence"],
              },
            },
          },
          required: ["items"],
        });
        for (const item of result.items ?? []) {
          const row = rows[item.index];
          const category = idsByCode.get(item.category);
          const confidence = Math.min(1, Math.max(0, Number(item.confidence) || 0));
          if (!row || !batch.includes(item.index) || !category || category.type !== row.type) {
            continue;
          }
          if (confidence < aiMinimumConfidence) continue;
          suggestions[item.index] = {
            categoryId: category.id,
            source: "ai",
            confidence: round(confidence),
          };
        }
      } catch (error) {
        console.warn(
          "Local AI categorization failed",
          error instanceof Error ? error.message : error,
        );
        break;
      }
    }
    return suggestions;
  }

  /** Flags rows that look like transactions already in the database (manual or recurring). */
  async function findPossibleDuplicates(rows: SuggestionRow[], userId: string) {
    if (!rows.length) return rows.map(() => false);
    const dates = rows.map((row) => row.purchaseDate).sort();
    const existing = await dependencies.listTransactionsForDuplicateCheck(
      userId,
      shiftDate(dates[0] as string, -3),
      shiftDate(dates.at(-1) as string, 3),
    );
    return rows.map((row) =>
      existing.some((item) => {
        if (Math.round(Number(item.amount) * 100) !== Math.round(row.amount * 100)) return false;
        const distance = Math.abs(Date.parse(item.purchaseDate) - Date.parse(row.purchaseDate));
        if (distance > 3 * 86_400_000) return false;
        return importedDescriptionSimilarity(item.name, row.name) >= 0.5;
      }),
    );
  }

  /** Uses the local model to read statements whose layout has no dedicated parser. */
  async function extractTransactionsFromText(text: string): Promise<ImportedTransaction[]> {
    if (!llm) return [];
    const result = await llm.generateJson<{
      transactions?: Array<{ date: string; description: string; amount: number; type: string }>;
    }>(extractSystemPrompt, text.slice(0, 20_000), {
      type: "object",
      properties: {
        transactions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string" },
              description: { type: "string" },
              amount: { type: "number" },
              type: { type: "string", enum: ["expense", "income"] },
            },
            required: ["date", "description", "amount", "type"],
          },
        },
      },
      required: ["transactions"],
    });
    return (result.transactions ?? []).flatMap<ImportedTransaction>((item) => {
      const amount = Math.abs(Number(item.amount));
      const name = String(item.description ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || Number.isNaN(Date.parse(item.date))) return [];
      if (!name || !Number.isFinite(amount) || amount <= 0) return [];
      return [
        {
          externalId: null,
          purchaseDate: item.date,
          amount: Math.round(amount * 100) / 100,
          name,
          type: item.type === "income" ? "income" : "expense",
          categoryName: null,
        },
      ];
    });
  }

  return {
    isAiEnabled: () => llm !== null,
    suggestCategories,
    findPossibleDuplicates,
    extractTransactionsFromText,
  };
}

export type ImportSuggestionsService = ReturnType<typeof createImportSuggestionsService>;

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function shiftDate(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}
