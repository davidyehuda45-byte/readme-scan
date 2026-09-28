import fs from 'node:fs';
import path from 'node:path';

export async function detectRuby(rootDir) {
  const gemfilePath = path.join(rootDir, 'Gemfile');
  let hasGemspec = false;
  let gemspecFile = null;

  try {
    const files = fs.readdirSync(rootDir);
    for (const file of files) {
      if (file.endsWith('.gemspec')) {
        hasGemspec = true;
        gemspecFile = file;
        break;
      }
    }
  } catch {
    // Ignore
  }

  const hasGemfile = fs.existsSync(gemfilePath);

  if (!hasGemfile && !hasGemspec) {
    return null;
  }

  let name = path.basename(path.resolve(rootDir));
  let rubyVersion = '';
  const dependencies = [];

  if (hasGemfile) {
    try {
      const content = fs.readFileSync(gemfilePath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('ruby ')) {
          rubyVersion = trimmed.replace('ruby ', '').replace(/['"]/g, '').trim();
        } else if (trimmed.startsWith('gem ')) {
          const match = trimmed.match(/^gem\s+['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]+)['"])?/);
          if (match) {
            dependencies.push({
              name: match[1],
              version: match[2] || 'latest',
            });
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  if (hasGemspec && gemspecFile) {
    name = path.basename(gemspecFile, '.gemspec');
  }

  return {
    type: 'ruby',
    name,
    rubyVersion,
    dependencies,
    installCommand: 'bundle install',
    testCommand: 'bundle exec rake test',
    runCommand: 'bundle exec rake',
  };
}
