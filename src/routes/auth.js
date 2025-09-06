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
    const { fullName, idNumber, accountNumber, password } = req.body;
    
    // Validate input
    const validationErrors = validateRegistrationInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }
    
    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE id_number = ? OR account_number = ?',
      [idNumber, accountNumber]
    );
    
    if (existingUsers.length > 0) {
      return res.status(409).json({ 
        error: 'User already exists with this ID number or account number' 
      });
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create user
    const [result] = await pool.execute(
      `INSERT INTO users (full_name, id_number, account_number, password_hash, role) 
       VALUES (?, ?, ?, ?, 'customer')`,
      [fullName.trim(), idNumber, accountNumber.toUpperCase(), passwordHash]
    );
    
    // Generate token
    const token = generateToken({ 
      id: result.insertId, 
      role: 'customer',
      accountNumber: accountNumber.toUpperCase()
    });
    
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: result.insertId,
        fullName: fullName.trim(),
        accountNumber: accountNumber.toUpperCase(),
        role: 'customer'
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.message.includes('Password hashing failed')) {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        error: 'User already exists with this ID number or account number' 
      });
    }
    
    res.status(500).json({ 
      error: 'Registration failed. Please try again.' 
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
    
    // Find user
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE account_number = ? AND is_active = true',
      [accountNumber.toUpperCase()]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }
    
    const user = users[0];
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }
    
    // Generate token
    const token = generateToken({ 
      id: user.id, 
      role: user.role,
      accountNumber: user.account_number
    });
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        accountNumber: user.account_number,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed. Please try again.' 
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
      'SELECT id, full_name, account_number, role, created_at FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    res.json({
      user: {
        id: user.id,
        fullName: user.full_name,
        accountNumber: user.account_number,
        role: user.role,
        createdAt: user.created_at
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
    
    // Get user
    const [users] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, users[0].password_hash);
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
    
    // Update password
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, decoded.id]
    );
    
    res.json({ message: 'Password changed successfully' });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

export default router;
