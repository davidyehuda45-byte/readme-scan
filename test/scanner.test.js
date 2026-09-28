import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseGitignore, isIgnored } from '../src/scanner/file-tree.js';
import { parseGitUrl } from '../src/scanner/git.js';
import { parseEnvExample } from '../src/scanner/env.js';

describe('Scanner Utilities', () => {
  test('parseGitignore handles wildcards, trailing slashes, comments', () => {
    const gitignore = `
      # comment
      node_modules/
      *.log
      dist
      /build/
    `;
    const rules = parseGitignore(gitignore);
    assert.strictEqual(rules.length, 4);

    assert.strictEqual(isIgnored('node_modules', true, rules), true);
    assert.strictEqual(isIgnored('error.log', false, rules), true);
    assert.strictEqual(isIgnored('src/index.js', false, rules), false);
  });

  test('parseGitUrl parses SSH, HTTPS, git+https, and shorthand remotes correctly', () => {
    const ssh = parseGitUrl('git@github.com:octocat/Hello-World.git');
    assert.strictEqual(ssh.host, 'github.com');
    assert.strictEqual(ssh.owner, 'octocat');
    assert.strictEqual(ssh.repo, 'Hello-World');
    assert.strictEqual(ssh.isGitHub, true);
    assert.strictEqual(ssh.webUrl, 'https://github.com/octocat/Hello-World');

    const gitPlus = parseGitUrl('git+https://github.com/octocat/Hello-World.git');
    assert.strictEqual(gitPlus.isGitHub, true);
    assert.strictEqual(gitPlus.owner, 'octocat');

    const shorthand = parseGitUrl('octocat/Hello-World');
    assert.strictEqual(shorthand.owner, 'octocat');
    assert.strictEqual(shorthand.isGitHub, true);

    const https = parseGitUrl('https://gitlab.com/group/subproject.git');
    assert.strictEqual(https.host, 'gitlab.com');
    assert.strictEqual(https.owner, 'group');
    assert.strictEqual(https.repo, 'subproject');
    assert.strictEqual(https.isGitLab, true);
  });

  test('parseEnvExample parses variable names and comments safely', () => {
    const example = `
      # Database connection
      DATABASE_URL=postgres://user:pass@localhost:5432/mydb # connection string
      
      # App secret key
      SECRET_KEY=
      
      PORT=3000
    `;
    const vars = parseEnvExample(example);
    assert.strictEqual(vars.length, 3);
    assert.strictEqual(vars[0].name, 'DATABASE_URL');
    assert.strictEqual(vars[0].description, 'connection string');
    assert.strictEqual(vars[1].name, 'SECRET_KEY');
    assert.strictEqual(vars[1].description, 'App secret key');
    assert.strictEqual(vars[2].name, 'PORT');
  });
});
