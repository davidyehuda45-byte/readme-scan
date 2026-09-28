import path from 'node:path';
import { parseGitUrl } from '../scanner/git.js';
import { detectLicense } from '../scanner/license.js';

/**
 * Repository Metadata Detector per PRD Section 4.12.
 * Resolves project name, author, license, documentation files, and authentic repository URL.
 */
export async function detectRepoMeta(context) {
  const pkg = context.readJson('package.json');
  const pyproject = context.readFile('pyproject.toml');
  const cargo = context.readFile('Cargo.toml');

  // 1. Project Name resolution
  let projectName = '';
  let description = '';

  if (pkg?.name) {
    projectName = pkg.name;
    description = pkg.description || '';
  } else if (pyproject) {
    const m = pyproject.match(/name\s*=\s*['"]([^'"]+)['"]/);
    if (m) projectName = m[1];
    const descM = pyproject.match(/description\s*=\s*['"]([^'"]+)['"]/);
    if (descM) description = descM[1];
  } else if (cargo) {
    const m = cargo.match(/name\s*=\s*['"]([^'"]+)['"]/);
    if (m) projectName = m[1];
    const descM = cargo.match(/description\s*=\s*['"]([^'"]+)['"]/);
    if (descM) description = descM[1];
  }

  const goMod = context.readFile('go.mod');
  if (!projectName && goMod) {
    const m = goMod.match(/module\s+([^\r\n]+)/);
    if (m) {
      const parts = m[1].trim().split('/');
      projectName = parts[parts.length - 1];
    }
  }

  if (!projectName) {
    const base = path.basename(context.rootDir);
    projectName = base.replace(/[/\\]+$/, '').trim();
  }

  // 2. Author resolution
  let author = '';
  if (pkg?.author) {
    if (typeof pkg.author === 'string') author = pkg.author;
    else if (typeof pkg.author === 'object') {
      author = pkg.author.name || '';
      if (pkg.author.email) author += ` <${pkg.author.email}>`;
    }
  }

  // 3. Git remote resolution
  let gitUrl = null;
  const gitConfig = context.readFile('.git/config');
  if (gitConfig) {
    const m = gitConfig.match(/\[remote\s+["']origin["']\][\s\S]*?url\s*=\s*([^\r\n]+)/i);
    if (m) {
      gitUrl = parseGitUrl(m[1].trim());
    }
  }

  if (!gitUrl && pkg?.repository) {
    const raw = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository.url;
    if (raw) {
      gitUrl = parseGitUrl(raw);
    }
  }

  // Clone URL fallback: Never invent fake usernames!
  const cloneUrl = gitUrl?.cloneUrl || '<repository-url>';
  const webUrl = gitUrl?.webUrl || null;

  // 4. Documentation files
  const docs = {
    contributing: context.files.find((f) => /^CONTRIBUTING\.md$/i.test(f)) || null,
    codeOfConduct: context.files.find((f) => /^CODE_OF_CONDUCT\.md$/i.test(f)) || null,
    changelog: context.files.find((f) => /^CHANGELOG\.md$/i.test(f)) || null,
    security: context.files.find((f) => /^SECURITY\.md$/i.test(f)) || null,
  };

  // 5. License
  const licenseInfo = await detectLicense(context.rootDir);
  const license = licenseInfo ? licenseInfo.spdxId : (pkg?.license || null);

  return {
    projectName,
    description,
    author,
    git: gitUrl,
    cloneUrl,
    webUrl,
    docs,
    license,
    licenseInfo,
    isRealRepoUrl: Boolean(gitUrl),
    confidence: 'high',
  };
}
