# Planejamento da renda por áreas

## Objetivo

Visualizar em um gráfico de rosquinha quanto da renda do mês vai para cada área (ex.: R$ 3.500 =
100%, Reserva R$ 700 = 20%) e acompanhar o realizado das áreas ligadas a categorias de despesa.

## Decisões

- **Áreas fixas + plano mensal.** `spending_areas` agrupa categorias de despesa (cada categoria em
  no máximo uma área). `income_plans` guarda a renda digitada do mês e `income_plan_allocations`
  o valor em R$ de cada área. A % é sempre derivada do valor.
- **Base 100% digitada**, não derivada das receitas reais.
- **Realizado** reaproveita `calculateBudgetSpending` e `calculateBudgetProgress` do Orçamento,
  para as duas telas nunca divergirem.
- A API aceita a alocação em `amount` ou `percentage`; a conversão fica no domain
  (`resolveAllocationAmounts`). A web só mostra uma prévia.
- Soma acima da renda é rejeitada (`allocations_exceed_income`). O restante vira "Não alocado".
- Rejeitadas: plano mensal com áreas próprias (remonta o agrupamento todo mês) e estender
  `budgets` (mistura dois casos de uso).

## API

- `GET/POST /spending-areas`, `PATCH/DELETE /spending-areas/{id}`
- `GET/PUT/DELETE /income-plans/{period}`, `POST /income-plans/{period}/copy-previous`

## Fora do escopo

Planejamento por pessoa, ligar a Reserva a Metas ou contas, alertas, widget no dashboard e
comparação com o salário recebido.
