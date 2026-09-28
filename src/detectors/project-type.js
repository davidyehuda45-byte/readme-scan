/**
 * Project Type Classifier per PRD Section 3.
 * Classifies: Web Frontend, Backend / API, Fullstack, Mobile, CLI Tool, Library / Package, Monorepo, Data / ML, DevOps / IaC, Game.
 */
export async function detectProjectType(context) {
  const types = [];
  const evidence = [];

  const pkg = context.readJson('package.json');
  const allDeps = pkg ? { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) } : {};
  const hasDep = (name) => Boolean(allDeps[name]);

  // 1. Monorepo
  const isMonorepo =
    Boolean(pkg?.workspaces) ||
    context.hasFile('pnpm-workspace.yaml') ||
    context.hasFile('lerna.json') ||
    context.hasFile('nx.json') ||
    context.hasFile('turbo.json') ||
    (context.hasDir('packages') && context.files.length > 5);

  if (isMonorepo) {
    types.push('Monorepo');
    evidence.push('Workspace configuration or packages/ directory detected');
  }

  // 2. Fullstack Meta-frameworks
  const isFullstack =
    hasDep('next') ||
    hasDep('nuxt') ||
    hasDep('@remix-run/node') ||
    hasDep('@sveltejs/kit') ||
    hasDep('astro');

  // 3. Frontend
  const isFrontend =
    isFullstack ||
    hasDep('react') ||
    hasDep('vue') ||
    hasDep('svelte') ||
    hasDep('@angular/core') ||
    hasDep('vite') ||
    context.hasDir('public') ||
    context.hasDir('src/pages') ||
    context.hasDir('src/components') ||
    context.hasFile('index.html');

  // 4. Backend / API
  const isBackend =
    isFullstack ||
    hasDep('express') ||
    hasDep('fastify') ||
    hasDep('koa') ||
    hasDep('nestjs') ||
    hasDep('@nestjs/core') ||
    hasDep('hono') ||
    context.hasFile('requirements.txt') ||
    context.hasFile('pyproject.toml') ||
    context.hasFile('go.mod') ||
    context.hasFile('Cargo.toml');

  if (isFullstack) {
    types.push('Fullstack Application');
    evidence.push('Fullstack meta-framework detected');
  } else {
    if (isFrontend && isBackend) {
      types.push('Fullstack Application');
      evidence.push('Both frontend UI and backend services detected');
    } else if (isFrontend) {
      types.push('Web Frontend');
      evidence.push('Frontend UI framework / assets detected');
    } else if (isBackend) {
      types.push('Backend / API Service');
      evidence.push('Backend API framework / server detected');
    }
  }

  // 5. CLI Tool
  const isCli =
    Boolean(pkg?.bin) ||
    hasDep('commander') ||
    hasDep('yargs') ||
    hasDep('meow') ||
    context.hasDir('bin') ||
    context.hasFile('bin/index.js');

  if (isCli) {
    types.push('CLI Tool');
    evidence.push('CLI entrypoint (bin) or command-line parser detected');
  }

  // 6. Mobile
  const isMobile =
    hasDep('react-native') ||
    hasDep('expo') ||
    context.hasFile('pubspec.yaml') ||
    (context.hasDir('android') && context.hasDir('ios'));

  if (isMobile) {
    types.push('Mobile Application');
    evidence.push('Mobile framework (React Native / Flutter / iOS / Android) detected');
  }

  // 7. Data / ML
  const isDataMl =
    context.findFiles('.ipynb').length > 0 ||
    context.findFiles(/requirements.*\.txt/).some((f) => {
      const c = context.readFile(f) || '';
      return /pandas|numpy|torch|tensorflow|scikit-learn|jupyter/i.test(c);
    });

  if (isDataMl) {
    types.push('Data / Machine Learning');
    evidence.push('Data science / Jupyter notebook / ML libraries detected');
  }

  // 8. DevOps / IaC
  const isDevOps =
    context.findFiles('.tf').length > 0 ||
    context.hasDir('helm') ||
    context.hasDir('k8s') ||
    context.hasFile('ansible.cfg');

  if (isDevOps) {
    types.push('DevOps / Infrastructure');
    evidence.push('Terraform, Helm, Kubernetes, or Ansible manifests detected');
  }

  // 9. Library / Package
  if (types.length === 0 && (pkg?.main || pkg?.exports || context.hasDir('lib'))) {
    types.push('Library / Package');
    evidence.push('Exported library modules without runnable application detected');
  }

  if (types.length === 0) {
    types.push('Software Application');
  }

  return {
    primaryType: types[0] || 'Software Application',
    types,
    isMonorepo,
    evidence,
    confidence: 'high',
  };
}
