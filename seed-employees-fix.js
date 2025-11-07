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

async function seedEmployees() {
  let connection;
  
  try {
    console.log('🔧 Seeding default employees with correct schema...');
    
    connection = await mysql.createConnection(dbConfig);
    
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
      // Generate UUID for id
      const id = crypto.randomUUID();
      
      // Hash password
      const hashedPassword = await bcrypt.hash(employee.password, 12);
      
      // Check if employee already exists
      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE accountNumber = ? OR username = ?',
        [employee.accountNumber, employee.username]
      );
      
      if (existing.length > 0) {
        // Update existing employee
        await connection.execute(
          `UPDATE users 
           SET fullName = ?, idNumber = ?, password = ?, role = 'employee', isVerified = 1
           WHERE accountNumber = ?`,
          [employee.fullName, employee.idNumber, hashedPassword, employee.accountNumber]
        );
        console.log(`✅ Updated employee: ${employee.accountNumber}`);
      } else {
        // Insert new employee
        await connection.execute(
          `INSERT INTO users (id, username, fullName, accountNumber, idNumber, password, role, isVerified)
           VALUES (?, ?, ?, ?, ?, ?, 'employee', 1)`,
          [id, employee.username, employee.fullName, employee.accountNumber, employee.idNumber, hashedPassword]
        );
        console.log(`✅ Created employee: ${employee.accountNumber}`);
      }
    }

    console.log('\n📋 Employee Login Credentials:');
    console.log('   Admin: accountNumber=EMP001, password=Admin123!');
    console.log('   Manager: accountNumber=EMP002, password=Manager123!');
    console.log('\n🎉 Seeding complete!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedEmployees();

