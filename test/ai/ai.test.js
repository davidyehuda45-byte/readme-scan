import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { runCli } from '../../src/cli.js';
import { redactText, redactPayload } from '../../src/ai/redact.js';
import { validateAiResponse } from '../../src/ai/validate.js';
import { buildFactsJson } from '../../src/ai/facts.js';
import { buildAiPayload } from '../../src/ai/payload.js';
import { runAiEnhancement } from '../../src/ai/run.js';
import { setApiKey, getApiKey, removeApiKey, maskKey } from '../../src/ai/auth.js';

describe('AI Mode and BYOK Security (PRD Addendum v3)', () => {
  const FIXTURE_DIR = path.resolve('test/fixtures-ai-test');

  before(() => {
    fs.mkdirSync(FIXTURE_DIR, { recursive: true });
    fs.writeFileSync(path.join(FIXTURE_DIR, 'package.json'), JSON.stringify({ name: 'ai-test-app' }));
  });

  after(() => {
    if (fs.existsSync(FIXTURE_DIR)) {
      fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
    }
  });

  test('redacts secret patterns, API keys, private keys, and paths', () => {
    const sensitive = `
      const key = "sk-123456789012345678901234567890";
      const aws = "AKIA1234567890ABCDEF";
      const github = "ghp_123456789012345678901234567890123456";
      const userPath = "C:\\\\Users\\\\Admin\\\\secret-project\\\\file.js";
      const email = "developer@example.com";
      const priv = "-----BEGIN RSA PRIVATE KEY-----\\nMIIEowIBAAKCAQEA0...\\n-----END RSA PRIVATE KEY-----";
    `;

    const redacted = redactText(sensitive);
    assert(!redacted.includes('sk-123456789012345678901234567890'));
    assert(!redacted.includes('AKIA1234567890ABCDEF'));
    assert(!redacted.includes('ghp_123456789012345678901234567890123456'));
    assert(!redacted.includes('C:\\\\Users\\\\Admin\\\\'));
    assert(!redacted.includes('developer@example.com'));
    assert(!redacted.includes('MIIEowIBAAKCAQEA0'));
    assert(redacted.includes('[REDACTED_SECRET]'));
    assert(redacted.includes('[REDACTED_EMAIL]'));
  });

  test('validates claims and discards hallucinated technologies', () => {
    const facts = {
      project: { name: 'my-service' },
      stack: {
        languages: [{ name: 'TypeScript' }],
        backend: ['Fastify'],
        database: ['PostgreSQL'],
      },
      evidence: {
        featuresCandidates: ['Fastify HTTP routes', 'PostgreSQL persistence'],
      },
    };

    const hallucinatedResponse = {
      description: 'Built with Fastify and PostgreSQL. It also uses Redis for caching and Kafka for event streaming.',
      about: 'Production ready system utilizing MongoDB and GraphQL.',
      features: [
        { id: 'Fastify HTTP routes', text: 'Fastify routes handling inventory.' },
        { id: 'Invented Redis cache', text: 'Uses Redis for session storage.' },
      ],
      architecture: 'Clean architecture with Kafka pipeline.',
    };

    const validated = validateAiResponse(hallucinatedResponse, facts);

    // Sentence with Redis and Kafka must be discarded
    assert(!validated.data.description.includes('Redis'));
    assert(!validated.data.description.includes('Kafka'));
    assert(validated.data.description.includes('Built with Fastify and PostgreSQL.'));

    // About with MongoDB must be discarded
    assert.strictEqual(validated.data.about, '');

    // Architecture with Kafka must be discarded
    assert.strictEqual(validated.data.architecture, '');

    // Feature not in candidates must be discarded
    assert.strictEqual(validated.data.features.length, 1);
    assert.strictEqual(validated.data.features[0].id, 'Fastify HTTP routes');
    assert(validated.discarded.length > 0);
  });

  test('masks API key revealing only last 4 chars', () => {
    assert.strictEqual(maskKey('sk-proj-1234567890abcd'), '••••••••••••abcd');
    assert.strictEqual(maskKey('short'), '••••••••••••hort');
    assert.strictEqual(maskKey('123'), '••••');
  });

  test('auth management: set, get, and remove key in isolated store', () => {
    setApiKey('test_provider', 'secret-key-9999');
    const lookup = getApiKey('test_provider');
    assert.strictEqual(lookup.key, 'secret-key-9999');

    const removed = removeApiKey('test_provider');
    assert.strictEqual(removed, true);
    const afterRemove = getApiKey('test_provider');
    assert.strictEqual(afterRemove.key, null);
  });

  test('AI preview flag prints payload without network calls', async () => {
    const fixtureDir = FIXTURE_DIR;
    const logs = [];
    const origLog = console.log;
    console.log = (msg) => logs.push(msg);

    try {
      const code = await runCli(['--ai-preview', fixtureDir]);
      assert.strictEqual(code, 0);
      assert(logs.length > 0);
      const parsed = JSON.parse(logs[0]);
      assert(parsed.payload);
      assert(parsed.payload.facts);
      assert(parsed.systemPrompt);
    } finally {
      console.log = origLog;
    }
  });

  test('orchestrates AI enhancement with mock provider and handles success', async () => {
    const scanData = {
      projectName: 'mock-app',
      context: { rootDir: process.cwd() },
      dominantLanguage: { name: 'JavaScript', linePercentage: 100 },
      features: {
        hasEnoughEvidence: true,
        count: 1,
        items: [{ en: 'REST API', id: 'REST API' }],
      },
    };

    const mockResponsePayload = {
      description: 'A mock application built with JavaScript.',
      about: 'A lightweight utility.',
      features: [{ id: 'REST API', text: 'Handles RESTful HTTP requests.' }],
      architecture: 'Single service architecture.',
    };

    const mockFetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(mockResponsePayload),
            },
          },
        ],
        usage: { prompt_tokens: 150, completion_tokens: 50, total_tokens: 200 },
      }),
    });

    const res = await runAiEnhancement(scanData, {
      provider: 'openai',
      apiKey: 'test-key',
      fetchFn: mockFetch,
    });

    assert.strictEqual(res.success, true);
    assert(res.scanData.description.includes('A mock application built with JavaScript.'));
    assert(res.scanData.description.includes('<!-- readme-scan:ai -->'));
    assert.strictEqual(res.usage.totalTokens, 200);
  });

  test('falls back gracefully to static generation if AI provider fails', async () => {
    const scanData = {
      projectName: 'mock-fail-app',
      context: { rootDir: process.cwd() },
      dominantLanguage: { name: 'JavaScript', linePercentage: 100 },
    };

    const failingFetch = async () => ({
      ok: false,
      status: 401,
      text: async () => 'Invalid API key provided',
    });

    const res = await runAiEnhancement(scanData, {
      provider: 'openai',
      apiKey: 'bad-key',
      fetchFn: failingFetch,
    });

    assert.strictEqual(res.success, false);
    assert(res.error.includes('Authentication error'));
    // scanData remains available for fallback
    assert.strictEqual(res.scanData.projectName, 'mock-fail-app');
  });

  test('CLI subcommand "models" runs with exit code 0', async () => {
    const logs = [];
    const origLog = console.log;
    console.log = (msg) => logs.push(msg);

    try {
      const code = await runCli(['models']);
      assert.strictEqual(code, 0);
      assert(logs.some((l) => l.includes('Supported Providers')));
    } finally {
      console.log = origLog;
    }
  });

  test('CLI subcommand "auth status" runs with exit code 0', async () => {
    const logs = [];
    const origLog = console.log;
    console.log = (msg) => logs.push(msg);

    try {
      const code = await runCli(['auth', 'status']);
      assert.strictEqual(code, 0);
      assert(logs.some((l) => l.includes('Configured AI Providers')));
    } finally {
      console.log = origLog;
    }
  });

  test('CLI subcommand "lint" inspects a markdown file', async () => {
    const tmpFile = path.resolve('test/tmp-lint-test.md');
    fs.writeFileSync(tmpFile, '# Test 🚀\n\n- **Config**: value!\n', 'utf8');

    const logs = [];
    const origLog = console.log;
    console.log = (msg) => logs.push(msg);

    try {
      const checkCode = await runCli(['lint', tmpFile]);
      assert.strictEqual(checkCode, 1); // violations found

      const fixCode = await runCli(['lint', tmpFile, '--fix']);
      assert.strictEqual(fixCode, 0); // fixed

      const fixedContent = fs.readFileSync(tmpFile, 'utf8');
      assert(!fixedContent.includes('🚀'));
      assert(!fixedContent.includes('- **Config**:'));
    } finally {
      console.log = origLog;
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });
});
