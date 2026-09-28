/**
 * Indonesian README templates and section builders.
 */

export function buildSectionsId(projectInfo, badges, options = {}) {
  const sections = [];
  const isMinimal = options.minimal;

  // 1. Deskripsi
  const hasDescription = Boolean(projectInfo.description && projectInfo.description.trim());
  const descriptionContent = hasDescription
    ? projectInfo.description.trim()
    : `<!-- TODO: Tambahkan deskripsi lengkap mengenai project ini -->\n\nAplikasi modern dan handal yang dirancang untuk mempermudah proses pengembangan.`;

  sections.push({
    key: 'description',
    title: '',
    slug: '',
    content: descriptionContent,
    isFilled: hasDescription,
  });

  // 2. Fitur
  const featureItems = [];
  let featuresAutoDetected = false;

  if (projectInfo.docker && projectInfo.docker.supported) {
    featureItems.push(isMinimal ? '- Dukungan Docker: Siap untuk deployment berbasis container' : '- 🐳 **Dukungan Docker**: Siap untuk deployment berbasis container dengan Docker dan Compose');
    featuresAutoDetected = true;
  }
  if (projectInfo.ecosystemData?.node?.isTypeScript) {
    featureItems.push(isMinimal ? '- Keamanan Tipe: Ditulis menggunakan TypeScript dengan pengetikan ketat' : '- 🔷 **Keamanan Tipe**: Ditulis menggunakan TypeScript dengan pengetikan ketat untuk keandalan maksimal');
    featuresAutoDetected = true;
  }
  if (projectInfo.testCommand) {
    featureItems.push(isMinimal ? `- Pengujian Otomatis: Dilengkapi test suite (\`${projectInfo.testCommand}\`)` : `- 🧪 **Pengujian Otomatis**: Dilengkapi test suite (\`${projectInfo.testCommand}\`)`);
    featuresAutoDetected = true;
  }
  if (projectInfo.envExample) {
    featureItems.push(isMinimal ? '- Mudah Dikonfigurasi: Dikonfigurasi melalui environment variables' : '- ⚙️ **Mudah Dikonfigurasi**: Dikonfigurasi melalui environment variables');
    featuresAutoDetected = true;
  }

  featureItems.push(
    isMinimal
      ? '- Fitur 1: <!-- TODO: Jelaskan fitur utama 1 -->'
      : '- ⚡ **Fitur Utama 1**: <!-- TODO: Jelaskan fitur utama 1 -->',
    isMinimal
      ? '- Fitur 2: <!-- TODO: Jelaskan fitur utama 2 -->'
      : '- 🚀 **Fitur Utama 2**: <!-- TODO: Jelaskan fitur utama 2 -->'
  );

  sections.push({
    key: 'features',
    title: 'Fitur',
    slug: 'fitur',
    content: featureItems.join('\n'),
    isFilled: featuresAutoDetected,
  });

  // 3. Tech Stack
  const techLines = [];
  if (projectInfo.dominantLanguage) {
    techLines.push(`- **Bahasa Utama**: ${projectInfo.dominantLanguage.name}`);
  }
  if (projectInfo.languages && projectInfo.languages.length > 1) {
    const others = projectInfo.languages.slice(1).map((l) => `${l.name} (${l.linePercentage}%)`).join(', ');
    techLines.push(`- **Bahasa Lainnya**: ${others}`);
  }

  const nodeData = projectInfo.ecosystemData?.node;
  if (nodeData) {
    if (nodeData.categorized.frameworks.length > 0) {
      techLines.push(`- **Framework**: ${nodeData.categorized.frameworks.map((f) => `\`${f.name}\``).join(', ')}`);
    }
    if (nodeData.categorized.databases.length > 0) {
      techLines.push(`- **Database / ORM**: ${nodeData.categorized.databases.map((d) => `\`${d.name}\``).join(', ')}`);
    }
    if (nodeData.categorized.devTools.length > 0) {
      techLines.push(`- **Alat Pengembangan**: ${nodeData.categorized.devTools.map((t) => `\`${t.name}\``).join(', ')}`);
    }
  }

  const pyData = projectInfo.ecosystemData?.python;
  if (pyData && pyData.dependencies.length > 0) {
    const topDeps = pyData.dependencies.slice(0, 10).map((d) => `\`${d}\``).join(', ');
    techLines.push(`- **Dependensi (${pyData.tool})**: ${topDeps}`);
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
      techLines.push(`- **Modul Go**: ${direct}`);
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

  // 4. Instalasi
  const installLines = ['### Prasyarat\n'];
  if (projectInfo.primaryEcosystem === 'node') {
    installLines.push(`- [Node.js](https://nodejs.org/) (versi 18 atau lebih baru)\n- Paket pengelola [${projectInfo.ecosystemData.node.packageManager}](https://www.npmjs.com/)\n`);
  } else if (projectInfo.primaryEcosystem === 'python') {
    const pyVer = projectInfo.ecosystemData.python?.pythonVersion || '3.9+';
    installLines.push(`- [Python](https://www.python.org/) (${pyVer})\n- [${projectInfo.ecosystemData.python?.tool || 'pip'}](https://pip.pypa.io/)\n`);
  } else if (projectInfo.primaryEcosystem === 'rust') {
    installLines.push('- [Rust & Cargo](https://rustup.rs/)\n');
  } else if (projectInfo.primaryEcosystem === 'go') {
    const goVer = projectInfo.ecosystemData.go?.goVersion || '1.18+';
    installLines.push(`- [Go](https://go.dev/) (${goVer})\n`);
  } else if (projectInfo.primaryEcosystem === 'php') {
    installLines.push('- [PHP](https://www.php.net/) dan [Composer](https://getcomposer.org/)\n');
  } else if (projectInfo.primaryEcosystem === 'java') {
    installLines.push('- [Java JDK](https://adoptium.net/) (versi 17 atau lebih baru)\n');
  } else {
    installLines.push('- Git\n');
  }

  installLines.push('### Langkah Instalasi\n');
  installLines.push('1. Clone repository:\n');
  const cloneCmd = projectInfo.git?.cloneUrl
    ? `git clone ${projectInfo.git.cloneUrl}`
    : `git clone https://github.com/username/${projectInfo.projectName}.git`;
  installLines.push('```bash\n' + cloneCmd + '\ncd ' + projectInfo.projectName + '\n```\n');

  if (projectInfo.installCommand) {
    installLines.push('2. Install dependensi:\n');
    installLines.push('```bash\n' + projectInfo.installCommand + '\n```');
  }

  sections.push({
    key: 'installation',
    title: 'Instalasi',
    slug: 'instalasi',
    content: installLines.join('\n'),
    isFilled: Boolean(projectInfo.installCommand),
  });

  // 5. Cara Menjalankan
  const usageLines = [];
  if (projectInfo.runCommand) {
    usageLines.push('Untuk menjalankan aplikasi:\n');
    usageLines.push('```bash\n' + projectInfo.runCommand + '\n```\n');
  }

  if (projectInfo.scripts && Object.keys(projectInfo.scripts).length > 0) {
    const pm = projectInfo.ecosystemData?.node?.packageManager || 'npm';
    usageLines.push('### Perintah / Script yang Tersedia\n');
    usageLines.push('| Perintah | Perintah Asli |');
    usageLines.push('| --- | --- |');
    for (const [scriptName, scriptCmd] of Object.entries(projectInfo.scripts)) {
      const runStr = pm === 'npm' ? `npm run ${scriptName}` : `${pm} ${scriptName}`;
      usageLines.push(`| \`${runStr}\` | \`${scriptCmd}\` |`);
    }
    usageLines.push('');
  }

  if (projectInfo.testCommand) {
    usageLines.push('### Menjalankan Pengujian (Testing)\n');
    usageLines.push('```bash\n' + projectInfo.testCommand + '\n```\n');
  }

  if (projectInfo.docker && projectInfo.docker.supported) {
    usageLines.push('### Menjalankan dengan Docker\n');
    if (projectInfo.docker.hasCompose) {
      usageLines.push('Jalankan dengan Docker Compose:\n```bash\ndocker compose up --build\n```\n');
    } else {
      usageLines.push(`Build dan jalankan container:\n\`\`\`bash\ndocker build -t ${projectInfo.projectName} .\ndocker run -p 3000:3000 ${projectInfo.projectName}\n\`\`\`\n`);
    }
  }

  if (usageLines.length > 0) {
    sections.push({
      key: 'usage',
      title: 'Cara Menjalankan',
      slug: 'cara-menjalankan',
      content: usageLines.join('\n').trim(),
      isFilled: true,
    });
  }

  // 6. Variabel Lingkungan
  if (projectInfo.envExample && projectInfo.envExample.variables.length > 0) {
    const envLines = [
      `Salin template \`${projectInfo.envExample.file}\` ke \`.env\` lalu sesuaikan nilainya:\n`,
      '```bash\ncp ' + projectInfo.envExample.file + ' .env\n```\n',
      '| Variabel | Keterangan |',
      '| --- | --- |',
    ];
    for (const v of projectInfo.envExample.variables) {
      envLines.push(`| \`${v.name}\` | ${v.description} |`);
    }
    sections.push({
      key: 'env',
      title: 'Variabel Lingkungan',
      slug: 'variabel-lingkungan',
      content: envLines.join('\n'),
      isFilled: true,
    });
  }

  // 7. Struktur Project
  if (projectInfo.fileTree) {
    sections.push({
      key: 'structure',
      title: 'Struktur Project',
      slug: 'struktur-project',
      content: '```text\n' + projectInfo.fileTree + '\n```',
      isFilled: true,
    });
  }

  // 8. Kontribusi
  sections.push({
    key: 'contributing',
    title: 'Kontribusi',
    slug: 'kontribusi',
    content: [
      'Kontribusi selalu disambut dengan baik! Ikuti langkah-langkah berikut:',
      '1. Fork repository ini.',
      '2. Buat branch baru (`git checkout -b fitur/fitur-keren`).',
      '3. Commit perubahan Anda (`git commit -m \'Menambahkan fitur keren\'`).',
      '4. Push ke branch Anda (`git push origin fitur/fitur-keren`).',
      '5. Buat sebuah Pull Request.',
    ].join('\n'),
    isFilled: true,
  });

  // 9. Lisensi & Author
  let licenseContent = '';
  let licenseFilled = false;
  if (projectInfo.licenseInfo || projectInfo.license) {
    const licenseName = projectInfo.licenseInfo?.name || projectInfo.license;
    const licenseFile = projectInfo.licenseInfo?.file || 'LICENSE';
    const licenseLink = projectInfo.licenseInfo ? `[${licenseFile}](${licenseFile})` : 'file LICENSE';
    licenseContent = `Didistribusikan di bawah lisensi ${licenseName}. Lihat ${licenseLink} untuk informasi lebih lanjut.`;
    if (projectInfo.author) {
      licenseContent += `\n\nDikelola oleh **${projectInfo.author}**.`;
    }
    licenseFilled = true;
  } else {
    licenseContent = `<!-- TODO: Tentukan lisensi project (contoh: MIT, Apache-2.0) -->\nProject ini belum memiliki lisensi formal.`;
    if (projectInfo.author) {
      licenseContent += `\n\nDikelola oleh **${projectInfo.author}**.`;
    }
    licenseFilled = false;
  }

  sections.push({
    key: 'license',
    title: 'Lisensi',
    slug: 'lisensi',
    content: licenseContent,
    isFilled: licenseFilled,
  });

  return sections;
}
