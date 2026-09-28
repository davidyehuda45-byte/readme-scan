/**
 * Database detector per PRD Section 4.2.
 * Detects database types, ORM, models, and migration commands.
 */
export async function detectDatabase(context) {
  const databases = new Set();
  const orms = new Set();
  const models = [];
  const evidence = [];
  let migrationCommand = '';

  // 1. Prisma
  const prismaSchemaPath = context.files.find((f) => f.endsWith('schema.prisma'));
  if (prismaSchemaPath) {
    orms.add('Prisma');
    evidence.push(`Prisma schema found at ${prismaSchemaPath}`);
    migrationCommand = 'npx prisma migrate dev';

    const content = context.readFile(prismaSchemaPath) || '';
    // Detect provider
    const providerMatch = content.match(/provider\s*=\s*["']([^"']+)["']/);
    if (providerMatch) {
      databases.add(formatDbName(providerMatch[1]));
    }

    // Extract models
    const modelBlocks = content.matchAll(/model\s+([A-Za-z0-9_]+)\s*\{([^}]+)\}/g);
    for (const match of modelBlocks) {
      const modelName = match[1];
      const fields = match[2]
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('//') && !l.startsWith('@@'));
      models.push({
        name: modelName,
        fieldsCount: fields.length,
      });
    }
  }

  // 2. Drizzle ORM
  if (context.hasFile('drizzle.config.ts') || context.hasFile('drizzle.config.js')) {
    orms.add('Drizzle ORM');
    evidence.push('Drizzle configuration detected');
    migrationCommand = 'npx drizzle-kit push';
  }

  // 3. TypeORM
  if (context.findFiles(/ormconfig\.(json|ts|js)/).length > 0) {
    orms.add('TypeORM');
    evidence.push('TypeORM configuration detected');
    migrationCommand = 'npm run typeorm migration:run';
  }

  // 4. Django models & migrations
  if (context.hasDir('migrations') && (context.hasFile('manage.py') || context.hasFile('wsgi.py'))) {
    orms.add('Django ORM');
    databases.add('Relational Database');
    migrationCommand = 'python manage.py migrate';
    evidence.push('Django migrations directory detected');
  }

  // 5. Alembic (SQLAlchemy)
  if (context.hasFile('alembic.ini')) {
    orms.add('SQLAlchemy (Alembic)');
    migrationCommand = 'alembic upgrade head';
    evidence.push('Alembic migration configuration detected');
  }

  // 6. Docker Compose database services
  const composeFiles = context.findFiles(/docker-compose.*\.ya?ml|compose.*\.ya?ml/);
  for (const cf of composeFiles) {
    const content = context.readFile(cf) || '';
    if (/image:.*postgres/i.test(content)) databases.add('PostgreSQL');
    if (/image:.*mysql/i.test(content)) databases.add('MySQL');
    if (/image:.*mariadb/i.test(content)) databases.add('MariaDB');
    if (/image:.*mongo/i.test(content)) databases.add('MongoDB');
    if (/image:.*redis/i.test(content)) databases.add('Redis');
  }

  // 7. Check package.json / requirements dependencies for databases
  const pkg = context.readJson('package.json');
  if (pkg) {
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    if (deps.pg) databases.add('PostgreSQL');
    if (deps.mysql2 || deps.mysql) databases.add('MySQL');
    if (deps.sqlite3 || deps['better-sqlite3']) databases.add('SQLite');
    if (deps.mongodb || deps.mongoose) databases.add('MongoDB');
    if (deps.redis || deps.ioredis) databases.add('Redis');
    if (deps.sequelize) orms.add('Sequelize');
    if (deps.typeorm) orms.add('TypeORM');
  }

  const found = databases.size > 0 || orms.size > 0 || models.length > 0;

  return {
    found,
    databases: Array.from(databases),
    orms: Array.from(orms),
    models,
    migrationCommand,
    confidence: found ? 'high' : 'low',
    evidence,
  };
}

function formatDbName(provider) {
  const map = {
    postgresql: 'PostgreSQL',
    postgres: 'PostgreSQL',
    mysql: 'MySQL',
    sqlite: 'SQLite',
    mongodb: 'MongoDB',
    sqlserver: 'Microsoft SQL Server',
    cockroachdb: 'CockroachDB',
  };
  return map[provider.toLowerCase()] || provider;
}
