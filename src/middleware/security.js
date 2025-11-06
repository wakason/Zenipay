import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import dotenv from 'dotenv';
import csurf from 'csurf';
import crypto from 'crypto';

dotenv.config();

// CORS configuration
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    const isDev = (process.env.NODE_ENV || 'development') !== 'production';
    // Allow all origins in development to avoid local CORS issues
    if (isDev) {
      return callback(null, true);
    }
    // In production, restrict to configured origins
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
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
  (process.env.NODE_ENV === 'development' ? 50 : 10), // More lenient in development: 50 attempts per 15 minutes, 10 in production
  'Too many attempts. Please try again later'
);

export const paymentRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  3, // 3 payment attempts per minute
  'Too many payment attempts, please try again later'
);

// Security headers configuration with comprehensive protection
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Required for React inline styles
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"], // Prevents clickjacking
      frameAncestors: ["'none'"], // X-Frame-Options: DENY equivalent
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "same-origin" },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  xFrameOptions: { action: 'deny' }, // Explicit clickjacking protection
  xContentTypeOptions: true, // Prevents MIME type sniffing
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: false,
  xDnsPrefetchControl: true,
  expectCt: {
    maxAge: 86400,
    enforce: true
  }
});

// CORS middleware
export const corsMiddleware = cors(corsOptions);

// Enhanced input sanitization to prevent XSS attacks
const sanitizeInput = (obj) => {
  if (typeof obj === 'string') {
    // Remove potentially dangerous characters and scripts
    return obj
      .trim()
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers (onclick, onerror, etc.)
      .replace(/&#x?[0-9a-f]+;/gi, '') // Remove HTML entities that could be used for XSS
      .replace(/&[a-z]+;/gi, ''); // Remove HTML entities
  }
  if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeInput(item));
    }
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return obj;
};

// Validate query parameters against RegEx patterns
const validateQueryParams = (req, res, next) => {
  const query = req.query;
  const dangerousPatterns = [
    /[<>]/,
    /javascript:/i,
    /on\w+=/i,
    /script/i,
    /eval\(/i,
    /expression\(/i
  ];

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          return res.status(400).json({
            error: 'Invalid characters detected in query parameters',
            field: key
          });
        }
      }
    }
  }
  next();
};

// Input validation middleware
export const validateInput = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  
  // Validate query parameters
  validateQueryParams(req, res, () => {
    // Validate URL parameters
    const params = req.params;
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // Check for SQL injection patterns
        const sqlPatterns = [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
          /(--|#|\/\*|\*\/|;)/,
          /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i
        ];
        
        for (const pattern of sqlPatterns) {
          if (pattern.test(value)) {
            return res.status(400).json({
              error: 'Invalid characters detected in URL parameters',
              field: key
            });
          }
        }
      }
    }
    next();
  });
};

// CSRF protection middleware (skip for API endpoints that use tokens)
export const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600 // 1 hour
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS']
});

// CSRF token generator for API endpoints (alternative to cookie-based CSRF)
export const generateCsrfToken = (req, res, next) => {
  // Generate CSRF token for API clients
  const token = crypto.randomBytes(32).toString('hex');
  res.setHeader('X-CSRF-Token', token);
  // Store token in session or return in response for client to use
  req.csrfToken = token;
  next();
};

// Security middleware setup
export const setupSecurityMiddleware = (app) => {
  // Trust proxy for rate limiting behind reverse proxy
  app.set('trust proxy', 1);
  
  // Security headers (must be first)
  app.use(securityHeaders);
  
  // CORS
  app.use(corsMiddleware);
  
  // General rate limiting
  app.use(generalRateLimit);
  
  // Input validation and sanitization
  app.use(validateInput);
  
  // CSRF protection for non-API routes (if using session-based auth)
  // For API routes using JWT, CSRF is handled via token validation
  // Uncomment if you add session-based routes:
  // app.use('/api', csrfProtection);
  
  console.log('✅ Security middleware configured');
  console.log('   - Helmet security headers enabled');
  console.log('   - CORS configured');
  console.log('   - Rate limiting active');
  console.log('   - Input sanitization enabled');
  console.log('   - XSS protection enabled');
  console.log('   - Clickjacking protection enabled');
  console.log('   - SQL injection protection via parameterized queries');
};
