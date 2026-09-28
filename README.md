# auto-readme

![Version](https://img.shields.io/badge/version-3.0.0-blue?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-success?style=flat-square) ![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square) ![Dependencies](https://img.shields.io/badge/dependencies-0-success?style=flat-square)

Offline-first, evidence-based CLI tool to generate professional, natural developer-written `README.md` files for any codebase.

## Overview

Most automated README generators produce either shallow generic templates filled with marketing buzzwords and hallucinated claims, or require proprietary cloud dependencies.

`auto-readme` uses local static analysis to inspect your repository. It analyzes package manifests, directory layouts, database schemas, router files, Docker definitions, CI workflows, and environment variables. Sections are only generated when verifiable code evidence exists.

Zero runtime dependencies. 100% offline by default.

## Key Capabilities

- Evidence-Based Generation: Eliminates generic fillers. If an API route, database model, or test suite is not detected in your code, the section is omitted.
- Natural Developer Tone: Output reads like code written by an experienced engineer. Zero emoji clutter, flattened heading hierarchies, and no marketing slogans.
- Deep Scan Engine: 
  - Classifies project architectures (Web Frontend, Backend/API, Fullstack, CLI, Mobile, DevOps, Monorepo).
  - Extracts backend routes (Express, FastAPI, Flask, Django, Go Gin/Fiber, and OpenAPI specs).
  - Inspects database engines, ORMs, and extracts Prisma models with field counts.
  - Generates static security posture checklists and alerts for unignored secret patterns.
  - Parses Dockerfiles, Compose services, and GitHub Actions workflows.
- Safe Marker-Based Merge Mode: Updates documentation blocks between `<!-- auto-readme:start:... -->` markers without overwriting manual notes.
- Optional BYOK AI Enhancement: Bring your own key (OpenAI, Anthropic, Gemini, Groq, OpenRouter) or run locally using Ollama. AI only polishes phrasing from verified scanner facts. Secrets and system paths are redacted before payload transmission.
- Multi-Ecosystem: Native detection for Node.js/TypeScript, Python, Rust, Go, PHP, Java, Ruby, and generic software projects.
- CI / CD Quality Gate: Run with `--check` to fail builds if documentation is out of sync with code changes.
- Built-in Style Linter: Standalone `auto-readme lint` command to enforce clean technical writing standards on any Markdown file.

## Installation

Install globally via npm:

```bash
npm install -g auto-readme
```

Or run directly without installation:

```bash
npx auto-readme
```

## Quick Start

Generate documentation for your current directory:

```bash
auto-readme
```

Preview the output in the terminal without writing to disk:

```bash
auto-readme --dry-run
```

Update an existing README while preserving custom sections:

```bash
auto-readme --merge
```

Generate in Indonesian:

```bash
auto-readme --lang id
```

Verify documentation status in continuous integration:

```bash
auto-readme --check
```

Output repository facts as structured JSON:

```bash
auto-readme --json
```

## CLI Usage & Options

### Core Flags

| Flag | Description | Default |
| --- | --- | --- |
| `-o, --output <path>` | Path to the target output file | `./README.md` |
| `-f, --force` | Overwrite existing README without confirmation prompt | `false` |
| `-l, --lang <en\|id>` | Language for the output document | `en` |
| `--style <preset>` | Formatting preset (`plain`, `minimal`, `detailed`, `classic`, `expressive`) | `plain` |
| `-m, --minimal` | Shortcut for `--style minimal` | `false` |
| `--dry-run` | Print generated markdown to stdout without writing files | `false` |
| `--merge, --update` | Update content inside markers while preserving manual text outside | `false` |
| `--check` | CI mode: exit code 0 if README is up to date, 1 if outdated | `false` |
| `--sections <list>` | Limit generation to specific comma-separated sections | all |
| `--exclude <list>` | Exclude specific comma-separated sections | none |
| `--json` | Print extracted repository facts as JSON and exit | `false` |
| `--badges <style>` | Badge style (`flat`, `flat-square`, `for-the-badge`, `none`) | `flat-square` |
| `--no-lint` | Disable the style linter post-processor | `false` |
| `-v, --version` | Display version number | - |
| `-h, --help` | Display CLI help menu | - |

### Style Presets

Select formatting rules via `--style <preset>`:

- `plain` (default): Minimal headings, concise prose, zero emojis, max 8 sections, no decorative list labels.
- `minimal`: Bare essentials: title, description, setup, usage, and license.
- `detailed`: Full technical breakdown of stack, routes, models, environment variables, and infrastructure.
- `classic`: Standard documentation layout with Table of Contents and shields.
- `expressive`: Opt-in mode allowing emojis and colorful badges.

### Subcommands

### 1. Style Linter (`lint`)

Inspect or auto-fix any Markdown document against developer tone guidelines (removes emojis, buzzwords, deep headings, and decorative comments):

```bash
auto-readme lint README.md
auto-readme lint README.md --fix
```

### 2. Key Management (`auth`)

Securely configure API keys for optional AI enhancement. Keys are stored with `0600` permissions in your user config and masked on inspection:

```bash
# View configured providers
auto-readme auth status

# Store key
auto-readme auth set openai

# Remove key
auto-readme auth remove openai
```

### 3. Model Registry (`models`)

List default and recommended models for supported providers:

```bash
auto-readme models
```

### Optional AI Mode (BYOK & Local Models)

AI mode is strictly opt-in. Without the `--ai` flag, zero network calls are made.

```bash
# Use local Ollama (offline & free, default: http://localhost:11434)
auto-readme --ai --provider ollama --model llama3.2

# Use cloud provider with environment variable or stored key
auto-readme --ai --provider openai --model gpt-4o-mini
auto-readme --ai --provider anthropic --model claude-3-5-haiku-latest
auto-readme --ai --provider gemini --model gemini-2.5-flash

# Preview sanitized payload before sending to an LLM
auto-readme --ai-preview
```

## Architecture

```text
auto-readme/
├── bin/
│   └── auto-readme.js       # CLI entrypoint
├── src/
│   ├── ai/                  # Optional BYOK AI engine & secret redaction
│   ├── data/                # Data-driven mappings (dependencies, models, rules)
│   ├── detectors/           # Deep Scan modules (endpoints, database, auth, security)
│   ├── generator/           # Adaptive renderer, merge engine, templates
│   ├── locales/             # Bilingual dictionaries (en, id)
│   ├── scanner/             # Traversal, language breakdown, AST scanners
│   ├── style/               # Style linter, presets, and rule engine
│   └── cli.js               # Command-line argument parsing and orchestration
└── test/                    # Automated test suites
```

## Development & Testing

Run the automated test suite:

```bash
npm test
```

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.

## Author

Maintained by **David Yehuda Surbakti**.
