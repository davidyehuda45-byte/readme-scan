/**
 * Generates Shields.io badge markdown strings.
 */
export function generateBadges(projectInfo, options = {}) {
  if (options.minimal) {
    return [];
  }

  const badges = [];

  // Dominant language badge
  if (projectInfo.dominantLanguage) {
    const lang = projectInfo.dominantLanguage;
    const color = lang.color || 'blue';
    const logoPart = lang.logo ? `&logo=${lang.logo}&logoColor=${lang.logoColor || 'white'}` : '';
    const safeLangName = encodeURIComponent(lang.name);
    badges.push(
      `![${lang.name}](https://img.shields.io/badge/language-${safeLangName}-${color}?style=flat-square${logoPart})`
    );
  }

  // Version badge
  if (projectInfo.version) {
    const safeVer = encodeURIComponent(projectInfo.version);
    badges.push(
      `![Version](https://img.shields.io/badge/version-${safeVer}-informational?style=flat-square)`
    );
  }

  // License badge
  if (projectInfo.license) {
    const safeLicense = encodeURIComponent(projectInfo.license);
    badges.push(
      `![License](https://img.shields.io/badge/license-${safeLicense}-success?style=flat-square)`
    );
  }

  // Docker badge
  if (projectInfo.docker && projectInfo.docker.supported) {
    badges.push(
      '![Docker](https://img.shields.io/badge/docker-supported-2496ED?style=flat-square&logo=docker&logoColor=white)'
    );
  }

  // GitHub repository badges
  if (projectInfo.git && projectInfo.git.isGitHub && projectInfo.git.owner && projectInfo.git.repo) {
    const { owner, repo } = projectInfo.git;
    badges.push(
      `![GitHub Stars](https://img.shields.io/github/stars/${owner}/${repo}?style=flat-square)`,
      `![GitHub Issues](https://img.shields.io/github/issues/${owner}/${repo}?style=flat-square)`
    );
  }

  return badges;
}
