import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'payment_portal',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    // Auto-create database if it doesn't exist, then retry once
    if (error && (error.code === 'ER_BAD_DB_ERROR' || /Unknown database/i.test(error.message))) {
      try {
        const adminConn = await mysql.createConnection({
          host: dbConfig.host,
          user: dbConfig.user,
          password: dbConfig.password,
          port: dbConfig.port
        });
        const dbName = String(dbConfig.database).replace(/`/g, '');
        const createDbSql = 'CREATE DATABASE IF NOT EXISTS `' + dbName + '`';
        await adminConn.execute(createDbSql);
        await adminConn.end();
        console.log(`✅ Database "${dbConfig.database}" created/verified`);
        const retry = await pool.getConnection();
        console.log('✅ Database connected successfully (after create)');
        retry.release();
        return;
      } catch (createErr) {
        console.error('❌ Failed to create database:', createErr.message);
        process.exit(1);
      }
    }
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Initialize database tables
const initializeDatabase = async () => {
  try {
    // Create users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        id_number VARCHAR(50) UNIQUE NOT NULL,
        account_number VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('customer', 'employee') DEFAULT 'customer',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create transactions table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) NOT NULL,
        payee_account VARCHAR(50) NOT NULL,
        swift_code VARCHAR(20) NOT NULL,
        payee_name VARCHAR(100),
        status ENUM('pending', 'verified', 'completed', 'rejected') DEFAULT 'pending',
        employee_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create audit_logs table for security tracking
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
  }
};

// Create or update default employee accounts (idempotent)
const createDefaultEmployees = async () => {
  try {
    const bcrypt = await import('bcrypt');
    const crypto = await import('crypto');

    const employees = [
      {
        username: 'EMP001',
        fullName: 'Admin User',
        idNumber: 'EMP001',
        accountNumber: 'EMP001',
        password: 'Admin123!',
      },
      {
        username: 'EMP002',
        fullName: 'Bank Manager',
        idNumber: 'EMP002', 
        accountNumber: 'EMP002',
        password: 'Manager123!',
      }
    ];

    for (const employee of employees) {
      const hashedPassword = await bcrypt.hash(employee.password, 12);
      
      // Check if employee already exists
      const [existing] = await pool.execute(
        'SELECT id FROM users WHERE accountNumber = ? OR username = ?',
        [employee.accountNumber, employee.username]
      );
      
      if (existing.length > 0) {
        // Update existing employee
        await pool.execute(
          `UPDATE users 
           SET fullName = ?, idNumber = ?, password = ?, role = 'employee', isVerified = 1
           WHERE accountNumber = ?`,
          [employee.fullName, employee.idNumber, hashedPassword, employee.accountNumber]
        );
      } else {
        // Insert new employee - using camelCase column names and UUID
        const userId = crypto.randomUUID();
        await pool.execute(
          `INSERT INTO users (id, username, fullName, accountNumber, idNumber, password, role, isVerified)
           VALUES (?, ?, ?, ?, ?, ?, 'employee', 1)`,
          [userId, employee.username, employee.fullName, employee.accountNumber, employee.idNumber, hashedPassword]
        );
      }
    }

    console.log('✅ Default employee accounts ensured');
    console.log('📋 Employee Login Credentials:');
    console.log('   Admin: accountNumber=EMP001, password=Admin123!');
    console.log('   Manager: accountNumber=EMP002, password=Manager123!');
  } catch (error) {
    console.error('❌ Failed to ensure default employees:', error.message);
  }
};

export { pool, testConnection, initializeDatabase, createDefaultEmployees };
export default pool;
