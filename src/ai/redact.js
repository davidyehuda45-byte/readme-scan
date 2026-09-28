/**
 * Redaction utility for AI payloads per PRD Section 4.
 * Strictly sanitizes secrets, tokens, absolute paths, emails, and usernames.
 */

function getSecretPatterns() {
  return [
    /sk-[\w-]{20,}/g,
    /AKIA[0-9A-Z]{16}/g,
    /ghp_[a-zA-Z0-9]{36}/g,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    /(?:api[_-]?key|auth[_-]?token|secret|password|passwd)\s*[:=]\s*['"]?(?!\[REDACTED)([\w\-.~+/=]{16,})['"]?/gi,
  ];
}

// Matches common Windows and Unix absolute user paths
const ABSOLUTE_PATH_PATTERNS = [
  /[A-Za-z]:[\\/]+Users[\\/]+[^\\/]+[\\/]+/gi,
  /[\\/]+Users[\\/]+[^\\/]+[\\/]+/gi,
  /[\\/]+home[\\/]+[^\\/]+[\\/]+/gi,
  /\\\\\?\\/g,
];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Redacts sensitive text strings.
 *
 * @param {string} text
 * @param {object} [options]
 * @param {string} [options.projectRoot]
 * @returns {string}
 */
export function redactText(text, options = {}) {
  if (typeof text !== 'string') return text;

  let result = text;

  // 1. Redact projectRoot if supplied
  if (options.projectRoot) {
    result = result.split(options.projectRoot).join('.');
  }

  // 2. Redact known absolute system paths
  for (const pat of ABSOLUTE_PATH_PATTERNS) {
    result = result.replace(pat, '~/');
  }

  // 3. Redact secret tokens
  for (const pat of getSecretPatterns()) {
    result = result.replace(pat, (match, ...args) => {
      const captures = args.slice(0, -2);
      if (captures.length > 0 && typeof captures[0] === 'string' && captures[0]) {
        return match.replace(captures[0], '[REDACTED_SECRET]');
      }
      return '[REDACTED_SECRET]';
    });
  }

  // 4. Redact emails
  result = result.replace(EMAIL_PATTERN, '[REDACTED_EMAIL]');

  return result;
}

/**
 * Deeply sanitizes an object or array.
 *
 * @param {any} val
 * @param {object} [options]
 * @returns {any}
 */
export function redactPayload(val, options = {}) {
  if (!val) return val;
  if (typeof val === 'string') {
    return redactText(val, options);
  }
  if (Array.isArray(val)) {
    return val.map((item) => redactPayload(item, options));
  }
  if (typeof val === 'object') {
    const redactedObj = {};
    for (const [k, v] of Object.entries(val)) {
      // Never send raw credentials or git user emails
      if (/email|author_email|git_user/i.test(k)) {
        continue;
      }
      redactedObj[k] = redactPayload(v, options);
    }
    return redactedObj;
  }
  return val;
}
