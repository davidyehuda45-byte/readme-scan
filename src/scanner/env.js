import fs from 'node:fs';
import path from 'node:path';

const ENV_EXAMPLE_FILES = [
  '.env.example',
  '.env.sample',
  '.env.template',
];

/**
 * Scan for environment variable templates.
 * CRITICAL RULE: NEVER reads actual .env or .env.local files!
 */
export async function detectEnvExample(rootDir) {
  for (const filename of ENV_EXAMPLE_FILES) {
    const filePath = path.join(rootDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const variables = parseEnvExample(content);
        return {
          file: filename,
          variables,
        };
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * Parse an .env.example file into variable names and descriptions.
 */
export function parseEnvExample(content) {
  const lines = content.split(/\r?\n/);
  const vars = [];
  let pendingComment = '';

  for (let line of lines) {
    line = line.trim();

    if (line.startsWith('#')) {
      const commentText = line.replace(/^#+\s*/, '').trim();
      pendingComment = pendingComment ? `${pendingComment} ${commentText}` : commentText;
      continue;
    }

    if (!line) {
      pendingComment = '';
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1];
      let val = match[2].trim();
      let inlineComment = '';

      const commentIdx = val.indexOf('#');
      if (commentIdx !== -1) {
        inlineComment = val.slice(commentIdx + 1).trim();
        val = val.slice(0, commentIdx).trim();
      }

      let description = inlineComment || pendingComment;
      if (!description) {
        if (!val) {
          description = 'Required';
        } else {
          description = `e.g. \`${val}\``;
        }
      }

      vars.push({
        name: key,
        description,
      });

      pendingComment = '';
    }
  }

  return vars;
}
