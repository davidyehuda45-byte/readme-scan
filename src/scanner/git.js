import fs from 'node:fs';
import path from 'node:path';

/**
 * Scan git configuration to extract remote repository information.
 */
export async function detectGit(rootDir) {
  const gitConfigPath = path.join(rootDir, '.git', 'config');
  if (!fs.existsSync(gitConfigPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(gitConfigPath, 'utf8');
    const lines = content.split(/\r?\n/);
    let inOrigin = false;
    let rawUrl = '';

    for (let line of lines) {
      line = line.trim();
      if (/^\[remote\s+["']origin["']\]/i.test(line)) {
        inOrigin = true;
        continue;
      }
      if (line.startsWith('[') && inOrigin) {
        break;
      }
      if (inOrigin && line.startsWith('url =')) {
        rawUrl = line.replace('url =', '').trim();
        break;
      }
    }

    if (!rawUrl) {
      return null;
    }

    return parseGitUrl(rawUrl);
  } catch {
    return null;
  }
}

/**
 * Normalizes git URL into standard web URL, clone URL, owner and repo.
 */
export function parseGitUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  let url = rawUrl.trim();

  // Strip git+ prefix (common in package.json)
  if (url.startsWith('git+')) {
    url = url.slice(4);
  }

  // Handle shorthand: github:user/repo
  if (url.startsWith('github:')) {
    url = `https://github.com/${url.slice(7)}`;
  } else if (/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(url)) {
    // Shorthand user/repo
    url = `https://github.com/${url}`;
  }

  let host = '';
  let owner = '';
  let repo = '';

  // SSH style: git@github.com:owner/repo.git
  const sshMatch = url.match(/^git@([^:]+):([^/]+)\/(.+?)(\.git)?$/);
  if (sshMatch) {
    host = sshMatch[1];
    owner = sshMatch[2];
    repo = sshMatch[3];
  } else {
    // HTTPS/HTTP: https://github.com/owner/repo.git
    const httpMatch = url.match(/^https?:\/\/([^/]+)\/([^/]+)\/(.+?)(\.git)?$/);
    if (httpMatch) {
      host = httpMatch[1];
      owner = httpMatch[2];
      repo = httpMatch[3];
    }
  }

  if (owner && repo) {
    const webUrl = `https://${host}/${owner}/${repo}`;
    const cloneUrl = `https://${host}/${owner}/${repo}.git`;
    const isGitHub = host.toLowerCase().includes('github.com');
    const isGitLab = host.toLowerCase().includes('gitlab.com');

    return {
      raw: rawUrl,
      host,
      owner,
      repo,
      webUrl,
      cloneUrl,
      isGitHub,
      isGitLab,
    };
  }

  return {
    raw: rawUrl,
    webUrl: url,
    cloneUrl: url,
    isGitHub: false,
    isGitLab: false,
  };
}
