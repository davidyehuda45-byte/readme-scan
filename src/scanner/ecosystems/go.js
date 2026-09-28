import fs from 'node:fs';
import path from 'node:path';

export async function detectGo(rootDir) {
  const goModPath = path.join(rootDir, 'go.mod');
  if (!fs.existsSync(goModPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(goModPath, 'utf8');
    const lines = content.split(/\r?\n/);

    let moduleName = '';
    let goVersion = '';
    const dependencies = [];
    let inRequireBlock = false;

    for (let line of lines) {
      line = line.trim();

      if (line.startsWith('module ')) {
        moduleName = line.replace('module ', '').trim();
      } else if (line.startsWith('go ')) {
        goVersion = line.replace('go ', '').trim();
      } else if (line === 'require (') {
        inRequireBlock = true;
      } else if (line === ')' && inRequireBlock) {
        inRequireBlock = false;
      } else if (inRequireBlock) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2 && !parts[0].startsWith('//')) {
          const isIndirect = line.includes('// indirect');
          dependencies.push({
            name: parts[0],
            version: parts[1],
            indirect: isIndirect,
          });
        }
      } else if (line.startsWith('require ')) {
        const parts = line.replace('require ', '').trim().split(/\s+/);
        if (parts.length >= 2) {
          dependencies.push({
            name: parts[0],
            version: parts[1],
            indirect: line.includes('// indirect'),
          });
        }
      }
    }

    const shortName = moduleName.split('/').pop() || path.basename(path.resolve(rootDir));

    return {
      type: 'go',
      name: shortName,
      module: moduleName,
      version: '1.0.0',
      goVersion,
      dependencies,
      installCommand: 'go mod download',
      runCommand: 'go run .',
      testCommand: 'go test ./...',
      buildCommand: 'go build -o app .',
    };
  } catch {
    return null;
  }
}
