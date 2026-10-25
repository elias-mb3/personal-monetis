import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanImportedDescription,
  importedDescriptionSimilarity,
  parseCsvStatement,
  parsePluxeeStatementText,
} from "./transactions";

test("cleanImportedDescription strips card noise, installments and accents", () => {
  assert.equal(cleanImportedDescription("IFD*Restaurante São José 12/03"), "restaurante sao jose");
  assert.equal(cleanImportedDescription("Vivara - Parcela 2/4"), "vivara");
  assert.equal(cleanImportedDescription("UBER *TRIP HELP.UBER.COM"), "uber trip help uber com");
});

test("importedDescriptionSimilarity matches variations of the same merchant", () => {
  assert.ok(importedDescriptionSimilarity("Uber *Trip", "UBER *TRIP 8812") > 0.8);
  assert.ok(importedDescriptionSimilarity("Uber *Trip", "Cacau Show") < 0.3);
});

test("parseCsvStatement reads Nubank card exports with purchases as expenses", () => {
  const statement = parseCsvStatement(
    "date,title,amount\n2026-10-20,Uber *Trip,23.90\n2026-10-21,Pagamento recebido,-500.00\n",
    "csv:test",
  );
  assert.equal(statement.isCreditCard, true);
  assert.deepEqual(
    statement.transactions.map(({ name, type, amount }) => ({ name, type, amount })),
    [
      { name: "Uber *Trip", type: "expense", amount: 23.9 },
      { name: "Pagamento recebido", type: "income", amount: 500 },
    ],
  );
});

test("parseCsvStatement reads semicolon Brazilian exports with signed values", () => {
  const statement = parseCsvStatement(
    'Data;Descrição;Valor\n05/11/2026;"Mercado; Centro";-1.234,56\n06/11/2026;Pix recebido;100,00\n',
    "csv:test",
  );
  assert.equal(statement.isCreditCard, false);
  assert.deepEqual(statement.transactions[0], {
    externalId: null,
    purchaseDate: "2026-11-05",
    amount: 1234.56,
    name: "Mercado; Centro",
    type: "expense",
    categoryName: null,
  });
  assert.equal(statement.transactions[1]?.type, "income");
});

test("parsePluxeeStatementText reads dated purchases from the app PDF text", () => {
  const statement = parsePluxeeStatementText(
    [
      "PDF gerado em 25/10/2026 19:11",
      "Pluxee",
      "Refeição",
      "Saldo disponível",
      "R$ 0,87 Extrato atualizado em 25/10/2026 19:11",
      "23 outubro 2026",
      "Panificadora E Confeitari",
      "Compra no Refeição • 11:40",
      "-R$ 18,23",
      "19 outubro 2026",
      "Cacau Show",
      "Compra no Refeição • 14:31",
      "-R$ 9,98",
      "Benefício disponibilizado",
      "Crédito no Refeição • 08:00",
      "+R$ 841,61",
    ].join("\n"),
  );
  assert.equal(statement.sourceName, "Pluxee Refeição");
  assert.deepEqual(
    statement.transactions.map(({ purchaseDate, name, amount, type }) => [
      purchaseDate,
      name,
      amount,
      type,
    ]),
    [
      ["2026-10-23", "Panificadora E Confeitari", 18.23, "expense"],
      ["2026-10-19", "Cacau Show", 9.98, "expense"],
      ["2026-10-19", "Benefício disponibilizado", 841.61, "income"],
    ],
  );
});
