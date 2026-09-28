# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-28

### Added
- Initial public release of `readme-scan`.
- Evidence-based repository analysis detecting frameworks, libraries, tests, Dockerfiles, and CI/CD pipelines.
- Deep Scan analyzers for Express, FastAPI, Django, Flask, Go, and OpenAPI route endpoints.
- Database analyzer supporting Prisma schema parsing, models, and field counts.
- Non-destructive marker merge mode with `--merge` / `--update`.
- Native style linter enforcing concise, developer-grade documentation with zero emoji clutter.
- Standalone CLI command `readme-scan lint <file> [--fix]`.
- Optional Bring-Your-Own-Key (BYOK) AI mode supporting OpenAI, Anthropic, Gemini, Groq, OpenRouter, and local Ollama.
- Secret redaction pipeline ensuring credentials, personal paths, and emails are never leaked.
- Multi-language output support (`--lang en`, `--lang id`).

### Changed
- Project renamed from `auto-readme` to `readme-scan` to prevent npm package name collisions.
- Marker syntax updated to `<!-- readme-scan:start:<key> -->` and `<!-- readme-scan:end:<key> -->`.

### Compatibility Notes
- Backward compatibility: The merge engine still reads legacy `<!-- auto-readme:* -->` markers but writes updated `<!-- readme-scan:* -->` markers.
- Configuration fallback: Reads legacy `.autoreadmerc.json` if `.readmescanrc.json` is not found.
- Environment variable fallback: Supports legacy `AUTO_README_API_KEY` alongside `README_SCAN_API_KEY`.
