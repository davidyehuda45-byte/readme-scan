/**
 * OpenAI-compatible API provider adapter.
 * Supports OpenAI, Groq, OpenRouter, Gemini (OpenAI compat), and Custom endpoints.
 */
export class OpenAICompatProvider {
  constructor(config = {}) {
    this.name = config.name || 'openai';
    this.apiKey = config.apiKey || '';
    this.baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    this.model = config.model || 'gpt-4o-mini';
    this.maxTokens = config.maxTokens || 1000;
  }

  async generate(systemPrompt, userContent, options = {}) {
    const url = `${this.baseUrl}/chat/completions`;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const payload = {
      model: this.model,
      temperature: 0.3,
      max_tokens: this.maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
    };

    return await executeWithRetry(async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);

      try {
        const res = await (options.fetchFn || fetch)(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!res.ok) {
          const status = res.status;
          const errText = await res.text().catch(() => '');
          let msg = `API request to ${this.name} failed with status ${status}`;
          if (status === 401) msg = `Authentication error: invalid API key for ${this.name}`;
          else if (status === 429) msg = `Rate limit exceeded / quota exhausted for ${this.name}`;
          else if (status === 404) msg = `Model "${this.model}" not found for ${this.name}`;

          const err = new Error(`${msg}: ${errText.slice(0, 300)}`);
          err.status = status;
          throw err;
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';
        const usage = {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        };

        return { content, usage };
      } finally {
        clearTimeout(timer);
      }
    });
  }
}

export async function executeWithRetry(fn, maxRetries = 2) {
  let attempt = 0;
  let delay = 1000;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const isRetryable = err.status === 429 || (err.status >= 500 && err.status < 600);
      if (attempt <= maxRetries && isRetryable) {
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
}
