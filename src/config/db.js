import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'payment_portal',
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

// Create default employee accounts
const createDefaultEmployees = async () => {
  try {
    const bcrypt = await import('bcrypt');
    
    // Check if employees already exist
    const [existingEmployees] = await pool.execute(
      "SELECT COUNT(*) as count FROM users WHERE role = 'employee'"
    );
    
    if (existingEmployees[0].count > 0) {
      console.log('✅ Employee accounts already exist');
      return;
    }

    // Create default employee accounts
    const employees = [
      {
        full_name: 'Admin User',
        id_number: 'EMP001',
        account_number: 'EMP001',
        password: 'Admin123!',
        role: 'employee'
      },
      {
        full_name: 'Bank Manager',
        id_number: 'EMP002', 
        account_number: 'EMP002',
        password: 'Manager123!',
        role: 'employee'
      }
    ];

    for (const employee of employees) {
      const hashedPassword = await bcrypt.hash(employee.password, 12);
      await pool.execute(
        `INSERT INTO users (full_name, id_number, account_number, password_hash, role) 
         VALUES (?, ?, ?, ?, ?)`,
        [employee.full_name, employee.id_number, employee.account_number, hashedPassword, employee.role]
      );
    }

    console.log('✅ Default employee accounts created');
    console.log('📋 Employee Login Credentials:');
    console.log('   Admin: account_number=EMP001, password=Admin123!');
    console.log('   Manager: account_number=EMP002, password=Manager123!');
  } catch (error) {
    console.error('❌ Failed to create default employees:', error.message);
  }
};

export { pool, testConnection, initializeDatabase, createDefaultEmployees };
export default pool;
