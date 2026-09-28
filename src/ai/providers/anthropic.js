import { executeWithRetry } from './openai-compat.js';

/**
 * Anthropic Messages API provider adapter.
 */
export class AnthropicProvider {
  constructor(config = {}) {
    this.name = 'anthropic';
    this.apiKey = config.apiKey || '';
    this.baseUrl = (config.baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
    this.model = config.model || 'claude-3-5-haiku-latest';
    this.maxTokens = config.maxTokens || 1000;
  }

  async generate(systemPrompt, userContent, options = {}) {
    const url = `${this.baseUrl}/messages`;
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
    };

    const payload = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userContent },
      ],
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
          let msg = `Anthropic API request failed with status ${status}`;
          if (status === 401) msg = 'Authentication error: invalid Anthropic API key';
          else if (status === 429) msg = 'Rate limit exceeded / quota exhausted for Anthropic';
          else if (status === 404) msg = `Model "${this.model}" not found for Anthropic`;

          const err = new Error(`${msg}: ${errText.slice(0, 300)}`);
          err.status = status;
          throw err;
        }

        const data = await res.json();
        const content = data.content?.[0]?.text || '';
        const usage = {
          inputTokens: data.usage?.input_tokens || 0,
          outputTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        };

        return { content, usage };
      } finally {
        clearTimeout(timer);
      }
    });
  }
}
