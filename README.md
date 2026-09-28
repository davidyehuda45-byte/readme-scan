# readme-scan

[![npm version](https://img.shields.io/npm/v/readme-scan.svg?style=flat-square)](https://www.npmjs.com/package/readme-scan)
[![Build Status](https://img.shields.io/github/actions/workflow/status/davidyehuda45-byte/readme-scan/ci.yml?branch=main&style=flat-square)](https://github.com/davidyehuda45-byte/readme-scan/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

Generate a README.md by scanning your project. Runs locally, no API key needed.

## Overview

readme-scan analyzes your repository to produce structured, evidence-based documentation. Instead of generating generic placeholders or hallucinated claims, every generated section maps directly to detected code artifacts, dependencies, database configurations, and route files.

- Zero runtime dependencies: Built entirely with Node.js standard libraries.
- Offline by default: Scans your filesystem locally without network requests.
- Evidence-based sections: Sections appear only when verifiable files or dependencies exist.
- Developer tone: Direct, clear documentation without promotional buzzwords or decorative emoji clutter.
- Marker-based merge: Updates documentation blocks while preserving your manual edits outside markers.

## Example Output

Below is an excerpt from documentation generated for an Express and PostgreSQL service. See [examples/express-api/README.md](examples/express-api/README.md) for the full output.

```markdown
## Features

<!-- readme-scan:start:features -->
- RESTful API: API with 3 endpoints
- Database Persistence: Powered by PostgreSQL
<!-- readme-scan:end:features -->

## Tech Stack

<!-- readme-scan:start:stack -->
| Category | Technologies |
| --- | --- |
| Primary Language | JavaScript |
| Backend / API | `Express` |
| Database / ORM | `PostgreSQL Client (pg)` |
<!-- readme-scan:end:stack -->

## API Documentation

<!-- readme-scan:start:api -->
| Method | Endpoint Path | Source File |
| --- | --- | --- |
| `GET` | `/api/health` | `src/index.js` |
| `GET` | `/api/tasks` | `src/index.js` |
| `POST` | `/api/tasks` | `src/index.js` |
<!-- readme-scan:end:api -->
```

## Quick Start

Run directly via npx:

```bash
npx readme-scan
```

Or install globally:

```bash
npm install -g readme-scan
readme-scan
```

Common commands:

```bash
# Preview generated markdown in terminal without saving
readme-scan --dry-run

# Scan a specific directory
readme-scan ./projects/my-api

# Update existing documentation while preserving manual notes
readme-scan --merge

# Generate documentation in Indonesian
readme-scan --lang id

# CI mode: exit non-zero if README.md is outdated
readme-scan --check

# Export repository facts as JSON
readme-scan --json
```

## Command Line Options

| Option | Description | Default |
| --- | --- | --- |
| `-o, --output <path>` | Path to target output file | `targetDir/README.md` |
| `-f, --force` | Overwrite existing README without confirmation prompt | `false` |
| `-l, --lang <en\|id>` | Language for the output document | `en` |
| `--style <preset>` | Formatting preset (`plain`, `minimal`, `detailed`, `classic`, `expressive`) | `plain` |
| `-m, --minimal` | Shortcut for `--style minimal` | `false` |
| `--dry-run` | Print generated markdown to stdout without writing files | `false` |
| `--merge, --update` | Update content inside markers while preserving manual text outside | `false` |
| `--check` | CI mode: exit 0 if README is up to date, 1 if outdated | `false` |
| `--sections <list>` | Include only comma-separated sections | all |
| `--exclude <list>` | Exclude comma-separated sections | none |
| `--json` | Print extracted repository facts as JSON and exit | `false` |
| `--depth <n>` | Folder tree traversal depth | `2` |
| `--init-config` | Generate a sample `.readmescanrc.json` configuration file | `false` |
| `-v, --version` | Display version number | - |
| `-h, --help` | Display CLI help menu | - |

## Style Presets & Linter

readme-scan includes formatting presets to adjust documentation density:

- `plain` (default): Minimal headings, concise prose, zero emojis, max 8 sections.
- `minimal`: Core details only: title, description, setup, usage, and license.
- `detailed`: Full technical breakdown including architecture trees, endpoints, and environment variables.
- `classic`: Traditional layout with Table of Contents and shield badges.
- `expressive`: Opt-in mode that allows emojis and badges.

The built-in style linter checks or fixes markdown files against technical writing standards:

```bash
# Inspect markdown style compliance
readme-scan lint README.md

# Automatically fix violations (strip buzzwords, flatten deep headings)
readme-scan lint README.md --fix
```

## Optional AI Enhancement

AI enhancement is strictly opt-in. Without the `--ai` flag, no network requests are made.

When enabled, the scanner extracts local facts first, and the AI only polishes phrasing from verified facts. Sensitive credentials, tokens, and local filesystem paths are automatically redacted before transmission.

```bash
# Use local Ollama instance (offline and free)
readme-scan --ai --provider ollama --model llama3.2

# Use cloud provider with environment variable or stored key
readme-scan --ai --provider openai --model gpt-4o-mini
readme-scan --ai --provider anthropic --model claude-3-5-haiku-latest
readme-scan --ai --provider gemini --model gemini-2.5-flash

# Preview sanitized payload without sending network requests
readme-scan --ai-preview
```

Manage stored API keys:

```bash
readme-scan auth status
readme-scan auth set openai
readme-scan auth remove openai
```

## Contributing & Testing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

Run tests locally:

```bash
npm test
```

Check style compliance:

```bash
npm run lint:readme
```

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details. Maintained by David Yehuda Surbakti.
