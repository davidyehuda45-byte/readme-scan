# Release Notes & Publishing Guide: v0.1.0

This document contains metadata, release notes, and publishing steps for `readme-scan` version `0.1.0`.

---

## 1. GitHub Repository "About" Section Configuration

Configure these settings at [https://github.com/davidyehuda45-byte/readme-scan](https://github.com/davidyehuda45-byte/readme-scan):

- **Description**:
  ```text
  Generate a README.md by scanning your project. Runs locally, no API key needed.
  ```

- **Website / Homepage**:
  ```text
  https://github.com/davidyehuda45-byte/readme-scan#readme
  ```

- **Topics / Tags**:
  ```text
  readme, readme-generator, developer-tools, static-analysis, cli, markdown, documentation, offline, nodejs
  ```

- **Include in home page**:
  - [x] Releases
  - [x] Packages

---

## 2. Git Tag Creation

Once changes are committed and pushed to `main`:

```bash
git tag -a v0.1.0 -m "Release v0.1.0: Initial release of readme-scan"
git push origin v0.1.0
```

---

## 3. GitHub Release Text (v0.1.0)

**Title**: `v0.1.0 - Evidence-Based Local README Generator`

**Tag**: `v0.1.0`

**Target**: `main`

**Body**:

```markdown
# readme-scan v0.1.0

We are excited to announce the initial release of **readme-scan** (`v0.1.0`), an offline-first, evidence-based CLI tool to generate natural, developer-written `README.md` files for any codebase.

### Highlights

- **Rebranded to `readme-scan`**: Clean, dedicated npm package name matching the binary and repository. Full backward compatibility with legacy `auto-readme` markers and configuration files.
- **Zero Runtime Dependencies**: Built 100% on Node.js built-in modules (`node:fs`, `node:path`, `node:util`, `node:test`, global `fetch`). Zero external packages, zero supply-chain risk.
- **Offline & Evidence-Based**: Scans filesystem trees, ASTs, router declarations, Prisma models, Dockerfiles, and environment variables locally. If there is no code evidence, the section is omitted—no generic fillers.
- **Developer Tone (Style Linter)**: Documentation sounds written by an engineer. Zero emoji clutter, flattened headings, and no marketing buzzwords. Built-in `readme-scan lint` validates and auto-fixes markdown files.
- **Marker-Based Merge Mode**: Run `readme-scan --merge` to update generated blocks (`<!-- readme-scan:start:... -->`) while keeping your custom prose untouched.
- **Optional BYOK AI Enhancement**: Bring Your Own Key (OpenAI, Anthropic, Gemini, Groq, OpenRouter) or run offline with local Ollama (`llama3.2`). Sensitive tokens, passwords, and absolute paths are automatically redacted before payload delivery.
- **Cross-Platform & CI Ready**: Verified on Linux, macOS, and Windows. Use `--check` in continuous integration to catch outdated documentation.

### Quick Start

```bash
npx readme-scan
```

Or install globally:

```bash
npm install -g readme-scan
readme-scan --dry-run
```

See the [README](https://github.com/davidyehuda45-byte/readme-scan#readme) for full usage instructions and options.
```

---

## 4. npm Publishing Steps

Before publishing, ensure `node scripts/prepublish-check.js` passes.

1. **Log in to npm**:
   ```bash
   npm login
   ```
   Follow the web-based authentication prompt.

2. **Publish the package**:
   ```bash
   npm publish --access public
   ```

3. **Verify the published package**:
   ```bash
   npx readme-scan@0.1.0 --version
   ```
