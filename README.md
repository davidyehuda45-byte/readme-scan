# auto-readme

![JavaScript](https://img.shields.io/badge/language-JavaScript-F7DF1E?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-success?style=flat-square)

Blazing-fast, zero-config, 100% offline CLI tool to generate professional README.md files for any project.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture & Project Structure](#architecture--project-structure)
- [Prerequisites & Installation](#prerequisites--installation)
- [Configuration & Environment Variables](#configuration--environment-variables)
- [Usage & Execution](#usage--execution)
- [Security Posture](#security-posture)
- [Contributing](#contributing)
- [License](#license)
- [Authors & Acknowledgments](#authors--acknowledgments)

## Features

<!-- auto-readme:start:features -->
- **100% Offline & Evidence-Based**: Scans codebases using static analysis without LLMs, external APIs, or generic fillers.
- **Multi-Ecosystem Detection**: Automatically classifies project types (Web, CLI, Backend, Fullstack, Mobile, DevOps, Monorepo).
- **Deep Scan Engine**: Discovers API endpoints, database models, auth flows, Docker configurations, and CI/CD pipelines.
- **Marker-Based Merge Mode**: Preserves custom sections and notes outside markers with `--merge`.
- **CI/CD Quality Gate**: Enforces up-to-date documentation with `auto-readme --check`.
<!-- auto-readme:end:features -->

## Tech Stack

<!-- auto-readme:start:stack -->
| Category | Technologies |
| --- | --- |
| **Primary Language** | JavaScript |
<!-- auto-readme:end:stack -->

## Architecture & Project Structure

<!-- auto-readme:start:architecture -->
```text
Auto Readme/
├── bin/ # CLI binaries and executables
│   └── auto-readme.js
├── src/ # Source code
│   ├── data/
│   ├── detectors/
│   ├── generator/
│   ├── locales/
│   ├── scanner/
│   ├── utils/ # Helper functions and utilities
│   └── cli.js
├── test/ # Automated test suite
│   ├── cli.test.js
│   ├── deep-scan.test.js
│   ├── detectors.test.js
│   ├── generator.test.js
│   ├── scanner.test.js
│   └── toml-parser.test.js
├── .gitignore
├── LICENSE
└── package.json
```
<!-- auto-readme:end:architecture -->

## Prerequisites & Installation

<!-- auto-readme:start:prerequisites -->
### Prerequisites

- Package Manager: `npm`

### Setup Instructions

1. Clone the repository:

```bash
git clone <repository-url>
cd auto-readme
```

2. Install dependencies:

```bash
npm install
```
<!-- auto-readme:end:prerequisites -->

## Configuration & Environment Variables

<!-- auto-readme:start:env -->
| Variable | Status | In Example | Description |
| --- | --- | --- | --- |
| `NO_COLOR` | Optional | ⚠️ No | Referenced in src/utils/colors.js |
| `TERM` | Optional | ⚠️ No | Referenced in src/utils/colors.js |
| `FORCE_COLOR` | Optional | ⚠️ No | Referenced in src/utils/colors.js |
<!-- auto-readme:end:env -->

## Usage & Execution

<!-- auto-readme:start:usage -->
To run or start the application:
```bash
npm start
```

### Available Scripts

| Command | Description |
| --- | --- |
| `npm run start` | `node ./bin/auto-readme.js` |
| `npm run test` | `node --test test/**/*.test.js` |
<!-- auto-readme:end:usage -->

## Security Posture

<!-- auto-readme:start:security -->
> ℹ️ _Security assessment is based on static dependency and configuration analysis, not a dynamic penetration test._

| Practice | Status |
| --- | --- |

### Security Recommendations

- **Security Headers**: No security headers package detected. Consider adding Helmet or equivalent middleware.
- **Rate Limiting**: No rate limiting detected. Consider adding rate limiting if this is a public API.
- **CORS Configuration**: Explicit CORS middleware not detected.
<!-- auto-readme:end:security -->

## Contributing

<!-- auto-readme:start:contributing -->
Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a new feature branch (`git checkout -b feature/my-feature`).
3. Commit your changes (`git commit -m "Add my feature"`).
4. Push to the branch (`git push origin feature/my-feature`).
5. Open a Pull Request.
<!-- auto-readme:end:contributing -->

## License

<!-- auto-readme:start:license -->
Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
<!-- auto-readme:end:license -->

## Authors & Acknowledgments

<!-- auto-readme:start:authors -->
Maintained with care by **David Yehuda Surbakti**.
<!-- auto-readme:end:authors -->
