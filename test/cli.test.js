import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { runCli } from '../src/cli.js';

const TEST_DIR = path.resolve('./test/tmp-cli-test');

describe('CLI Integration', () => {
  before(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(TEST_DIR, 'package.json'),
      JSON.stringify({ name: 'temp-cli-app', version: '1.0.0' })
    );
  });

  after(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('runs --help with exit code 0', async () => {
    const code = await runCli(['--help']);
    assert.strictEqual(code, 0);
  });

  test('runs --version with exit code 0', async () => {
    const code = await runCli(['--version']);
    assert.strictEqual(code, 0);
  });

  test('rejects unsupported language with exit code 1', async () => {
    const code = await runCli(['--lang', 'es', TEST_DIR]);
    assert.strictEqual(code, 1);
  });

  test('executes --dry-run without creating files', async () => {
    const outPath = path.join(TEST_DIR, 'DRY_README.md');
    const code = await runCli(['--dry-run', '-o', outPath, TEST_DIR]);
    assert.strictEqual(code, 0);
    assert.strictEqual(fs.existsSync(outPath), false);
  });

  test('generates README.md to specified output path', async () => {
    const outPath = path.join(TEST_DIR, 'OUTPUT_README.md');
    const code = await runCli(['-o', outPath, TEST_DIR]);
    assert.strictEqual(code, 0);
    assert.strictEqual(fs.existsSync(outPath), true);
    const content = fs.readFileSync(outPath, 'utf8');
    assert(content.includes('# temp-cli-app'));
  });

  test('safely falls back to README.generated.md non-interactively when file exists without --force', async () => {
    const outPath = path.join(TEST_DIR, 'README.md');
    fs.writeFileSync(outPath, '# Pre-existing content');

    const code = await runCli(['-o', outPath, TEST_DIR]);
    assert.strictEqual(code, 0);

    const originalContent = fs.readFileSync(outPath, 'utf8');
    assert.strictEqual(originalContent, '# Pre-existing content');

    const altPath = path.join(TEST_DIR, 'README.generated.md');
    assert.strictEqual(fs.existsSync(altPath), true);
  });

  test('overwrites existing file when --force is used', async () => {
    const outPath = path.join(TEST_DIR, 'FORCE_README.md');
    fs.writeFileSync(outPath, '# Old content to be overwritten');

    const code = await runCli(['--force', '-o', outPath, TEST_DIR]);
    assert.strictEqual(code, 0);

    const newContent = fs.readFileSync(outPath, 'utf8');
    assert(newContent.includes('# temp-cli-app'));
    assert(!newContent.includes('Old content to be overwritten'));
  });
});
