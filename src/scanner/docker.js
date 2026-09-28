import fs from 'node:fs';
import path from 'node:path';

const COMPOSE_FILES = [
  'docker-compose.yml',
  'docker-compose.yaml',
  'compose.yml',
  'compose.yaml',
];

export async function detectDocker(rootDir) {
  let hasDockerfile = false;
  let dockerfile = null;
  let hasCompose = false;
  let composeFile = null;

  try {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true }).filter((e) => e.isFile());

    for (const entry of entries) {
      if (entry.name === 'Dockerfile' || entry.name.startsWith('Dockerfile.')) {
        hasDockerfile = true;
        dockerfile = entry.name;
      }
      if (COMPOSE_FILES.includes(entry.name)) {
        hasCompose = true;
        composeFile = entry.name;
      }
    }
  } catch {
    // Ignore read error
  }

  if (hasDockerfile || hasCompose) {
    return {
      supported: true,
      hasDockerfile,
      dockerfile,
      hasCompose,
      composeFile,
    };
  }

  return {
    supported: false,
    hasDockerfile: false,
    dockerfile: null,
    hasCompose: false,
    composeFile: null,
  };
}
