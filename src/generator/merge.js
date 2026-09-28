/**
 * Merge engine per PRD Section 6.
 * Preserves user's manual text outside of auto-readme markers.
 * Markers: <!-- auto-readme:start:<key> --> ... <!-- auto-readme:end:<key> -->
 */

export function mergeReadme(existingContent, newSections) {
  if (!existingContent || !existingContent.includes('<!-- auto-readme:start:')) {
    // If no previous markers exist, generate full markdown with markers
    return null;
  }

  let merged = existingContent;

  for (const sec of newSections) {
    const startTag = `<!-- auto-readme:start:${sec.key} -->`;
    const endTag = `<!-- auto-readme:end:${sec.key} -->`;
    const regex = new RegExp(`${escapeRegExp(startTag)}[\\s\\S]*?${escapeRegExp(endTag)}`, 'g');

    const replacement = `${startTag}\n${sec.content}\n${endTag}`;

    if (regex.test(merged)) {
      if (sec.isTodo) {
        const match = merged.match(regex);
        if (match && !match[0].includes('<!-- TODO:')) {
          continue;
        }
      }
      merged = merged.replace(regex, replacement);
    }
  }

  return merged;
}

export function wrapWithMarkers(key, content) {
  return `<!-- auto-readme:start:${key} -->\n${content}\n<!-- auto-readme:end:${key} -->`;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
