/**
 * Builds the facts JSON schema per PRD Section 5.
 * Strictly based on scanner signals; empties are pruned.
 */
export function buildFactsJson(scanData) {
  const pm = scanData.scriptsInfo?.packageManager || scanData.packageManager || 'npm';
  const runtime = scanData.context?.packageJson?.engines?.node
    ? `node ${scanData.context.packageJson.engines.node}`
    : scanData.dominantLanguage ? `${scanData.dominantLanguage.name.toLowerCase()}` : undefined;

  const project = cleanObject({
    name: scanData.projectName || scanData.repoMeta?.projectName,
    type: scanData.projectType?.types?.length ? scanData.projectType.types : undefined,
    version: scanData.version || scanData.context?.packageJson?.version,
    license: scanData.repoMeta?.licenseInfo?.name || scanData.repoMeta?.license,
    declaredDescription: scanData.description || scanData.context?.existingReadmeDescription,
    repoUrl: scanData.repoMeta?.cloneUrl && !scanData.repoMeta.cloneUrl.includes('<repository-url>')
      ? scanData.repoMeta.cloneUrl
      : undefined,
    packageManager: pm,
    runtime,
  });

  const languages = (scanData.languages || []).map((l) => ({
    name: l.name,
    share: Math.round((l.linePercentage / 100) * 100) / 100,
  }));

  const backendStack = (scanData.frameworks?.categorized?.backend || []).map((f) => f.version ? `${f.name} ${f.version}` : f.name);
  const dbStack = [
    ...(scanData.database?.databases || []),
    ...(scanData.database?.orms || []),
    ...(scanData.frameworks?.categorized?.database || []).map((d) => d.name),
  ];
  const uniqueDbStack = [...new Set(dbStack)];

  const authStack = scanData.auth?.methods || [];
  const testStack = scanData.testing?.frameworks || [];
  const infraStack = [
    ...(scanData.docker?.supported ? ['Docker'] : []),
    ...(scanData.cicd?.platforms || []),
  ];

  const stack = cleanObject({
    languages: languages.length ? languages : undefined,
    backend: backendStack.length ? backendStack : undefined,
    database: uniqueDbStack.length ? uniqueDbStack : undefined,
    auth: authStack.length ? authStack : undefined,
    testing: testStack.length ? testStack : undefined,
    infra: infraStack.length ? infraStack : undefined,
  });

  let api = undefined;
  if (scanData.endpoints?.found) {
    api = cleanObject({
      count: scanData.endpoints.totalCount || scanData.endpoints.endpoints.length,
      endpoints: scanData.endpoints.endpoints.slice(0, 30).map((e) => ({
        method: e.method,
        path: e.path,
        file: e.source,
      })),
      openapiFile: scanData.endpoints.openapiFile || undefined,
    });
  }

  let database = undefined;
  if (scanData.database?.found && scanData.database.models?.length) {
    database = {
      models: scanData.database.models.map((m) => ({
        name: m.name,
        fields: m.fieldsCount,
      })),
    };
  }

  const env = scanData.envVars?.variables?.length
    ? scanData.envVars.variables.map((v) => cleanObject({
        name: v.name,
        required: v.required,
        hint: v.description,
      }))
    : undefined;

  let security = undefined;
  if (scanData.security) {
    security = cleanObject({
      detected: scanData.security.verifiedChecks?.map((c) => c.id),
      notDetected: scanData.security.missingSuggestions?.map((s) => s.id),
    });
  }

  const scriptsData = scanData.scriptsInfo?.scripts || scanData.scripts;
  const scripts = scriptsData && typeof scriptsData === 'object' && Object.keys(scriptsData).length
    ? scriptsData
    : undefined;

  let excerpt = scanData.context?.existingReadmeDescription;
  if (excerpt && excerpt.length > 4000) excerpt = excerpt.slice(0, 4000);

  const docs = cleanObject({
    existingReadmeExcerpt: excerpt || undefined,
    hasContributing: Boolean(scanData.repoMeta?.docs?.contributing),
  });

  const featItems = (scanData.features?.items || []).map((f) => f.en || f.id || '');
  const featuresCandidates = featItems.filter(Boolean);

  const evidence = cleanObject({
    featuresCandidates: featuresCandidates.length ? featuresCandidates : undefined,
  });

  return cleanObject({
    projectName: project?.name,
    projectType: scanData.projectType,
    project,
    stack,
    api,
    database,
    env,
    security,
    scripts,
    docs,
    evidence,
  });
}

function cleanObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    const cleanedArr = obj.filter((item) => item !== undefined && item !== null);
    return cleanedArr.length ? cleanedArr : undefined;
  }
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object') {
        const cleaned = cleanObject(value);
        if (cleaned !== undefined) result[key] = cleaned;
      } else {
        result[key] = value;
      }
    }
  }
  return Object.keys(result).length ? result : undefined;
}
