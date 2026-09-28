/**
 * Testing & Quality detector per PRD Section 4.7.
 */
export async function detectTesting(context) {
  const frameworks = [];
  const linters = [];
  const formatters = [];
  const typeCheckers = [];
  const gitHooks = [];
  const evidence = [];

  const pkg = context.readJson('package.json');
  const allDeps = pkg ? { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) } : {};
  const hasDep = (name) => Boolean(allDeps[name]);

  // Test Frameworks
  if (hasDep('vitest')) frameworks.push('Vitest');
  if (hasDep('jest')) frameworks.push('Jest');
  if (hasDep('mocha')) frameworks.push('Mocha');
  if (hasDep('playwright') || hasDep('@playwright/test')) frameworks.push('Playwright (E2E)');
  if (hasDep('cypress')) frameworks.push('Cypress (E2E)');

  // Linters & Formatters
  if (hasDep('eslint') || context.hasFile('.eslintrc.js') || context.hasFile('eslint.config.js')) linters.push('ESLint');
  if (hasDep('prettier') || context.hasFile('.prettierrc')) formatters.push('Prettier');
  if (hasDep('typescript') || context.hasFile('tsconfig.json')) typeCheckers.push('TypeScript');

  // Git hooks
  if (hasDep('husky') || context.hasDir('.husky')) gitHooks.push('Husky');
  if (hasDep('lint-staged')) gitHooks.push('lint-staged');
  if (context.hasFile('.pre-commit-config.yaml')) gitHooks.push('pre-commit');

  // Python Testing & Linting
  const reqFiles = context.findFiles(/requirements.*\.txt/);
  for (const f of reqFiles) {
    const c = context.readFile(f) || '';
    if (/pytest/i.test(c)) frameworks.push('pytest');
    if (/black/i.test(c)) formatters.push('Black');
    if (/ruff/i.test(c)) linters.push('Ruff');
    if (/flake8/i.test(c)) linters.push('Flake8');
    if (/mypy/i.test(c)) typeCheckers.push('Mypy');
  }

  // Go / Rust Testing
  if (context.hasFile('go.mod')) frameworks.push('go test');
  if (context.hasFile('Cargo.toml')) frameworks.push('cargo test');

  // Test command
  let testCommand = '';
  if (pkg?.scripts?.test) {
    testCommand = 'npm test';
  } else if (frameworks.includes('pytest')) {
    testCommand = 'pytest';
  } else if (frameworks.includes('cargo test')) {
    testCommand = 'cargo test';
  } else if (frameworks.includes('go test')) {
    testCommand = 'go test ./...';
  }

  const found = frameworks.length > 0 || linters.length > 0 || formatters.length > 0;

  return {
    found,
    frameworks: Array.from(new Set(frameworks)),
    linters: Array.from(new Set(linters)),
    formatters: Array.from(new Set(formatters)),
    typeCheckers: Array.from(new Set(typeCheckers)),
    gitHooks: Array.from(new Set(gitHooks)),
    testCommand,
    confidence: found ? 'high' : 'low',
    evidence,
  };
}
