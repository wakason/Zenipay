# Security Implementation Documentation

## Overview

This document outlines the comprehensive security measures implemented in the ZeniPay Payment Portal to meet Task 2 and Task 3 requirements.

## Security Features Implemented

### 1. Password Security ✅

**Implementation:**
- **Hashing:** Bcrypt with 12 salt rounds (configurable via `BCRYPT_SALT_ROUNDS`)
- **Location:** `src/utils/auth.js`
- **Functions:** `hashPassword()`, `verifyPassword()`
- **Validation:** Strong password requirements enforced:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&)

**Code Reference:**
```javascript
// Password hashing with salt
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};
```

### 2. Input Whitelisting with RegEx Patterns ✅

**Implementation:**
- **Location:** `src/utils/auth.js`, `src/utils/validation.ts`
- **Patterns Defined:**
  - `PASSWORD_REGEX`: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/`
  - `ACCOUNT_NUMBER_REGEX`: `/^[A-Z0-9]{6,20}$/`
  - `ID_NUMBER_REGEX`: `/^[0-9]{13}$/`
  - `SWIFT_CODE_REGEX`: `/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/`
  - `CURRENCY_REGEX`: `/^[A-Z]{3}$/`
  - `NAME_REGEX`: `/^[a-zA-Z\s]{2,100}$/`

**Validation Applied To:**
- Registration input (`validateRegistrationInput`)
- Login input (`validateLoginInput`)
- Payment input (`validatePaymentInput`)
- Query parameters (page, limit, status, customerId)
- URL parameters (transactionId)

### 3. SSL/TLS Configuration ✅

**Implementation:**
- **Location:** `src/server.js`, `scripts/generate-ssl-certs.js`
- **Features:**
  - Automatic SSL certificate detection
  - Self-signed certificate generation for development
  - Secure cipher suites configuration
  - TLS 1.2+ enforcement
  - HSTS (HTTP Strict Transport Security) headers

**Cipher Suites:**
- ECDHE-RSA-AES128-GCM-SHA256
- ECDHE-ECDSA-AES128-GCM-SHA256
- ECDHE-RSA-AES256-GCM-SHA384
- ECDHE-ECDSA-AES256-GCM-SHA384
- Weak ciphers explicitly disabled

**Usage:**
```bash
# Generate SSL certificates for development
npm run setup:ssl

# Production: Set environment variables
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

### 4. Protection Against Attacks ✅

#### 4.1 Session Jacking Protection
- **JWT Tokens:** Stateless authentication prevents session fixation
- **Token Expiration:** Configurable expiration (default: 1 hour)
- **Secure Token Generation:** Cryptographically secure random tokens
- **Token Validation:** Issuer and audience verification

#### 4.2 Clickjacking Protection
- **X-Frame-Options:** Set to `DENY` via Helmet
- **Content Security Policy:** `frameSrc: ["'none'"]` and `frameAncestors: ["'none'"]`
- **Location:** `src/middleware/security.js`

#### 4.3 SQL Injection Protection
- **Parameterized Queries:** All database queries use prepared statements
- **Pattern Detection:** Additional validation for SQL injection patterns in URL parameters
- **Example:**
```javascript
await pool.execute(
  'SELECT * FROM users WHERE accountNumber = ?',
  [accountNumber]
);
```

#### 4.4 Cross-Site Scripting (XSS) Protection
- **Input Sanitization:** Multi-layer sanitization in `validateInput` middleware
- **Removes:**
  - HTML tags (`<`, `>`)
  - JavaScript protocol (`javascript:`)
  - Event handlers (`onclick`, `onerror`, etc.)
  - HTML entities
- **Content Security Policy:** Restricts script sources to `'self'`
- **Location:** `src/middleware/security.js`

#### 4.5 Man-in-the-Middle (MITM) Protection
- **SSL/TLS:** All traffic encrypted in production
- **HSTS:** Forces HTTPS connections
- **Certificate Validation:** Proper certificate chain validation
- **Secure Cipher Suites:** Only strong ciphers allowed

