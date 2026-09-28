/**
 * Preset style definitions per PRD Section 7.1.
 */

export const PRESETS = {
  plain: {
    name: 'plain',
    allowEmojis: false,
    maxSections: 8,
    maxBadges: 3,
    forceToc: false,
    tocThresholdLines: 150,
    tocThresholdSections: 8,
    condenseShortSections: true,
    stripExclamations: true,
    replaceEmDashes: true,
    allowedSections: null, // all subject to maxSections and evidence
  },
  minimal: {
    name: 'minimal',
    allowEmojis: false,
    maxSections: 5,
    maxBadges: 0,
    forceToc: false,
    tocThresholdLines: Infinity,
    tocThresholdSections: Infinity,
    condenseShortSections: true,
    stripExclamations: true,
    replaceEmDashes: true,
    allowedSections: ['features', 'prerequisites', 'usage', 'license'],
  },
  detailed: {
    name: 'detailed',
    allowEmojis: false,
    maxSections: 20,
    maxBadges: 5,
    forceToc: false,
    tocThresholdLines: 150,
    tocThresholdSections: 8,
    condenseShortSections: false,
    stripExclamations: true,
    replaceEmDashes: true,
    allowedSections: null,
  },
  classic: {
    name: 'classic',
    allowEmojis: false,
    maxSections: 15,
    maxBadges: 5,
    forceToc: true,
    tocThresholdLines: 0,
    tocThresholdSections: 0,
    condenseShortSections: false,
    stripExclamations: true,
    replaceEmDashes: true,
    allowedSections: null,
  },
  expressive: {
    name: 'expressive',
    allowEmojis: true,
    maxSections: 20,
    maxBadges: 8,
    forceToc: false,
    tocThresholdLines: 100,
    tocThresholdSections: 6,
    condenseShortSections: false,
    stripExclamations: false,
    replaceEmDashes: false,
    allowedSections: null,
  },
};

export function getPreset(name = 'plain') {
  return PRESETS[name.toLowerCase()] || PRESETS.plain;
}
