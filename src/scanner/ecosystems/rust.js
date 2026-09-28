import fs from 'node:fs';
import path from 'node:path';
import { parseToml } from '../../utils/toml-parser.js';

export async function detectRust(rootDir) {
  const cargoPath = path.join(rootDir, 'Cargo.toml');
  if (!fs.existsSync(cargoPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(cargoPath, 'utf8');
    const parsed = parseToml(content);

    const pkg = parsed.package || {};
    const name = pkg.name || path.basename(path.resolve(rootDir));
    const version = pkg.version || '0.1.0';
    const description = pkg.description || '';
    const edition = pkg.edition || '2021';
    const license = pkg.license || '';
    const repository = pkg.repository || '';

    const rawDeps = parsed.dependencies || {};
    const dependencies = [];

    for (const [dep, val] of Object.entries(rawDeps)) {
      if (typeof val === 'string') {
        dependencies.push({ name: dep, version: val });
      } else if (typeof val === 'object' && val !== null) {
        dependencies.push({
          name: dep,
          version: val.version || 'path/git',
          features: val.features || [],
        });
      }
    }

    return {
      type: 'rust',
      name,
      version,
      description,
      edition,
      license,
      repository,
      dependencies,
      installCommand: 'cargo build',
      runCommand: 'cargo run',
      testCommand: 'cargo test',
      buildCommand: 'cargo build --release',
    };
  } catch {
    return null;
  }
}
