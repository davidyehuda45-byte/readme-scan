/**
 * English README templates and section builders.
 */

export function buildSectionsEn(projectInfo, badges, options = {}) {
  const sections = [];
  const isMinimal = options.minimal;

  // 1. Description
  const hasDescription = Boolean(projectInfo.description && projectInfo.description.trim());
  const descriptionContent = hasDescription
    ? projectInfo.description.trim()
    : `<!-- TODO: Add a comprehensive project description here -->\n\nA modern and robust application designed to streamline development.`;

  sections.push({
    key: 'description',
    title: '',
    slug: '',
    content: descriptionContent,
    isFilled: hasDescription,
  });

  // 2. Features
  const featureItems = [];
  let featuresAutoDetected = false;

  if (projectInfo.docker && projectInfo.docker.supported) {
    featureItems.push(isMinimal ? '- Docker Support: Ready for containerized deployment' : '- 🐳 **Docker Support**: Ready for containerized deployment with Docker and Compose');
    featuresAutoDetected = true;
  }
  if (projectInfo.ecosystemData?.node?.isTypeScript) {
    featureItems.push(isMinimal ? '- Type Safety: Fully typed with TypeScript' : '- 🔷 **Type Safety**: Fully typed with TypeScript for enhanced reliability');
    featuresAutoDetected = true;
  }
  if (projectInfo.testCommand) {
    featureItems.push(isMinimal ? `- Testing Suite: Built-in automated testing (\`${projectInfo.testCommand}\`)` : `- 🧪 **Testing Suite**: Built-in automated testing (\`${projectInfo.testCommand}\`)`);
    featuresAutoDetected = true;
  }
  if (projectInfo.envExample) {
    featureItems.push(isMinimal ? '- Configurable: Easily configured via environment variables' : '- ⚙️ **Configurable**: Easily configured via environment variables');
    featuresAutoDetected = true;
  }

  featureItems.push(
    isMinimal
      ? '- Feature 1: <!-- TODO: Describe key feature 1 -->'
      : '- ⚡ **Key Feature 1**: <!-- TODO: Describe key feature 1 -->',
    isMinimal
      ? '- Feature 2: <!-- TODO: Describe key feature 2 -->'
      : '- 🚀 **Key Feature 2**: <!-- TODO: Describe key feature 2 -->'
  );

  sections.push({
    key: 'features',
    title: 'Features',
    slug: 'features',
    content: featureItems.join('\n'),
    isFilled: featuresAutoDetected,
  });

  // 3. Tech Stack
  const techLines = [];
  if (projectInfo.dominantLanguage) {
    techLines.push(`- **Primary Language**: ${projectInfo.dominantLanguage.name}`);
  }
  if (projectInfo.languages && projectInfo.languages.length > 1) {
    const others = projectInfo.languages.slice(1).map((l) => `${l.name} (${l.linePercentage}%)`).join(', ');
    techLines.push(`- **Other Languages**: ${others}`);
  }

  const nodeData = projectInfo.ecosystemData?.node;
  if (nodeData) {
    if (nodeData.categorized.frameworks.length > 0) {
      techLines.push(`- **Frameworks**: ${nodeData.categorized.frameworks.map((f) => `\`${f.name}\``).join(', ')}`);
    }
    if (nodeData.categorized.databases.length > 0) {
      techLines.push(`- **Database / ORM**: ${nodeData.categorized.databases.map((d) => `\`${d.name}\``).join(', ')}`);
    }
    if (nodeData.categorized.devTools.length > 0) {
      techLines.push(`- **Dev Tools**: ${nodeData.categorized.devTools.map((t) => `\`${t.name}\``).join(', ')}`);
    }
  }

  const pyData = projectInfo.ecosystemData?.python;
  if (pyData && pyData.dependencies.length > 0) {
    const topDeps = pyData.dependencies.slice(0, 10).map((d) => `\`${d}\``).join(', ');
    techLines.push(`- **Dependencies (${pyData.tool})**: ${topDeps}`);
  }

  const rustData = projectInfo.ecosystemData?.rust;
  if (rustData && rustData.dependencies.length > 0) {
    const topDeps = rustData.dependencies.slice(0, 10).map((d) => `\`${d.name}\``).join(', ');
    techLines.push(`- **Crates**: ${topDeps}`);
  }

  const goData = projectInfo.ecosystemData?.go;
  if (goData && goData.dependencies.length > 0) {
    const direct = goData.dependencies.filter((d) => !d.indirect).slice(0, 10).map((d) => `\`${d.name}\``).join(', ');
    if (direct) {
      techLines.push(`- **Go Modules**: ${direct}`);
    }
  }

  if (techLines.length > 0) {
    sections.push({
      key: 'techStack',
      title: 'Tech Stack',
      slug: 'tech-stack',
      content: techLines.join('\n'),
      isFilled: true,
    });
  }

  // 4. Installation
  const installLines = ['### Prerequisites\n'];
  if (projectInfo.primaryEcosystem === 'node') {
    installLines.push(`- [Node.js](https://nodejs.org/) (version 18 or higher)\n- [${projectInfo.ecosystemData.node.packageManager}](https://www.npmjs.com/) package manager\n`);
  } else if (projectInfo.primaryEcosystem === 'python') {
    const pyVer = projectInfo.ecosystemData.python?.pythonVersion || '3.9+';
    installLines.push(`- [Python](https://www.python.org/) (${pyVer})\n- [${projectInfo.ecosystemData.python?.tool || 'pip'}](https://pip.pypa.io/)\n`);
  } else if (projectInfo.primaryEcosystem === 'rust') {
    installLines.push('- [Rust & Cargo](https://rustup.rs/)\n');
  } else if (projectInfo.primaryEcosystem === 'go') {
    const goVer = projectInfo.ecosystemData.go?.goVersion || '1.18+';
    installLines.push(`- [Go](https://go.dev/) (${goVer})\n`);
  } else if (projectInfo.primaryEcosystem === 'php') {
    installLines.push('- [PHP](https://www.php.net/) and [Composer](https://getcomposer.org/)\n');
  } else if (projectInfo.primaryEcosystem === 'java') {
    installLines.push('- [Java JDK](https://adoptium.net/) (version 17 or higher)\n');
  } else {
    installLines.push('- Git\n');
  }

  installLines.push('### Setup Instructions\n');
  installLines.push('1. Clone the repository:\n');
  const cloneCmd = projectInfo.git?.cloneUrl
    ? `git clone ${projectInfo.git.cloneUrl}`
    : `git clone https://github.com/username/${projectInfo.projectName}.git`;
  installLines.push('```bash\n' + cloneCmd + '\ncd ' + projectInfo.projectName + '\n```\n');

  if (projectInfo.installCommand) {
    installLines.push('2. Install dependencies:\n');
    installLines.push('```bash\n' + projectInfo.installCommand + '\n```');
  }

  sections.push({
    key: 'installation',
    title: 'Installation',
    slug: 'installation',
    content: installLines.join('\n'),
    isFilled: Boolean(projectInfo.installCommand),
  });

  // 5. Usage
  const usageLines = [];
  if (projectInfo.runCommand) {
    usageLines.push('To start the application:\n');
    usageLines.push('```bash\n' + projectInfo.runCommand + '\n```\n');
  }

  if (projectInfo.scripts && Object.keys(projectInfo.scripts).length > 0) {
    const pm = projectInfo.ecosystemData?.node?.packageManager || 'npm';
    usageLines.push('### Available Scripts\n');
    usageLines.push('| Command | Description |');
    usageLines.push('| --- | --- |');
    for (const [scriptName, scriptCmd] of Object.entries(projectInfo.scripts)) {
      const runStr = pm === 'npm' ? `npm run ${scriptName}` : `${pm} ${scriptName}`;
      usageLines.push(`| \`${runStr}\` | \`${scriptCmd}\` |`);
    }
    usageLines.push('');
  }

  if (projectInfo.testCommand) {
    usageLines.push('### Running Tests\n');
    usageLines.push('```bash\n' + projectInfo.testCommand + '\n```\n');
  }

  if (projectInfo.docker && projectInfo.docker.supported) {
    usageLines.push('### Docker Usage\n');
    if (projectInfo.docker.hasCompose) {
      usageLines.push('Run with Docker Compose:\n```bash\ndocker compose up --build\n```\n');
    } else {
      usageLines.push(`Build and run container:\n\`\`\`bash\ndocker build -t ${projectInfo.projectName} .\ndocker run -p 3000:3000 ${projectInfo.projectName}\n\`\`\`\n`);
    }
  }

  if (usageLines.length > 0) {
    sections.push({
      key: 'usage',
      title: 'Usage',
      slug: 'usage',
      content: usageLines.join('\n').trim(),
      isFilled: true,
    });
  }

  // 6. Environment Variables
  if (projectInfo.envExample && projectInfo.envExample.variables.length > 0) {
    const envLines = [
      `Copy the \`${projectInfo.envExample.file}\` template to \`.env\` and customize the values:\n`,
      '```bash\ncp ' + projectInfo.envExample.file + ' .env\n```\n',
      '| Variable | Description |',
      '| --- | --- |',
    ];
    for (const v of projectInfo.envExample.variables) {
      envLines.push(`| \`${v.name}\` | ${v.description} |`);
    }
    sections.push({
      key: 'env',
      title: 'Environment Variables',
      slug: 'environment-variables',
      content: envLines.join('\n'),
      isFilled: true,
    });
  }

  // 7. Project Structure
  if (projectInfo.fileTree) {
    sections.push({
      key: 'structure',
      title: 'Project Structure',
      slug: 'project-structure',
      content: '```text\n' + projectInfo.fileTree + '\n```',
      isFilled: true,
    });
  }

  // 8. Contributing
  sections.push({
    key: 'contributing',
    title: 'Contributing',
    slug: 'contributing',
    content: [
      'Contributions are welcome! Please follow these steps:',
      '1. Fork the repository.',
      '2. Create a new branch (`git checkout -b feature/amazing-feature`).',
      '3. Commit your changes (`git commit -m \'Add amazing feature\'`).',
      '4. Push to the branch (`git push origin feature/amazing-feature`).',
      '5. Open a Pull Request.',
    ].join('\n'),
    isFilled: true,
  });

  // 9. License & Author
  let licenseContent = '';
  let licenseFilled = false;
  if (projectInfo.licenseInfo || projectInfo.license) {
    const licenseName = projectInfo.licenseInfo?.name || projectInfo.license;
    const licenseFile = projectInfo.licenseInfo?.file || 'LICENSE';
    const licenseLink = projectInfo.licenseInfo ? `[${licenseFile}](${licenseFile})` : 'LICENSE file';
    licenseContent = `Distributed under the ${licenseName}. See ${licenseLink} for more information.`;
    if (projectInfo.author) {
      licenseContent += `\n\nMaintained by **${projectInfo.author}**.`;
    }
    licenseFilled = true;
  } else {
    licenseContent = `<!-- TODO: Specify project license (e.g. MIT, Apache-2.0) -->\nThis project is currently unlicensed.`;
    if (projectInfo.author) {
      licenseContent += `\n\nMaintained by **${projectInfo.author}**.`;
    }
    licenseFilled = false;
  }

  sections.push({
    key: 'license',
    title: 'License',
    slug: 'license',
    content: licenseContent,
    isFilled: licenseFilled,
  });

  return sections;
}
