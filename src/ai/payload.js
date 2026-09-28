import path from 'node:path';
import { buildFactsJson } from './facts.js';
import { redactPayload, redactText } from './redact.js';

/**
 * Builds the complete, redacted AI payload per PRD Section 4.
 *
 * @param {object} scanData
 * @param {object} options
 * @returns {object}
 */
export function buildAiPayload(scanData, options = {}) {
  const rootDir = scanData.context?.rootDir || process.cwd();
  const rawFacts = buildFactsJson(scanData);

  // Extract small entrypoint comment snippet if available
  let entrypointSnippet = '';
  if (scanData.context?.files) {
    const entryCandidate = scanData.context.files.find((f) =>
      /^(index|main|app|server)\.(js|ts|py|go|rs|php)$/i.test(path.basename(f))
    );
    if (entryCandidate) {
      try {
        const content = scanData.context.readFile(entryCandidate) || '';
        // Extract top-level comments or first 1500 chars
        const topComments = content.match(/^(?:\/\*[\s\S]*?\*\/|\/\/[^\n]*\n|#[^\n]*\n)+/);
        if (topComments && topComments[0]) {
          entrypointSnippet = topComments[0].slice(0, 1500);
        } else {
          entrypointSnippet = content.slice(0, 500);
        }
      } catch {
        // ignore read error
      }
    }
  }

  const snippets = {};
  if (entrypointSnippet) {
    snippets.entrypointComments = redactText(entrypointSnippet, { projectRoot: rootDir });
  }

  // Redact the facts JSON
  const redactedFacts = redactPayload(rawFacts, { projectRoot: rootDir });

  return {
    facts: redactedFacts,
    snippets: Object.keys(snippets).length ? snippets : undefined,
    lang: options.lang || 'en',
    style: options.style || 'plain',
  };
}
