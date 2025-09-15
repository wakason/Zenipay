import express from 'express';
import pool from '../config/db.js';
import { validatePaymentInput } from '../utils/auth.js';
import { authenticateToken, requireCustomer, requireEmployee, auditLog } from '../middleware/auth.js';
import { paymentRateLimit } from '../middleware/security.js';
import { verifyBeneficiaryAccount, validateDataProvider } from '../services/swiftPreValidationService.js'; // Import the new service

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(auditLog);

// Create new payment (Customer only)
router.post('/create', requireCustomer, paymentRateLimit, async (req, res) => {
  try {
    const { amount, currency, payeeAccount, swiftCode, payeeName } = req.body;
    
    // Validate input
    const validationErrors = validatePaymentInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }
    
    // Check if customer has sufficient balance (mock check)
    // In a real system, you'd check against account balance
    const parsedAmount = parseFloat(amount);
    if (parsedAmount > 100000) { // Mock limit
      return res.status(400).json({ 
        error: 'Amount exceeds maximum limit of 100,000' 
      });
    }
    
    // Create transaction
    const [result] = await pool.execute(
      `INSERT INTO transactions (customer_id, amount, currency, payee_account, swift_code, payee_name, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        req.user.id,
        parsedAmount,
        currency.toUpperCase(),
        payeeAccount.toUpperCase(),
        swiftCode.toUpperCase(),
        payeeName.trim()
      ]
    );
    
    res.status(201).json({
      message: 'Payment created successfully',
      transaction: {
        id: result.insertId,
        amount: parsedAmount,
        currency: currency.toUpperCase(),
        payeeAccount: payeeAccount.toUpperCase(),
        swiftCode: swiftCode.toUpperCase(),
        payeeName: payeeName.trim(),
        status: 'pending',
        createdAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ 
      error: 'Payment creation failed. Please try again.' 
    });
  }
});

// Get customer's transactions
router.get('/my-transactions', requireCustomer, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT 
        id,
        amount,
        currency,
        payee_account AS payeeAccount,
        swift_code AS swiftCode,
        payee_name AS payeeName,
        status,
        DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.000Z') AS createdAt,
        DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s.000Z') AS updatedAt
      FROM transactions 
      WHERE customer_id = ?
    `;
    let params = [req.user.id];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const [transactions] = await pool.execute(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM transactions WHERE customer_id = ?';
    let countParams = [req.user.id];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    
    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve transactions' 
    });
  }
});

