/**
 * Frontend detector per PRD Section 4.4.
 * Extracts pages/routes from folder structure (Next.js, Nuxt, SvelteKit), PWA, i18n, styling.
 */
export async function detectFrontend(context) {
  const pages = [];
  const features = [];
  const evidence = [];

  // 1. Next.js App Router (app/**/page.tsx)
  const appRouterPages = context.findFiles(/app\/(.*\/)?page\.(jsx?|tsx)/);
  for (const p of appRouterPages) {
    const route = p.replace(/^.*app\/?/, '').replace(/\/page\.[a-z]+$/, '') || '/';
    pages.push(`/${route.replace(/^\//, '')}`);
  }

  // 2. Next.js / Nuxt Pages Router (pages/**/*.tsx)
  const pagesRouterPages = context.findFiles(/pages\/([^._].*)\.(jsx?|tsx|vue)/);
  for (const p of pagesRouterPages) {
    let route = p.replace(/^.*pages\//, '').replace(/\.[a-z]+$/, '');
    if (route.endsWith('/index') || route === 'index') {
      route = route.replace(/\/?index$/, '') || '/';
    }
    pages.push(`/${route.replace(/^\//, '')}`);
  }

  // 3. SvelteKit (src/routes/**/+page.svelte)
  const sveltePages = context.findFiles(/src\/routes\/(.*\/)?\+page\.svelte/);
  for (const p of sveltePages) {
    const route = p.replace(/^src\/routes\/?/, '').replace(/\/\+page\.svelte$/, '') || '/';
    pages.push(`/${route.replace(/^\//, '')}`);
  }

  // 4. PWA Detection
  const hasManifest = context.hasFile('manifest.json') || context.hasFile('public/manifest.json');
  const hasServiceWorker = context.findFiles(/sw\.(js|ts)|service-worker\.(js|ts)/).length > 0;
  if (hasManifest || hasServiceWorker) {
    features.push('Progressive Web App (PWA) ready');
    evidence.push('PWA manifest or service worker detected');
  }

  // 5. i18n Detection
  const pkg = context.readJson('package.json');
  const allDeps = pkg ? { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) } : {};
  if (allDeps['next-i18next'] || allDeps['react-i18next'] || allDeps['vue-i18n'] || context.hasDir('locales')) {
    features.push('Multi-language (i18n) support');
    evidence.push('i18n library or locales directory detected');
  }

  // Deduplicate and sort pages
  const uniquePages = Array.from(new Set(pages)).sort();

  const found = uniquePages.length > 0 || features.length > 0;

  return {
    found,
    pages: uniquePages.slice(0, 20),
    totalCount: uniquePages.length,
    features,
    confidence: found ? 'high' : 'low',
    evidence,
  };
}
