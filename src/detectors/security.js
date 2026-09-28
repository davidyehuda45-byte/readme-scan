import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { isIgnored, parseGitignore } from '../scanner/file-tree.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SIGNALS_PATH = path.resolve(__dirname, '../data/security-signals.json');

let securitySignals = { checks: [] };
try {
  securitySignals = JSON.parse(fs.readFileSync(SIGNALS_PATH, 'utf8'));
} catch {
  // Fallback
}

const SECRET_PATTERNS = [
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'GitHub Token', regex: /ghp_[0-9a-zA-Z]{36}/ },
  { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9]{32,}/ },
  { name: 'Private Key', regex: /-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY-----/ },
];

/**
 * Security Posture Detector per PRD Section 4.6.
 * Checks evidence-based practices and scans for unignored .env or hardcoded secret patterns.
 */
export async function detectSecurity(context) {
  const verifiedChecks = [];
  const missingSuggestions = [];
  const warnings = [];

  const pkg = context.readJson('package.json');
  const allDeps = pkg ? { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) } : {};

  // 1. Check each signal in security-signals.json
  for (const check of securitySignals.checks) {
    let hasDep = check.dependencies.some((d) => Boolean(allDeps[d]));
    let hasFile = check.files.some((f) => context.hasFile(f));

    if (check.id === 'env-separation') {
      const gitignore = context.readFile('.gitignore') || '';
      const rules = parseGitignore(gitignore);
      const isEnvIgnored = isIgnored('.env', false, rules);
      const hasExample = context.hasFile('.env.example') || context.hasFile('.env.sample');
      if (hasExample && isEnvIgnored) {
        hasFile = true;
      }
    }

    if (hasDep || hasFile) {
      verifiedChecks.push({
        id: check.id,
        title: check.title,
        status: 'verified',
      });
    } else {
      missingSuggestions.push({
        id: check.id,
        title: check.title,
        suggestion: check.suggestion,
      });
    }
  }

  // 2. Secret and .env scanning (Generates TERMINAL WARNINGS ONLY, NEVER in README)
  if (context.hasFile('.env')) {
    const gitignore = context.readFile('.gitignore') || '';
    const rules = parseGitignore(gitignore);
    if (!isIgnored('.env', false, rules)) {
      warnings.push({
        type: 'UNPROTECTED_ENV',
        message: 'CRITICAL: File ".env" exists but is NOT listed in .gitignore! Secrets may be accidentally committed.',
      });
    }
  }

  // Scan text files for hardcoded secret patterns (limited to first 50 files)
  const scannableFiles = context.findFiles(/\.(js|ts|py|json|ya?ml|toml|env|env\..*)$/).slice(0, 50);

  for (const file of scannableFiles) {
    // Skip lockfiles, test fixtures, and git files
    if (/lock|package-lock|\.test\.|\.spec\.|fixture/i.test(file)) continue;

    const content = context.readFile(file);
    if (!content) continue;

    const lines = content.split(/\r?\n/);
    for (let lineNum = 1; lineNum <= lines.length; lineNum++) {
      const line = lines[lineNum - 1];
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.regex.test(line)) {
          warnings.push({
            type: 'HARDCODED_SECRET',
            file,
            line: lineNum,
            secretType: pattern.name,
            message: `Possible ${pattern.name} detected in ${file}:${lineNum} (values are redacted).`,
          });
          break;
        }
      }
    }
  }

  return {
    verifiedChecks,
    missingSuggestions,
    warnings,
    confidence: 'high',
  };
}
