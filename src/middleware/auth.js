import { verifyToken, extractToken } from '../utils/auth.js';
import pool from '../config/db.js';

// Authentication middleware
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }
    
    const decoded = verifyToken(token);
    
    // Verify user still exists and is verified - using camelCase column names
    const [users] = await pool.execute(
      'SELECT id, role, accountNumber, isVerified FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ 
        error: 'User not found.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    const user = users[0];
    
    if (!user.isVerified) {
      return res.status(401).json({ 
        error: 'Account is not verified.',
        code: 'ACCOUNT_NOT_VERIFIED'
      });
    }
    
    // Add user info to request
    req.user = {
      id: user.id,
      role: user.role,
      accountNumber: user.accountNumber
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ 
      error: error.message || 'Invalid token.',
      code: 'INVALID_TOKEN'
    });
  }
};

// Role-based authorization middleware
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions.',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: userRole
      });
    }
    
    next();
  };
};

// Customer-only middleware
export const requireCustomer = requireRole('customer');

// Employee-only middleware  
export const requireEmployee = requireRole('employee');

// Admin-only middleware (for future use)
export const requireAdmin = requireRole('employee'); // For now, employees are admins

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);
    
    if (token) {
      const decoded = verifyToken(token);
      
      const [users] = await pool.execute(
        'SELECT id, role, accountNumber, isVerified FROM users WHERE id = ?',
        [decoded.id]
      );
      
      if (users.length > 0 && users[0].isVerified) {
        req.user = {
          id: users[0].id,
          role: users[0].role,
          accountNumber: users[0].accountNumber
        };
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Audit logging middleware
export const auditLog = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log the action after response is sent
    setImmediate(async () => {
      try {
        if (req.user && req.route) {
          const action = `${req.method} ${req.route.path}`;
          const details = {
            endpoint: req.originalUrl,
            method: req.method,
            statusCode: res.statusCode,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress
          };
          
          // Generate UUID for audit log id
          const crypto = await import('crypto');
          const auditLogId = crypto.randomUUID();
          
          // Extract transactionId from URL if present (e.g., /payments/123)
          const transactionIdMatch = req.originalUrl.match(/\/payments\/([^\/]+)/);
          const transactionId = transactionIdMatch ? transactionIdMatch[1] : null;
          
          // Using camelCase column names to match database schema
          await pool.execute(
            'INSERT INTO audit_logs (id, actorUserId, action, transactionId, details) VALUES (?, ?, ?, ?, ?)',
            [
              auditLogId,
              req.user.id,
              action,
              transactionId,
              JSON.stringify(details)
            ]
          );
        }
      } catch (error) {
        console.error('Audit logging error:', error);
      }
    });
    
    originalSend.call(this, data);
  };
  
  next();
};
