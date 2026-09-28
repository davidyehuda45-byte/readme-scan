import fs from 'node:fs';
import path from 'node:path';
import { scanDirectory } from './walk.js';

/**
 * ProjectContext is the unified, cached context passed to all deep scan detectors.
 */
export class ProjectContext {
  constructor(rootDir, scanResult, options = {}) {
    this.rootDir = path.resolve(rootDir);
    this.files = scanResult.files;
    this.directories = scanResult.directories;
    this.fileStats = scanResult.fileStats;
    this.options = options;
    this.verbose = Boolean(options.verbose);

    this.fileCache = new Map();
    this.evidenceLog = [];

    // Parse existing README if present to preserve human-written description
    this.existingReadmeDescription = this.extractOldReadmeDescription();
  }

  static async create(rootDir, options = {}) {
    const scanResult = await scanDirectory(rootDir, options);
    return new ProjectContext(rootDir, scanResult, options);
  }

  hasFile(relPath) {
    const normalized = relPath.replace(/\\/g, '/');
    return this.files.includes(normalized);
  }

  hasDir(relPath) {
    const normalized = relPath.replace(/\\/g, '/');
    return this.directories.includes(normalized);
  }

  findFiles(filter) {
    if (typeof filter === 'string') {
      const lower = filter.toLowerCase();
      return this.files.filter((f) => f.toLowerCase().endsWith(lower));
    }
    if (filter instanceof RegExp) {
      return this.files.filter((f) => filter.test(f));
    }
    if (typeof filter === 'function') {
      return this.files.filter(filter);
    }
    return [];
  }

  readFile(relPath) {
    const normalized = relPath.replace(/\\/g, '/');
    if (this.fileCache.has(normalized)) {
      return this.fileCache.get(normalized);
    }

    const fullPath = path.join(this.rootDir, normalized);
    try {
      if (!fs.existsSync(fullPath)) return null;
      const content = fs.readFileSync(fullPath, 'utf8');
      this.fileCache.set(normalized, content);
      return content;
    } catch {
      return null;
    }
  }

  readJson(relPath) {
    const content = this.readFile(relPath);
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  logEvidence(detectorName, item, confidence = 'high', source = '') {
    this.evidenceLog.push({
      detector: detectorName,
      item,
      confidence,
      source,
    });
  }

  extractOldReadmeDescription() {
    const readmeFile = this.files.find((f) => /^README\.md$/i.test(f));
    if (!readmeFile) return '';

    const content = this.readFile(readmeFile);
    if (!content) return '';

    const lines = content.split(/\r?\n/);
    let captured = [];
    let pastTitle = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!pastTitle) {
        if (trimmed.startsWith('# ')) {
          pastTitle = true;
        }
        continue;
      }

      // Skip badges or TOC or empty lines before description
      if (trimmed.startsWith('![') || trimmed.startsWith('[![') || trimmed.startsWith('## ') || trimmed.startsWith('<!--')) {
        if (trimmed.startsWith('## ')) break;
        continue;
      }

      if (trimmed.length > 0) {
        captured.push(trimmed);
      } else if (captured.length > 0) {
        break; // Stop at first blank line after text paragraph
      }
    }

    const desc = captured.join(' ').trim();
    // Ignore default fallback placeholders
    if (desc.includes('TODO:') || desc.includes('modern and robust application')) {
      return '';
    }
    return desc;
  }
}
