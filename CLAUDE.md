# CLAUDE.md — personal-monetis (fork local do OpenMonetis)

@AGENTS.md

## Regras deste fork

- **Tudo roda em containers.** Nunca instale Node, pnpm, Python ou outras linguagens no host.
  - App: `docker-compose up -d --build` (Podman via `DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock`).
  - Lint/testes/typecheck: devcontainer (`.devcontainer/`) ou um container descartável, por exemplo
    `podman run --rm --userns=keep-id -v "$PWD:/w:Z" -w /w node:22.16.0-bookworm sh -c "corepack pnpm install --frozen-lockfile && corepack pnpm test"`.
  - No host use só ferramentas já existentes do sistema: `curl`, `jq`, `sha256sum`, `base64`.
- `compose.override.yml` builda as imagens deste fork e sobe o Ollama (`ollama` + `ollama-pull`)
  só na rede interna do compose. A API usa `OLLAMA_URL`/`OLLAMA_MODEL` (padrão `qwen2.5:3b`).
- Nunca commite `.env`, cookies, extratos ou senhas. Peça a senha ao usuário quando precisar logar.

## Importação de extratos com IA

A tela **Lançamentos → Importar** aceita OFX/QFX/XLSX/CSV/PDF. A prévia
(`POST /transactions/imports/preview`) sugere categorias nesta ordem:

1. `mapping` — descrição idêntica já confirmada antes (`import_category_mappings`);
2. `history` — descrição parecida no histórico do usuário (trigramas ≥ 0,82);
3. `ai` — modelo local no Ollama, com as categorias do usuário e exemplos do histórico.

Também marca `isDuplicate` (mesmo FITID/ID externo) e `isPossibleDuplicate` (mesmo valor,
data ±3 dias e descrição parecida com algo já lançado, ex. recorrências).
Código: `packages/domain/src/transactions.ts` (parsers), `apps/api/src/services/import-suggestions.service.ts`,
`apps/api/src/utils/ollama.ts`, `apps/api/src/utils/pdf-text.ts`.

Para fazer a mesma importação pelo Claude Code (sem o modelo local), use a skill
`/importar-extrato` (`.claude/skills/importar-extrato/SKILL.md`).
