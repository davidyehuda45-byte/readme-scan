import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import readline from 'node:readline/promises';
import { scanProject } from './scanner/index.js';
import { generateReadme } from './generator/index.js';
import { colors } from './utils/colors.js';

const VERSION = '1.0.0';

export function printHelp() {
  console.log(`
${colors.bold(colors.cyan('auto-readme'))} ${colors.gray(`v${VERSION}`)}
${colors.dim('Generate high-quality, professional README.md files 100% locally and offline.')}

${colors.bold('USAGE:')}
  ${colors.green('npx auto-readme')} [path/to/project] [options]

${colors.bold('OPTIONS:')}
  ${colors.yellow('-o, --output <path>')}        Output file path ${colors.gray('(default: ./README.md)')}
  ${colors.yellow('-f, --force')}                Overwrite existing README without confirmation
  ${colors.yellow('-l, --lang <id|en>')}         Language for the generated README ${colors.gray('(default: en)')}
  ${colors.yellow('-m, --minimal')}              Generate compact README without badges/emojis
  ${colors.yellow('-e, --ecosystem <name>')}     Override primary ecosystem (node, python, rust, go, php, java, ruby)
  ${colors.yellow('--dry-run')}                  Print generated README to terminal without saving
  ${colors.yellow('-h, --help')}                 Show this help message
  ${colors.yellow('-v, --version')}              Show version number

${colors.bold('EXAMPLES:')}
  ${colors.gray('# Generate README.md in current directory:')}
  ${colors.green('npx auto-readme')}

  ${colors.gray('# Generate README in Indonesian language:')}
  ${colors.green('npx auto-readme --lang id')}

  ${colors.gray('# Preview in terminal without writing:')}
  ${colors.green('npx auto-readme --dry-run')}

  ${colors.gray('# Target a specific project directory:')}
  ${colors.green('npx auto-readme ../my-project -o ../my-project/README.md')}
`);
}

export async function runCli(argv = process.argv.slice(2)) {
  const optionsConfig = {
    output: { type: 'string', short: 'o', default: './README.md' },
    force: { type: 'boolean', short: 'f', default: false },
    lang: { type: 'string', short: 'l', default: 'en' },
    minimal: { type: 'boolean', short: 'm', default: false },
    ecosystem: { type: 'string', short: 'e' },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
    version: { type: 'boolean', short: 'v', default: false },
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

  const targetDir = positionals[0] ? path.resolve(positionals[0]) : process.cwd();

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

  console.log(`${colors.cyan('🔍 Scanning project...')} ${colors.gray(targetDir)}`);

  const startTime = Date.now();
  const projectInfo = await scanProject(targetDir, {
    ecosystem: values.ecosystem,
  });
  const scanDuration = Date.now() - startTime;

  const { markdown, summary } = generateReadme(projectInfo, {
    lang,
    minimal: values.minimal,
  });

  if (values['dry-run']) {
    console.log(`\n${colors.bold(colors.blue('--- DRY RUN: GENERATED README.MD ---'))}\n`);
    console.log(markdown);
    console.log(`\n${colors.bold(colors.blue('--- END DRY RUN ---'))}\n`);
    printSummaryReport(projectInfo, summary, outputPath, scanDuration, true);
    return 0;
  }

  // Handle overwrite protection
  if (fs.existsSync(outputPath) && !values.force) {
    const isInteractive = Boolean(process.stdin.isTTY && process.stdout.isTTY);

    if (isInteractive) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      try {
        const answer = await rl.question(
          `${colors.yellow('⚠️  File already exists:')} ${outputPath}\nOverwrite? (y/N): `
        );

        if (!/^y(es)?$/i.test(answer.trim())) {
          const altAnswer = await rl.question(
            `Save as ${colors.cyan('README.generated.md')} instead? (Y/n): `
          );

          if (/^n(o)?$/i.test(altAnswer.trim())) {
            console.log(colors.gray('Operation cancelled. No files were modified.'));
            return 0;
          } else {
            outputPath = path.join(path.dirname(outputPath), 'README.generated.md');
          }
        }
      } finally {
        rl.close();
      }
    } else {
      const altPath = path.join(path.dirname(outputPath), 'README.generated.md');
      console.log(
        `${colors.yellow('Notice:')} Output file exists and running non-interactively without --force.`
      );
      console.log(`Saving generated README to: ${colors.cyan(altPath)}`);
      outputPath = altPath;
    }
  }

  try {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, markdown, 'utf8');
  } catch (err) {
    console.error(`${colors.red('Error writing file:')} ${err.message}`);
    return 1;
  }

  printSummaryReport(projectInfo, summary, outputPath, scanDuration, false);
  return 0;
}

function printSummaryReport(projectInfo, summary, outputPath, duration, isDryRun) {
  console.log(`\n${colors.bold(colors.green('✔ Scan complete in ' + duration + 'ms'))}`);

  if (projectInfo.ecosystems && projectInfo.ecosystems.length > 1) {
    console.log(
      `${colors.bold('Ecosystems detected:')} ${projectInfo.ecosystems.join(', ')} (${colors.cyan('Primary: ' + projectInfo.primaryEcosystem.toUpperCase())})`
    );
  } else {
    console.log(`${colors.bold('Project:')} ${colors.cyan(projectInfo.projectName)} (${projectInfo.primaryEcosystem.toUpperCase()})`);
  }

  if (projectInfo.dominantLanguage) {
    console.log(`${colors.bold('Dominant Language:')} ${projectInfo.dominantLanguage.name}`);
  }

  console.log(`\n${colors.bold('Generation Summary:')}`);
  for (const s of summary.filledSections) {
    console.log(`  ${colors.green('✔')} ${s} ${colors.gray('(automatically detected)')}`);
  }
  for (const s of summary.placeholderSections) {
    console.log(`  ${colors.yellow('✎')} ${s} ${colors.yellow('(contains placeholders to review)')}`);
  }

  if (!isDryRun) {
    console.log(`\n${colors.bold(colors.green('🚀 README created successfully at:'))}`);
    console.log(`  ${colors.underline(outputPath)}`);
    console.log(`\n${colors.dim('Tip: Review and fill in any placeholder TODOs to make your README shine!')}\n`);
  }
}
