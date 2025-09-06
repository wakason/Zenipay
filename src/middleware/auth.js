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
    
    // Verify user still exists and is active
    const [users] = await pool.execute(
      'SELECT id, role, account_number, is_active FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ 
        error: 'User not found.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    const user = users[0];
    
    if (!user.is_active) {
      return res.status(401).json({ 
        error: 'Account is deactivated.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }
    
    // Add user info to request
    req.user = {
      id: user.id,
      role: user.role,
      accountNumber: user.account_number
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
        'SELECT id, role, account_number, is_active FROM users WHERE id = ?',
        [decoded.id]
      );
      
      if (users.length > 0 && users[0].is_active) {
        req.user = {
          id: users[0].id,
          role: users[0].role,
          accountNumber: users[0].account_number
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
          
          await pool.execute(
            'INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
            [
              req.user.id,
              action,
              JSON.stringify(details),
              req.ip || req.connection.remoteAddress,
              req.get('User-Agent')
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
