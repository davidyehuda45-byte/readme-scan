import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_EXCLUDES, parseGitignore, isIgnored } from './file-tree.js';

const EXTENSION_MAP = {
  '.js': { name: 'JavaScript', color: 'F7DF1E', logo: 'javascript', logoColor: 'black' },
  '.mjs': { name: 'JavaScript', color: 'F7DF1E', logo: 'javascript', logoColor: 'black' },
  '.cjs': { name: 'JavaScript', color: 'F7DF1E', logo: 'javascript', logoColor: 'black' },
  '.jsx': { name: 'JavaScript', color: 'F7DF1E', logo: 'javascript', logoColor: 'black' },
  '.ts': { name: 'TypeScript', color: '3178C6', logo: 'typescript', logoColor: 'white' },
  '.mts': { name: 'TypeScript', color: '3178C6', logo: 'typescript', logoColor: 'white' },
  '.cts': { name: 'TypeScript', color: '3178C6', logo: 'typescript', logoColor: 'white' },
  '.tsx': { name: 'TypeScript', color: '3178C6', logo: 'typescript', logoColor: 'white' },
  '.py': { name: 'Python', color: '3776AB', logo: 'python', logoColor: 'white' },
  '.rs': { name: 'Rust', color: 'DEA584', logo: 'rust', logoColor: 'black' },
  '.go': { name: 'Go', color: '00ADD8', logo: 'go', logoColor: 'white' },
  '.php': { name: 'PHP', color: '777BB4', logo: 'php', logoColor: 'white' },
  '.java': { name: 'Java', color: 'ED8B00', logo: 'openjdk', logoColor: 'white' },
  '.kt': { name: 'Kotlin', color: '7F52FF', logo: 'kotlin', logoColor: 'white' },
  '.kts': { name: 'Kotlin', color: '7F52FF', logo: 'kotlin', logoColor: 'white' },
  '.rb': { name: 'Ruby', color: 'CC342D', logo: 'ruby', logoColor: 'white' },
  '.cs': { name: 'C#', color: '239120', logo: 'c-sharp', logoColor: 'white' },
  '.c': { name: 'C', color: 'A8B9CC', logo: 'c', logoColor: 'white' },
  '.h': { name: 'C', color: 'A8B9CC', logo: 'c', logoColor: 'white' },
  '.cpp': { name: 'C++', color: '00599C', logo: 'c%2B%2B', logoColor: 'white' },
  '.hpp': { name: 'C++', color: '00599C', logo: 'c%2B%2B', logoColor: 'white' },
  '.swift': { name: 'Swift', color: 'F05138', logo: 'swift', logoColor: 'white' },
  '.dart': { name: 'Dart', color: '0175C2', logo: 'dart', logoColor: 'white' },
  '.html': { name: 'HTML5', color: 'E34F26', logo: 'html5', logoColor: 'white' },
  '.css': { name: 'CSS3', color: '1572B6', logo: 'css3', logoColor: 'white' },
  '.scss': { name: 'Sass', color: 'CC6699', logo: 'sass', logoColor: 'white' },
  '.vue': { name: 'Vue.js', color: '4FC08D', logo: 'vuedotjs', logoColor: 'white' },
  '.svelte': { name: 'Svelte', color: 'FF3E00', logo: 'svelte', logoColor: 'white' },
  '.sh': { name: 'Shell', color: '4EAA25', logo: 'gnubash', logoColor: 'white' },
  '.bash': { name: 'Shell', color: '4EAA25', logo: 'gnubash', logoColor: 'white' },
  '.sql': { name: 'SQL', color: 'CC292B', logo: 'sqlite', logoColor: 'white' },
};

/**
 * Scan directory and detect languages, file counts, and line counts.
 */
export async function detectLanguages(rootDir) {
  let gitignoreRules = [];
  const gitignorePath = path.join(rootDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    try {
      gitignoreRules = parseGitignore(fs.readFileSync(gitignorePath, 'utf8'));
    } catch {
      // Ignore read errors
    }
  }

  const langStats = {};
  let totalFiles = 0;
  let totalLines = 0;

  function walk(currentDir) {
    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(rootDir, fullPath);
      const isDir = entry.isDirectory();

      if (isIgnored(relativePath, isDir, gitignoreRules)) {
        continue;
      }

      if (isDir) {
        walk(fullPath);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        const langInfo = EXTENSION_MAP[ext];
        if (langInfo) {
          let lineCount = 0;
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            lineCount = content.split('\n').length;
          } catch {
            lineCount = 1;
          }

          if (!langStats[langInfo.name]) {
            langStats[langInfo.name] = {
              name: langInfo.name,
              color: langInfo.color,
              logo: langInfo.logo,
              logoColor: langInfo.logoColor,
              files: 0,
              lines: 0,
            };
          }

          langStats[langInfo.name].files++;
          langStats[langInfo.name].lines += lineCount;
          totalFiles++;
          totalLines += lineCount;
        }
      }
    }
  }

  walk(rootDir);

  const languages = Object.values(langStats).map((item) => ({
    ...item,
    filePercentage: totalFiles > 0 ? Math.round((item.files / totalFiles) * 100) : 0,
    linePercentage: totalLines > 0 ? Math.round((item.lines / totalLines) * 100) : 0,
  }));

  // Sort by lines descending
  languages.sort((a, b) => b.lines - a.lines);

  const dominant = languages.length > 0 ? languages[0] : null;

  return {
    languages,
    dominant,
    totalFiles,
    totalLines,
  };
}
