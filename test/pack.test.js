import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

describe('npm pack Smoke Test', () => {
  const rootDir = path.resolve('.');
  const tmpDir = path.join(rootDir, 'test', 'tmp-pack-test');

  test('packages tarball and executes binary properly', () => {
    // 1. Pack tarball
    const packOutput = execSync('npm pack', { cwd: rootDir, encoding: 'utf8' }).trim();
    const tarballName = packOutput.split('\n').pop().trim();
    const tarballPath = path.join(rootDir, tarballName);

    assert(fs.existsSync(tarballPath), `Tarball ${tarballPath} should exist`);

    try {
      // 2. Extract into tmp directory
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tmpDir, { recursive: true });

      execSync(`tar -xzf "${tarballPath}" -C "${tmpDir}"`, { encoding: 'utf8' });

      const pkgDir = path.join(tmpDir, 'package');
      assert(fs.existsSync(path.join(pkgDir, 'package.json')), 'package.json should exist in unpacked package');
      assert(fs.existsSync(path.join(pkgDir, 'bin', 'readme-scan.js')), 'bin/readme-scan.js should exist in unpacked package');

      // 3. Test running the binary
      const binPath = path.join(pkgDir, 'bin', 'readme-scan.js');
      const versionOutput = execSync(`node "${binPath}" --version`, { encoding: 'utf8' }).trim();
      assert.strictEqual(versionOutput, 'readme-scan v0.1.0');

      const helpOutput = execSync(`node "${binPath}" --help`, { encoding: 'utf8' });
      assert(helpOutput.includes('readme-scan'));
      assert(!helpOutput.toLowerCase().includes('auto-readme'));
    } finally {
      // Cleanup
      if (fs.existsSync(tarballPath)) {
        fs.unlinkSync(tarballPath);
      }
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }
  });
});
