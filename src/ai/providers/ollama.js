/**
 * Ollama local API provider adapter (PRD Section 2).
 * Operates offline against local Ollama daemon (default: http://localhost:11434).
 */
export class OllamaProvider {
  constructor(config = {}) {
    this.name = 'ollama';
    this.baseUrl = (config.baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
    this.model = config.model || 'llama3.2';
    this.maxTokens = config.maxTokens || 1000;
  }

  async isAvailable(fetchFn = fetch) {
    try {
      const res = await fetchFn(`${this.baseUrl}/api/tags`, { method: 'GET', signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async generate(systemPrompt, userContent, options = {}) {
    const url = `${this.baseUrl}/api/chat`;

    const payload = {
      model: this.model,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.3,
        num_predict: this.maxTokens,
      },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await (options.fetchFn || fetch)(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Ollama request failed with status ${res.status}: ${errText.slice(0, 300)}`);
      }

      const data = await res.json();
      const content = data.message?.content || '';
      const usage = {
        inputTokens: data.prompt_eval_count || 0,
        outputTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      };

      return { content, usage };
    } finally {
      clearTimeout(timer);
    }
  }
}
