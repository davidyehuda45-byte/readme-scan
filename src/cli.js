import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import readline from 'node:readline/promises';
import { scanProject } from './scanner/index.js';
import { generateReadme } from './generator/index.js';
import { colors } from './utils/colors.js';

const VERSION = '2.0.0';

export function printHelp() {
  console.log(`
${colors.bold(colors.cyan('auto-readme'))} ${colors.gray(`v${VERSION}`)}
${colors.dim('Deep Scan, evidence-based CLI tool to generate professional README.md files 100% locally and offline.')}

${colors.bold('USAGE:')}
  ${colors.green('npx auto-readme')} [path/to/project] [options]

${colors.bold('CORE OPTIONS:')}
  ${colors.yellow('-o, --output <path>')}        Output file path ${colors.gray('(default: ./README.md)')}
  ${colors.yellow('-f, --force')}                Overwrite existing README without confirmation
  ${colors.yellow('-l, --lang <id|en>')}         Language for the generated README ${colors.gray('(default: en)')}
  ${colors.yellow('-m, --minimal')}              Generate compact README without badges/emojis
  ${colors.yellow('--dry-run')}                  Print generated README to terminal without saving
  ${colors.yellow('-h, --help')}                 Show this help message
  ${colors.yellow('-v, --version')}              Show version number

${colors.bold('DEEP SCAN v2 OPTIONS:')}
  ${colors.yellow('--sections <list>')}          Include only specified sections ${colors.gray('(e.g. stack,api,security)')}
  ${colors.yellow('--exclude <list>')}           Exclude specific sections
  ${colors.yellow('--merge, --update')}          Preserve manual edits outside auto-readme markers
  ${colors.yellow('--check')}                    CI mode: exit non-zero if README.md is outdated
  ${colors.yellow('--verbose')}                  Display evidence and signal origins in terminal
  ${colors.yellow('--json')}                     Output raw scan data as JSON
  ${colors.yellow('--depth <n>')}                Folder tree traversal depth ${colors.gray('(default: 2)')}
  ${colors.yellow('--workspace <name>')}         Generate README for a specific monorepo workspace
  ${colors.yellow('--badges <style>')}           Badge style: flat, flat-square, for-the-badge, none
  ${colors.yellow('--init-config')}              Generate a sample .autoreadmerc.json config file
  ${colors.yellow('-e, --ecosystem <name>')}     Override primary ecosystem (node, python, rust, go, php, java, ruby)

${colors.bold('EXAMPLES:')}
  ${colors.gray('# Generate README in current directory:')}
  ${colors.green('npx auto-readme')}

  ${colors.gray('# Safe update preserving manual edits:')}
  ${colors.green('npx auto-readme --merge')}

  ${colors.gray('# Generate in Indonesian:')}
  ${colors.green('npx auto-readme --lang id')}

  ${colors.gray('# CI verification check:')}
  ${colors.green('npx auto-readme --check')}
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
    // v2 flags
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
    'init-config': { type: 'boolean', default: false },
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
      badges: 'flat-square',
      minimal: false,
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

  if (!values.json) {
    console.log(`${colors.cyan('🔍 Scanning project with Deep Scan v2...')} ${colors.gray(targetDir)}`);
  }

  const startTime = Date.now();
  const projectInfo = await scanProject(targetDir, {
    ecosystem: values.ecosystem,
    depth,
    verbose: values.verbose,
  });
  const scanDuration = Date.now() - startTime;

  // JSON output mode
  if (values.json) {
    const cleanInfo = { ...projectInfo };
    delete cleanInfo.context;
    console.log(JSON.stringify(cleanInfo, null, 2));
    return 0;
  }

  // Read existing content if present for merge mode
  let existingContent = null;
  if (fs.existsSync(outputPath)) {
    existingContent = fs.readFileSync(outputPath, 'utf8');
  }

  const { markdown, summary } = generateReadme(projectInfo, {
    lang,
    minimal: values.minimal,
    badges: values.badges,
    sections: values.sections,
    exclude: values.exclude,
    merge: isMerge,
    existingContent,
  });

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

  printSummaryReport(projectInfo, summary, outputPath, scanDuration, false, values.verbose);
  return 0;
}

function printSummaryReport(projectInfo, summary, outputPath, duration, isDryRun, verbose) {
  console.log(`\n${colors.bold(colors.green('✔ Deep Scan complete in ' + duration + 'ms'))}`);
  console.log(`${colors.bold('Project Type:')} ${colors.cyan(projectInfo.projectType?.primaryType || projectInfo.primaryEcosystem.toUpperCase())}`);

  if (projectInfo.dominantLanguage) {
    console.log(`${colors.bold('Dominant Language:')} ${projectInfo.dominantLanguage.name}`);
  }

  console.log(`\n${colors.bold('Evidence-Based Sections:')}`);
  if (summary.deepSummary) {
    for (const s of summary.deepSummary.filled) {
      console.log(`  ${colors.green('✔')} ${s.name} ${colors.gray(`(${s.evidenceCount} verified signals)`)}`);
    }
    for (const s of summary.deepSummary.skipped) {
      console.log(`  ${colors.dim('○')} ${s.name} ${colors.gray(`(${s.reason})`)}`);
    }
  } else {
    for (const s of summary.filledSections || []) {
      console.log(`  ${colors.green('✔')} ${s}`);
    }
    for (const s of summary.placeholderSections || []) {
      console.log(`  ${colors.yellow('✎')} ${s}`);
    }
  }

  // Display security warnings in terminal ONLY per PRD 4.6
  const warnings = projectInfo.security?.warnings || [];
  if (warnings.length > 0) {
    console.log(`\n${colors.bold(colors.red('⚠️  Security Alerts (Internal Terminal Warnings):'))}`);
    for (const w of warnings) {
      console.log(`  ${colors.red('!')} ${w.message}`);
    }
  }

  if (verbose && projectInfo.context?.evidenceLog) {
    console.log(`\n${colors.bold('Verbose Evidence Log:')}`);
    for (const ev of projectInfo.context.evidenceLog) {
      console.log(`  [${ev.detector}] ${ev.item} (Source: ${ev.source || 'scan'})`);
    }
  }

  if (!isDryRun) {
    console.log(`\n${colors.bold(colors.green('🚀 README created successfully at:'))}`);
    console.log(`  ${colors.underline(outputPath)}\n`);
  }
}
