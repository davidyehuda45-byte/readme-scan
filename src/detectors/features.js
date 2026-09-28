/**
 * Features synthesizer per PRD Section 4.13.
 * Strictly evidence-based. If evidence count < 2, skips or marks as TODO without generic fillers.
 */
export async function detectFeatures(context, allDetectorsData = {}) {
  const items = [];
  const evidence = [];

  const {
    auth,
    docker,
    testing,
    endpoints,
    frontend,
    database,
    cicd,
  } = allDetectorsData;

  // 1. Authentication
  if (auth?.found && auth.methods.length > 0) {
    items.push({
      en: `🔐 **User Authentication**: Integrated ${auth.methods.join(', ')}`,
      id: `🔐 **Autentikasi Pengguna**: Terintegrasi ${auth.methods.join(', ')}`,
      evidence: auth.methods.join(', '),
    });
  }

  // 2. REST API Endpoints
  if (endpoints?.found && endpoints.totalCount > 0) {
    items.push({
      en: `🌐 **RESTful API**: Comprehensive API with ${endpoints.totalCount} endpoints`,
      id: `🌐 **RESTful API**: Layanan API lengkap dengan ${endpoints.totalCount} endpoint`,
      evidence: `${endpoints.totalCount} endpoints`,
    });
  }

  // 3. Database & Models
  if (database?.found) {
    const dbList = database.databases.concat(database.orms).join(', ');
    const modelNote = database.models.length > 0 ? ` (${database.models.length} data models)` : '';
    items.push({
      en: `🗄️ **Database Persistence**: Powered by ${dbList}${modelNote}`,
      id: `🗄️ **Penyimpanan Database**: Didukung oleh ${dbList}${modelNote}`,
      evidence: dbList,
    });
  }

  // 4. Docker containerization
  if (docker?.supported) {
    const details = docker.hasCompose
      ? `Docker & Compose (${docker.services.length} services)`
      : 'Docker container ready';
    items.push({
      en: `🐳 **Containerized Deployment**: ${details}`,
      id: `🐳 **Deployment Kontainer**: ${details}`,
      evidence: docker.dockerfile || docker.composeFile,
    });
  }

  // 5. Automated Testing
  if (testing?.found && testing.frameworks.length > 0) {
    items.push({
      en: `🧪 **Automated Testing Suite**: Test coverage with ${testing.frameworks.join(', ')}`,
      id: `🧪 **Pengujian Otomatis**: Dilengkapi pengujian menggunakan ${testing.frameworks.join(', ')}`,
      evidence: testing.frameworks.join(', '),
    });
  }

  // 6. Frontend PWA / i18n
  if (frontend?.features?.length > 0) {
    for (const feat of frontend.features) {
      items.push({
        en: `✨ **${feat}**`,
        id: `✨ **${feat}**`,
        evidence: feat,
      });
    }
  }

  // 7. CI/CD automation
  if (cicd?.found && cicd.workflows.length > 0) {
    const names = cicd.workflows.map((w) => w.name).join(', ');
    items.push({
      en: `🚀 **CI/CD Automation**: Continuous integration via ${names}`,
      id: `🚀 **Otomatisasi CI/CD**: Integrasi berkelanjutan melalui ${names}`,
      evidence: names,
    });
  }

  // 8. Dark mode detection
  const cssFiles = context.findFiles(/\.(css|scss|tsx|jsx)$/).slice(0, 30);
  let hasDarkMode = false;
  for (const f of cssFiles) {
    const content = context.readFile(f);
    if (content && (content.includes('prefers-color-scheme') || content.includes('next-themes'))) {
      hasDarkMode = true;
      break;
    }
  }
  if (hasDarkMode) {
    items.push({
      en: '🌓 **Dark Mode Support**: Adaptive theming and color scheme preferences',
      id: '🌓 **Dukungan Dark Mode**: Tema adaptif dan preferensi skema warna',
      evidence: 'prefers-color-scheme / next-themes detected',
    });
  }

  const hasEnoughEvidence = items.length >= 2;

  return {
    found: hasEnoughEvidence,
    items,
    count: items.length,
    hasEnoughEvidence,
    confidence: hasEnoughEvidence ? 'high' : 'low',
    evidence,
  };
}
