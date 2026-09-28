import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OpenAICompatProvider } from './providers/openai-compat.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { OllamaProvider } from './providers/ollama.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODELS_PATH = path.resolve(__dirname, '../data/models.json');

export function loadModelsConfig() {
  try {
    return JSON.parse(fs.readFileSync(MODELS_PATH, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Creates a configured provider instance.
 *
 * @param {string} providerName
 * @param {object} options
 * @returns {AnthropicProvider | OllamaProvider | OpenAICompatProvider}
 */
export function createProvider(providerName = 'openai', options = {}) {
  const norm = (providerName || 'openai').toLowerCase();
  const modelsConf = loadModelsConfig();
  const defaultInfo = modelsConf[norm] || {};

  const baseUrl = options.baseUrl || defaultInfo.baseUrl;
  const model = options.model || defaultInfo.defaultModel;
  const apiKey = options.apiKey || '';
  const maxTokens = options.maxOutputTokens ? Number(options.maxOutputTokens) : 1000;

  if (norm === 'anthropic') {
    return new AnthropicProvider({
      apiKey,
      baseUrl,
      model,
      maxTokens,
    });
  }

  if (norm === 'ollama') {
    return new OllamaProvider({
      baseUrl,
      model,
      maxTokens,
    });
  }

  // OpenAI, Groq, OpenRouter, Gemini (OpenAI compat endpoint), and Custom
  return new OpenAICompatProvider({
    name: norm,
    apiKey,
    baseUrl,
    model,
    maxTokens,
  });
}
