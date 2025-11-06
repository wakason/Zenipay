#!/usr/bin/env node
/**
 * SSL Certificate Generator for Development
 * Generates self-signed certificates for local development
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certsDir = path.join(__dirname, 'certs');
const keyPath = path.join(certsDir, 'server.key');
const certPath = path.join(certsDir, 'server.crt');

// Create certs directory if it doesn't exist
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

// Check if certificates already exist
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('✅ SSL certificates already exist');
  console.log(`   Key: ${keyPath}`);
  console.log(`   Cert: ${certPath}`);
  process.exit(0);
}

console.log('🔐 Generating self-signed SSL certificates for development...');

try {
  // Generate private key
  execSync(
    `openssl genrsa -out "${keyPath}" 2048`,
    { stdio: 'inherit' }
  );

  // Generate certificate signing request
  const csrPath = path.join(certsDir, 'server.csr');
  execSync(
    `openssl req -new -key "${keyPath}" -out "${csrPath}" -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=ZeniPay/OU=Development/CN=localhost"`,
    { stdio: 'inherit' }
  );

  // Generate self-signed certificate (valid for 365 days)
  execSync(
    `openssl x509 -req -days 365 -in "${csrPath}" -signkey "${keyPath}" -out "${certPath}" -extensions v3_req -extfile <(echo "[v3_req]"; echo "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1")`,
    { stdio: 'inherit' }
  );

  // Clean up CSR file
  if (fs.existsSync(csrPath)) {
    fs.unlinkSync(csrPath);
  }

  console.log('✅ SSL certificates generated successfully!');
  console.log(`   Key: ${keyPath}`);
  console.log(`   Cert: ${certPath}`);
  console.log('\n⚠️  These are self-signed certificates for development only.');
  console.log('   Your browser will show a security warning - this is expected.');
  console.log('   For production, use certificates from a trusted CA.\n');
} catch (error) {
  console.error('❌ Failed to generate SSL certificates:', error.message);
  console.log('\n💡 Alternative: Use mkcert for trusted local certificates:');
  console.log('   1. Install mkcert: https://github.com/FiloSottile/mkcert');
  console.log('   2. Run: mkcert -install');
  console.log('   3. Run: mkcert localhost 127.0.0.1');
  console.log('   4. Update .env with SSL_CERT_PATH and SSL_KEY_PATH\n');
  process.exit(1);
}

