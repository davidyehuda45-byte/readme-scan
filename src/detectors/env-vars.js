import { parseEnvExample } from '../scanner/env.js';

/**
 * Environment Variable Detector per PRD Section 4.10.
 * Safely aggregates variables from .env.example and code references without ever touching .env values.
 */
export async function detectEnvVars(context) {
  const envMap = new Map();
  const evidence = [];

  // 1. Read .env.example / .env.sample / .env.template
  const exampleFile = context.files.find((f) =>
    ['.env.example', '.env.sample', '.env.template'].includes(f)
  );

  if (exampleFile) {
    const content = context.readFile(exampleFile) || '';
    const parsed = parseEnvExample(content);
    for (const item of parsed) {
      envMap.set(item.name, {
        name: item.name,
        required: !item.description.toLowerCase().includes('optional'),
        inExample: true,
        description: item.description || '',
      });
    }
    evidence.push(`Found template file: ${exampleFile}`);
  }

  // 2. Scan code files for env references (limited to 50 code files)
  const codeFiles = context.findFiles(/\.(js|ts|py|go|rs)$/).slice(0, 50);

  for (const file of codeFiles) {
    if (/test|fixture|node_modules|detectors\//i.test(file)) continue;

    const content = context.readFile(file);
    if (!content) continue;

    // process.env.VAR
    const nodeMatches = content.matchAll(/process\.env\.([A-Z0-9_]{3,})/g);
    for (const m of nodeMatches) {
      if (!envMap.has(m[1])) {
        envMap.set(m[1], {
          name: m[1],
          required: false,
          inExample: false,
          description: `Referenced in ${file}`,
        });
      }
    }

    // Python os.environ["VAR"] or os.getenv("VAR")
    const pyMatches = content.matchAll(/os\.(?:environ(?:\[|\.get\()|getenv\()\s*['"]([A-Z0-9_]{3,})['"]/g);
    for (const m of pyMatches) {
      if (!envMap.has(m[1])) {
        envMap.set(m[1], {
          name: m[1],
          required: false,
          inExample: false,
          description: `Referenced in ${file}`,
        });
      }
    }

    // Go os.Getenv("VAR")
    const goMatches = content.matchAll(/os\.Getenv\s*\(\s*['"]([A-Z0-9_]{3,})['"]/g);
    for (const m of goMatches) {
      if (!envMap.has(m[1])) {
        envMap.set(m[1], {
          name: m[1],
          required: false,
          inExample: false,
          description: `Referenced in ${file}`,
        });
      }
    }
  }

  const variables = Array.from(envMap.values());
  const found = variables.length > 0;

  return {
    found,
    exampleFile: exampleFile || null,
    variables,
    confidence: found ? 'high' : 'low',
    evidence,
  };
}
