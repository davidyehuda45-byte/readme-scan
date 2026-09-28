import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_DATA_PATH = path.resolve(__dirname, '../data/models.json');

function loadModelsConfig() {
  try {
    return JSON.parse(fs.readFileSync(MODELS_DATA_PATH, 'utf8'));
  } catch {
    return {};
  }
}

export function getGlobalConfigPath() {
  const home = os.homedir();
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    return path.join(appData, 'auto-readme', 'config.json');
  }
  return path.join(home, '.config', 'auto-readme', 'config.json');
}

export function readGlobalConfig() {
  const cfgPath = getGlobalConfigPath();
  try {
    if (!fs.existsSync(cfgPath)) return { keys: {} };
    const raw = fs.readFileSync(cfgPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { keys: {} };
  }
}

export function writeGlobalConfig(data) {
  const cfgPath = getGlobalConfigPath();
  const dir = path.dirname(cfgPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(cfgPath, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export function maskKey(key) {
  if (!key || typeof key !== 'string') return '';
  if (key.length <= 4) return '••••';
  return '••••••••••••' + key.slice(-4);
}

/**
 * Searches for an API key according to PRD Section 3.
 *
 * Search precedence:
 * 1. CLI flag --api-key
 * 2. Process environment variable for provider
 * 3. .env in project dir (ONLY if --load-env enabled AND .env is in .gitignore)
 * 4. User global config
 */
export function getApiKey(providerName, options = {}) {
  const models = loadModelsConfig();
  const provConf = models[providerName.toLowerCase()] || {};
  const envVarName = provConf.envKey;

  // Ollama does not need a key
  if (providerName.toLowerCase() === 'ollama') {
    return { key: '', source: 'none_needed' };
  }

  // 1. --api-key flag
  if (options.apiKey) {
    console.warn('Warning: Passing --api-key directly via command line flag may expose it in shell history.');
    return { key: options.apiKey.trim(), source: 'cli_flag' };
  }

  // 2. Process environment variable
  if (envVarName && process.env[envVarName]) {
    return { key: process.env[envVarName].trim(), source: 'env_var' };
  }

  // 3. Project .env (only if loadEnv enabled and in .gitignore)
  if (options.loadEnv && options.projectDir) {
    const dotEnvPath = path.join(options.projectDir, '.env');
    const gitignorePath = path.join(options.projectDir, '.gitignore');
    if (fs.existsSync(dotEnvPath) && fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf8');
      if (gitignore.includes('.env')) {
        const dotEnvContent = fs.readFileSync(dotEnvPath, 'utf8');
        const match = dotEnvContent.match(new RegExp(`^${envVarName}=(.*)$`, 'm'));
        if (match && match[1]) {
          return { key: match[1].trim().replace(/^['"]|['"]$/g, ''), source: 'project_env' };
        }
      }
    }
  }

  // 4. Global config
  const globalConf = readGlobalConfig();
  if (globalConf.keys && globalConf.keys[providerName.toLowerCase()]) {
    return { key: globalConf.keys[providerName.toLowerCase()], source: 'global_config' };
  }

  return { key: null, source: 'not_found' };
}

export function setApiKey(providerName, key) {
  const norm = providerName.toLowerCase();
  const conf = readGlobalConfig();
  if (!conf.keys) conf.keys = {};
  conf.keys[norm] = key.trim();
  writeGlobalConfig(conf);
}

export function removeApiKey(providerName) {
  const norm = providerName.toLowerCase();
  const conf = readGlobalConfig();
  if (conf.keys && conf.keys[norm]) {
    delete conf.keys[norm];
    writeGlobalConfig(conf);
    return true;
  }
  return false;
}

export function getAuthStatus() {
  const models = loadModelsConfig();
  const conf = readGlobalConfig();
  const result = [];

  for (const [pName, info] of Object.entries(models)) {
    if (pName === 'ollama') {
      result.push({ provider: pName, configured: true, note: 'Local, no key required' });
      continue;
    }
    const envKey = info.envKey;
    let configured = false;
    let masked = null;
    let source = null;

    if (envKey && process.env[envKey]) {
      configured = true;
      masked = maskKey(process.env[envKey]);
      source = `Environment (${envKey})`;
    } else if (conf.keys && conf.keys[pName]) {
      configured = true;
      masked = maskKey(conf.keys[pName]);
      source = 'Global Config';
    }

    result.push({
      provider: pName,
      configured,
      maskedKey: masked,
      source,
    });
  }

  return result;
}
