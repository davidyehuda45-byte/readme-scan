import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import readline from 'node:readline/promises';
import { scanProject } from './scanner/index.js';
import { generateReadme } from './generator/index.js';
import { colors } from './utils/colors.js';
import { lintMarkdown } from './style/lint.js';
import { buildFactsJson } from './ai/facts.js';
import { runAiEnhancement } from './ai/run.js';
import { getAuthStatus, setApiKey, removeApiKey } from './ai/auth.js';
import { loadModelsConfig } from './ai/provider.js';

const VERSION = '3.0.0';

export function printHelp() {
  console.log(`
${colors.bold(colors.cyan('auto-readme'))} ${colors.gray(`v${VERSION}`)}
${colors.dim('Evidence-based, offline-first CLI tool to generate professional, natural README.md files.')}

${colors.bold('USAGE:')}
  ${colors.green('auto-readme')} [path/to/project] [options]
  ${colors.green('auto-readme')} <command> [arguments]

${colors.bold('COMMANDS:')}
  ${colors.yellow('lint <file>')}                  Check or fix README style rules
  ${colors.yellow('auth status')}                  View configured AI providers and keys
  ${colors.yellow('auth set <provider>')}          Save API key for a provider
  ${colors.yellow('auth remove <provider>')}       Remove stored API key
  ${colors.yellow('models')}                       List supported models and default providers

${colors.bold('CORE OPTIONS:')}
  ${colors.yellow('-o, --output <path>')}        Output file path ${colors.gray('(default: ./README.md)')}
  ${colors.yellow('-f, --force')}                Overwrite existing README without confirmation
  ${colors.yellow('-l, --lang <id|en>')}         Language for the generated README ${colors.gray('(default: en)')}
  ${colors.yellow('-m, --minimal')}              Alias for --style minimal
  ${colors.yellow('--style <preset>')}           Style preset: plain, minimal, detailed, classic, expressive ${colors.gray('(default: plain)')}
  ${colors.yellow('--dry-run')}                  Print generated README to terminal without saving
  ${colors.yellow('-h, --help')}                 Show this help message
  ${colors.yellow('-v, --version')}              Show version number

${colors.bold('DEEP SCAN & EVIDENCE OPTIONS:')}
  ${colors.yellow('--sections <list>')}          Include only specified sections ${colors.gray('(e.g. stack,api,security)')}
  ${colors.yellow('--exclude <list>')}           Exclude specific sections
  ${colors.yellow('--merge, --update')}          Preserve manual edits outside auto-readme markers
  ${colors.yellow('--check')}                    CI mode: exit non-zero if README.md is outdated
  ${colors.yellow('--verbose')}                  Display evidence and signal origins in terminal
  ${colors.yellow('--json')}                     Output raw facts data as clean JSON
  ${colors.yellow('--depth <n>')}                Folder tree traversal depth ${colors.gray('(default: 2)')}
  ${colors.yellow('--workspace <name>')}         Generate README for a specific monorepo workspace
  ${colors.yellow('--badges <style>')}           Badge style: flat, flat-square, for-the-badge, none
  ${colors.yellow('--no-lint')}                  Disable style linter post-processor
  ${colors.yellow('--init-config')}              Generate a sample .autoreadmerc.json config file
  ${colors.yellow('-e, --ecosystem <name>')}     Override primary ecosystem

${colors.bold('AI ENHANCEMENT (BYOK - OPT-IN):')}
  ${colors.yellow('--ai')}                       Enable AI enhancement mode (requires key or local Ollama)
  ${colors.yellow('--provider <name>')}          Provider: openai, anthropic, gemini, openrouter, groq, ollama, custom
  ${colors.yellow('--model <name>')}             Override model name
  ${colors.yellow('--base-url <url>')}           Custom endpoint URL (e.g. for LM Studio / vLLM)
  ${colors.yellow('--api-key <key>')}            Direct API key
  ${colors.yellow('--ai-preview')}               Display full AI payload and exit without calling API
  ${colors.yellow('-y, --yes')}                  Skip cloud confirmation prompts
  ${colors.yellow('--load-env')}                 Allow reading key from project .env if gitignored
`);
}

