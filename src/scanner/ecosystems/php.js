import fs from 'node:fs';
import path from 'node:path';

export async function detectPhp(rootDir) {
  const composerPath = path.join(rootDir, 'composer.json');
  if (!fs.existsSync(composerPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(composerPath, 'utf8');
    const composer = JSON.parse(raw);

    const name = composer.name || path.basename(path.resolve(rootDir));
    const description = composer.description || '';
    const license = composer.license || '';
    const req = composer.require || {};
    const reqDev = composer['require-dev'] || {};
    const scripts = composer.scripts || {};

    const dependencies = [];
    let phpVersion = '';

    for (const [pkg, ver] of Object.entries(req)) {
      if (pkg.toLowerCase() === 'php') {
        phpVersion = ver;
      } else {
        dependencies.push({ name: pkg, version: ver, dev: false });
      }
    }

    for (const [pkg, ver] of Object.entries(reqDev)) {
      dependencies.push({ name: pkg, version: ver, dev: true });
    }

    return {
      type: 'php',
      name,
      description,
      license,
      phpVersion,
      dependencies,
      scripts,
      installCommand: 'composer install',
      testCommand: scripts.test ? 'composer test' : (fs.existsSync(path.join(rootDir, 'phpunit.xml')) ? './vendor/bin/phpunit' : null),
      runCommand: scripts.start ? 'composer start' : 'php -S localhost:8000',
    };
  } catch {
    return null;
  }
}
