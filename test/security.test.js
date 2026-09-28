import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { runCli } from '../src/cli.js';
import { scanProject } from '../src/scanner/index.js';
import { buildFactsJson } from '../src/ai/facts.js';

describe('Security & Privacy Invariants', () => {
  const rootDir = path.resolve('.');
  const tmpSecDir = path.join(rootDir, 'test', 'tmp-sec-test');

  test('zero runtime dependencies in package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.strictEqual(
      pkg.dependencies === undefined || Object.keys(pkg.dependencies).length === 0,
      true,
      'Production dependencies must be 0 to maintain 0-dependency promise'
    );
  });

  test('never leaks secret values from .env into facts json or scan data', async () => {
    if (fs.existsSync(tmpSecDir)) {
      fs.rmSync(tmpSecDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tmpSecDir, { recursive: true });

    try {
      const secretToken = 'sk-proj-SUPER_SECRET_TOKEN_1234567890';
      const secretDbPass = 'super_secret_postgres_password_999!';
      
      fs.writeFileSync(
        path.join(tmpSecDir, '.env'),
        `OPENAI_API_KEY=${secretToken}\nDATABASE_URL=postgres://user:${secretDbPass}@localhost:5432/mydb\n`
      );
      fs.writeFileSync(
        path.join(tmpSecDir, 'package.json'),
        JSON.stringify({ name: 'leak-test-pkg', version: '1.0.0' })
      );

      const projectInfo = await scanProject(tmpSecDir, { depth: 2, verbose: true });
      const facts = buildFactsJson(projectInfo);
      const factsStr = JSON.stringify(facts);

      assert(!factsStr.includes(secretToken), 'Facts JSON must not contain secret API token');
      assert(!factsStr.includes(secretDbPass), 'Facts JSON must not contain secret DB password');
    } finally {
      if (fs.existsSync(tmpSecDir)) {
        fs.rmSync(tmpSecDir, { recursive: true, force: true });
      }
    }
  });

  test('scanner does not escape project boundaries via symlinks pointing outside', async () => {
    if (fs.existsSync(tmpSecDir)) {
      fs.rmSync(tmpSecDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tmpSecDir, { recursive: true });

    try {
      // Create external folder with private content
      const outsideDir = path.join(rootDir, 'test', 'tmp-outside-dir');
      if (fs.existsSync(outsideDir)) {
        fs.rmSync(outsideDir, { recursive: true, force: true });
      }
      fs.mkdirSync(outsideDir, { recursive: true });
      fs.writeFileSync(path.join(outsideDir, 'private_external_file.txt'), 'PRIVATE_EXTERNAL_CONTENT');

      // Create symlink inside tmpSecDir pointing to outsideDir
      const symlinkPath = path.join(tmpSecDir, 'linked_outside');
      try {
        fs.symlinkSync(outsideDir, symlinkPath, 'junction');
      } catch {
        // If symlink creation fails due to Windows privilege policies, test will pass gracefully
        return;
      }

      const projectInfo = await scanProject(tmpSecDir, { depth: 2 });
      const hasOutsideFile = projectInfo.context?.files?.some((f) => f.includes('private_external_file.txt')) || false;
      const fileTreeStr = typeof projectInfo.fileTree === 'string' ? projectInfo.fileTree : '';

      assert.strictEqual(hasOutsideFile, false, 'Symlinked external directories must not be traversed');
      assert(!fileTreeStr.includes('private_external_file.txt'), 'Symlinked external files must not appear in tree');

      if (fs.existsSync(outsideDir)) {
        fs.rmSync(outsideDir, { recursive: true, force: true });
      }
    } finally {
      if (fs.existsSync(tmpSecDir)) {
        fs.rmSync(tmpSecDir, { recursive: true, force: true });
      }
    }
  });
});
