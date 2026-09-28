# auto-readme

![JavaScript](https://img.shields.io/badge/language-JavaScript-F7DF1E?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-success?style=flat-square)

Evidence-based, 100% offline CLI tool to generate professional, natural developer-written README.md files.

## Features

<.-- auto-readme:start:features -->
<.-- TODO: add project features list -->
<.-- auto-readme:end:features -->

## Tech Stack

<.-- auto-readme:start:stack -->
| Category | Technologies |
| --- | --- |
| Primary Language | JavaScript |
<.-- auto-readme:end:stack -->

## Architecture & Project Structure

<.-- auto-readme:start:architecture -->
```text
Auto Readme/
├── bin/ # CLI binaries and executables
│   └── auto-readme.js
├── src/ # Source code
│   ├── ai/
│   ├── data/
│   ├── detectors/
│   ├── generator/
│   ├── locales/
│   ├── scanner/
│   ├── style/
│   ├── utils/ # Helper functions and utilities
│   └── cli.js
├── test/ # Automated test suite
│   ├── ai/
│   ├── style/
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
<.-- auto-readme:end:architecture -->

## Prerequisites & Installation

<.-- auto-readme:start:prerequisites -->
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
<.-- auto-readme:end:prerequisites -->

## Usage & Execution

<.-- auto-readme:start:usage -->
To run the application:
```bash
npm start
```

### Available Scripts

| Command | Description |
| --- | --- |
| `npm run start` | `node ./bin/auto-readme.js` |
| `npm run test` | `node --test test/**/*.test.js` |
<.-- auto-readme:end:usage -->

## Configuration & Environment Variables

<.-- auto-readme:start:env -->
| Variable | Status | In Example | Description |
| --- | --- | --- | --- |
| `APPDATA` | Optional | No | Referenced in src/ai/auth.js |
<.-- auto-readme:end:env -->

## License

<.-- auto-readme:start:license -->
Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
<.-- auto-readme:end:license -->

## Contributing

<.-- auto-readme:start:contributing -->
Contributions and pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
<.-- auto-readme:end:contributing -->