export async function runCli(argv = process.argv.slice(2)) {
  // Check for subcommands first
  const firstArg = argv[0];

  if (firstArg === 'lint') {
    return handleLintCommand(argv.slice(1));
  }
  if (firstArg === 'auth') {
    return handleAuthCommand(argv.slice(1));
  }
  if (firstArg === 'models') {
    return handleModelsCommand();
  }

  const optionsConfig = {
    output: { type: 'string', short: 'o', default: './README.md' },
    force: { type: 'boolean', short: 'f', default: false },
    lang: { type: 'string', short: 'l', default: 'en' },
    minimal: { type: 'boolean', short: 'm', default: false },
    style: { type: 'string', default: 'plain' },
    ecosystem: { type: 'string', short: 'e' },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
    version: { type: 'boolean', short: 'v', default: false },
    sections: { type: 'string' },
    exclude: { type: 'string' },
    merge: { type: 'boolean', default: false },
    update: { type: 'boolean', default: false },
    check: { type: 'boolean', default: false },
    verbose: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
    depth: { type: 'string', default: '2' },
    workspace: { type: 'string' },
    badges: { type: 'string' },
    'no-lint': { type: 'boolean', default: false },
    'init-config': { type: 'boolean', default: false },
    // AI flags
    ai: { type: 'boolean', default: false },
    provider: { type: 'string' },
    model: { type: 'string' },
    'base-url': { type: 'string' },
    'api-key': { type: 'string' },
    'ai-preview': { type: 'boolean', default: false },
    yes: { type: 'boolean', short: 'y', default: false },
    'load-env': { type: 'boolean', default: false },
    'max-input-tokens': { type: 'string' },
    'max-output-tokens': { type: 'string' },
  };

  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: optionsConfig,
      allowPositionals: true,
    });
  } catch (err) {
    console.error(`${colors.red('Error:')} ${err.message}`);
    console.log(`Run ${colors.cyan('auto-readme --help')} for available options.`);
    return 1;
  }

  const { values, positionals } = parsed;

  if (values.help) {
    printHelp();
    return 0;
  }

  if (values.version) {
    console.log(`auto-readme v${VERSION}`);
    return 0;
  }

  let targetDir = positionals[0] ? path.resolve(positionals[0]) : process.cwd();

  // Handle monorepo workspace targeting
  if (values.workspace) {
    const wsTarget = path.resolve(targetDir, 'packages', values.workspace);
    const altWs = path.resolve(targetDir, 'apps', values.workspace);
    if (fs.existsSync(wsTarget)) {
      targetDir = wsTarget;
    } else if (fs.existsSync(altWs)) {
      targetDir = altWs;
    } else {
      console.error(`${colors.red('Error:')} Workspace "${values.workspace}" not found.`);
      return 1;
    }
  }

  if (values['init-config']) {
    const configPath = path.join(targetDir, '.autoreadmerc.json');
    const sampleConfig = {
      lang: 'en',
      style: 'plain',
      badges: 'flat-square',
      depth: 2,
      exclude: [],
      sections: [],
    };
    fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2), 'utf8');
    console.log(`${colors.green('✔')} Created ${colors.cyan('.autoreadmerc.json')}`);
    return 0;
  }

  if (!fs.existsSync(targetDir)) {
    console.error(`${colors.red('Error:')} Target directory does not exist: ${targetDir}`);
    return 1;
  }

  const lang = (values.lang || 'en').toLowerCase();
  if (lang !== 'en' && lang !== 'id') {
    console.error(`${colors.red('Error:')} Unsupported language "${values.lang}". Supported languages: en, id`);
    return 1;
  }

  let outputPath = values.output;
  if (!path.isAbsolute(outputPath)) {
    outputPath = path.resolve(targetDir, outputPath);
  }

  const depth = parseInt(values.depth, 10) || 2;
  const isMerge = Boolean(values.merge || values.update);
  const stylePreset = values.minimal ? 'minimal' : (values.style || 'plain');

  if (!values.json && !values['ai-preview']) {
    console.log(`${colors.cyan('🔍 Scanning project with Deep Scan v2...')} ${colors.gray(targetDir)}`);
  }

  const startTime = Date.now();
  let projectInfo = await scanProject(targetDir, {
    ecosystem: values.ecosystem,
    depth,
    verbose: values.verbose,
  });
  const scanDuration = Date.now() - startTime;

  // JSON output mode per PRD Section 5
  if (values.json) {
    const factsJson = buildFactsJson(projectInfo);
    console.log(JSON.stringify(factsJson, null, 2));
    return 0;
  }

  // AI Preview mode
  if (values['ai-preview']) {
    const aiRes = await runAiEnhancement(projectInfo, {
      lang,
      style: stylePreset,
      aiPreview: true,
    });
    console.log(JSON.stringify(aiRes.preview, null, 2));
    return 0;
  }

  // AI enhancement mode if opted-in
  if (values.ai) {
    if (!values.json) {
      console.log(`${colors.cyan('🤖 Running AI enhancement...')} (BYOK / local mode)`);
    }

    const aiRes = await runAiEnhancement(projectInfo, {
      lang,
      style: stylePreset,
      provider: values.provider,
      model: values.model,
      baseUrl: values['base-url'],
      apiKey: values['api-key'],
      yes: values.yes,
      loadEnv: values['load-env'],
      maxOutputTokens: values['max-output-tokens'],
    });

    if (aiRes.success) {
      projectInfo = aiRes.scanData;
      if (aiRes.usage && !values.json) {
        console.log(colors.green(`✔ AI enhancement complete using ${aiRes.provider} (${aiRes.model}) [${aiRes.usage.totalTokens} tokens]`));
      }
    } else {
      console.warn(colors.yellow(`Notice: ${aiRes.error}`));
      console.warn(colors.gray('Proceeding safely with static generation.'));
    }
  }

  // Read existing content if present for merge mode
  let existingContent = null;
  if (fs.existsSync(outputPath)) {
    existingContent = fs.readFileSync(outputPath, 'utf8');
  }

  const { markdown, summary, lint } = generateReadme(projectInfo, {
    lang,
    minimal: values.minimal,
    style: stylePreset,
    badges: values.badges,
    sections: values.sections,
    exclude: values.exclude,
    merge: isMerge,
    noLint: values['no-lint'],
    existingContent,
  });

  // Report style violations in --verbose mode
  if (values.verbose && lint?.violations?.length > 0) {
    console.log(`\n${colors.yellow('Style Linter Observations:')}`);
    for (const v of lint.violations.slice(0, 5)) {
      console.log(`  - [${v.rule}] ${v.message}`);
    }
  }

  // CI check mode
  if (values.check) {
    if (!fs.existsSync(outputPath)) {
      console.error(`${colors.red('✖ Check failed:')} ${outputPath} does not exist.`);
      return 1;
    }
    const currentOnDisk = fs.readFileSync(outputPath, 'utf8').replace(/\r\n/g, '\n').trim();
    const generatedMarkdown = markdown.replace(/\r\n/g, '\n').trim();
    if (currentOnDisk !== generatedMarkdown) {
      console.error(`${colors.red('✖ Check failed:')} README.md is outdated. Run auto-readme to update.`);
      return 1;
    }
    console.log(`${colors.green('✔ Check passed:')} README.md is up to date.`);
    return 0;
  }

  // Dry run mode
  if (values['dry-run']) {
    console.log(`\n${colors.bold(colors.blue('--- DRY RUN: GENERATED README.MD ---'))}\n`);
    console.log(markdown);
    console.log(`\n${colors.bold(colors.blue('--- END DRY RUN ---'))}\n`);
    printSummaryReport(projectInfo, summary, outputPath, scanDuration, true, values.verbose);
    return 0;
  }

  // Handle overwrite protection if not merge and file exists
  if (fs.existsSync(outputPath) && !values.force && !isMerge) {
    const isInteractive = Boolean(process.stdin.isTTY && process.stdout.isTTY);

    if (isInteractive) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      try {
        const answer = await rl.question(
          `${colors.yellow(`File ${outputPath} already exists. Overwrite? (y/N): `)}`
        );
        if (answer.trim().toLowerCase() !== 'y') {
          console.log(colors.gray('Operation cancelled by user.'));
          return 0;
        }
      } finally {
        rl.close();
      }
    } else {
      const fallbackPath = path.resolve(targetDir, 'README.generated.md');
      console.log(colors.yellow(`Notice: Output file exists and running non-interactively without --force.`));
      console.log(colors.yellow(`Saving generated README to: ${fallbackPath}`));
      fs.writeFileSync(fallbackPath, markdown, 'utf8');
      printSummaryReport(projectInfo, summary, fallbackPath, scanDuration, false, values.verbose);
      return 0;
    }
  }

  // Save generated README to disk
  fs.writeFileSync(outputPath, markdown, 'utf8');
  printSummaryReport(projectInfo, summary, outputPath, scanDuration, false, values.verbose);
  return 0;
}

