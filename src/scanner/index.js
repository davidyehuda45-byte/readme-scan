import path from 'node:path';
import { ProjectContext } from './context.js';
import { detectLanguages } from './language.js';
import { generateProjectTree } from './file-tree.js';

import { detectProjectType } from '../detectors/project-type.js';
import { detectFrameworks } from '../detectors/frameworks.js';
import { detectDatabase } from '../detectors/database.js';
import { detectApiEndpoints } from '../detectors/api-endpoints.js';
import { detectFrontend } from '../detectors/frontend.js';
import { detectAuth } from '../detectors/auth.js';
import { detectSecurity } from '../detectors/security.js';
import { detectTesting } from '../detectors/testing.js';
import { detectCicd } from '../detectors/cicd.js';
import { detectDocker } from '../detectors/docker.js';
import { detectEnvVars } from '../detectors/env-vars.js';
import { detectScripts } from '../detectors/scripts.js';
import { detectRepoMeta } from '../detectors/repo-meta.js';
import { detectFeatures } from '../detectors/features.js';

// Backward compatibility detectors
import { detectNode } from './ecosystems/node.js';
import { detectPython } from './ecosystems/python.js';
import { detectRust } from './ecosystems/rust.js';
import { detectGo } from './ecosystems/go.js';
import { detectPhp } from './ecosystems/php.js';
import { detectJava } from './ecosystems/java.js';
import { detectRuby } from './ecosystems/ruby.js';

/**
 * Deep scan entrypoint per PRD v2.
 * Executes modular, evidence-based detectors with error safety.
 */
export async function scanProject(targetDir, options = {}) {
  const rootDir = path.resolve(targetDir || '.');
  const context = await ProjectContext.create(rootDir, options);

  // Run general scanners and detectors in parallel
  const [
    langResult,
    fileTree,
    projectType,
    frameworks,
    database,
    endpoints,
    frontend,
    auth,
    security,
    testing,
    cicd,
    docker,
    envVars,
    scripts,
    repoMeta,
    nodeLegacy,
    pythonLegacy,
    rustLegacy,
    goLegacy,
    phpLegacy,
    javaLegacy,
    rubyLegacy,
  ] = await Promise.all([
    safeRun(() => detectLanguages(rootDir), { dominant: null, languages: [] }),
    safeRun(() => generateProjectTree(rootDir, options.depth || 2), ''),
    safeRun(() => detectProjectType(context), { primaryType: 'Software Application' }),
    safeRun(() => detectFrameworks(context), { categorized: {} }),
    safeRun(() => detectDatabase(context), { found: false, databases: [], orms: [], models: [] }),
    safeRun(() => detectApiEndpoints(context), { found: false, endpoints: [], totalCount: 0 }),
    safeRun(() => detectFrontend(context), { found: false, pages: [], features: [] }),
    safeRun(() => detectAuth(context), { found: false, methods: [] }),
    safeRun(() => detectSecurity(context), { verifiedChecks: [], missingSuggestions: [], warnings: [] }),
    safeRun(() => detectTesting(context), { found: false, frameworks: [], linters: [], formatters: [] }),
    safeRun(() => detectCicd(context), { found: false, workflows: [], platforms: [] }),
    safeRun(() => detectDocker(context), { supported: false, services: [] }),
    safeRun(() => detectEnvVars(context), { found: false, variables: [] }),
    safeRun(() => detectScripts(context), { packageManager: 'npm', installCommand: 'npm install', categorizedScripts: { dev: [], build: [], test: [], lint: [], database: [], other: [] } }),
    safeRun(() => detectRepoMeta(context), { projectName: path.basename(rootDir), cloneUrl: '<repository-url>', docs: {} }),
    safeRun(() => detectNode(rootDir), null),
    safeRun(() => detectPython(rootDir), null),
    safeRun(() => detectRust(rootDir), null),
    safeRun(() => detectGo(rootDir), null),
    safeRun(() => detectPhp(rootDir), null),
    safeRun(() => detectJava(rootDir), null),
    safeRun(() => detectRuby(rootDir), null),
  ]);

  // Backward compatibility ecosystem data
  const detectedEcosystems = [];
  const ecosystemData = {};
  if (nodeLegacy) { detectedEcosystems.push('node'); ecosystemData.node = nodeLegacy; }
  if (pythonLegacy) { detectedEcosystems.push('python'); ecosystemData.python = pythonLegacy; }
  if (rustLegacy) { detectedEcosystems.push('rust'); ecosystemData.rust = rustLegacy; }
  if (goLegacy) { detectedEcosystems.push('go'); ecosystemData.go = goLegacy; }
  if (phpLegacy) { detectedEcosystems.push('php'); ecosystemData.php = phpLegacy; }
  if (javaLegacy) { detectedEcosystems.push('java'); ecosystemData.java = javaLegacy; }
  if (rubyLegacy) { detectedEcosystems.push('ruby'); ecosystemData.ruby = rubyLegacy; }

  // Synthesize features strictly from verified detector results
  const features = await safeRun(
    () =>
      detectFeatures(context, {
        auth,
        docker,
        testing,
        endpoints,
        frontend,
        database,
        cicd,
      }),
    { found: false, items: [], count: 0, hasEnoughEvidence: false }
  );

  let primaryEcosystem = 'generic';
  if (options.ecosystem && ecosystemData[options.ecosystem]) {
    primaryEcosystem = options.ecosystem;
  } else if (detectedEcosystems.length > 0) {
    primaryEcosystem = detectedEcosystems[0];
  }

  return {
    rootDir,
    context,
    projectName: repoMeta.projectName,
    description: repoMeta.description || nodeLegacy?.description || context.existingReadmeDescription || '',
    version: nodeLegacy?.version || pythonLegacy?.version || rustLegacy?.version || '1.0.0',
    primaryEcosystem,
    ecosystems: detectedEcosystems,
    ecosystemData,
    dominantLanguage: langResult.dominant,
    languages: langResult.languages,
    fileTree,
    installCommand: scripts.installCommand,
    runCommand: nodeLegacy?.devCommand || pythonLegacy?.runCommand || rustLegacy?.runCommand || goLegacy?.runCommand || '',
    testCommand: testing.testCommand || (scripts.rawScripts?.test ? `npm test` : ''),
    scripts: scripts.rawScripts,
    scriptsInfo: scripts,
    git: repoMeta.git,
    license: repoMeta.license,
    licenseInfo: repoMeta.licenseInfo,
    docker,
    envExample: envVars.found ? { file: envVars.exampleFile, variables: envVars.variables } : null,
    // Deep scan additions
    projectType,
    frameworks,
    database,
    endpoints,
    frontend,
    auth,
    security,
    testing,
    cicd,
    envVars,
    repoMeta,
    features,
  };
}

async function safeRun(fn, fallback) {
  try {
    const res = await fn();
    return res !== null && res !== undefined ? res : fallback;
  } catch (err) {
    return fallback;
  }
}
