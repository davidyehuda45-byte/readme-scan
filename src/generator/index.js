import { generateBadges } from './badges.js';
import { buildSectionsEn } from './templates/en.js';
import { buildSectionsId } from './templates/id.js';

export function generateReadme(projectInfo, options = {}) {
  const lang = (options.lang || 'en').toLowerCase();
  const isId = lang === 'id';
  const isMinimal = Boolean(options.minimal);

  // Generate badges
  const badges = generateBadges(projectInfo, { minimal: isMinimal });

  // Build section list
  const sections = isId
    ? buildSectionsId(projectInfo, badges, { minimal: isMinimal })
    : buildSectionsEn(projectInfo, badges, { minimal: isMinimal });

  const descriptionSec = sections.find((s) => s.key === 'description');
  const titledSections = sections.filter((s) => s.title);

  // Generate Table of Contents
  const tocTitle = isId ? 'Daftar Isi' : 'Table of Contents';

  const tocList = [];
  for (const s of titledSections) {
    tocList.push(`- [${s.title}](#${s.slug})`);
  }

  // Assemble document
  const parts = [];

  // 1. Title
  parts.push(`# ${projectInfo.projectName}\n`);

  // 2. Badges (if any)
  if (badges.length > 0) {
    parts.push(badges.join(' ') + '\n');
  }

  // 3. Description
  if (descriptionSec) {
    parts.push(descriptionSec.content + '\n');
  }

  // 4. Table of Contents (only if 2 or more sections)
  if (titledSections.length > 1) {
    parts.push(`## ${tocTitle}\n\n${tocList.join('\n')}\n`);
  }

  // 5. Each section
  for (const s of titledSections) {
    parts.push(`## ${s.title}\n\n${s.content}\n`);
  }

  const markdown = parts.join('\n').trim() + '\n';

  // Compute filled vs placeholder summary
  const filledSections = [];
  const placeholderSections = [];

  for (const s of sections) {
    const label = s.title || (isId ? 'Deskripsi' : 'Description');
    if (s.isFilled) {
      filledSections.push(label);
    } else {
      placeholderSections.push(label);
    }
  }

  return {
    markdown,
    summary: {
      filledSections,
      placeholderSections,
    },
  };
}
