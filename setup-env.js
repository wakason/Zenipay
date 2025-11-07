import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ENV_PATH = path.resolve(process.cwd(), '.env');

function generateSecret() {
  // 48 bytes -> 64 char base64url string approx; safe for env
  return crypto.randomBytes(48).toString('base64url');
}

function upsertKey(lines, key, value) {
  const idx = lines.findIndex((l) => l.trim().startsWith(key + '='));
  const entry = `${key}=${value}`;
  if (idx === -1) {
    lines.push(entry);
  } else {
    lines[idx] = entry;
  }
}

try {
  let content = '';
  if (fs.existsSync(ENV_PATH)) {
    content = fs.readFileSync(ENV_PATH, 'utf8');
  }
  const lines = content
    .split(/\r?\n/)
    .filter((l) => l.length > 0 && !/^#/.test(l));

  // Only set JWT_SECRET if missing, empty, or placeholder
  const jwtLineIndex = lines.findIndex((l) => /^JWT_SECRET=/.test(l));
  let needsSecret = true;
  if (jwtLineIndex !== -1) {
    const current = (lines[jwtLineIndex].split('=')[1] || '').trim();
    if (current && current.toLowerCase() !== 'change-me') {
      needsSecret = false;
    }
  }
  if (needsSecret) {
    const secret = generateSecret();
    upsertKey(lines, 'JWT_SECRET', secret);
  }

  // Ensure basic defaults exist if file was empty
  if (!lines.some((l) => l.startsWith('DB_HOST='))) upsertKey(lines, 'DB_HOST', 'localhost');
  if (!lines.some((l) => l.startsWith('DB_USER='))) upsertKey(lines, 'DB_USER', 'root');
  if (!lines.some((l) => l.startsWith('DB_PASSWORD='))) upsertKey(lines, 'DB_PASSWORD', '');
  if (!lines.some((l) => l.startsWith('DB_NAME='))) upsertKey(lines, 'DB_NAME', 'payment_portal');
  if (!lines.some((l) => l.startsWith('PORT='))) upsertKey(lines, 'PORT', '5000');
  if (!lines.some((l) => l.startsWith('NODE_ENV='))) upsertKey(lines, 'NODE_ENV', 'development');

  const finalContent = lines.join('\n') + '\n';
  fs.writeFileSync(ENV_PATH, finalContent, 'utf8');
  console.log('✅ .env ensured and JWT_SECRET set');
} catch (err) {
  console.error('❌ Failed to ensure .env:', err?.message || err);
  process.exit(0); // do not block install/start
}


