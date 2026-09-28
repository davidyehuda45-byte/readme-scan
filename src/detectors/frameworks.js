import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEP_MAP_PATH = path.resolve(__dirname, '../data/dependency-map.json');

let dependencyMap = {};
try {
  dependencyMap = JSON.parse(fs.readFileSync(DEP_MAP_PATH, 'utf8'));
} catch {
  // Fallback empty
}

/**
 * Framework and library detector.
 * Categorizes dependencies based on data-driven map with major versions.
 */
export async function detectFrameworks(context) {
  const categorized = {
    frontend: [],
    backend: [],
    database: [],
    styling: [],
    state: [],
    validation: [],
    testing: [],
    auth: [],
    tools: [],
  };

  const detectedDeps = new Map();
  const evidence = [];

  // 1. Node dependencies
  const pkg = context.readJson('package.json');
  if (pkg) {
    const all = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    for (const [dep, ver] of Object.entries(all)) {
      const cleanVer = String(ver).replace(/^[\^~>=<]+/, '');
      detectedDeps.set(dep.toLowerCase(), { version: cleanVer, source: 'package.json' });
    }
  }

  // 2. Python dependencies
  const reqFiles = context.findFiles(/requirements.*\.txt/);
  for (const f of reqFiles) {
    const content = context.readFile(f) || '';
    for (const line of content.split(/\r?\n/)) {
      const match = line.trim().match(/^([a-zA-Z0-9_-]+)(?:[=<>~]+(.*))?$/);
      if (match && !line.startsWith('#')) {
        detectedDeps.set(match[1].toLowerCase(), { version: match[2] || '', source: f });
      }
    }
  }

  // 3. Go modules
  if (context.hasFile('go.mod')) {
    const content = context.readFile('go.mod') || '';
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2 && !parts[0].startsWith('//') && !parts[0].startsWith('module') && !parts[0].startsWith('go')) {
        detectedDeps.set(parts[0].toLowerCase(), { version: parts[1], source: 'go.mod' });
      }
    }
  }

  // 4. Rust crates
  if (context.hasFile('Cargo.toml')) {
    const content = context.readFile('Cargo.toml') || '';
    for (const line of content.split(/\r?\n/)) {
      const match = line.trim().match(/^([a-zA-Z0-9_-]+)\s*=\s*(?:["']([^"']+)["']|\{.*version\s*=\s*["']([^"']+)["'])/);
      if (match) {
        detectedDeps.set(match[1].toLowerCase(), { version: match[2] || match[3] || '', source: 'Cargo.toml' });
      }
    }
  }

  // Match against dependency map
  for (const [depKey, info] of detectedDeps.entries()) {
    const matched = dependencyMap[depKey];
    if (matched) {
      const item = {
        name: matched.name,
        rawName: depKey,
        version: info.version,
        source: info.source,
      };

      evidence.push(`${matched.name} (${info.source})`);

      switch (matched.category) {
        case 'ui-framework':
        case 'fullstack-framework':
          categorized.frontend.push(item);
          break;
        case 'backend-framework':
          categorized.backend.push(item);
          break;
        case 'orm-database':
          categorized.database.push(item);
          break;
        case 'styling':
          categorized.styling.push(item);
          break;
        case 'state-management':
          categorized.state.push(item);
          break;
        case 'validation':
          categorized.validation.push(item);
          break;
        case 'testing':
          categorized.testing.push(item);
          break;
        case 'auth':
          categorized.auth.push(item);
          break;
        default:
          categorized.tools.push(item);
      }
    }
  }

  const hasAny = Object.values(categorized).some((arr) => arr.length > 0);

  return {
    found: hasAny,
    categorized,
    confidence: hasAny ? 'high' : 'low',
    evidence,
  };
}
