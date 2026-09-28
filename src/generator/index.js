import { renderReadme } from './render.js';
import { generateBadges } from './badges.js';
import { buildSectionsEn } from './templates/en.js';
import { buildSectionsId } from './templates/id.js';

/**
 * Main README Generator entrypoint.
 * Delegates to Deep Scan v2 renderer while preserving backward compatibility.
 */
export function generateReadme(projectInfo, options = {}) {
  // If scanData has deep scan detector fields, use renderReadme v2
  if (projectInfo.projectType || projectInfo.frameworks || projectInfo.security) {
    const result = renderReadme(projectInfo, options);
    return {
      markdown: result.markdown,
      summary: {
        filledSections: result.summary.filled.map((f) => f.name),
        placeholderSections: result.summary.skipped.map((s) => s.name),
        deepSummary: result.summary,
      },
    };
  }

  // Legacy fallback if mock data didn't have v2 detectors
  const lang = (options.lang || 'en').toLowerCase();
  const isId = lang === 'id';
  const isMinimal = Boolean(options.minimal);

  const badges = generateBadges(projectInfo, { minimal: isMinimal });
  const sections = isId
    ? buildSectionsId(projectInfo, badges, { minimal: isMinimal })
    : buildSectionsEn(projectInfo, badges, { minimal: isMinimal });

  const descriptionSec = sections.find((s) => s.key === 'description');
  const titledSections = sections.filter((s) => s.title);
  const tocTitle = isId ? 'Daftar Isi' : 'Table of Contents';

  const tocList = titledSections.map((s) => `- [${s.title}](#${s.slug})`);

  const parts = [];
  parts.push(`# ${projectInfo.projectName}\n`);
  if (badges.length > 0) parts.push(badges.join(' ') + '\n');
  if (descriptionSec) parts.push(descriptionSec.content + '\n');
  if (titledSections.length > 1) parts.push(`## ${tocTitle}\n\n${tocList.join('\n')}\n`);

  for (const s of titledSections) {
    parts.push(`## ${s.title}\n\n${s.content}\n`);
  }

  const markdown = parts.join('\n').trim() + '\n';
  const filledSections = [];
  const placeholderSections = [];

  for (const s of sections) {
    const label = s.title || (isId ? 'Deskripsi' : 'Description');
    if (s.isFilled) filledSections.push(label);
    else placeholderSections.push(label);
  }

  return {
    markdown,
    summary: {
      filledSections,
      placeholderSections,
    },
  };
}
