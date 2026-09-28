import fs from 'node:fs';
import path from 'node:path';

const FRAMEWORKS = new Set([
  'express', 'fastify', 'koa', 'nestjs', '@nestjs/core', 'next', 'nuxt',
  'react', 'react-dom', 'vue', 'svelte', '@sveltejs/kit', '@angular/core',
  'electron', 'astro', '@remix-run/node', 'hono', 'gatsby', 'solid-js'
]);

const DATABASES = new Set([
  'prisma', '@prisma/client', 'mongoose', 'typeorm', 'sequelize', 'pg',
  'mysql2', 'redis', 'ioredis', 'mongodb', 'drizzle-orm', 'better-sqlite3',
  'sqlite3', 'knex', 'kysely'
]);

const DEV_TOOLS = new Set([
  'typescript', 'eslint', 'prettier', 'vitest', 'jest', 'mocha', 'chai',
  'webpack', 'vite', 'rollup', 'tsup', 'esbuild', 'babel', 'nodemon',
  'tsx', 'ts-node', 'tailwindcss', 'postcss', 'sass'
]);

export function detectPackageManager(rootDir) {
  if (fs.existsSync(path.join(rootDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(rootDir, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(rootDir, 'bun.lockb')) || fs.existsSync(path.join(rootDir, 'bun.lock'))) return 'bun';
  return 'npm';
}

export async function detectNode(rootDir) {
  const pkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(raw);
    const pm = detectPackageManager(rootDir);

    const deps = pkg.dependencies || {};
    const devDeps = pkg.devDependencies || {};
    const scripts = pkg.scripts || {};

    const categorized = {
      frameworks: [],
      databases: [],
      devTools: [],
      other: [],
    };

    const allDeps = { ...deps, ...devDeps };
    for (const [dep, ver] of Object.entries(allDeps)) {
      if (FRAMEWORKS.has(dep.toLowerCase())) {
        categorized.frameworks.push({ name: dep, version: ver });
      } else if (DATABASES.has(dep.toLowerCase())) {
        categorized.databases.push({ name: dep, version: ver });
      } else if (DEV_TOOLS.has(dep.toLowerCase())) {
        categorized.devTools.push({ name: dep, version: ver });
      } else {
        categorized.other.push({ name: dep, version: ver });
      }
    }

    let author = '';
    if (typeof pkg.author === 'string') {
      author = pkg.author;
    } else if (pkg.author && typeof pkg.author === 'object') {
      author = pkg.author.name || '';
      if (pkg.author.email) author += ` <${pkg.author.email}>`;
    }

    let repoUrl = '';
    if (typeof pkg.repository === 'string') {
      repoUrl = pkg.repository;
    } else if (pkg.repository && typeof pkg.repository === 'object') {
      repoUrl = pkg.repository.url || '';
    }

    const isTypeScript = Boolean(devDeps.typescript || deps.typescript || fs.existsSync(path.join(rootDir, 'tsconfig.json')));

    return {
      type: 'node',
      name: pkg.name || path.basename(path.resolve(rootDir)),
      description: pkg.description || '',
      version: pkg.version || '1.0.0',
      author,
      license: pkg.license || '',
      repoUrl,
      packageManager: pm,
      isTypeScript,
      scripts,
      dependencies: deps,
      devDependencies: devDeps,
      categorized,
      installCommand: pm === 'npm' ? 'npm install' : `${pm} install`,
      testCommand: scripts.test ? (pm === 'npm' ? 'npm test' : `${pm} test`) : null,
      devCommand: scripts.dev ? (pm === 'npm' ? 'npm run dev' : `${pm} dev`) : (scripts.start ? (pm === 'npm' ? 'npm start' : `${pm} start`) : null),
      buildCommand: scripts.build ? (pm === 'npm' ? 'npm run build' : `${pm} run build`) : null,
    };
  } catch {
    return null;
  }
}
