#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { loadStyleRules } from '../src/style/rules.js';

const rootDir = path.resolve('.');
const errors = [];
const passed = [];

function check(title, fn) {
  try {
    fn();
    passed.push(title);
    console.log(`\x1b[32m✔\x1b[0m ${title}`);
  } catch (err) {
    errors.push({ title, error: err.message });
    console.error(`\x1b[31m✖\x1b[0m ${title}: ${err.message}`);
  }
}

console.log('\n--- readme-scan Pre-publish Verification ---\n');

// 1. package.json checks
check('package.json metadata and structure', () => {
  const pkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(pkgPath)) throw new Error('package.json missing');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  if (pkg.name !== 'readme-scan') throw new Error(`Package name must be "readme-scan", found "${pkg.name}"`);
  if (pkg.version !== '0.1.0') throw new Error(`Expected version 0.1.0, found ${pkg.version}`);
  if (!pkg.description) throw new Error('Missing package description');

  const rules = loadStyleRules();
  const forbidden = [...(rules.forbiddenWords?.en || []), ...(rules.forbiddenWords?.id || [])];
  for (const word of forbidden) {
    if (pkg.description.toLowerCase().includes(word.toLowerCase())) {
      throw new Error(`Description contains forbidden buzzword: "${word}"`);
    }
  }

  if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
    throw new Error('Zero runtime dependencies rule violated: dependencies field must be empty');
  }

  if (!pkg.repository?.url?.includes('github.com/davidyehuda45-byte/readme-scan')) {
    throw new Error('Repository URL not matching davidyehuda45-byte/readme-scan');
  }
  if (!pkg.homepage?.includes('github.com/davidyehuda45-byte/readme-scan')) {
    throw new Error('Homepage URL not matching davidyehuda45-byte/readme-scan');
  }
  if (!pkg.bugs?.url?.includes('github.com/davidyehuda45-byte/readme-scan')) {
    throw new Error('Bugs URL not matching davidyehuda45-byte/readme-scan');
  }
});

// 2. Binary file checks
check('bin/readme-scan.js executable format and LF line endings', () => {
  const binPath = path.join(rootDir, 'bin', 'readme-scan.js');
  if (!fs.existsSync(binPath)) throw new Error('bin/readme-scan.js missing');

  const content = fs.readFileSync(binPath, 'utf8');
  if (!content.startsWith('#!/usr/bin/env node')) {
    throw new Error('bin/readme-scan.js missing "#!/usr/bin/env node" shebang');
  }
  if (content.includes('\r\n')) {
    throw new Error('bin/readme-scan.js contains CRLF line endings. Must be LF only');
  }
});

// 3. Documentation checks
check('Repository documentation present (README, LICENSE, CHANGELOG, SECURITY, CONTRIBUTING)', () => {
  const requiredFiles = ['README.md', 'LICENSE', 'CHANGELOG.md', 'SECURITY.md', 'CONTRIBUTING.md'];
  for (const f of requiredFiles) {
    if (!fs.existsSync(path.join(rootDir, f))) {
      throw new Error(`Required file missing: ${f}`);
    }
  }
});

// 4. Style linter on README.md
check('README.md passes style linter with 100/100', () => {
  const output = execSync('node ./bin/readme-scan.js lint README.md', { encoding: 'utf8' });
  if (!output.includes('Score: 100/100')) {
    throw new Error('README.md did not achieve 100/100 on style linter');
  }
});

// 5. Test suite
check('All automated tests pass', () => {
  execSync('npm test', { encoding: 'utf8', stdio: 'pipe' });
});

// 6. Tarball packing check
check('npm pack dry-run does not bundle test fixtures or secrets', () => {
  const packOutput = execSync('npm pack --dry-run', { encoding: 'utf8', stdio: 'pipe' });
  const forbiddenFiles = ['.env', 'test/', 'fixtures', '.github/', 'scripts/'];
  for (const f of forbiddenFiles) {
    if (packOutput.includes(` ${f}`)) {
      throw new Error(`Tarball contains file that should not be published: ${f}`);
    }
  }
});

console.log('\n--- Summary ---');
console.log(`Passed: ${passed.length} checks`);
if (errors.length > 0) {
  console.error(`\x1b[31mFailed: ${errors.length} checks\x1b[0m`);
  process.exit(1);
} else {
  console.log('\x1b[32m✔ All pre-publish checks passed successfully. Package is ready for release.\x1b[0m\n');
  process.exit(0);
}
