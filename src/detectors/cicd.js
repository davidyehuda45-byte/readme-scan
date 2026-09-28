/**
 * CI/CD & Deployment platform detector per PRD Section 4.8.
 */
export async function detectCicd(context) {
  const workflows = [];
  const platforms = [];
  const evidence = [];

  // 1. GitHub Actions
  const ghaFiles = context.findFiles(/\.github\/workflows\/.*\.ya?ml$/);
  for (const f of ghaFiles) {
    const content = context.readFile(f) || '';
    const nameMatch = content.match(/name:\s*['"]?([^'"\r\n]+)['"]?/);
    const workflowName = nameMatch ? nameMatch[1].trim() : f.split('/').pop().replace(/\.ya?ml$/, '');

    const triggers = [];
    if (/on:\s*\[?[^\]\n]*push/i.test(content) || /push:/i.test(content)) triggers.push('push');
    if (/pull_request:/i.test(content)) triggers.push('pull_request');
    if (/release:/i.test(content)) triggers.push('release');
    if (/workflow_dispatch:/i.test(content)) triggers.push('manual');

    workflows.push({
      file: f,
      name: workflowName,
      triggers,
    });
    evidence.push(`GitHub Actions workflow: ${workflowName}`);
  }

  // 2. GitLab CI
  if (context.hasFile('.gitlab-ci.yml')) {
    workflows.push({ name: 'GitLab CI/CD', file: '.gitlab-ci.yml', triggers: ['push'] });
  }

  // 3. Deployment Platforms
  if (context.hasFile('vercel.json') || context.hasDir('.vercel')) platforms.push('Vercel');
  if (context.hasFile('netlify.toml')) platforms.push('Netlify');
  if (context.hasFile('fly.toml')) platforms.push('Fly.io');
  if (context.hasFile('render.yaml')) platforms.push('Render');
  if (context.hasFile('railway.json')) platforms.push('Railway');
  if (context.hasFile('wrangler.toml')) platforms.push('Cloudflare Workers/Pages');
  if (context.hasFile('Procfile')) platforms.push('Heroku');
  if (context.hasFile('serverless.yml')) platforms.push('Serverless Framework');
  if (context.hasFile('app.yaml')) platforms.push('Google App Engine');
  if (context.hasDir('k8s') || context.hasDir('kubernetes')) platforms.push('Kubernetes');
  if (context.hasDir('helm')) platforms.push('Helm');

  const found = workflows.length > 0 || platforms.length > 0;

  return {
    found,
    workflows,
    platforms,
    confidence: found ? 'high' : 'low',
    evidence,
  };
}
