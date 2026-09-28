import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAiPayload } from './payload.js';
import { createProvider, loadModelsConfig } from './provider.js';
import { getApiKey } from './auth.js';
import { validateAiResponse } from './validate.js';
import { OllamaProvider } from './providers/ollama.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadPrompt(lang = 'en') {
  const file = path.resolve(__dirname, `prompts/system.${lang === 'id' ? 'id' : 'en'}.txt`);
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return fs.readFileSync(path.resolve(__dirname, 'prompts/system.en.txt'), 'utf8');
  }
}

function loadExamples() {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, 'prompts/examples.json'), 'utf8'));
  } catch {
    return [];
  }
}

/**
 * Runs the AI enhancement flow per PRD Section 6.
 * Fallback-safe: always returns scanData, even on complete AI failure.
 *
 * @param {object} scanData
 * @param {object} options
 * @returns {Promise<{ success: boolean, scanData: object, usage?: object, error?: string, preview?: object }>}
 */
export async function runAiEnhancement(scanData, options = {}) {
  const lang = (options.lang || 'en').toLowerCase();
  const systemPrompt = loadPrompt(lang);
  const examples = loadExamples();

  const payload = buildAiPayload(scanData, options);

  // Transparansi: --ai-preview
  if (options.aiPreview) {
    return {
      success: true,
      preview: {
        systemPrompt,
        examples,
        payload,
      },
      scanData,
    };
  }

  // Determine provider
  let providerName = options.provider ? options.provider.toLowerCase() : null;

  if (!providerName) {
    // If not specified, check if any env key exists or check local ollama
    const models = loadModelsConfig();
    for (const [p, conf] of Object.entries(models)) {
      if (conf.envKey && process.env[conf.envKey]) {
        providerName = p;
        break;
      }
    }
    if (!providerName) {
      // Check if Ollama is available locally
      const ollama = new OllamaProvider();
      const isOllamaUp = await ollama.isAvailable(options.fetchFn);
      if (isOllamaUp) {
        providerName = 'ollama';
      } else {
        providerName = 'openai'; // fallback default
      }
    }
  }

  // Resolve API key
  const { key: apiKey, source: keySource } = getApiKey(providerName, {
    apiKey: options.apiKey,
    loadEnv: options.loadEnv,
    projectDir: scanData.context?.rootDir,
  });

  if (providerName !== 'ollama' && !apiKey) {
    return {
      success: false,
      error: `No API key found for provider "${providerName}". Configure one with "auto-readme auth set ${providerName}" or set the environment variable.`,
      scanData,
    };
  }

  // Check confirmation for cloud providers
  if (providerName !== 'ollama' && !options.yes && options.interactivePrompt) {
    const estimatedTokens = Math.ceil(JSON.stringify(payload).length / 4);
    const confirmed = await options.interactivePrompt({
      provider: providerName,
      model: options.model || 'default',
      estimatedTokens,
    });
    if (!confirmed) {
      return {
        success: false,
        error: 'AI generation cancelled by user.',
        scanData,
      };
    }
  }

  const provider = createProvider(providerName, {
    apiKey,
    baseUrl: options.baseUrl,
    model: options.model,
    maxOutputTokens: options.maxOutputTokens,
  });

  // Prepare user prompt with examples
  const userPrompt = JSON.stringify({
    facts: payload.facts,
    snippets: payload.snippets,
    fewShotExamples: examples,
  });

  try {
    const result = await provider.generate(systemPrompt, userPrompt, { fetchFn: options.fetchFn });

    // Validate model response against facts JSON
    const validation = validateAiResponse(result.content, payload.facts, {
      style: options.style,
      lang,
    });

    if (!validation.valid) {
      return {
        success: false,
        error: 'AI response failed claim validation. Using static generation fallback.',
        scanData,
      };
    }

    // Merge validated AI narratives into scanData
    const updatedScanData = { ...scanData };

    if (validation.data.description) {
      updatedScanData.description = `<!-- auto-readme:ai -->\n${validation.data.description}`;
    }
    if (validation.data.about) {
      updatedScanData.about = `<!-- auto-readme:ai -->\n${validation.data.about}`;
    }
    if (validation.data.features && validation.data.features.length > 0) {
      updatedScanData.features = {
        ...updatedScanData.features,
        hasEnoughEvidence: true,
        count: validation.data.features.length,
        items: validation.data.features.map((f) => ({
          en: f.text,
          id: f.text,
        })),
        isAiGenerated: true,
      };
    }
    if (validation.data.architecture) {
      updatedScanData.aiArchitecture = `<!-- auto-readme:ai -->\n${validation.data.architecture}`;
    }

    return {
      success: true,
      scanData: updatedScanData,
      usage: result.usage,
      provider: providerName,
      model: provider.model,
      discarded: validation.discarded,
    };
  } catch (err) {
    return {
      success: false,
      error: `AI provider error (${providerName}): ${err.message}`,
      scanData,
    };
  }
}
