require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

const SWIFT_AUTH_BASE_URL = process.env.SWIFT_AUTH_BASE_URL || 'https://sandbox.swift.com/oauth2/v1';
const CONSUMER_KEY = process.env.SWIFT_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.SWIFT_CONSUMER_SECRET;

let accessToken = null;
let refreshToken = null;
let tokenExpiresAt = 0;

// Function to generate a unique JWT ID
const generateJti = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Function to create a JWT (JSON Web Token)
const createJwt = (subjectDn) => {
  // IMPORTANT: In a production environment, you MUST securely load your PKI private key
  // and certificate. These should not be hardcoded or directly exposed.
  // Consider using a secure key management system or environment variables properly loaded.
  const privateKey = process.env.SWIFT_PRIVATE_KEY; // Your PKI private key in PEM format
  const x5cCertificate = process.env.SWIFT_X5C_CERTIFICATE; // Your public certificate chain (e.g., base64-encoded DER or PEM without headers/footers)

  if (!privateKey || !x5cCertificate) {
    throw new Error('SWIFT_PRIVATE_KEY and SWIFT_X5C_CERTIFICATE environment variables must be set for JWT signing.');
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + (5 * 60); // Token expires in 5 minutes (max 30 mins for Swift guidelines)

  const header = {
    alg: 'RS256', // Algorithm for signing, typically RS256 for channel certificates
    typ: 'JWT',
    x5c: [x5cCertificate] // Public certificate chain (or just the signing cert) for verification
  };

  const payload = {
    iss: CONSUMER_KEY, // Issuer: Your application's consumer key
    aud: `${SWIFT_AUTH_BASE_URL}/token`, // Audience: Swift's token endpoint
    sub: subjectDn, // Subject: Subject DN of your signing certificate
    jti: generateJti(), // JWT ID: Unique identifier for the JWT
    exp: exp, // Expiration time
    iat: now, // Issued at time
    nbf: now // Not before time (same as iat for immediate use)
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // --- CRITICAL: Implement actual cryptographic signing here ---
  // This is a placeholder. You need to replace this with your actual
  // cryptographic signing logic using a library like 'node-jose' or built-in 'crypto'.
  // The signature must be generated using your PKI private key.
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${encodedHeader}.${encodedPayload}`);
  const signature = signer.sign(privateKey, 'base64url');
  // --- END CRITICAL SECTION ---

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

// Function to request an access token
const requestAccessToken = async (subjectDn) => {
  try {
    const jwt = createJwt(subjectDn);
    const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');

    const response = await axios.post(
      `${SWIFT_AUTH_BASE_URL}/token`,
      new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
        scope: 'swift.preval' // Scope for Payment Pre-validation API
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      }
    );

    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;
    tokenExpiresAt = Math.floor(Date.now() / 1000) + response.data.expires_in;

    console.log('Access token obtained successfully.');
    return accessToken;
  } catch (error) {
    console.error('Error requesting access token:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Function to refresh the access token
const refreshAccessToken = async () => {
  if (!refreshToken) {
    throw new Error('No refresh token available. Please obtain a new access token.');
  }

  try {
    const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');

    const response = await axios.post(
      `${SWIFT_AUTH_BASE_URL}/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: 'swift.preval' // Scope for Payment Pre-validation API
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      }
    );

    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;
    tokenExpiresAt = Math.floor(Date.now() / 1000) + response.data.expires_in;

    console.log('Access token refreshed successfully.');
    return accessToken;
  } catch (error) {
    console.error('Error refreshing access token:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Function to get a valid access token (requests a new one if expired/not present)
const getAccessToken = async (subjectDn) => {
  if (!accessToken || Date.now() / 1000 >= tokenExpiresAt - 60) { // Refresh 60 seconds before expiry
    console.log('Access token expired or not present. Attempting to refresh or request new token.');
    if (refreshToken) {
      return await refreshAccessToken();
    } else {
      return await requestAccessToken(subjectDn);
    }
  }
  return accessToken;
};

// Function to dispose of the access token (revoke)
const disposeAccessToken = async () => {
  if (!accessToken) {
    console.log('No access token to dispose.');
    return;
  }

  try {
    const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');

    await axios.post(
      `${SWIFT_AUTH_BASE_URL}/revoke`,
      new URLSearchParams({
        token: accessToken
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      }
    );
    accessToken = null;
    refreshToken = null;
    tokenExpiresAt = 0;
    console.log('Access token disposed successfully.');
  } catch (error) {
    console.error('Error disposing access token:', error.response ? error.response.data : error.message);
    throw error;
  }
};

module.exports = {
  getAccessToken,
  disposeAccessToken,
  createJwt // Export for potential external testing or advanced usage
};
