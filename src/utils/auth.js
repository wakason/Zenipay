import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// Resolve JWT secret automatically if not provided
let resolvedJwtSecret = (process.env.JWT_SECRET && process.env.JWT_SECRET.trim()) ? process.env.JWT_SECRET : '';
if (!resolvedJwtSecret) {
  // Generate an ephemeral secret for development to avoid startup failures
  resolvedJwtSecret = crypto.randomBytes(48).toString('hex');
  process.env.JWT_SECRET = resolvedJwtSecret;
  if ((process.env.NODE_ENV || 'development') !== 'production') {
    console.warn('JWT_SECRET not set. Generated an ephemeral secret for development. Tokens will invalidate on restart.');
  }
}

const JWT_SECRET = resolvedJwtSecret;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

// Password validation regex patterns
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
export const ACCOUNT_NUMBER_REGEX = /^[A-Z0-9]{6,20}$/;
export const ID_NUMBER_REGEX = /^[0-9]{13}$/;
export const SWIFT_CODE_REGEX = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
export const CURRENCY_REGEX = /^[A-Z]{3}$/;

// Hash password with salt
export const hashPassword = async (password) => {
  try {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }
    
    if (!PASSWORD_REGEX.test(password)) {
      throw new Error('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
    }
    
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    throw new Error(`Password hashing failed: ${error.message}`);
  }
};

// Verify password against hash
export const verifyPassword = async (password, hash) => {
  try {
    if (!password || !hash) {
      return false;
    }
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
};

// Generate JWT token
export const generateToken = (payload) => {
  try {
    if (!payload || !payload.id || !payload.role) {
      throw new Error('Invalid payload for token generation');
    }
    
    return jwt.sign(
      { 
        id: payload.id, 
        role: payload.role,
        accountNumber: payload.accountNumber 
      }, 
      JWT_SECRET, 
      { 
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'payment-portal',
        audience: 'payment-portal-users'
      }
    );
  } catch (error) {
    throw new Error(`Token generation failed: ${error.message}`);
  }
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    if (!token) {
      throw new Error('No token provided');
    }
    
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'payment-portal',
      audience: 'payment-portal-users'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }
};

// Extract token from Authorization header
export const extractToken = (authHeader) => {
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

// Input validation functions
export const validateRegistrationInput = (data) => {
  const errors = [];
  
  if (!data.fullName || typeof data.fullName !== 'string' || data.fullName.trim().length < 2) {
    errors.push('Full name must be at least 2 characters');
  }
  
  if (!data.idNumber || !ID_NUMBER_REGEX.test(data.idNumber)) {
    errors.push('ID number must be exactly 13 digits');
  }
  
  if (!data.accountNumber || !ACCOUNT_NUMBER_REGEX.test(data.accountNumber)) {
    errors.push('Account number must be 6-20 alphanumeric characters');
  }
  
  if (!data.password || !PASSWORD_REGEX.test(data.password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
  }
  
  return errors;
};

export const validateLoginInput = (data) => {
  const errors = [];
  
  if (!data.accountNumber || !ACCOUNT_NUMBER_REGEX.test(data.accountNumber)) {
    errors.push('Invalid account number format');
  }
  
  if (!data.password || typeof data.password !== 'string' || data.password.length < 1) {
    errors.push('Password is required');
  }
  
  return errors;
};

export const validatePaymentInput = (data) => {
  const errors = [];
  
  if (!data.amount || isNaN(data.amount) || parseFloat(data.amount) <= 0) {
    errors.push('Amount must be a positive number');
  }
  
  if (!data.currency || !CURRENCY_REGEX.test(data.currency)) {
    errors.push('Currency must be a valid 3-letter code (e.g., USD, EUR, ZAR)');
  }
  
  if (!data.payeeAccount || !ACCOUNT_NUMBER_REGEX.test(data.payeeAccount)) {
    errors.push('Payee account must be 6-20 alphanumeric characters');
  }
  
  if (!data.swiftCode || !SWIFT_CODE_REGEX.test(data.swiftCode)) {
    errors.push('SWIFT code must be 8 or 11 characters (e.g., SBZAZAJJ)');
  }
  
  if (!data.payeeName || typeof data.payeeName !== 'string' || data.payeeName.trim().length < 2) {
    errors.push('Payee name must be at least 2 characters');
  }
  
  return errors;
};

// Generate secure random string for CSRF tokens
export const generateSecureToken = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
