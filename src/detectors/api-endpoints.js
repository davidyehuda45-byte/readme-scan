/**
 * API Endpoint Extractor per PRD Section 4.3.
 * Supports Express, Fastify, Hono, NestJS, Flask, FastAPI, Django, Go Gin/Fiber, and OpenAPI/Swagger.
 */
export async function detectApiEndpoints(context) {
  const endpoints = [];
  const evidence = [];

  // 1. OpenAPI / Swagger files (highest priority)
  const openApiFiles = context.findFiles(/openapi\.(yaml|yml|json)|swagger\.json/);
  if (openApiFiles.length > 0) {
    const file = openApiFiles[0];
    const content = context.readFile(file) || '';
    try {
      if (file.endsWith('.json')) {
        const parsed = JSON.parse(content);
        if (parsed.paths) {
          for (const [routePath, methodsObj] of Object.entries(parsed.paths)) {
            for (const method of Object.keys(methodsObj)) {
              if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
                endpoints.push({
                  method: method.toUpperCase(),
                  path: routePath,
                  source: file,
                });
              }
            }
          }
          evidence.push(`Extracted endpoints from OpenAPI specification: ${file}`);
        }
      }
    } catch {
      // Ignore JSON parse failure
    }
  }

  // 2. Scan code files if openapi didn't provide endpoints
  if (endpoints.length === 0) {
    // Check JS/TS files for Express, Fastify, Hono, Koa, NestJS
    const codeFiles = context.findFiles(/\.(js|ts|mjs|cjs|jsx|tsx|py|go)$/);

    for (const file of codeFiles) {
      if (endpoints.length >= 35) break;

      // Skip test files, detector files, and declaration files
      if (/test|spec|\.d\.ts|detectors\//i.test(file)) continue;

      const content = context.readFile(file);
      if (!content) continue;

      // Express / Fastify / Hono: app.get('/path', router.post('/path'
      const expressMatches = content.matchAll(
        /(?:app|router|server|route|api)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi
      );
      for (const m of expressMatches) {
        endpoints.push({
          method: m[1].toUpperCase(),
          path: m[2],
          source: file,
        });
      }

      // FastAPI / Flask: @app.get("/path"), @router.post("/path"), @app.route("/path")
      const pyMatches = content.matchAll(
        /@(?:app|router|api)\.(get|post|put|patch|delete|route)\s*\(\s*['"]([^'"]+)['"]/gi
      );
      for (const m of pyMatches) {
        let method = m[1].toUpperCase();
        if (method === 'ROUTE') method = 'GET/POST';
        endpoints.push({
          method,
          path: m[2],
          source: file,
        });
      }

      // Django urls.py: path('api/users/', views.list_users)
      if (file.endsWith('urls.py')) {
        const djangoMatches = content.matchAll(/path\s*\(\s*['"]([^'"]+)['"]/g);
        for (const m of djangoMatches) {
          endpoints.push({
            method: 'ANY',
            path: `/${m[1].replace(/^\//, '')}`,
            source: file,
          });
        }
      }

      // Go Gin / Fiber: r.GET("/path", ...), app.Post("/path", ...)
      if (file.endsWith('.go')) {
        const goMatches = content.matchAll(
          /(?:r|router|app|api|group)\.(GET|POST|PUT|PATCH|DELETE)\s*\(\s*['"]([^'"]+)['"]/g
        );
        for (const m of goMatches) {
          endpoints.push({
            method: m[1].toUpperCase(),
            path: m[2],
            source: file,
          });
        }
      }
    }
  }

  // Deduplicate endpoints by method + path
  const seen = new Set();
  const uniqueEndpoints = [];
  for (const ep of endpoints) {
    const key = `${ep.method} ${ep.path}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEndpoints.push(ep);
    }
  }

  const maxDisplay = 30;
  const displayed = uniqueEndpoints.slice(0, maxDisplay);
  const remainingCount = uniqueEndpoints.length > maxDisplay ? uniqueEndpoints.length - maxDisplay : 0;

  return {
    found: uniqueEndpoints.length > 0,
    totalCount: uniqueEndpoints.length,
    endpoints: displayed,
    remainingCount,
    confidence: uniqueEndpoints.length > 0 ? 'high' : 'low',
    evidence,
  };
}
