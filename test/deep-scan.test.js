import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { ProjectContext } from '../src/scanner/context.js';
import { detectApiEndpoints } from '../src/detectors/api-endpoints.js';
import { detectDatabase } from '../src/detectors/database.js';
import { detectSecurity } from '../src/detectors/security.js';
import { detectFrontend } from '../src/detectors/frontend.js';
import { detectAuth } from '../src/detectors/auth.js';
import { mergeReadme } from '../src/generator/merge.js';
import { scanProject } from '../src/scanner/index.js';
import { runCli } from '../src/cli.js';

const FIXTURE_DIR = path.resolve('./test/fixtures-deep-scan');

describe('Deep Scan v2 Detectors & Features', () => {
  before(() => {
    fs.mkdirSync(FIXTURE_DIR, { recursive: true });

    // Setup Express + Prisma + Auth fixture
    const appDir = path.join(FIXTURE_DIR, 'full-app');
    fs.mkdirSync(path.join(appDir, 'src', 'routes'), { recursive: true });
    fs.mkdirSync(path.join(appDir, 'prisma'), { recursive: true });

    fs.writeFileSync(
      path.join(appDir, 'package.json'),
      JSON.stringify({
        name: 'cloud-commerce-api',
        version: '1.0.0',
        dependencies: {
          express: '^4.19.0',
          '@prisma/client': '^5.10.0',
          jsonwebtoken: '^9.0.0',
          bcrypt: '^5.1.0',
          helmet: '^7.1.0',
          zod: '^3.22.0',
          cors: '^2.8.5',
        },
      })
    );

    // Route file
    fs.writeFileSync(
      path.join(appDir, 'src', 'routes', 'users.js'),
      `
      app.get('/api/v1/users', listUsers);
      router.post('/api/v1/users/register', registerUser);
      router.delete('/api/v1/users/:id', deleteUser);
      `
    );

    // Prisma schema
    fs.writeFileSync(
      path.join(appDir, 'prisma', 'schema.prisma'),
      `
      datasource db {
        provider = "postgresql"
        url      = env("DATABASE_URL")
      }

      model User {
        id        String   @id @default(uuid())
        email     String   @unique
        password  String
        createdAt DateTime @default(now())
      }

      model Product {
        id    String @id
        title String
        price Float
      }
      `
    );

    // .env.example
    fs.writeFileSync(
      path.join(appDir, '.env.example'),
      `DATABASE_URL=postgresql://localhost:5432/db # Postgres connection`
    );
  });

  after(() => {
    if (fs.existsSync(FIXTURE_DIR)) {
      fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
    }
  });

  test('extracts Express API endpoints accurately', async () => {
    const appDir = path.join(FIXTURE_DIR, 'full-app');
    const ctx = await ProjectContext.create(appDir);
    const result = await detectApiEndpoints(ctx);

    assert.strictEqual(result.found, true);
    assert(result.endpoints.length >= 3);
    assert(result.endpoints.some((ep) => ep.method === 'GET' && ep.path === '/api/v1/users'));
    assert(result.endpoints.some((ep) => ep.method === 'POST' && ep.path === '/api/v1/users/register'));
  });

  test('detects Prisma models and database provider', async () => {
    const appDir = path.join(FIXTURE_DIR, 'full-app');
    const ctx = await ProjectContext.create(appDir);
    const db = await detectDatabase(ctx);

    assert.strictEqual(db.found, true);
    assert(db.databases.includes('PostgreSQL'));
    assert(db.orms.includes('Prisma'));
    assert.strictEqual(db.models.length, 2);
    assert.strictEqual(db.models[0].name, 'User');
    assert.strictEqual(db.models[1].name, 'Product');
  });

  test('detects authentication methods and security posture', async () => {
    const appDir = path.join(FIXTURE_DIR, 'full-app');
    const ctx = await ProjectContext.create(appDir);
    const auth = await detectAuth(ctx);
    const sec = await detectSecurity(ctx);

    assert.strictEqual(auth.found, true);
    assert(auth.methods.some((m) => m.includes('JWT')));
    assert(auth.methods.some((m) => m.includes('bcrypt')));

    assert(sec.verifiedChecks.some((c) => c.id === 'security-headers'));
    assert(sec.verifiedChecks.some((c) => c.id === 'input-validation'));
    assert(sec.verifiedChecks.some((c) => c.id === 'cors'));
  });

  test('merge mode preserves manual content outside markers', () => {
    const original = `# My Project\n\nThis is human-crafted prose.\n\n<!-- auto-readme:start:stack -->\nOld Stack\n<!-- auto-readme:end:stack -->\n\nFooter note.`;
    const newSections = [
      { key: 'stack', content: '| New | Stack |' },
    ];

    const merged = mergeReadme(original, newSections);
    assert(merged.includes('This is human-crafted prose.'));
    assert(merged.includes('Footer note.'));
    assert(merged.includes('| New | Stack |'));
    assert(!merged.includes('Old Stack'));
  });

  test('CI check flag returns 0 when up-to-date', async () => {
    const appDir = path.join(FIXTURE_DIR, 'full-app');
    // First generate README
    const genCode = await runCli(['-o', path.join(appDir, 'README.md'), appDir]);
    assert.strictEqual(genCode, 0);

    // Then run --check
    const checkCode = await runCli(['--check', '-o', path.join(appDir, 'README.md'), appDir]);
    assert.strictEqual(checkCode, 0);
  });

  test('supports --json flag returning clean data', async () => {
    const appDir = path.join(FIXTURE_DIR, 'full-app');
    const logs = [];
    const origLog = console.log;
    console.log = (msg) => logs.push(msg);

    try {
      const code = await runCli(['--json', appDir]);
      assert.strictEqual(code, 0);
      const parsed = JSON.parse(logs[0]);
      assert.strictEqual(parsed.projectName, 'cloud-commerce-api');
      assert.strictEqual(parsed.projectType.primaryType, 'Backend / API Service');
    } finally {
      console.log = origLog;
    }
  });
});
