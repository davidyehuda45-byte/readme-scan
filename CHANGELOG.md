# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-28

### Added
- Complete project rebrand to `readme-scan` matching package, binary, and GitHub repository.
- Deep Scan static analysis engine with modular detectors for frameworks, databases, API endpoints, authentication, Docker, CI/CD, and environment variables.
- Zero runtime dependencies: built entirely on Node.js standard libraries.
- Plain developer tone presets and built-in `readme-scan lint` command with auto-fix capabilities.
- Real example fixture in `examples/express-api/` with `npm run examples`.
- Optional Bring Your Own Key (BYOK) AI mode with local Ollama (`llama3.2`) and cloud providers (OpenAI, Anthropic, Gemini, Groq, OpenRouter).
- Automatic secret token and local absolute filesystem path redaction prior to AI payload transmission.
- Multi-OS, multi-Node GitHub Actions CI matrix workflow (`.github/workflows/ci.yml`).
- Automated pre-publish verification check script (`scripts/prepublish-check.js`).
- Complete repository documentation (`SECURITY.md`, `CONTRIBUTING.md`, issue/PR templates).

### Changed
- Target Node.js engine requirement updated to `>=20`.
- Output marker prefix updated to `<!-- readme-scan:start:<key> -->`.
- Primary project configuration renamed to `.readmescanrc.json`.
- Global configuration path updated to `~/.config/readme-scan/config.json`.
- Custom AI provider environment variable updated to `README_SCAN_API_KEY`.

### Compatibility & Migration
- Full 1-version backward compatibility for legacy `<!-- auto-readme:* -->` markers in existing README files.
- Automatic migration and fallback for legacy `.autoreadmerc.json` configuration files with deprecation notices.
- Automatic migration of legacy API keys from `~/.config/auto-readme/config.json` to `~/.config/readme-scan/config.json`.
- Fallback support for `AUTO_README_API_KEY` when `README_SCAN_API_KEY` is not defined.
