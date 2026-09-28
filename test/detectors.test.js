import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { scanProject } from '../src/scanner/index.js';
import { generateReadme } from '../src/generator/index.js';

const FIXTURES_DIR = path.resolve('./test/fixtures');

describe('Ecosystem Detectors and Scanners', () => {
  before(() => {
    fs.mkdirSync(path.join(FIXTURES_DIR, 'node-project', 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(FIXTURES_DIR, 'node-project', 'package.json'),
      JSON.stringify({
        name: 'sample-express-app',
        version: '2.1.0',
        description: 'Sample Express REST API',
        scripts: { dev: 'nodemon src/index.js', test: 'jest' },
        dependencies: { express: '^4.18.2' },
        devDependencies: { nodemon: '^3.0.1', jest: '^29.6.2' },
      })
    );
    fs.writeFileSync(path.join(FIXTURES_DIR, 'node-project', 'src', 'index.js'), 'console.log("express");');

    // Python fixture
    fs.mkdirSync(path.join(FIXTURES_DIR, 'python-project'), { recursive: true });
    fs.writeFileSync(
      path.join(FIXTURES_DIR, 'python-project', 'pyproject.toml'),
      `[project]
name = "python-service"
version = "0.4.0"
description = "FastAPI backend service"
dependencies = ["fastapi", "uvicorn"]
`
    );
    fs.writeFileSync(
      path.join(FIXTURES_DIR, 'python-project', '.env.example'),
      `# Database URL
DATABASE_URL=postgresql://user:pass@localhost:5432/db
# Server port
PORT=8000
`
    );
    fs.writeFileSync(path.join(FIXTURES_DIR, 'python-project', 'main.py'), 'print("python")');

    // Rust fixture
    fs.mkdirSync(path.join(FIXTURES_DIR, 'rust-project', 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(FIXTURES_DIR, 'rust-project', 'Cargo.toml'),
      `[package]
name = "rust-cli"
version = "0.5.2"
description = "A command line tool written in Rust"
edition = "2021"

[dependencies]
clap = "4.0"
`
    );
    fs.writeFileSync(path.join(FIXTURES_DIR, 'rust-project', 'src', 'main.rs'), 'fn main() {}');
    fs.writeFileSync(path.join(FIXTURES_DIR, 'rust-project', 'Dockerfile'), 'FROM rust:latest');

    // Go fixture
    fs.mkdirSync(path.join(FIXTURES_DIR, 'go-project'), { recursive: true });
    fs.writeFileSync(
      path.join(FIXTURES_DIR, 'go-project', 'go.mod'),
      `module github.com/user/go-microservice

go 1.22

require (
	github.com/gin-gonic/gin v1.9.1
	github.com/google/uuid v1.6.0 // indirect
)
`
    );
    fs.writeFileSync(path.join(FIXTURES_DIR, 'go-project', 'main.go'), 'package main\nfunc main() {}');

    // Generic project fixture
    fs.mkdirSync(path.join(FIXTURES_DIR, 'generic-project', 'src'), { recursive: true });
    fs.writeFileSync(path.join(FIXTURES_DIR, 'generic-project', 'src', 'main.c'), '#include <stdio.h>\nint main() { return 0; }');
    fs.writeFileSync(path.join(FIXTURES_DIR, 'generic-project', 'Makefile'), 'all:\n\tgcc src/main.c -o app');
  });

  after(() => {
    if (fs.existsSync(FIXTURES_DIR)) {
      fs.rmSync(FIXTURES_DIR, { recursive: true, force: true });
    }
  });

  test('detects Node.js project correctly', async () => {
    const info = await scanProject(path.join(FIXTURES_DIR, 'node-project'));
    assert.strictEqual(info.primaryEcosystem, 'node');
    assert.strictEqual(info.projectName, 'sample-express-app');
    assert.strictEqual(info.version, '2.1.0');
    assert.strictEqual(info.description, 'Sample Express REST API');
    assert.strictEqual(info.installCommand, 'npm install');
    assert.strictEqual(info.testCommand, 'npm test');
    assert.strictEqual(info.ecosystemData.node.categorized.frameworks[0].name, 'express');

    const { markdown } = generateReadme(info);
    assert(markdown.includes('# sample-express-app'));
    assert(markdown.includes('Sample Express REST API'));
    assert(markdown.includes('npm install'));
    assert(markdown.includes('npm test'));
  });

  test('detects Python project with .env.example correctly', async () => {
    const info = await scanProject(path.join(FIXTURES_DIR, 'python-project'));
    assert.strictEqual(info.primaryEcosystem, 'python');
    assert.strictEqual(info.projectName, 'python-service');
    assert.strictEqual(info.version, '0.4.0');
    assert.strictEqual(info.description, 'FastAPI backend service');
    assert(info.envExample !== null);
    assert.strictEqual(info.envExample.variables.length, 2);
    assert.strictEqual(info.envExample.variables[0].name, 'DATABASE_URL');

    const { markdown } = generateReadme(info);
    assert(markdown.includes('# python-service'));
    assert(markdown.includes('FastAPI backend service'));
    assert(markdown.includes('DATABASE_URL'));
    assert(markdown.includes('Environment Variables'));
  });

  test('detects Rust project with Dockerfile correctly', async () => {
    const info = await scanProject(path.join(FIXTURES_DIR, 'rust-project'));
    assert.strictEqual(info.primaryEcosystem, 'rust');
    assert.strictEqual(info.projectName, 'rust-cli');
    assert.strictEqual(info.version, '0.5.2');
    assert.strictEqual(info.installCommand, 'cargo build');
    assert.strictEqual(info.runCommand, 'cargo run');
    assert.strictEqual(info.docker.supported, true);

    const { markdown } = generateReadme(info);
    assert(markdown.includes('# rust-cli'));
    assert(markdown.includes('cargo build'));
    assert(markdown.includes('Docker Usage'));
    assert(markdown.includes('docker-supported'));
  });

  test('detects Go project with go.mod correctly', async () => {
    const info = await scanProject(path.join(FIXTURES_DIR, 'go-project'));
    assert.strictEqual(info.primaryEcosystem, 'go');
    assert.strictEqual(info.projectName, 'go-microservice');
    assert.strictEqual(info.installCommand, 'go mod download');
    assert.strictEqual(info.runCommand, 'go run .');
    assert.strictEqual(info.testCommand, 'go test ./...');

    const { markdown } = generateReadme(info);
    assert(markdown.includes('# go-microservice'));
    assert(markdown.includes('go mod download'));
    assert(markdown.includes('go run .'));
  });

  test('falls back gracefully on generic project without config files', async () => {
    const info = await scanProject(path.join(FIXTURES_DIR, 'generic-project'));
    assert.strictEqual(info.primaryEcosystem, 'generic');
    assert.strictEqual(info.dominantLanguage.name, 'C');

    const { markdown } = generateReadme(info);
    assert(markdown.includes('# generic-project'));
    assert(markdown.includes('C'));
    assert(markdown.includes('Structure') || markdown.includes('Architecture'));
  });
});
