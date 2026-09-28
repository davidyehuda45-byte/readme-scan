# Contributing to readme-scan

Thank you for your interest in improving readme-scan.

## Core Invariants

Before contributing, please review the foundational constraints of this project:

1. **Zero Runtime Dependencies**: No third-party packages may be added to `dependencies`. All core capabilities (argument parsing, static analysis, formatting, HTTP requests in AI mode) must use Node.js built-in modules (`node:fs`, `node:path`, `node:util`, `node:test`, global `fetch`).
2. **Evidence-Based Output**: The scanner must never guess or fabricate details. Sections should only be rendered when verified code or configuration signals exist.
3. **Developer Tone**: All generated content and CLI text must adhere to natural, clear technical writing. Avoid marketing slogans, decorative emojis, and promotional filler words.
4. **Offline First**: All scanning, analysis, and formatting must operate completely offline. Network connectivity is permitted only when the user explicitly opts into AI enhancement via `--ai`.

## Development Setup

Requirements:
- Node.js >= 20.0.0
- Git

Clone and set up:

```bash
git clone https://github.com/davidyehuda45-byte/readme-scan.git
cd readme-scan
```

No installation step is needed because there are zero dependencies.

## Running Tests

Execute the automated test suite using the built-in Node.js test runner:

```bash
npm test
```

To run a specific test suite:

```bash
node --test test/security.test.js
```

## Verifying Style and Format

Ensure documentation and markdown templates comply with the style guidelines:

```bash
npm run lint:readme
```

Ensure the generated example documentation is updated:

```bash
npm run examples
```

## Pull Request Guidelines

1. Fork the repository and create your branch from `main`.
2. Ensure all existing tests pass and add new tests covering your changes.
3. Verify that `package.json` contains no runtime `dependencies`.
4. Keep commits concise and descriptive.
5. Open a Pull Request detailing your changes, evidence, and test coverage.
