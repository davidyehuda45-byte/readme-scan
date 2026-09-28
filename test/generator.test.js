import { test, describe } from 'node:test';
import assert from 'node:assert';
import { generateReadme } from '../src/generator/index.js';
import { generateBadges } from '../src/generator/badges.js';

describe('Markdown Generator', () => {
  const mockProjectInfo = {
    projectName: 'super-app',
    description: 'An ultra-fast web application',
    version: '1.2.0',
    license: 'MIT',
    licenseInfo: { name: 'MIT License', file: 'LICENSE' },
    primaryEcosystem: 'node',
    dominantLanguage: { name: 'TypeScript', color: '3178C6', logo: 'typescript' },
    languages: [{ name: 'TypeScript', linePercentage: 90 }, { name: 'CSS', linePercentage: 10 }],
    git: { isGitHub: true, owner: 'org', repo: 'super-app' },
    docker: { supported: true, hasCompose: true },
    ecosystemData: {
      node: {
        isTypeScript: true,
        packageManager: 'pnpm',
        categorized: {
          frameworks: [{ name: 'react', version: '^18.0.0' }],
          databases: [{ name: 'prisma', version: '^5.0.0' }],
          devTools: [{ name: 'vite', version: '^5.0.0' }],
        },
      },
    },
    installCommand: 'pnpm install',
    runCommand: 'pnpm dev',
    testCommand: 'pnpm test',
    scripts: { dev: 'vite', test: 'vitest' },
    fileTree: 'super-app/\n├── src/\n└── package.json',
  };

  test('generates complete English README with badges and TOC', () => {
    const { markdown, summary } = generateReadme(mockProjectInfo, { lang: 'en' });

    assert(markdown.startsWith('# super-app'));
    assert(markdown.includes('https://img.shields.io/badge/language-TypeScript'));
    assert(markdown.includes('https://img.shields.io/badge/version-1.2.0'));
    assert(markdown.includes('## Table of Contents'));
    assert(markdown.includes('- [Features](#features)'));
    assert(markdown.includes('- [Tech Stack](#tech-stack)'));
    assert(markdown.includes('pnpm install'));
    assert(markdown.includes('pnpm dev'));
    assert(markdown.includes('Docker Usage'));
    assert(markdown.includes('docker compose up --build'));
    assert(markdown.includes('Distributed under the MIT License'));

    assert(summary.filledSections.includes('Features'));
    assert(summary.filledSections.includes('Tech Stack'));
  });

  test('generates Indonesian README with proper translations', () => {
    const { markdown, summary } = generateReadme(mockProjectInfo, { lang: 'id' });

    assert(markdown.startsWith('# super-app'));
    assert(markdown.includes('## Daftar Isi'));
    assert(markdown.includes('- [Fitur](#fitur)'));
    assert(markdown.includes('- [Instalasi](#instalasi)'));
    assert(markdown.includes('- [Cara Menjalankan](#cara-menjalankan)'));
    assert(markdown.includes('### Prasyarat'));
    assert(markdown.includes('### Langkah Instalasi'));
    assert(markdown.includes('Didistribusikan di bawah lisensi MIT License'));

    assert(summary.filledSections.includes('Fitur'));
    assert(summary.filledSections.includes('Instalasi'));
  });

  test('supports minimal mode without badges and emojis', () => {
    const { markdown } = generateReadme(mockProjectInfo, { lang: 'en', minimal: true });

    assert(!markdown.includes('img.shields.io'));
    assert(!markdown.includes('🐳'));
    assert(!markdown.includes('🔷'));
    assert(markdown.includes('Docker Support: Ready for containerized deployment'));
    assert(markdown.includes('Type Safety: Fully typed with TypeScript'));
  });

  test('generates badges correctly', () => {
    const badges = generateBadges(mockProjectInfo);
    assert.strictEqual(badges.length, 6);
    assert(badges.some((b) => b.includes('stars/org/super-app')));
    assert(badges.some((b) => b.includes('docker-supported')));
  });
});
