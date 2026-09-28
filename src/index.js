/**
 * readme-scan - Programmatic Entrypoint
 * Offline-first, evidence-based project documentation engine.
 */

export { scanProject } from './scanner/index.js';
export { generateReadme } from './generator/index.js';
export { lintMarkdown } from './style/lint.js';
export { buildFactsJson } from './ai/facts.js';
export { runAiEnhancement } from './ai/run.js';
