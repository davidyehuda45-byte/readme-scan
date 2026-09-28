import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseToml } from '../src/utils/toml-parser.js';

describe('TOML Parser', () => {
  test('parses simple key-value pairs and comments', () => {
    const toml = `
      # Comment line
      name = "my-project"
      version = "1.2.3" # inline comment
      count = 42
      active = true
    `;
    const res = parseToml(toml);
    assert.strictEqual(res.name, 'my-project');
    assert.strictEqual(res.version, '1.2.3');
    assert.strictEqual(res.count, 42);
    assert.strictEqual(res.active, true);
  });

  test('parses Cargo.toml structure', () => {
    const toml = `
      [package]
      name = "ripgrep"
      version = "14.1.0"
      authors = ["Andrew Gallant <jamslam@gmail.com>"]
      description = "Fast line-oriented search tool."
      edition = "2021"
      license = "Unlicense OR MIT"

      [dependencies]
      clap = { version = "4.4", features = ["derive"] }
      regex = "1.10"
      serde = "1.0"
    `;
    const res = parseToml(toml);
    assert.strictEqual(res.package.name, 'ripgrep');
    assert.strictEqual(res.package.version, '14.1.0');
    assert.strictEqual(res.package.edition, '2021');
    assert.strictEqual(res.package.license, 'Unlicense OR MIT');
    assert.strictEqual(res.dependencies.regex, '1.10');
    assert.deepStrictEqual(res.dependencies.clap, { version: '4.4', features: ['derive'] });
  });

  test('parses pyproject.toml structure', () => {
    const toml = `
      [project]
      name = "fastapi-demo"
      version = "0.1.0"
      description = "A demo FastAPI application"
      dependencies = [
        "fastapi>=0.100.0",
        "uvicorn>=0.22.0",
      ]

      [tool.poetry.dependencies]
      python = "^3.11"
      pydantic = "^2.0"
    `;
    const res = parseToml(toml);
    assert.strictEqual(res.project.name, 'fastapi-demo');
    assert.strictEqual(res.project.version, '0.1.0');
    assert.strictEqual(res.project.description, 'A demo FastAPI application');
    assert.deepStrictEqual(res.project.dependencies, ['fastapi>=0.100.0', 'uvicorn>=0.22.0']);
    assert.strictEqual(res.tool.poetry.dependencies.python, '^3.11');
  });
});