// Get all pending transactions (Employee only)
router.get('/pending', requireEmployee, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const [transactions] = await pool.execute(`
      SELECT 
        t.id,
        t.amount,
        t.currency,
        t.payee_account AS payeeAccount,
        t.swift_code AS swiftCode,
        t.payee_name AS payeeName,
        t.status,
        DATE_FORMAT(t.created_at, '%Y-%m-%dT%H:%i:%s.000Z') AS createdAt,
        DATE_FORMAT(t.updated_at, '%Y-%m-%dT%H:%i:%s.000Z') AS updatedAt,
        u.full_name AS customerName,
        u.account_number AS customerAccount
      FROM transactions t
      JOIN users u ON t.customer_id = u.id
      WHERE t.status = 'pending'
      ORDER BY t.created_at ASC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), offset]);
    
    // Get total count
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM transactions WHERE status = "pending"'
    );
    const total = countResult[0].total;
    
    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Get pending transactions error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve pending transactions' 
    });
  }
});

// Verify transaction (Employee only)
router.put('/verify/:transactionId', requireEmployee, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { verified, notes } = req.body;
    
    if (typeof verified !== 'boolean') {
      return res.status(400).json({ 
        error: 'Verified field must be a boolean' 
      });
    }
    
    // Check if transaction exists and is pending
    const [transactions] = await pool.execute(
      'SELECT * FROM transactions WHERE id = ? AND status = "pending"',
      [transactionId]
    );
    
    if (transactions.length === 0) {
      return res.status(404).json({ 
        error: 'Transaction not found or already processed' 
      });
    }
    
    const transaction = transactions[0];
    
    // Update transaction status
    const newStatus = verified ? 'verified' : 'rejected';
    await pool.execute(
      'UPDATE transactions SET status = ?, employee_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, notes || null, transactionId]
    );
    
    res.json({
      message: `Transaction ${verified ? 'verified' : 'rejected'} successfully`,
      transaction: {
        id: transactionId,
        status: newStatus,
        notes: notes || null
      }
    });
    
  } catch (error) {
    console.error('Transaction verification error:', error);
    res.status(500).json({ 
      error: 'Transaction verification failed' 
    });
  }
});

// Submit to SWIFT (Employee only)
router.post('/submit-to-swift/:transactionId', requireEmployee, async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    // Check if transaction exists and is verified
    const [transactions] = await pool.execute(
      'SELECT * FROM transactions WHERE id = ? AND status = "verified"',
      [transactionId]
    );
    
    if (transactions.length === 0) {
      return res.status(404).json({ 
        error: 'Transaction not found or not verified' 
      });
    }
    
    const transaction = transactions[0];
    
    // Simulate SWIFT submission
    // In a real system, this would make an API call to SWIFT
    const swiftSubmissionId = `SWIFT-${Date.now()}-${transactionId}`;
    
    // Update transaction status
    await pool.execute(
      'UPDATE transactions SET status = "completed", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [transactionId]
    );
    
    // Log SWIFT submission
    await pool.execute(
      'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
      [
        req.user.id,
        'SWIFT_SUBMISSION',
        JSON.stringify({
          transactionId,
          swiftSubmissionId,
          amount: transaction.amount,
          currency: transaction.currency,
          payeeAccount: transaction.payee_account,
          swiftCode: transaction.swift_code
        })
      ]
    );
    
    res.json({
      message: 'Transaction submitted to SWIFT successfully',
      swiftSubmissionId,
      transaction: {
        id: transactionId,
        status: 'completed',
        submittedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('SWIFT submission error:', error);
    res.status(500).json({ 
      error: 'SWIFT submission failed' 
    });
  }
});

// Payment Pre-validation (Employee only)
router.post('/pre-validate-account', requireEmployee, async (req, res) => {
  try {
    const { accountDetails, subjectDn } = req.body; // subjectDn should be securely managed, potentially derived from employee's identity

    if (!accountDetails || !subjectDn) {
      return res.status(400).json({ error: 'Missing accountDetails or subjectDn' });
    }

    const validationResult = await verifyBeneficiaryAccount(accountDetails, subjectDn);
    res.json(validationResult);
  } catch (error) {
    console.error('Payment pre-validation error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Payment pre-validation failed' });
  }
});

// Validate Data Provider (Employee only)
router.post('/validate-data-provider', requireEmployee, async (req, res) => {
  try {
    const { partyAgentDetails, subjectDn } = req.body; // subjectDn should be securely managed

    if (!partyAgentDetails || !subjectDn) {
      return res.status(400).json({ error: 'Missing partyAgentDetails or subjectDn' });
    }

    const validationResult = await validateDataProvider(partyAgentDetails, subjectDn);
    res.json(validationResult);
  } catch (error) {
    console.error('Data provider validation error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Data provider validation failed' });
  }
});

// Get transaction details
router.get('/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    let query = `
      SELECT 
        t.id,
        t.amount,
        t.currency,
        t.payee_account AS payeeAccount,
        t.swift_code AS swiftCode,
        t.payee_name AS payeeName,
        t.status,
        DATE_FORMAT(t.created_at, '%Y-%m-%dT%H:%i:%s.000Z') AS createdAt,
        DATE_FORMAT(t.updated_at, '%Y-%m-%dT%H:%i:%s.000Z') AS updatedAt,
        u.full_name AS customerName,
        u.account_number AS customerAccount
      FROM transactions t
      JOIN users u ON t.customer_id = u.id
      WHERE t.id = ?
    `;
    let params = [transactionId];
    
    // If customer, only show their own transactions
    if (req.user.role === 'customer') {
      query += ' AND t.customer_id = ?';
      params.push(req.user.id);
    }
    
    const [transactions] = await pool.execute(query, params);
    
    if (transactions.length === 0) {
      return res.status(404).json({ 
        error: 'Transaction not found' 
      });
    }
    
    res.json({
      transaction: transactions[0]
    });
    
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve transaction' 
    });
  }
});

// Get all transactions (Employee only)
router.get('/', requireEmployee, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, customerId } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT t.id, t.amount, t.currency,
             t.payee_account AS payeeAccount,
             t.swift_code AS swiftCode,
             t.payee_name AS payeeName,
             t.status,
             DATE_FORMAT(t.created_at, '%Y-%m-%dT%H:%i:%s.000Z') AS createdAt,
             DATE_FORMAT(t.updated_at, '%Y-%m-%dT%H:%i:%s.000Z') AS updatedAt,
             u.full_name AS customerName, 
             u.account_number AS customerAccount
      FROM transactions t
      JOIN users u ON t.customer_id = u.id
      WHERE 1=1
    `;
    let params = [];
    
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    
    if (customerId) {
      query += ' AND t.customer_id = ?';
      params.push(customerId);
    }
    
    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const [transactions] = await pool.execute(query, params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM transactions t
      JOIN users u ON t.customer_id = u.id
      WHERE 1=1
    `;
    let countParams = [];
    
    if (status) {
      countQuery += ' AND t.status = ?';
      countParams.push(status);
    }
    
    if (customerId) {
      countQuery += ' AND t.customer_id = ?';
      countParams.push(customerId);
    }
    
    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve transactions' 
    });
  }
});

export default router;
