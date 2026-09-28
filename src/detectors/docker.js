/**
 * Docker and infrastructure detector per PRD Section 4.9.
 */
export async function detectDocker(context) {
  let hasDockerfile = false;
  let dockerfile = null;
  let baseImage = '';
  let exposedPorts = [];
  let cmd = '';

  let hasCompose = false;
  let composeFile = null;
  const services = [];
  const evidence = [];

  // 1. Dockerfile
  const df = context.files.find((f) => f === 'Dockerfile' || f.startsWith('Dockerfile.'));
  if (df) {
    hasDockerfile = true;
    dockerfile = df;
    const content = context.readFile(df) || '';

    const fromMatch = content.match(/FROM\s+([^\s\r\n]+)/i);
    if (fromMatch) baseImage = fromMatch[1];

    const exposeMatches = content.matchAll(/EXPOSE\s+([0-9\s/tcpudp]+)/gi);
    for (const m of exposeMatches) {
      exposedPorts.push(...m[1].trim().split(/\s+/));
    }

    const cmdMatch = content.match(/CMD\s+(\[[^\]]+\]|[^\r\n]+)/i);
    if (cmdMatch) cmd = cmdMatch[1].trim();

    evidence.push(`Dockerfile with base image ${baseImage || 'custom'}`);
  }

  // 2. Docker Compose
  const cf = context.files.find((f) =>
    ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'].includes(f)
  );

  if (cf) {
    hasCompose = true;
    composeFile = cf;
    const content = context.readFile(cf) || '';

    // Extract services roughly by matching service name under services:
    const lines = content.split(/\r?\n/);
    let inServices = false;
    let currentService = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^services:\s*$/i.test(line.trim())) {
        inServices = true;
        continue;
      }
      if (inServices) {
        if (/^[a-zA-Z0-9_-]+:/.test(line)) {
          // New top-level block (e.g. volumes:, networks:)
          break;
        }

        // Service name is indented by 2 spaces: "  web:"
        const svcMatch = line.match(/^  ([a-zA-Z0-9_-]+):\s*$/);
        if (svcMatch) {
          currentService = { name: svcMatch[1], ports: [], image: '' };
          services.push(currentService);
          continue;
        }

        if (currentService) {
          const imgMatch = line.match(/^\s+image:\s*['"]?([^'"\s]+)['"]?/);
          if (imgMatch) currentService.image = imgMatch[1];

          const portMatch = line.match(/^\s+-\s*["']?([0-9]+:[0-9]+)["']?/);
          if (portMatch) currentService.ports.push(portMatch[1]);
        }
      }
    }

    evidence.push(`Docker Compose with ${services.length} services (${services.map((s) => s.name).join(', ')})`);
  }

  const supported = hasDockerfile || hasCompose;

  return {
    supported,
    hasDockerfile,
    dockerfile,
    baseImage,
    exposedPorts: Array.from(new Set(exposedPorts)),
    cmd,
    hasCompose,
    composeFile,
    services,
    runCommand: hasCompose ? 'docker compose up -d' : `docker build -t app . && docker run -p 3000:3000 app`,
    confidence: supported ? 'high' : 'low',
    evidence,
  };
}
