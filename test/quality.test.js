import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { runCli, printHelp } from '../src/cli.js';
import { lintMarkdown } from '../src/style/lint.js';
import { loadStyleRules } from '../src/style/rules.js';

describe('Code Quality, Style Compliance & Edge Cases', () => {
  const rootDir = path.resolve('.');
  const tmpEdgeDir = path.join(rootDir, 'test', 'tmp-edge-test');

  test('package.json metadata complies with style guide (no forbidden buzzwords)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    const desc = pkg.description.toLowerCase();
    const rules = loadStyleRules();
    const forbiddenWords = [...(rules.forbiddenWords?.en || []), ...(rules.forbiddenWords?.id || [])];

    for (const word of forbiddenWords) {
      assert(
        !desc.includes(word.toLowerCase()),
        `package.json description must not contain forbidden buzzword: "${word}"`
      );
    }
  });

  test('CLI help output complies with style guide', () => {
    let captured = '';
    const originalLog = console.log;
    console.log = (...args) => {
      captured += args.join(' ') + '\n';
    };

    try {
      printHelp();
    } finally {
      console.log = originalLog;
    }

    assert(captured.includes('readme-scan'));
    assert(!captured.toLowerCase().includes('auto-readme'));
    assert(!captured.toLowerCase().includes('blazing-fast'));
    assert(!captured.toLowerCase().includes('professional'));
  });

  test('handles completely empty directory gracefully', async () => {
    if (fs.existsSync(tmpEdgeDir)) {
      fs.rmSync(tmpEdgeDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tmpEdgeDir, { recursive: true });

    try {
      const outPath = path.join(tmpEdgeDir, 'README.md');
      const exitCode = await runCli(['-o', outPath, tmpEdgeDir]);
      assert.strictEqual(exitCode, 0);
      assert(fs.existsSync(outPath));
      const content = fs.readFileSync(outPath, 'utf8');
      assert(content.includes('# tmp-edge-test'));
    } finally {
      if (fs.existsSync(tmpEdgeDir)) {
        fs.rmSync(tmpEdgeDir, { recursive: true, force: true });
      }
    }
  });

  test('handles directory without git repository gracefully', async () => {
    if (fs.existsSync(tmpEdgeDir)) {
      fs.rmSync(tmpEdgeDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tmpEdgeDir, { recursive: true });

    try {
      fs.writeFileSync(
        path.join(tmpEdgeDir, 'index.js'),
        'console.log("hello world");'
      );
      const outPath = path.join(tmpEdgeDir, 'README.md');
      const exitCode = await runCli(['--dry-run', tmpEdgeDir]);
      assert.strictEqual(exitCode, 0);
    } finally {
      if (fs.existsSync(tmpEdgeDir)) {
        fs.rmSync(tmpEdgeDir, { recursive: true, force: true });
      }
    }
  });

  test('supports all style presets without crashing', async () => {
    const presets = ['plain', 'minimal', 'detailed', 'classic', 'expressive'];
    for (const preset of presets) {
      const exitCode = await runCli(['--style', preset, '--dry-run', rootDir]);
      assert.strictEqual(exitCode, 0, `Preset ${preset} should execute with exit code 0`);
    }
  });
});
