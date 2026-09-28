/**
 * Scripts & Commands Detector per PRD Section 4.11.
 * Categorizes scripts and guarantees accurate package manager usage based on lockfiles.
 */
export async function detectScripts(context) {
  let packageManager = 'npm';
  let installCommand = 'npm install';

  // 1. Detect exact package manager from lockfiles
  if (context.hasFile('pnpm-lock.yaml')) {
    packageManager = 'pnpm';
    installCommand = 'pnpm install';
  } else if (context.hasFile('yarn.lock')) {
    packageManager = 'yarn';
    installCommand = 'yarn install';
  } else if (context.hasFile('bun.lockb') || context.hasFile('bun.lock')) {
    packageManager = 'bun';
    installCommand = 'bun install';
  } else if (context.hasFile('package-lock.json')) {
    packageManager = 'npm';
    installCommand = 'npm install';
  } else if (context.hasFile('poetry.lock')) {
    packageManager = 'poetry';
    installCommand = 'poetry install';
  } else if (context.hasFile('Pipfile.lock') || context.hasFile('Pipfile')) {
    packageManager = 'pipenv';
    installCommand = 'pipenv install';
  } else if (context.hasFile('Cargo.lock') || context.hasFile('Cargo.toml')) {
    packageManager = 'cargo';
    installCommand = 'cargo build';
  } else if (context.hasFile('go.mod')) {
    packageManager = 'go';
    installCommand = 'go mod download';
  } else if (context.hasFile('requirements.txt')) {
    packageManager = 'pip';
    installCommand = 'pip install -r requirements.txt';
  }

  // 2. Node.js scripts categorization
  const pkg = context.readJson('package.json');
  const categorizedScripts = {
    dev: [],
    build: [],
    test: [],
    lint: [],
    database: [],
    other: [],
  };

  if (pkg?.scripts) {
    for (const [name, cmd] of Object.entries(pkg.scripts)) {
      const runCmd = packageManager === 'npm' ? `npm run ${name}` : `${packageManager} ${name}`;
      const item = { name, cmd, runCmd };

      const lower = name.toLowerCase();
      if (/^(dev|start|serve|watch)/.test(lower)) {
        categorizedScripts.dev.push(item);
      } else if (/^(build|compile|bundle)/.test(lower)) {
        categorizedScripts.build.push(item);
      } else if (/^(test|coverage|spec|e2e)/.test(lower)) {
        categorizedScripts.test.push(item);
      } else if (/^(lint|format|prettier|check)/.test(lower)) {
        categorizedScripts.lint.push(item);
      } else if (/^(db|prisma|migrate|seed)/.test(lower)) {
        categorizedScripts.database.push(item);
      } else {
        categorizedScripts.other.push(item);
      }
    }
  }

  return {
    packageManager,
    installCommand,
    categorizedScripts,
    rawScripts: pkg?.scripts || {},
    confidence: 'high',
  };
}
