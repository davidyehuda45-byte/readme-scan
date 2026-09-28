import path from 'node:path';
import { detectLanguages } from './language.js';
import { generateProjectTree } from './file-tree.js';
import { detectGit, parseGitUrl } from './git.js';
import { detectLicense } from './license.js';
import { detectDocker } from './docker.js';
import { detectEnvExample } from './env.js';

import { detectNode } from './ecosystems/node.js';
import { detectPython } from './ecosystems/python.js';
import { detectRust } from './ecosystems/rust.js';
import { detectGo } from './ecosystems/go.js';
import { detectPhp } from './ecosystems/php.js';
import { detectJava } from './ecosystems/java.js';
import { detectRuby } from './ecosystems/ruby.js';

/**
 * Scan a project directory and collect all metadata.
 */
export async function scanProject(targetDir, options = {}) {
  const rootDir = path.resolve(targetDir || '.');
  const folderName = path.basename(rootDir);

  const [
    langResult,
    fileTree,
    detectedGit,
    licenseInfo,
    dockerInfo,
    envInfo,
    nodeInfo,
    pythonInfo,
    rustInfo,
    goInfo,
    phpInfo,
    javaInfo,
    rubyInfo,
  ] = await Promise.all([
    detectLanguages(rootDir),
    generateProjectTree(rootDir, options.depth || 2),
    detectGit(rootDir),
    detectLicense(rootDir),
    detectDocker(rootDir),
    detectEnvExample(rootDir),
    detectNode(rootDir),
    detectPython(rootDir),
    detectRust(rootDir),
    detectGo(rootDir),
    detectPhp(rootDir),
    detectJava(rootDir),
    detectRuby(rootDir),
  ]);

  const detectedEcosystems = [];
  const ecosystemData = {};

  if (nodeInfo) {
    detectedEcosystems.push('node');
    ecosystemData.node = nodeInfo;
  }
  if (pythonInfo) {
    detectedEcosystems.push('python');
    ecosystemData.python = pythonInfo;
  }
  if (rustInfo) {
    detectedEcosystems.push('rust');
    ecosystemData.rust = rustInfo;
  }
  if (goInfo) {
    detectedEcosystems.push('go');
    ecosystemData.go = goInfo;
  }
  if (phpInfo) {
    detectedEcosystems.push('php');
    ecosystemData.php = phpInfo;
  }
  if (javaInfo) {
    detectedEcosystems.push('java');
    ecosystemData.java = javaInfo;
  }
  if (rubyInfo) {
    detectedEcosystems.push('ruby');
    ecosystemData.ruby = rubyInfo;
  }

  // Determine primary ecosystem
  let primaryEcosystem = 'generic';

  // Allow manual override via --ecosystem option
  if (options.ecosystem && ecosystemData[options.ecosystem]) {
    primaryEcosystem = options.ecosystem;
  } else if (detectedEcosystems.length > 0) {
    if (langResult.dominant) {
      const dom = langResult.dominant.name.toLowerCase();
      if ((dom === 'javascript' || dom === 'typescript') && ecosystemData.node) {
        primaryEcosystem = 'node';
      } else if (dom === 'python' && ecosystemData.python) {
        primaryEcosystem = 'python';
      } else if (dom === 'rust' && ecosystemData.rust) {
        primaryEcosystem = 'rust';
      } else if (dom === 'go' && ecosystemData.go) {
        primaryEcosystem = 'go';
      } else if (dom === 'php' && ecosystemData.php) {
        primaryEcosystem = 'php';
      } else if ((dom === 'java' || dom === 'kotlin') && ecosystemData.java) {
        primaryEcosystem = 'java';
      } else if (dom === 'ruby' && ecosystemData.ruby) {
        primaryEcosystem = 'ruby';
      } else {
        primaryEcosystem = detectedEcosystems[0];
      }
    } else {
      primaryEcosystem = detectedEcosystems[0];
    }
  }

  // Fallback git remote from package.json or Cargo.toml if .git was absent
  let gitInfo = detectedGit;
  if (!gitInfo) {
    const rawRepo = ecosystemData.node?.repoUrl || ecosystemData.rust?.repository;
    if (rawRepo) {
      gitInfo = parseGitUrl(rawRepo);
    }
  }

  // Resolve metadata: name, description, version, license, author
  let projectName = folderName;
  let description = '';
  let version = '1.0.0';
  let author = '';
  let license = licenseInfo ? licenseInfo.spdxId : '';
  let installCommand = '';
  let runCommand = '';
  let testCommand = '';
  let scripts = {};

  if (primaryEcosystem !== 'generic') {
    const primaryData = ecosystemData[primaryEcosystem];
    if (primaryData.name) projectName = primaryData.name;
    if (primaryData.description) description = primaryData.description;
    if (primaryData.version) version = primaryData.version;
    if (primaryData.author) author = primaryData.author;
    if (!license && primaryData.license) license = primaryData.license;
    if (primaryData.installCommand) installCommand = primaryData.installCommand;
    if (primaryData.runCommand) runCommand = primaryData.runCommand;
    if (primaryData.testCommand) testCommand = primaryData.testCommand;
    if (primaryData.scripts) scripts = primaryData.scripts;
  } else {
    if (langResult.dominant) {
      const dom = langResult.dominant.name.toLowerCase();
      if (dom === 'c' || dom === 'c++') {
        installCommand = 'make';
        runCommand = './app';
      } else if (dom === 'shell') {
        runCommand = 'bash script.sh';
      }
    }
  }

  return {
    rootDir,
    projectName,
    description,
    version,
    author,
    license,
    licenseInfo,
    primaryEcosystem,
    ecosystems: detectedEcosystems,
    ecosystemData,
    dominantLanguage: langResult.dominant,
    languages: langResult.languages,
    git: gitInfo,
    docker: dockerInfo,
    envExample: envInfo,
    fileTree,
    installCommand,
    runCommand,
    testCommand,
    scripts,
  };
}
