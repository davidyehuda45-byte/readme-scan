import fs from 'node:fs';
import path from 'node:path';

export async function detectJava(rootDir) {
  const pomPath = path.join(rootDir, 'pom.xml');
  const gradlePath = path.join(rootDir, 'build.gradle');
  const gradleKtsPath = path.join(rootDir, 'build.gradle.kts');

  const hasPom = fs.existsSync(pomPath);
  const hasGradle = fs.existsSync(gradlePath) || fs.existsSync(gradleKtsPath);

  if (!hasPom && !hasGradle) {
    return null;
  }

  let name = path.basename(path.resolve(rootDir));
  let version = '1.0.0';
  let buildTool = hasGradle ? 'gradle' : 'maven';
  const dependencies = [];

  const hasGradlew = fs.existsSync(path.join(rootDir, 'gradlew')) || fs.existsSync(path.join(rootDir, 'gradlew.bat'));
  const hasMvnw = fs.existsSync(path.join(rootDir, 'mvnw')) || fs.existsSync(path.join(rootDir, 'mvnw.cmd'));

  if (hasPom) {
    try {
      const content = fs.readFileSync(pomPath, 'utf8');
      const artifactMatch = content.match(/<artifactId>([^<]+)<\/artifactId>/);
      if (artifactMatch) name = artifactMatch[1];
      const versionMatch = content.match(/<version>([^<]+)<\/version>/);
      if (versionMatch) version = versionMatch[1];

      const depMatches = content.matchAll(/<dependency>[\s\S]*?<artifactId>([^<]+)<\/artifactId>[\s\S]*?<\/dependency>/g);
      for (const m of depMatches) {
        dependencies.push(m[1].trim());
      }
    } catch {
      // Ignore
    }
  } else if (hasGradle) {
    try {
      const activeGradlePath = fs.existsSync(gradlePath) ? gradlePath : gradleKtsPath;
      const content = fs.readFileSync(activeGradlePath, 'utf8');
      const depMatches = content.matchAll(/(?:implementation|api|compileOnly|testImplementation)\s*\(?['"]([^'"]+)['"]\)?/g);
      for (const m of depMatches) {
        dependencies.push(m[1].trim());
      }
    } catch {
      // Ignore
    }
  }

  let installCommand = buildTool === 'gradle'
    ? (hasGradlew ? './gradlew build' : 'gradle build')
    : (hasMvnw ? './mvnw install' : 'mvn install');

  let testCommand = buildTool === 'gradle'
    ? (hasGradlew ? './gradlew test' : 'gradle test')
    : (hasMvnw ? './mvnw test' : 'mvn test');

  let runCommand = buildTool === 'gradle'
    ? (hasGradlew ? './gradlew run' : 'gradle run')
    : (hasMvnw ? './mvnw spring-boot:run' : 'mvn spring-boot:run');

  return {
    type: 'java',
    name,
    version,
    buildTool,
    dependencies,
    installCommand,
    testCommand,
    runCommand,
  };
}
