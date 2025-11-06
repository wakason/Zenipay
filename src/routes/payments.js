import express from 'express';
import pool from '../config/db.js';
import { validatePaymentInput } from '../utils/auth.js';
import { authenticateToken, requireCustomer, requireEmployee, auditLog } from '../middleware/auth.js';
import { paymentRateLimit } from '../middleware/security.js';
 // Import the new service

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
    
    // Generate UUID for transaction id (database uses VARCHAR(36) UUID)
    const crypto = await import('crypto');
    const transactionId = crypto.randomUUID();
    
    // Create transaction - using camelCase column names to match database schema
    const [result] = await pool.execute(
      `INSERT INTO transactions (id, userId, amount, currency, recipientAccount, swiftCode, recipientName, status, type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'swift')`,
      [
        transactionId,
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
        id: transactionId,
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
        recipientAccount AS payeeAccount,
        swiftCode AS swiftCode,
        recipientName AS payeeName,
        status,
        DATE_FORMAT(createdAt, '%Y-%m-%dT%H:%i:%s.000Z') AS createdAt,
        DATE_FORMAT(updatedAt, '%Y-%m-%dT%H:%i:%s.000Z') AS updatedAt
      FROM transactions 
      WHERE userId = ?
    `;
    let params = [req.user.id];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const [transactions] = await pool.execute(query, params);
    
    // Get total count - using camelCase column name
    let countQuery = 'SELECT COUNT(*) as total FROM transactions WHERE userId = ?';
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
    // Validate query parameters with RegEx patterns
    const { page = 1, limit = 10 } = req.query;
    
    // Validate page and limit are positive integers
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1 || !/^\d+$/.test(String(page))) {
      return res.status(400).json({ error: 'Page must be a positive integer' });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100 || !/^\d+$/.test(String(limit))) {
      return res.status(400).json({ error: 'Limit must be a positive integer between 1 and 100' });
    }
    
    const offset = (pageNum - 1) * limitNum;
    
    const [transactions] = await pool.execute(`
      SELECT 
        t.id,
        t.amount,
        t.currency,
        t.recipientAccount AS payeeAccount,
        t.swiftCode AS swiftCode,
        t.recipientName AS payeeName,
        t.status,
        DATE_FORMAT(t.createdAt, '%Y-%m-%dT%H:%i:%s.000Z') AS createdAt,
        DATE_FORMAT(t.updatedAt, '%Y-%m-%dT%H:%i:%s.000Z') AS updatedAt,
        u.fullName AS customerName,
        u.accountNumber AS customerAccount
      FROM transactions t
      JOIN users u ON t.userId = u.id
      WHERE t.status = 'pending'
      ORDER BY t.createdAt ASC
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
    
    // Validate transactionId format (UUID)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId)) {
      return res.status(400).json({ error: 'Invalid transaction ID format' });
    }
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
    
    // Update transaction status - database enum is ('pending','completed','failed')
    const newStatus = verified ? 'completed' : 'failed';
    await pool.execute(
      'UPDATE transactions SET status = ?, updatedAt = CURRENT_TIMESTAMP(6) WHERE id = ?',
      [newStatus, transactionId]
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
    
    // Validate transactionId format (UUID)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId)) {
      return res.status(400).json({ error: 'Invalid transaction ID format' });
    }
    
    // Check if transaction exists and is pending (can only submit pending transactions)
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
    
    // Simulate SWIFT submission
    // In a real system, this would make an API call to SWIFT
    const swiftSubmissionId = `SWIFT-${Date.now()}-${transactionId}`;
    
    // Generate UUID for audit log
    const crypto = await import('crypto');
    
    // Update transaction status
    await pool.execute(
      'UPDATE transactions SET status = "completed", updatedAt = CURRENT_TIMESTAMP(6) WHERE id = ?',
      [transactionId]
    );
    
    // Log SWIFT submission - using camelCase column names
    await pool.execute(
      'INSERT INTO audit_logs (id, actorUserId, action, transactionId, details) VALUES (?, ?, ?, ?, ?)',
      [
        crypto.randomUUID(),
        req.user.id,
        'SWIFT_SUBMISSION',
        transactionId,
        JSON.stringify({
          transactionId,
          swiftSubmissionId,
          amount: transaction.amount,
          currency: transaction.currency,
          payeeAccount: transaction.recipientAccount,
          swiftCode: transaction.swiftCode
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
    
    // Validate transactionId format (UUID)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId)) {
      return res.status(400).json({ error: 'Invalid transaction ID format' });
    }
    
    let query = `
      SELECT 
        t.id,
        t.amount,
        t.currency,
        t.recipientAccount AS payeeAccount,
        t.swiftCode AS swiftCode,
        t.recipientName AS payeeName,
        t.status,
        DATE_FORMAT(t.createdAt, '%Y-%m-%dT%H:%i:%s.000Z') AS createdAt,
        DATE_FORMAT(t.updatedAt, '%Y-%m-%dT%H:%i:%s.000Z') AS updatedAt,
        u.fullName AS customerName,
        u.accountNumber AS customerAccount
      FROM transactions t
      JOIN users u ON t.userId = u.id
      WHERE t.id = ?
    `;
    let params = [transactionId];
    
    // If customer, only show their own transactions
    if (req.user.role === 'customer') {
      query += ' AND t.userId = ?';
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
    // Validate query parameters with RegEx patterns
    const { page = 1, limit = 10, status, customerId } = req.query;
    
    // Validate page and limit are positive integers
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1 || !/^\d+$/.test(String(page))) {
      return res.status(400).json({ error: 'Page must be a positive integer' });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100 || !/^\d+$/.test(String(limit))) {
      return res.status(400).json({ error: 'Limit must be a positive integer between 1 and 100' });
    }
    
    // Validate status if provided (whitelist approach)
    if (status && !/^(pending|completed|failed)$/i.test(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be pending, completed, or failed' });
    }
    
    // Validate customerId if provided (UUID format)
    if (customerId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)) {
      return res.status(400).json({ error: 'Invalid customer ID format' });
    }
    
    const offset = (pageNum - 1) * limitNum;
    
    let query = `
      SELECT t.id, t.amount, t.currency,
             t.recipientAccount AS payeeAccount,
             t.swiftCode AS swiftCode,
             t.recipientName AS payeeName,
             t.status,
             DATE_FORMAT(t.createdAt, '%Y-%m-%dT%H:%i:%s.000Z') AS createdAt,
             DATE_FORMAT(t.updatedAt, '%Y-%m-%dT%H:%i:%s.000Z') AS updatedAt,
             u.fullName AS customerName, 
             u.accountNumber AS customerAccount
      FROM transactions t
      JOIN users u ON t.userId = u.id
      WHERE 1=1
    `;
    let params = [];
    
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    
    if (customerId) {
      query += ' AND t.userId = ?';
      params.push(customerId);
    }
    
    query += ' ORDER BY t.createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const [transactions] = await pool.execute(query, params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM transactions t
      JOIN users u ON t.userId = u.id
      WHERE 1=1
    `;
    let countParams = [];
    
    if (status) {
      countQuery += ' AND t.status = ?';
      countParams.push(status);
    }
    
    if (customerId) {
      countQuery += ' AND t.userId = ?';
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
