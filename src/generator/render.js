import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { mergeReadme, wrapWithMarkers } from './merge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadLocale(lang = 'en') {
  const file = path.resolve(__dirname, `../locales/${lang === 'id' ? 'id' : 'en'}.json`);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, '../locales/en.json'), 'utf8'));
  }
}

/**
 * Deep Scan Markdown Renderer v2.
 * Strictly evidence-based with adaptive section rendering.
 */
export function renderReadme(scanData, options = {}) {
  const lang = (options.lang || 'en').toLowerCase();
  const locale = loadLocale(lang);
  const isId = lang === 'id';
  const isMinimal = Boolean(options.minimal);
  const badgeStyle = options.badges || (isMinimal ? 'none' : 'flat-square');

  // Filter allowed sections if --sections or --exclude passed
  const allowedSections = options.sections ? new Set(options.sections.split(',').map((s) => s.trim().toLowerCase())) : null;
  const excludedSections = options.exclude ? new Set(options.exclude.split(',').map((s) => s.trim().toLowerCase())) : new Set();

  function isSectionEnabled(key) {
    if (excludedSections.has(key.toLowerCase())) return false;
    if (allowedSections && !allowedSections.has(key.toLowerCase())) return false;
    return true;
  }

  const {
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
    features,
    fileTree,
    dominantLanguage,
    languages,
  } = scanData;

  const sections = [];

  // 1. Title & Badges
  const badgesList = [];
  if (badgeStyle !== 'none') {
    if (dominantLanguage) {
      badgesList.push(`![${dominantLanguage.name}](https://img.shields.io/badge/language-${encodeURIComponent(dominantLanguage.name)}-${dominantLanguage.color || 'blue'}?style=${badgeStyle})`);
    }
    if (repoMeta?.license) {
      badgesList.push(`![License](https://img.shields.io/badge/license-${encodeURIComponent(repoMeta.license)}-success?style=${badgeStyle})`);
    }
    if (docker?.supported) {
      badgesList.push(`![Docker](https://img.shields.io/badge/docker-supported-2496ED?style=${badgeStyle}&logo=docker&logoColor=white)`);
    }
    if (repoMeta?.git?.isGitHub) {
      badgesList.push(`![Stars](https://img.shields.io/github/stars/${repoMeta.git.owner}/${repoMeta.git.repo}?style=${badgeStyle})`);
    }
  }

  // 2. Description
  let description = scanData.description || scanData.context?.existingReadmeDescription || '';
  if (!description) {
    description = isId
      ? `<!-- TODO: tambahkan deskripsi singkat mengenai tujuan proyek ini -->`
      : `<!-- TODO: add a concise description explaining the purpose of this project -->`;
  }

  // 3. Features (Strictly evidence-based, skipped if < 2 evidence items)
  if (isSectionEnabled('features')) {
    if (features?.hasEnoughEvidence) {
      const featContent = features.items.map((item) => (isId ? item.id : item.en)).join('\n\n');
      sections.push({
        key: 'features',
        title: locale.sections.features,
        slug: 'features',
        content: featContent,
        evidenceCount: features.count,
      });
    } else {
      sections.push({
        key: 'features',
        title: locale.sections.features,
        slug: 'features',
        content: `<!-- TODO: ${isId ? 'tambahkan daftar fitur proyek' : 'add project features list'} -->`,
        evidenceCount: 0,
        isTodo: true,
      });
    }
  }

  // 4. Tech Stack (Categorized table)
  if (isSectionEnabled('stack')) {
    const stackRows = [];
    if (dominantLanguage) {
      const allLangs = languages?.length > 1
        ? `${dominantLanguage.name} (${dominantLanguage.linePercentage}%), ${languages.slice(1).map((l) => `${l.name} (${l.linePercentage}%)`).join(', ')}`
        : dominantLanguage.name;
      stackRows.push(`| **Primary Language** | ${allLangs} |`);
    }
    if (frameworks?.categorized?.frontend?.length > 0) {
      stackRows.push(`| **Frontend** | ${frameworks.categorized.frontend.map((f) => `\`${f.name}\``).join(', ')} |`);
    }
    if (frameworks?.categorized?.backend?.length > 0) {
      stackRows.push(`| **Backend / API** | ${frameworks.categorized.backend.map((f) => `\`${f.name}\``).join(', ')} |`);
    }
    if (frameworks?.categorized?.database?.length > 0) {
      stackRows.push(`| **Database / ORM** | ${frameworks.categorized.database.map((d) => `\`${d.name}\``).join(', ')} |`);
    }
    if (frameworks?.categorized?.styling?.length > 0) {
      stackRows.push(`| **Styling** | ${frameworks.categorized.styling.map((s) => `\`${s.name}\``).join(', ')} |`);
    }
    if (frameworks?.categorized?.validation?.length > 0) {
      stackRows.push(`| **Validation** | ${frameworks.categorized.validation.map((v) => `\`${v.name}\``).join(', ')} |`);
    }
    if (testing?.frameworks?.length > 0) {
      stackRows.push(`| **Testing** | ${testing.frameworks.map((t) => `\`${t}\``).join(', ')} |`);
    }
    if (docker?.supported || cicd?.platforms?.length > 0) {
      const devopsItems = (docker?.supported ? ['Docker'] : []).concat(cicd.platforms || []);
      stackRows.push(`| **DevOps & Infra** | ${devopsItems.map((d) => `\`${d}\``).join(', ')} |`);
    }

    if (stackRows.length > 0) {
      const stackContent = `| Category | Technologies |\n| --- | --- |\n${stackRows.join('\n')}`;
      sections.push({
        key: 'stack',
        title: locale.sections.stack,
        slug: 'tech-stack',
        content: stackContent,
        evidenceCount: stackRows.length,
      });
    }
  }

  // 5. Architecture & Project Structure
  if (isSectionEnabled('architecture') && fileTree) {
    sections.push({
      key: 'architecture',
      title: locale.sections.architecture,
      slug: 'architecture--project-structure',
      content: `\`\`\`text\n${fileTree}\n\`\`\``,
      evidenceCount: 1,
    });
  }

  // 6. Prerequisites & Installation (lockfile-accurate)
  if (isSectionEnabled('prerequisites')) {
    const scriptsData = scanData.scriptsInfo || scanData.scripts || {};
    const pm = scriptsData.packageManager || scanData.packageManager || 'npm';
    const installCmd = scriptsData.installCommand || scanData.installCommand || `${pm} install`;
    const installLines = [
      `### ${locale.labels.prerequisites}\n`,
      `- Package Manager: \`${pm}\`\n`,
      `### ${locale.labels.setupInstructions}\n`,
      `${locale.labels.cloneRepo}\n`,
      `\`\`\`bash\ngit clone ${repoMeta.cloneUrl}\ncd ${repoMeta.projectName}\n\`\`\`\n`,
      `${locale.labels.installDeps}\n`,
      `\`\`\`bash\n${installCmd}\n\`\`\``,
    ];
    sections.push({
      key: 'prerequisites',
      title: locale.sections.prerequisites,
      slug: 'prerequisites--installation',
      content: installLines.join('\n'),
      evidenceCount: 2,
    });
  }

  // 7. Environment Variables
  if (isSectionEnabled('env') && envVars?.found) {
    const rows = [
      `| ${locale.labels.variable} | ${locale.labels.status} | In Example | ${locale.labels.description} |`,
      '| --- | --- | --- | --- |',
    ];
    for (const v of envVars.variables) {
      const statusText = v.required ? '**Required**' : 'Optional';
      const inEx = v.inExample ? '✅ Yes' : '⚠️ No';
      rows.push(`| \`${v.name}\` | ${statusText} | ${inEx} | ${v.description} |`);
    }
    const envContent = [
      envVars.exampleFile ? `Copy the \`${envVars.exampleFile}\` template to \`.env\`:\n\`\`\`bash\ncp ${envVars.exampleFile} .env\n\`\`\`\n` : '',
      rows.join('\n'),
    ].join('\n');

    sections.push({
      key: 'env',
      title: locale.sections.env,
      slug: 'configuration--environment-variables',
      content: envContent.trim(),
      evidenceCount: envVars.variables.length,
    });
  }

  // 8. Usage & Available Scripts
  if (isSectionEnabled('usage')) {
    const usageParts = [];
    if (scanData.runCommand) {
      usageParts.push(`To run or start the application:\n\`\`\`bash\n${scanData.runCommand}\n\`\`\`\n`);
    }

    const scriptsData = scanData.scriptsInfo || scanData.scripts;
    const cats = scriptsData?.categorizedScripts || { dev: [], build: [], test: [], lint: [], database: [], other: [] };

    if (cats.dev?.length > 0 || cats.build?.length > 0 || cats.test?.length > 0) {
      usageParts.push(`### ${locale.labels.availableScripts}\n`);
      usageParts.push(`| ${locale.labels.command} | ${locale.labels.description} |`);
      usageParts.push('| --- | --- |');

      const allScriptItems = [
        ...(cats.dev || []),
        ...(cats.build || []),
        ...(cats.test || []),
        ...(cats.lint || []),
        ...(cats.database || []),
        ...(cats.other || []),
      ];

      for (const item of allScriptItems) {
        usageParts.push(`| \`${item.runCmd}\` | \`${item.cmd}\` |`);
      }
    }

    if (usageParts.length > 0) {
      sections.push({
        key: 'usage',
        title: locale.sections.usage,
        slug: 'usage--execution',
        content: usageParts.join('\n'),
        evidenceCount: 1,
      });
    }
  }

  // 9. Docker
  if (isSectionEnabled('docker') && docker?.supported) {
    const dockerLines = ['### Docker Usage\n'];
    if (docker.hasCompose) {
      dockerLines.push('Run all container services:\n```bash\ndocker compose up -d\n```\n');
      if (docker.services.length > 0) {
        dockerLines.push('| Service | Image | Ports |');
        dockerLines.push('| --- | --- | --- |');
        for (const s of docker.services) {
          dockerLines.push(`| **${s.name}** | \`${s.image || 'build'}\` | ${s.ports.map((p) => `\`${p}\``).join(', ') || '-'} |`);
        }
      }
    } else {
      dockerLines.push(`Build and run Docker container:\n\`\`\`bash\ndocker build -t ${repoMeta.projectName} .\ndocker run -p 3000:3000 ${repoMeta.projectName}\n\`\`\``);
    }

    sections.push({
      key: 'docker',
      title: locale.sections.docker,
      slug: 'docker--containerization',
      content: dockerLines.join('\n'),
      evidenceCount: docker.services.length || 1,
    });
  }

  // 10. API Endpoints
  if (isSectionEnabled('api') && endpoints?.found) {
    const epLines = [
      `| ${locale.labels.method} | ${locale.labels.path} | ${locale.labels.source} |`,
      '| --- | --- | --- |',
    ];
    for (const ep of endpoints.endpoints) {
      epLines.push(`| \`${ep.method}\` | \`${ep.path}\` | \`${ep.source}\` |`);
    }
    if (endpoints.remainingCount > 0) {
      epLines.push(`\n_${locale.labels.moreEndpoints.replace('{count}', endpoints.remainingCount)}_`);
    }

    sections.push({
      key: 'api',
      title: locale.sections.api,
      slug: 'api-documentation',
      content: epLines.join('\n'),
      evidenceCount: endpoints.totalCount,
    });
  }

  // 11. Database & Models
  if (isSectionEnabled('database') && database?.found) {
    const dbLines = [];
    dbLines.push(`- **Database Engines**: ${database.databases.join(', ') || 'Relational'}`);
    if (database.orms.length > 0) {
      dbLines.push(`- **ORM / Query Builder**: ${database.orms.join(', ')}`);
    }
    if (database.migrationCommand) {
      dbLines.push(`\nRun database migrations:\n\`\`\`bash\n${database.migrationCommand}\n\`\`\`\n`);
    }
    if (database.models.length > 0) {
      dbLines.push('| Data Model | Estimated Fields |');
      dbLines.push('| --- | --- |');
      for (const m of database.models) {
        dbLines.push(`| **${m.name}** | ${m.fieldsCount} fields |`);
      }
    }

    sections.push({
      key: 'database',
      title: locale.sections.database,
      slug: 'database--models',
      content: dbLines.join('\n'),
      evidenceCount: database.models.length + database.databases.length,
    });
  }

  // 12. Frontend Overview
  if (isSectionEnabled('frontend') && frontend?.found) {
    const feLines = [];
    if (frontend.pages.length > 0) {
      feLines.push('### Routed Pages & Views\n');
      feLines.push('| Route Path | Type |');
      feLines.push('| --- | --- |');
      for (const p of frontend.pages) {
        feLines.push(`| \`${p}\` | View Route |`);
      }
    }
    if (frontend.features.length > 0) {
      feLines.push('\n### Capabilities\n' + frontend.features.map((f) => `- ${f}`).join('\n'));
    }

    sections.push({
      key: 'frontend',
      title: locale.sections.frontend,
      slug: 'frontend-overview',
      content: feLines.join('\n'),
      evidenceCount: frontend.pages.length || 1,
    });
  }

  // 13. Testing & Code Quality
  if (isSectionEnabled('testing') && testing?.found) {
    const tLines = [];
    if (testing.testCommand) {
      tLines.push(`Execute automated tests:\n\`\`\`bash\n${testing.testCommand}\n\`\`\`\n`);
    }
    if (testing.frameworks.length > 0) tLines.push(`- **Test Frameworks**: ${testing.frameworks.join(', ')}`);
    if (testing.linters.length > 0) tLines.push(`- **Linters**: ${testing.linters.join(', ')}`);
    if (testing.formatters.length > 0) tLines.push(`- **Formatters**: ${testing.formatters.join(', ')}`);
    if (testing.typeCheckers.length > 0) tLines.push(`- **Type Checking**: ${testing.typeCheckers.join(', ')}`);
    if (testing.gitHooks.length > 0) tLines.push(`- **Git Hooks**: ${testing.gitHooks.join(', ')}`);

    sections.push({
      key: 'testing',
      title: locale.sections.testing,
      slug: 'testing--code-quality',
      content: tLines.join('\n'),
      evidenceCount: testing.frameworks.length + testing.linters.length,
    });
  }

  // 14. Security Posture
  if (isSectionEnabled('security')) {
    const secLines = [
      `> ℹ️ _${locale.labels.disclaimer}_\n`,
      `| Practice | Status |`,
      '| --- | --- |',
    ];

    for (const v of security.verifiedChecks) {
      secLines.push(`| ${v.title} | ✅ Verified |`);
    }

    if (security.missingSuggestions.length > 0) {
      secLines.push(`\n### ${locale.labels.recommendations}\n`);
      for (const s of security.missingSuggestions.slice(0, 3)) {
        secLines.push(`- **${s.title}**: ${s.suggestion}`);
      }
    }

    sections.push({
      key: 'security',
      title: locale.sections.security,
      slug: 'security-posture',
      content: secLines.join('\n'),
      evidenceCount: security.verifiedChecks.length,
    });
  }

  // 15. CI/CD & Deployment
  if (isSectionEnabled('cicd') && cicd?.found) {
    const ciLines = [];
    if (cicd.workflows.length > 0) {
      ciLines.push('| Workflow | Triggers | File |');
      ciLines.push('| --- | --- | --- |');
      for (const w of cicd.workflows) {
        ciLines.push(`| **${w.name}** | \`${w.triggers.join(', ') || 'push'}\` | \`${w.file}\` |`);
      }
    }
    if (cicd.platforms.length > 0) {
      ciLines.push(`\n- **Target Platforms**: ${cicd.platforms.join(', ')}`);
    }

    sections.push({
      key: 'cicd',
      title: locale.sections.cicd,
      slug: 'cicd--deployment',
      content: ciLines.join('\n'),
      evidenceCount: cicd.workflows.length + cicd.platforms.length,
    });
  }

  // 16. Contributing
  if (isSectionEnabled('contributing')) {
    const docFile = repoMeta.docs.contributing;
    const contContent = docFile
      ? `Please review [${docFile}](${docFile}) for contributing guidelines and pull request instructions.`
      : [
          'Contributions are welcome! Please follow these steps:',
          '1. Fork the repository.',
          '2. Create a new feature branch (`git checkout -b feature/my-feature`).',
          '3. Commit your changes (`git commit -m "Add my feature"`).',
          '4. Push to the branch (`git push origin feature/my-feature`).',
          '5. Open a Pull Request.',
        ].join('\n');

    sections.push({
      key: 'contributing',
      title: locale.sections.contributing,
      slug: 'contributing',
      content: contContent,
      evidenceCount: 1,
    });
  }

  // 17. License
  if (isSectionEnabled('license')) {
    const licName = repoMeta.licenseInfo?.name || repoMeta.license;
    const licFile = repoMeta.licenseInfo?.file || 'LICENSE';
    const licLink = repoMeta.licenseInfo ? `[${licFile}](${licFile})` : 'LICENSE file';
    const licContent = licName
      ? `Distributed under the ${licName}. See ${licLink} for more information.`
      : `<!-- TODO: specify license -->\nThis project is currently unlicensed.`;

    sections.push({
      key: 'license',
      title: locale.sections.license,
      slug: 'license',
      content: licContent,
      evidenceCount: licName ? 1 : 0,
    });
  }

  // 18. Authors
  if (isSectionEnabled('authors') && repoMeta.author) {
    sections.push({
      key: 'authors',
      title: locale.sections.authors,
      slug: 'authors--acknowledgments',
      content: `Maintained with care by **${repoMeta.author}**.`,
      evidenceCount: 1,
    });
  }

  // Assemble TOC
  const tocList = [];
  for (const s of sections) {
    tocList.push(`- [${s.title}](#${s.slug})`);
  }

  // Check if --merge or --update was requested and existing README is present
  if ((options.merge || options.update) && options.existingContent) {
    const merged = mergeReadme(options.existingContent, sections);
    if (merged) {
      return {
        markdown: merged,
        sections,
        summary: computeSummary(sections, security.warnings),
      };
    }
  }

  // Build full markdown document
  const parts = [];
  parts.push(`# ${repoMeta.projectName}\n`);

  if (badgesList.length > 0) {
    parts.push(badgesList.join(' ') + '\n');
  }

  parts.push(description + '\n');

  if (sections.length > 1) {
    parts.push(`## ${locale.tocTitle}\n\n${tocList.join('\n')}\n`);
  }

  for (const s of sections) {
    // When writing fresh or in merge mode, wrap sections with marker comments
    const wrappedContent = wrapWithMarkers(s.key, s.content);
    parts.push(`## ${s.title}\n\n${wrappedContent}\n`);
  }

  const markdown = parts.join('\n').trim() + '\n';

  return {
    markdown,
    sections,
    summary: computeSummary(sections, security.warnings),
  };
}

function computeSummary(sections, warnings = []) {
  const filled = [];
  const skipped = [];

  for (const s of sections) {
    if (s.evidenceCount > 0) {
      filled.push({ name: s.title, evidenceCount: s.evidenceCount });
    } else {
      skipped.push({ name: s.title, reason: 'Insufficient evidence' });
    }
  }

  return {
    filled,
    skipped,
    warnings,
  };
}
