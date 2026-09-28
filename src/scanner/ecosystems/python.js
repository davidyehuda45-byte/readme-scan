import fs from 'node:fs';
import path from 'node:path';
import { parseToml } from '../../utils/toml-parser.js';

export async function detectPython(rootDir) {
  const pyprojectPath = path.join(rootDir, 'pyproject.toml');
  const reqsPath = path.join(rootDir, 'requirements.txt');
  const setupPath = path.join(rootDir, 'setup.py');
  const pipfilePath = path.join(rootDir, 'Pipfile');

  const hasPyproject = fs.existsSync(pyprojectPath);
  const hasReqs = fs.existsSync(reqsPath);
  const hasSetup = fs.existsSync(setupPath);
  const hasPipfile = fs.existsSync(pipfilePath);

  if (!hasPyproject && !hasReqs && !hasSetup && !hasPipfile) {
    return null;
  }

  let name = path.basename(path.resolve(rootDir));
  let version = '0.1.0';
  let description = '';
  let pythonVersion = '';
  let dependencies = [];
  let tool = 'pip';

  if (fs.existsSync(path.join(rootDir, 'poetry.lock'))) tool = 'poetry';
  else if (fs.existsSync(path.join(rootDir, 'Pipfile.lock')) || hasPipfile) tool = 'pipenv';
  else if (fs.existsSync(path.join(rootDir, 'pdm.lock'))) tool = 'pdm';

  if (hasPyproject) {
    try {
      const content = fs.readFileSync(pyprojectPath, 'utf8');
      const parsed = parseToml(content);

      if (parsed.project) {
        if (parsed.project.name) name = parsed.project.name;
        if (parsed.project.version) version = parsed.project.version;
        if (parsed.project.description) description = parsed.project.description;
        if (Array.isArray(parsed.project.dependencies)) {
          dependencies.push(...parsed.project.dependencies.map(cleanDep));
        }
      }

      if (parsed.tool && parsed.tool.poetry) {
        tool = 'poetry';
        const poetry = parsed.tool.poetry;
        if (poetry.name) name = poetry.name;
        if (poetry.version) version = poetry.version;
        if (poetry.description) description = poetry.description;
        if (poetry.dependencies) {
          for (const [dep, val] of Object.entries(poetry.dependencies)) {
            if (dep.toLowerCase() === 'python') {
              pythonVersion = typeof val === 'string' ? val : (val.version || '');
            } else {
              dependencies.push(`${dep} (${typeof val === 'string' ? val : val.version || 'latest'})`);
            }
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  if (hasReqs && dependencies.length === 0) {
    try {
      const content = fs.readFileSync(reqsPath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-r')) {
          dependencies.push(cleanDep(trimmed));
        }
      }
    } catch {
      // Ignore
    }
  }

  if (hasSetup && (!description || name === path.basename(path.resolve(rootDir)))) {
    try {
      const content = fs.readFileSync(setupPath, 'utf8');
      const nameMatch = content.match(/name\s*=\s*['"]([^'"]+)['"]/);
      if (nameMatch) name = nameMatch[1];
      const verMatch = content.match(/version\s*=\s*['"]([^'"]+)['"]/);
      if (verMatch) version = verMatch[1];
      const descMatch = content.match(/description\s*=\s*['"]([^'"]+)['"]/);
      if (descMatch) description = descMatch[1];
    } catch {
      // Ignore
    }
  }

  let installCommand = 'pip install -r requirements.txt';
  let runCommand = 'python main.py';
  let testCommand = 'pytest';

  if (tool === 'poetry') {
    installCommand = 'poetry install';
    runCommand = 'poetry run python main.py';
    testCommand = 'poetry run pytest';
  } else if (tool === 'pipenv') {
    installCommand = 'pipenv install';
    runCommand = 'pipenv run python main.py';
    testCommand = 'pipenv run pytest';
  } else if (tool === 'pdm') {
    installCommand = 'pdm install';
    runCommand = 'pdm run python main.py';
    testCommand = 'pdm run pytest';
  } else {
    if (!hasReqs && hasSetup) {
      installCommand = 'pip install -e .';
    } else if (hasPyproject && !hasReqs) {
      installCommand = 'pip install .';
    }
  }

  if (fs.existsSync(path.join(rootDir, 'app.py'))) {
    runCommand = tool === 'poetry' ? 'poetry run python app.py' : 'python app.py';
  } else if (fs.existsSync(path.join(rootDir, 'manage.py'))) {
    runCommand = tool === 'poetry' ? 'poetry run python manage.py runserver' : 'python manage.py runserver';
  }

  return {
    type: 'python',
    name,
    version,
    description,
    pythonVersion,
    dependencies,
    tool,
    installCommand,
    runCommand,
    testCommand,
  };
}

function cleanDep(dep) {
  return dep.replace(/;.*$/, '').trim();
}