async function handleLintCommand(args) {
  const filePath = args[0] || 'README.md';
  const fullPath = path.resolve(filePath);

  if (!fs.existsSync(fullPath)) {
    console.error(colors.red(`Error: File not found: ${fullPath}`));
    return 1;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const shouldFix = args.includes('--fix');
  const result = lintMarkdown(content, { fix: shouldFix });

  console.log(`\n${colors.bold('Style Linter Results:')} ${fullPath}`);
  console.log(`Score: ${result.score}/100\n`);

  if (result.violations.length === 0) {
    console.log(colors.green('✔ No style violations detected. Document complies with developer tone.'));
    return 0;
  }

  for (const v of result.violations) {
    console.log(`- ${colors.yellow(`[${v.rule}]`)} line ${v.line || 1}: ${v.message}`);
  }

  if (shouldFix) {
    fs.writeFileSync(fullPath, result.output, 'utf8');
    console.log(colors.green(`\n✔ Applied auto-fixes to ${fullPath}`));
    return 0;
  } else {
    console.log(colors.gray(`\nRun "auto-readme lint ${filePath} --fix" to automatically apply formatting fixes.`));
    return 1;
  }
}

async function handleAuthCommand(args) {
  const sub = args[0];
  const provider = args[1];

  if (sub === 'status') {
    const list = getAuthStatus();
    console.log(`\n${colors.bold('Configured AI Providers:')}\n`);
    for (const item of list) {
      if (item.configured) {
        const keyText = item.maskedKey ? `(${item.maskedKey}) via ${item.source}` : item.note;
        console.log(`  ${colors.green('✔')} ${colors.bold(item.provider)}: ${colors.gray(keyText)}`);
      } else {
        console.log(`  ${colors.gray('○')} ${item.provider}: ${colors.dim('Not configured')}`);
      }
    }
    return 0;
  }

  if (sub === 'set') {
    if (!provider) {
      console.error(colors.red('Usage: auto-readme auth set <provider>'));
      return 1;
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      const key = await rl.question(`Enter API Key for ${provider}: `);
      if (!key.trim()) {
        console.error(colors.red('Error: API key cannot be empty.'));
        return 1;
      }
      setApiKey(provider, key.trim());
      console.log(colors.green(`✔ Saved API key for ${provider}.`));
      return 0;
    } finally {
      rl.close();
    }
  }

  if (sub === 'remove') {
    if (!provider) {
      console.error(colors.red('Usage: auto-readme auth remove <provider>'));
      return 1;
    }
    const removed = removeApiKey(provider);
    if (removed) {
      console.log(colors.green(`✔ Removed API key for ${provider}.`));
    } else {
      console.log(colors.gray(`No saved key found for ${provider}.`));
    }
    return 0;
  }

  console.log('Usage: auto-readme auth <status|set <provider>|remove <provider>>');
  return 1;
}

function handleModelsCommand() {
  const models = loadModelsConfig();
  console.log(`\n${colors.bold('Supported Providers & Default Models:')}\n`);
  for (const [p, conf] of Object.entries(models)) {
    console.log(`- ${colors.bold(p)}:`);
    console.log(`    Default: ${colors.cyan(conf.defaultModel)}`);
    console.log(`    Recommended: ${conf.recommendedModels?.join(', ')}`);
    if (conf.baseUrl) console.log(`    Endpoint: ${colors.dim(conf.baseUrl)}`);
  }
  return 0;
}

function printSummaryReport(projectInfo, summary, outputPath, duration, isDryRun, verbose) {
  console.log(`\n${colors.green('✔')} Deep Scan complete in ${duration}ms`);
  const typeStr = projectInfo.projectType?.primary || 'Software Application';
  console.log(`Project Type: ${colors.cyan(typeStr)}`);
  if (projectInfo.dominantLanguage) {
    console.log(`Dominant Language: ${colors.cyan(projectInfo.dominantLanguage.name)}`);
  }

  if (summary?.deepSummary) {
    console.log(`\n${colors.bold('Evidence-Based Sections:')}`);
    for (const f of summary.deepSummary.filled || []) {
      console.log(`  ${colors.green('✔')} ${f.name} (${colors.gray(`${f.evidenceCount} verified signals`)})`);
    }
    for (const s of summary.deepSummary.skipped || []) {
      console.log(`  ${colors.gray('○')} ${s.name} (${colors.dim(s.reason)})`);
    }

    if (summary.deepSummary.warnings?.length > 0) {
      console.log(`\n${colors.bold(colors.yellow('⚠️ Security Signals & Warnings:'))}`);
      for (const w of summary.deepSummary.warnings) {
        console.log(`  ${colors.red('!')} ${w.file}:${w.line || 1} - ${w.message}`);
      }
    }
  }

  if (!isDryRun) {
    console.log(`\n${colors.bold(colors.green('🚀 README created successfully at:'))}`);
    console.log(`  ${outputPath}\n`);
  }
}
