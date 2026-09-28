import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RULES_PATH = path.resolve(__dirname, '../data/style-rules.json');

let cachedRules = null;

export function loadStyleRules() {
  if (cachedRules) return cachedRules;
  try {
    const raw = fs.readFileSync(RULES_PATH, 'utf8');
    cachedRules = JSON.parse(raw);
  } catch {
    cachedRules = {
      forbiddenWords: { en: [], id: [] },
      forbiddenPatterns: [],
    };
  }
  return cachedRules;
}
