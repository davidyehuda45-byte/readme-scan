/**
 * Merge engine per PRD Section 6.
 * Preserves user's manual text outside of readme-scan markers.
 * Markers: <!-- readme-scan:start:<key> --> ... <!-- readme-scan:end:<key> -->
 *
 * Backward compatibility:
 * Reads legacy <!-- auto-readme:* --> markers and replaces them with <!-- readme-scan:* -->.
 */

export function mergeReadme(existingContent, newSections) {
  if (
    !existingContent ||
    (!existingContent.includes('<!-- readme-scan:start:') &&
      !existingContent.includes('<!-- auto-readme:start:'))
  ) {
    // If no previous markers exist, return null so full markdown is generated
    return null;
  }

  let merged = existingContent;

  for (const sec of newSections) {
    // Matches both new and legacy marker tags
    const markerRegex = new RegExp(
      `<!-- (?:readme-scan|auto-readme):start:${escapeRegExp(sec.key)} -->[\\s\\S]*?<!-- (?:readme-scan|auto-readme):end:${escapeRegExp(sec.key)} -->`,
      'g'
    );

    const replacement = `<!-- readme-scan:start:${sec.key} -->\n${sec.content}\n<!-- readme-scan:end:${sec.key} -->`;

    if (markerRegex.test(merged)) {
      if (sec.isTodo) {
        const match = merged.match(markerRegex);
        if (match && !match[0].includes('<!-- TODO:')) {
          continue;
        }
      }
      merged = merged.replace(markerRegex, replacement);
    }
  }

  return merged;
}

export function wrapWithMarkers(key, content) {
  return `<!-- readme-scan:start:${key} -->\n${content}\n<!-- readme-scan:end:${key} -->`;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
