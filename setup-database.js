import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔧 Setting up Payment Portal Database...');
    
    // Connect without specifying database
    connection = await mysql.createConnection(dbConfig);
    
    // Create database
    await connection.execute('CREATE DATABASE IF NOT EXISTS payment_portal');
    console.log('✅ Database "payment_portal" created/verified');
    
    // Use the database
    await connection.query('USE payment_portal');
    
    // Create users table
    await connection.query(`
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
    console.log('✅ Users table created/verified');
    
    // Create transactions table
    await connection.query(`
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
    console.log('✅ Transactions table created/verified');
    
    // Create audit_logs table
    await connection.query(`
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
    console.log('✅ Audit logs table created/verified');
    
    // Create indexes
    await connection.query('CREATE INDEX IF NOT EXISTS idx_users_account_number ON users(account_number)');
    await connection.query('CREATE INDEX IF NOT EXISTS idx_users_id_number ON users(id_number)');
    await connection.query('CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id)');
    await connection.query('CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)');
    await connection.query('CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)');
    await connection.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
    await connection.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)');
    console.log('✅ Database indexes created/verified');
    
    // Check if employees already exist
    const [existingEmployees] = await connection.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'employee'"
    );
    
    if (existingEmployees[0].count === 0) {
      // Create default employee accounts
      const bcrypt = await import('bcrypt');
      
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
        await connection.query(
          `INSERT INTO users (full_name, id_number, account_number, password_hash, role) 
           VALUES (?, ?, ?, ?, ?)`,
          [employee.full_name, employee.id_number, employee.account_number, hashedPassword, employee.role]
        );
      }
      
      console.log('✅ Default employee accounts created');
      console.log('📋 Employee Login Credentials:');
      console.log('   Admin: account_number=EMP001, password=Admin123!');
      console.log('   Manager: account_number=EMP002, password=Manager123!');
    } else {
      console.log('✅ Employee accounts already exist');
    }
    
    console.log('🎉 Database setup completed successfully!');
    console.log('🚀 You can now start the server with: npm run dev');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure XAMPP MySQL is running on localhost:3306');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 Check your database credentials in .env file');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
