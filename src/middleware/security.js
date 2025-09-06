import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token']
};

// Rate limiting configuration
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// Different rate limits for different endpoints
export const generalRateLimit = createRateLimit(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  'Too many requests from this IP, please try again later'
);

export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // 10 attempts per 15 minutes (increased for testing)
  'Too many authentication attempts, please try again later'
);

export const paymentRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  3, // 3 payment attempts per minute
  'Too many payment attempts, please try again later'
);

// Security headers configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// CORS middleware
export const corsMiddleware = cors(corsOptions);

// Input validation middleware
export const validateInput = (req, res, next) => {
  // Basic input sanitization
  const sanitizeInput = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/[<>]/g, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeInput(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  // Note: req.query and req.params are read-only in Express, so we skip sanitizing them
  // Input validation will be handled in route handlers with proper validation libraries

  next();
};

// Security middleware setup
export const setupSecurityMiddleware = (app) => {
  // Trust proxy for rate limiting behind reverse proxy
  app.set('trust proxy', 1);
  
  // Security headers
  app.use(securityHeaders);
  
  // CORS
  app.use(corsMiddleware);
  
  // General rate limiting
  app.use(generalRateLimit);
  
  // Input validation
  app.use(validateInput);
  
  console.log('✅ Security middleware configured');
};
