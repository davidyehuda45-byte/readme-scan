import { lintMarkdown } from '../style/lint.js';

// Common tech keywords to guard against hallucination
const COMMON_TECH_SET = new Set([
  'react', 'vue', 'angular', 'svelte', 'nextjs', 'next.js', 'nuxtjs', 'nuxt',
  'express', 'fastify', 'nestjs', 'koa', 'hono', 'django', 'flask', 'fastapi',
  'postgres', 'postgresql', 'mysql', 'mariadb', 'mongodb', 'redis', 'sqlite',
  'prisma', 'typeorm', 'sequelize', 'drizzle', 'graphql', 'apollo',
  'docker', 'kubernetes', 'k8s', 'kafka', 'rabbitmq', 'elasticsearch',
  'tailwind', 'bootstrap', 'sass', 'jwt', 'oauth', 'stripe', 'aws', 'gcp', 'azure',
]);

/**
 * Validates and sanitizes AI output against facts per PRD Section 6.
 *
 * @param {string|object} rawResponse
 * @param {object} factsJson
 * @param {object} options
 * @returns {{ valid: boolean, data: object, discarded: string[] }}
 */
export function validateAiResponse(rawResponse, factsJson, options = {}) {
  let parsed;
  const discarded = [];

  if (typeof rawResponse === 'string') {
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return { valid: false, data: null, discarded: ['Failed to parse JSON response from model'] };
    }
  } else {
    parsed = rawResponse;
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, data: null, discarded: ['Model response is not an object'] };
  }

  // Extract all authorized tech terms from factsJson
  const allowedTech = extractAllowedTech(factsJson);

  // 1. Validate description
  let description = String(parsed.description || '').trim();
  if (description) {
    const sentences = splitIntoSentences(description);
    const validSentences = [];

    for (const sent of sentences) {
      if (containsHallucinatedTech(sent, allowedTech)) {
        discarded.push(`Discarded description sentence due to unverified tech claim: "${sent}"`);
      } else {
        validSentences.push(sent);
      }
    }

    // Limit to max 3 sentences per PRD 6
    description = validSentences.slice(0, 3).join(' ');
  }

  // 2. Validate about
  let about = String(parsed.about || '').trim();
  if (about && containsHallucinatedTech(about, allowedTech)) {
    discarded.push(`Discarded about paragraph due to unverified tech claim: "${about}"`);
    about = '';
  }

  // 3. Validate features
  const allowedCandidates = new Set(
    (factsJson.evidence?.featuresCandidates || []).map((c) => String(c).toLowerCase().trim())
  );

  const validFeatures = [];
  if (Array.isArray(parsed.features)) {
    for (const f of parsed.features) {
      if (!f || !f.id || !f.text) continue;
      const normalizedId = String(f.id).toLowerCase().trim();
      const matched = [...allowedCandidates].some((c) => c.includes(normalizedId) || normalizedId.includes(c));

      if (matched) {
        if (!containsHallucinatedTech(f.text, allowedTech)) {
          validFeatures.push({
            id: f.id,
            text: f.text.trim(),
          });
        } else {
          discarded.push(`Discarded feature "${f.id}" due to unverified tech claim in explanation`);
        }
      } else {
        discarded.push(`Discarded feature "${f.id}" not found in featuresCandidates`);
      }
    }
  }

  // 4. Validate architecture
  let architecture = String(parsed.architecture || '').trim();
  if (architecture && containsHallucinatedTech(architecture, allowedTech)) {
    discarded.push(`Discarded architecture summary due to unverified tech claim`);
    architecture = '';
  }

  // 5. Run style linter on texts to guarantee zero emojis/forbidden words
  const style = options.style || 'plain';
  const lang = options.lang || 'en';

  if (description) {
    description = lintMarkdown(description, { style, lang, fix: true }).output.trim();
  }
  if (about) {
    about = lintMarkdown(about, { style, lang, fix: true }).output.trim();
  }
  for (const f of validFeatures) {
    f.text = lintMarkdown(f.text, { style, lang, fix: true }).output.trim();
  }
  if (architecture) {
    architecture = lintMarkdown(architecture, { style, lang, fix: true }).output.trim();
  }

  return {
    valid: Boolean(description || validFeatures.length),
    data: {
      description,
      about,
      features: validFeatures,
      architecture,
    },
    discarded,
  };
}

function extractAllowedTech(factsJson) {
  const allowed = new Set();
  function addTerm(term) {
    if (!term || typeof term !== 'string') return;
    const words = term.toLowerCase().split(/[\s,./\\-_]+/);
    for (const w of words) {
      if (w.length > 2) allowed.add(w);
    }
  }

  if (factsJson.stack) {
    for (const val of Object.values(factsJson.stack)) {
      if (Array.isArray(val)) {
        for (const item of val) {
          if (typeof item === 'string') addTerm(item);
          else if (item?.name) addTerm(item.name);
        }
      }
    }
  }

  if (factsJson.project) {
    addTerm(factsJson.project.name);
    addTerm(factsJson.project.packageManager);
    addTerm(factsJson.project.runtime);
  }

  return allowed;
}

function containsHallucinatedTech(sentence, allowedTech) {
  const words = sentence.toLowerCase().split(/[\s,.;:!?()[\]{}"'`]+/);
  for (const word of words) {
    if (COMMON_TECH_SET.has(word) && !allowedTech.has(word)) {
      return true;
    }
  }
  return false;
}

function splitIntoSentences(text) {
  return text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [text];
}
