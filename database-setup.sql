-- Payment Portal Database Setup Script
-- Run this in phpMyAdmin or MySQL command line

-- Create database
CREATE DATABASE IF NOT EXISTS payment_portal;
USE payment_portal;

-- Create users table
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
);

-- Create transactions table
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
);

-- Create audit_logs table for security tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default employee accounts (passwords are hashed in the application)
-- These are just placeholders - the actual hashed passwords will be created by the app
INSERT IGNORE INTO users (full_name, id_number, account_number, password_hash, role) VALUES
('Admin User', 'EMP001', 'EMP001', 'placeholder_hash', 'employee'),
('Bank Manager', 'EMP002', 'EMP002', 'placeholder_hash', 'employee');

-- Create indexes for better performance
CREATE INDEX idx_users_account_number ON users(account_number);
CREATE INDEX idx_users_id_number ON users(id_number);
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Show tables
SHOW TABLES;

-- Show table structures
DESCRIBE users;
DESCRIBE transactions;
DESCRIBE audit_logs;
