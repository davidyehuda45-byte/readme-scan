import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_EXCLUDES, parseGitignore, isIgnored } from './file-tree.js';

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB limit per PRD

/**
 * Fast filesystem traversal respecting .gitignore, file size limits, and security boundaries.
 */
export async function scanDirectory(rootDir, options = {}) {
  const resolvedRoot = path.resolve(rootDir);
  let gitignoreRules = [];
  const gitignorePath = path.join(resolvedRoot, '.gitignore');

  if (fs.existsSync(gitignorePath)) {
    try {
      gitignoreRules = parseGitignore(fs.readFileSync(gitignorePath, 'utf8'));
    } catch {
      // Ignore
    }
  }

  const files = [];
  const directories = [];
  const fileStats = new Map();

  function walk(currentDir) {
    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(resolvedRoot, fullPath).replace(/\\/g, '/');

      // Security check: Don't follow symlinks leading outside resolvedRoot
      if (entry.isSymbolicLink()) {
        try {
          const realTarget = fs.realpathSync(fullPath);
          if (!realTarget.startsWith(resolvedRoot)) {
            continue;
          }
        } catch {
          continue;
        }
      }

      const isDir = entry.isDirectory();
      if (isIgnored(relPath, isDir, gitignoreRules)) {
        continue;
      }

      if (isDir) {
        directories.push(relPath);
        walk(fullPath);
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(fullPath);
          if (stat.size <= MAX_FILE_SIZE) {
            files.push(relPath);
            fileStats.set(relPath, {
              size: stat.size,
              ext: path.extname(entry.name).toLowerCase(),
            });
          }
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  walk(resolvedRoot);

  return {
    files,
    directories,
    fileStats,
    resolvedRoot,
  };
}
