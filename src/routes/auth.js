import express from 'express';
import pool from '../config/db.js';
import { 
  hashPassword, 
  verifyPassword, 
  generateToken, 
  validateRegistrationInput, 
  validateLoginInput 
} from '../utils/auth.js';
import { authRateLimit } from '../middleware/security.js';
import { auditLog } from '../middleware/auth.js';

const router = express.Router();

// Apply rate limiting only to login and registration routes
router.use('/login', authRateLimit);
router.use('/register', authRateLimit);

// Apply audit logging
router.use(auditLog);

// Customer Registration
router.post('/register', async (req, res) => {
  try {
    const { fullName, idNumber, accountNumber, password, role } = req.body;
    
    // CRITICAL: Prevent employee registration - employees must be pre-registered
    if (role === 'employee' || role === 'admin') {
      return res.status(403).json({ 
        error: 'Employee registration is not allowed. Employees must be pre-registered by administrators.',
        code: 'EMPLOYEE_REGISTRATION_DISABLED'
      });
    }
    
    // Additional check: Prevent registration with employee account numbers
    if (accountNumber && accountNumber.toUpperCase().startsWith('EMP')) {
      return res.status(403).json({ 
        error: 'Invalid account number format. Employee accounts cannot be registered through this endpoint.',
        code: 'INVALID_ACCOUNT_FORMAT'
      });
    }
    
    // Validate input
    const validationErrors = validateRegistrationInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }
    
    // Check if user already exists - using camelCase column names
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE idNumber = ? OR accountNumber = ?',
      [idNumber, accountNumber]
    );
    
    if (existingUsers.length > 0) {
      return res.status(409).json({ 
        error: 'User already exists with this ID number or account number' 
      });
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Generate UUID for id field (database uses VARCHAR(36) UUID, not INT)
    const crypto = await import('crypto');
    const userId = crypto.randomUUID();
    
    // Create user - using camelCase column names to match database schema
    const [result] = await pool.execute(
      `INSERT INTO users (id, username, fullName, idNumber, accountNumber, password, role, isVerified) 
       VALUES (?, ?, ?, ?, ?, ?, 'customer', 1)`,
      [userId, accountNumber.toUpperCase(), fullName.trim(), idNumber, accountNumber.toUpperCase(), passwordHash]
    );
    
    // Generate token
    const token = generateToken({ 
      id: userId, 
      role: 'customer',
      accountNumber: accountNumber.toUpperCase()
    });
    
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: userId,
        fullName: fullName.trim(),
        accountNumber: accountNumber.toUpperCase(),
        role: 'customer'
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    const isDev = (process.env.NODE_ENV || 'development') !== 'production';
    if (error.message && error.message.includes('Password hashing failed')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        error: 'User already exists with this ID number or account number' 
      });
    }
    res.status(500).json({ 
      error: 'Registration failed. Please try again.',
      ...(isDev && { details: error.message, code: error.code, sqlMessage: error.sqlMessage })
    });
  }
});

// Login (Customer & Employee)
router.post('/login', async (req, res) => {
  try {
    const { accountNumber, password } = req.body;
    
    // Validate input
    const validationErrors = validateLoginInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }
    
    // Find user - using camelCase column names to match database schema
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE accountNumber = ? AND isVerified = 1',
      [accountNumber.toUpperCase()]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }
    
    const user = users[0];
    
    // Verify password - using camelCase column name
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }
    
    // Generate token
    const token = generateToken({ 
      id: user.id, 
      role: user.role,
      accountNumber: user.accountNumber
    });
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        accountNumber: user.accountNumber,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    const isDev = (process.env.NODE_ENV || 'development') !== 'production';
    res.status(500).json({ 
      error: 'Login failed. Please try again.',
      ...(isDev && { details: error.message, code: error.code, sqlMessage: error.sqlMessage })
    });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const { verifyToken } = await import('../utils/auth.js');
    const decoded = verifyToken(token);
    
    const [users] = await pool.execute(
      'SELECT id, fullName, accountNumber, role, createdAt FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    res.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        accountNumber: user.accountNumber,
        role: user.role,
        createdAt: user.createdAt
      }
    });
    
  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

// Change password
router.put('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const { verifyToken } = await import('../utils/auth.js');
    const decoded = verifyToken(token);
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    // Get user - using camelCase column name
    const [users] = await pool.execute(
      'SELECT password FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password - using camelCase column name
    const isValidPassword = await verifyPassword(currentPassword, users[0].password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Validate new password
    const { validateRegistrationInput } = await import('../utils/auth.js');
    const validationErrors = validateRegistrationInput({ 
      fullName: 'dummy', 
      idNumber: '1234567890123', 
      accountNumber: 'DUMMY123', 
      password: newPassword 
    });
    
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'New password validation failed', 
        details: validationErrors 
      });
    }
    
    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);
    
    // Update password - using camelCase column name
    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [newPasswordHash, decoded.id]
    );
    
    res.json({ message: 'Password changed successfully' });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

export default router;
