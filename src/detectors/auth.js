/**
 * Authentication & Authorization detector per PRD Section 4.5.
 */
export async function detectAuth(context) {
  const methods = [];
  const evidence = [];

  const pkg = context.readJson('package.json');
  const allDeps = pkg ? { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) } : {};
  const hasDep = (name) => Boolean(allDeps[name]);

  if (hasDep('jsonwebtoken') || hasDep('jose') || hasDep('jwt-decode')) {
    methods.push('JWT (JSON Web Tokens)');
    evidence.push('JWT token library detected');
  }

  if (hasDep('next-auth') || hasDep('@auth/core')) {
    methods.push('NextAuth.js / Auth.js');
    evidence.push('NextAuth.js detected');
  }

  if (hasDep('passport')) {
    methods.push('Passport.js authentication middleware');
    evidence.push('Passport.js detected');
  }

  if (hasDep('lucia')) {
    methods.push('Lucia Auth session management');
    evidence.push('Lucia Auth detected');
  }

  if (hasDep('@clerk/nextjs') || hasDep('@clerk/clerk-react') || hasDep('@clerk/clerk-sdk-node')) {
    methods.push('Clerk User Authentication');
    evidence.push('Clerk SDK detected');
  }

  if (hasDep('@supabase/supabase-js') || hasDep('@supabase/auth-helpers-nextjs')) {
    methods.push('Supabase Authentication & RLS');
    evidence.push('Supabase Auth detected');
  }

  if (hasDep('bcrypt') || hasDep('bcryptjs') || hasDep('argon2')) {
    const alg = hasDep('argon2') ? 'Argon2' : 'bcrypt';
    methods.push(`Password hashing with ${alg}`);
    evidence.push(`${alg} detected`);
  }

  // Python Auth
  const reqFiles = context.findFiles(/requirements.*\.txt/);
  for (const f of reqFiles) {
    const c = context.readFile(f) || '';
    if (/pyjwt|python-jose/i.test(c)) methods.push('JWT (JSON Web Tokens)');
    if (/passlib|bcrypt/i.test(c)) methods.push('Password hashing (bcrypt/passlib)');
    if (/authlib/i.test(c)) methods.push('OAuth / OpenID Connect (Authlib)');
  }

  const found = methods.length > 0;

  return {
    found,
    methods: Array.from(new Set(methods)),
    confidence: found ? 'high' : 'low',
    evidence,
  };
}
