export type JsonSchema = Record<string, unknown>;

export type LocalLlm = {
  model: string;
  /** Runs one chat completion constrained to `schema` and returns the parsed JSON. */
  generateJson<T>(system: string, prompt: string, schema: JsonSchema): Promise<T>;
};

export function createOllamaClient(options: {
  baseUrl: string;
  model: string;
  timeoutMs?: number;
  /** CPU threads for inference; Ollama under-detects them inside containers. */
  numThread?: number;
  fetchImpl?: typeof fetch;
}): LocalLlm {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    model: options.model,
    async generateJson<T>(system: string, prompt: string, schema: JsonSchema) {
      const response = await fetchImpl(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: AbortSignal.timeout(options.timeoutMs ?? 300_000),
        body: JSON.stringify({
          model: options.model,
          stream: false,
          format: schema,
          keep_alive: "15m",
          options: {
            temperature: 0,
            num_ctx: 8192,
            ...(options.numThread ? { num_thread: options.numThread } : {}),
          },
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!response.ok) throw new Error(`Ollama request failed with status ${response.status}`);
      const body = (await response.json()) as { message?: { content?: string } };
      return JSON.parse(body.message?.content ?? "") as T;
    },
  };
}

export function createOllamaClientFromEnv(env = process.env): LocalLlm | null {
  const baseUrl = env.OLLAMA_URL?.trim();
  if (!baseUrl) return null;
  return createOllamaClient({
    baseUrl,
    model: env.OLLAMA_MODEL?.trim() || "qwen2.5:3b",
    timeoutMs: Number(env.OLLAMA_TIMEOUT_MS) || undefined,
    numThread: Number(env.OLLAMA_NUM_THREAD) || undefined,
  });
}
