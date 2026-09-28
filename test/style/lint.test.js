import { test, describe } from 'node:test';
import assert from 'node:assert';
import { lintMarkdown } from '../../src/style/lint.js';

describe('Style Linter (PRD Section 7)', () => {
  test('strips emojis and decorative symbols in plain mode', () => {
    const input = '# My Project 🚀\n\n- 🐳 Docker support\n- ✅ Verified practice\n- ⚠️ Warning note';
    const { output, violations } = lintMarkdown(input, { style: 'plain' });

    assert(!output.includes('🚀'));
    assert(!output.includes('🐳'));
    assert(!output.includes('✅'));
    assert(!output.includes('⚠️'));
    assert(violations.some((v) => v.rule === 'no-emoji'));
  });

  test('allows emojis in expressive mode', () => {
    const input = '# Super App 🚀\n\n- 🔥 Fast performance';
    const { output, violations } = lintMarkdown(input, { style: 'expressive' });

    assert(output.includes('🚀'));
    assert(output.includes('🔥'));
    assert.strictEqual(violations.filter((v) => v.rule === 'no-emoji').length, 0);
  });

  test('strips exclamation marks in prose but preserves markdown images', () => {
    const input = '# Project\n\nWelcome! Happy hacking! Checkout ![Badge](https://img.shields.io/badge.svg)!';
    const { output } = lintMarkdown(input, { style: 'plain' });

    assert(!output.includes('Welcome!'));
    assert(!output.includes('Happy hacking!'));
    assert(output.includes('![Badge](https://img.shields.io/badge.svg)'));
  });

  test('replaces em-dashes with hyphens', () => {
    const input = 'This project is fast — and very lightweight.';
    const { output } = lintMarkdown(input, { style: 'plain' });

    assert(!output.includes('—'));
    assert(output.includes(' - '));
  });

  test('flattens headings deeper than ###', () => {
    const input = '#### Deep Section\n\n##### Very Deep Sub-Section';
    const { output } = lintMarkdown(input, { style: 'plain' });

    assert(!output.includes('#### Deep Section'));
    assert(output.includes('### Deep Section'));
    assert(output.includes('### Very Deep Sub-Section'));
  });

  test('flattens repetitive bold list labels', () => {
    const input = '- **Configuration**: set your port\n- **Database**: postgres connection';
    const { output } = lintMarkdown(input, { style: 'plain' });

    assert(!output.includes('- **Configuration**:'));
    assert(output.includes('- Configuration: set your port'));
    assert(output.includes('- Database: postgres connection'));
  });

  test('detects and cleans forbidden promotional words in English and Indonesian', () => {
    const inputEn = 'This is a blazing-fast, robust, cutting-edge solution.';
    const { output: outputEn, violations: vEn } = lintMarkdown(inputEn, { style: 'plain', lang: 'en' });

    assert(!outputEn.includes('blazing-fast'));
    assert(!outputEn.includes('robust'));
    assert(!outputEn.includes('cutting-edge'));
    assert(vEn.some((v) => v.rule === 'forbidden-word'));

    const inputId = 'Aplikasi canggih, tangguh, dan super cepat untuk bisnis Anda.';
    const { output: outputId, violations: vId } = lintMarkdown(inputId, { style: 'plain', lang: 'id' });

    assert(!outputId.includes('canggih'));
    assert(!outputId.includes('tangguh'));
    assert(!outputId.includes('super cepat'));
    assert(vId.some((v) => v.rule === 'forbidden-word'));
  });

  test('removes Table of Contents for short documents', () => {
    const input = `# Short Project\n\nShort description.\n\n## Table of Contents\n\n- [Usage](#usage)\n\n## Usage\n\nRun npm start.\n`;
    const { output } = lintMarkdown(input, { style: 'plain' });

    assert(!output.includes('Table of Contents'));
    assert(output.includes('## Usage'));
  });
});
