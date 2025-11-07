import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'payment_portal',
  port: parseInt(process.env.DB_PORT || '3306'),
};

async function createTestCustomer() {
  let connection;
  
  try {
    console.log('🔧 Creating test customer account...');
    
    connection = await mysql.createConnection(dbConfig);
    
    const customer = {
      username: 'CUST001',
      fullName: 'Test Customer',
      idNumber: '1234567890123',
      accountNumber: 'CUST001',
      password: 'Customer123!',
    };

    // Generate UUID for id field
    const userId = crypto.randomUUID();
    
    // Hash password
    const hashedPassword = await bcrypt.hash(customer.password, 12);
    
    // Check if customer already exists
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE accountNumber = ? OR username = ?',
      [customer.accountNumber, customer.username]
    );
    
    if (existing.length > 0) {
      // Update existing customer
      await connection.execute(
        `UPDATE users 
         SET fullName = ?, idNumber = ?, password = ?, role = 'customer', isVerified = 1
         WHERE accountNumber = ?`,
        [customer.fullName, customer.idNumber, hashedPassword, customer.accountNumber]
      );
      console.log(`✅ Updated customer: ${customer.accountNumber}`);
    } else {
      // Insert new customer
      await connection.execute(
        `INSERT INTO users (id, username, fullName, accountNumber, idNumber, password, role, isVerified)
         VALUES (?, ?, ?, ?, ?, ?, 'customer', 1)`,
        [userId, customer.username, customer.fullName, customer.accountNumber, customer.idNumber, hashedPassword]
      );
      console.log(`✅ Created customer: ${customer.accountNumber}`);
    }

    console.log('\n📋 Test Customer Login Credentials:');
    console.log(`   Account Number: ${customer.accountNumber}`);
    console.log(`   Password: ${customer.password}`);
    console.log('\n🎉 Customer account created!');
    
  } catch (error) {
    console.error('❌ Failed to create customer:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createTestCustomer();

