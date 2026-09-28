import fs from 'node:fs';
import path from 'node:path';

// Default folders and files to always ignore when scanning
export const DEFAULT_EXCLUDES = new Set([
  'README.md',
  'README.generated.md',
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'out',
  'vendor',
  '.venv',
  'venv',
  'env',
  '__pycache__',
  '.pytest_cache',
  'target',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.cache',
  '.idea',
  '.vscode',
  'coverage',
  '.nyc_output',
  '.turbo',
  '.gradle',
  '.DS_Store',
  'Thumbs.db',
]);

const FOLDER_ANNOTATIONS = {
  src: 'Source code',
  app: 'Application core',
  lib: 'Library and utility modules',
  utils: 'Helper functions and utilities',
  bin: 'CLI binaries and executables',
  test: 'Automated test suite',
  tests: 'Automated test suite',
  __tests__: 'Automated test suite',
  docs: 'Project documentation',
  public: 'Static public assets',
  assets: 'Media and static assets',
  components: 'Reusable components',
  routes: 'Routing and endpoints',
  api: 'API controllers and routes',
  services: 'Business logic and services',
  models: 'Data models and schemas',
  controllers: 'Request controllers',
  views: 'Templates and views',
  styles: 'CSS / styling stylesheets',
  config: 'Configuration files',
  scripts: 'Build and maintenance scripts',
  migrations: 'Database migrations',
};

/**
 * Parse .gitignore lines into a matchable rule list.
 */
export function parseGitignore(content) {
  if (!content) return [];
  return content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((rule) => {
      let isDirOnly = false;
      if (rule.endsWith('/')) {
        isDirOnly = true;
        rule = rule.slice(0, -1);
      }
      if (rule.startsWith('/')) {
        rule = rule.slice(1);
      }
      return { pattern: rule, isDirOnly };
    });
}

/**
 * Check if a relative path matches gitignore rules or default excludes.
 */
export function isIgnored(itemPath, isDirectory, gitignoreRules = []) {
  const normalized = itemPath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  const baseName = segments[segments.length - 1];

  // Default excludes
  if (DEFAULT_EXCLUDES.has(baseName)) {
    return true;
  }
  for (const seg of segments) {
    if (DEFAULT_EXCLUDES.has(seg)) {
      return true;
    }
  }

  // Gitignore rules
  for (const { pattern, isDirOnly } of gitignoreRules) {
    if (isDirOnly && !isDirectory) continue;

    if (pattern === normalized || pattern === baseName) {
      return true;
    }
    // Simple wildcard support: *.log, test/*, etc.
    if (pattern.includes('*')) {
      const regexStr = '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$';
      const regex = new RegExp(regexStr);
      if (regex.test(normalized) || regex.test(baseName)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Generate a visual tree representation up to maxDepth (default 2).
 */
export async function generateProjectTree(rootDir, maxDepth = 2) {
  let gitignoreRules = [];
  const gitignorePath = path.join(rootDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    try {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      gitignoreRules = parseGitignore(content);
    } catch {
      // Ignore read errors
    }
  }

  function walk(currentDir, currentDepth) {
    if (currentDepth > maxDepth) return [];

    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return [];
    }

    // Sort: directories first, then files alphabetically
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    const result = [];
    const maxEntriesPerFolder = 15;
    let count = 0;

    for (const entry of entries) {
      const relativePath = path.relative(rootDir, path.join(currentDir, entry.name));
      const isDir = entry.isDirectory();

      if (isIgnored(relativePath, isDir, gitignoreRules)) {
        continue;
      }

      count++;
      if (count > maxEntriesPerFolder) {
        result.push({
          name: `... and ${entries.length - maxEntriesPerFolder} more files`,
          isDirectory: false,
          annotation: '',
        });
        break;
      }

      const node = {
        name: entry.name,
        isDirectory: isDir,
        annotation: isDir ? FOLDER_ANNOTATIONS[entry.name.toLowerCase()] || '' : '',
      };

      if (isDir && currentDepth < maxDepth) {
        node.children = walk(path.join(currentDir, entry.name), currentDepth + 1);
      }

      result.push(node);
    }

    return result;
  }

  const treeData = walk(rootDir, 1);
  return formatTree(treeData, path.basename(path.resolve(rootDir)));
}

function formatTree(nodes, rootName) {
  const lines = [rootName + '/'];

  function renderNodes(list, prefix = '') {
    list.forEach((node, index) => {
      const isLast = index === list.length - 1;
      const pointer = isLast ? '└── ' : '├── ';
      const childPrefix = prefix + (isLast ? '    ' : '│   ');

      let label = node.name + (node.isDirectory ? '/' : '');
      if (node.annotation) {
        label += ` # ${node.annotation}`;
      }

      lines.push(prefix + pointer + label);

      if (node.children && node.children.length > 0) {
        renderNodes(node.children, childPrefix);
      }
    });
  }

  renderNodes(nodes, '');
  return lines.join('\n');
}