#### 4.6 DDoS Protection
- **Rate Limiting:** Multiple tiers implemented
  - General API: 100 requests per 15 minutes
  - Authentication: 10 requests per 15 minutes (production)
  - Payment creation: 3 requests per minute
- **Location:** `src/middleware/security.js`
- **Implementation:** `express-rate-limit`

### 5. Employee Registration Prevention ✅

**Implementation:**
- **Location:** `src/routes/auth.js`
- **Checks:**
  1. Explicit role check: Rejects `employee` or `admin` roles
  2. Account number pattern: Blocks accounts starting with `EMP`
  3. Pre-registration: Employees created via `createDefaultEmployees()` function
- **Error Response:**
```json
{
  "error": "Employee registration is not allowed. Employees must be pre-registered by administrators.",
  "code": "EMPLOYEE_REGISTRATION_DISABLED"
}
```

### 6. Additional Security Headers ✅

**Implemented via Helmet.js:**
- `X-Frame-Options: DENY` - Clickjacking protection
- `X-Content-Type-Options: nosniff` - MIME type sniffing prevention
- `Referrer-Policy: strict-origin-when-cross-origin` - Privacy protection
- `X-DNS-Prefetch-Control: on` - DNS prefetch control
- `Expect-CT` - Certificate transparency
- `Content-Security-Policy` - XSS and injection protection
- `Strict-Transport-Security` - HSTS

### 7. DevSecOps Pipeline ✅

**CircleCI Configuration:**
- **Location:** `.circleci/config.yml`
- **Features:**
  - Automated builds on push
  - SonarQube integration for code quality
  - Test execution with coverage
  - Node.js 20.0 Docker image

**SonarQube Configuration:**
- **Location:** `sonar-project.properties`
- **Features:**
  - Code quality analysis
  - Security hotspot detection
  - Code smell identification
  - Coverage reporting

**Setup:**
1. Connect repository to CircleCI
2. Add SonarCloud token to CircleCI environment variables
3. Push code to trigger pipeline

## Security Checklist

### Task 2 Requirements ✅
- [x] Password security with hashing and salting
- [x] Whitelist all input using RegEx patterns
- [x] All traffic served over SSL
- [x] Protection against Session Jacking
- [x] Protection against Clickjacking
- [x] Protection against SQL Injection
- [x] Protection against XSS
- [x] Protection against MITM
- [x] Protection against DDoS

### Task 3 Requirements ✅
- [x] Users created (no registration process for employees)
- [x] Password security with hashing and salting
- [x] Whitelist all input using RegEx patterns
- [x] All traffic served over SSL
- [x] Protection against all listed attacks
- [x] GitHub repository with CircleCI pipeline
- [x] SonarQube scan for hotspots and code smells

## Testing Security Features

### Test Password Security
```bash
# Test password validation
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","idNumber":"1234567890123","accountNumber":"TEST001","password":"weak"}'
# Should return: Password validation error
```

### Test Input Whitelisting
```bash
# Test SQL injection attempt
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"accountNumber":"'\'' OR 1=1--","password":"test"}'
# Should return: Validation error
```

### Test Rate Limiting
```bash
# Make multiple rapid requests
for i in {1..20}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"accountNumber":"TEST","password":"test"}'
done
# Should return: Rate limit error after threshold
```

### Test Employee Registration Prevention
```bash
# Attempt employee registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Employee","idNumber":"1234567890123","accountNumber":"EMP999","password":"SecurePass123!","role":"employee"}'
# Should return: Employee registration disabled error
```

## Environment Variables

Required security-related environment variables:

```env
# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=1h

# SSL/TLS Configuration
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem

# Password Security
BCRYPT_SALT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
FRONTEND_URL=http://localhost:3000

# Environment
NODE_ENV=production
```

## Security Best Practices

1. **Never commit secrets:** Use environment variables
2. **Regular updates:** Keep dependencies updated
3. **Monitor logs:** Review audit logs regularly
4. **Certificate rotation:** Rotate SSL certificates annually
5. **Password policies:** Enforce strong password requirements
6. **Access control:** Implement role-based access control
7. **Audit trail:** All actions logged in `audit_logs` table

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)

