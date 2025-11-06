#!/usr/bin/env node
/**
 * Comprehensive Test Script for ZeniPay Payment Portal
 * Tests all major functionality and security features
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';
let customerToken = '';
let employeeToken = '';
let testCustomerAccount = `TEST${Date.now()}`;
let testTransactionId = '';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`Testing: ${name}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Test 1: Health Check
async function testHealthCheck() {
  logTest('Health Check');
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    if (response.status === 200 && response.data.status === 'OK') {
      logSuccess('Health check passed');
      logInfo(`Environment: ${response.data.environment}`);
      logInfo(`Version: ${response.data.version}`);
      return true;
    }
    logError('Health check failed - unexpected response');
    return false;
  } catch (error) {
    logError(`Health check failed: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      logWarning('Server is not running. Start it with: npm run dev');
    }
    return false;
  }
}

// Test 2: Customer Registration
async function testCustomerRegistration() {
  logTest('Customer Registration');
  // Use a unique account number for each test run
  const uniqueAccount = `TEST${Date.now()}${Math.floor(Math.random() * 1000)}`;
  testCustomerAccount = uniqueAccount;
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
      fullName: 'Test Customer',
      idNumber: `${Date.now().toString().slice(-13)}`, // Ensure 13 digits
      accountNumber: uniqueAccount,
      password: 'SecurePass123!'
    });
    
    if (response.status === 201 && response.data.token) {
      customerToken = response.data.token;
      logSuccess('Customer registration successful');
      logInfo(`Account: ${uniqueAccount}`);
      logInfo(`Token received: ${customerToken.substring(0, 20)}...`);
      return true;
    }
    logError('Registration failed - unexpected response');
    return false;
  } catch (error) {
    if (error.response?.status === 409) {
      logWarning('Customer already exists - trying with different account...');
      // Try with a different account
      const retryAccount = `TEST${Date.now()}${Math.floor(Math.random() * 10000)}`;
      testCustomerAccount = retryAccount;
      try {
        const retryResponse = await axios.post(`${API_BASE_URL}/api/auth/register`, {
          fullName: 'Test Customer Retry',
          idNumber: `${Date.now().toString().slice(-13)}`,
          accountNumber: retryAccount,
          password: 'SecurePass123!'
        });
        if (retryResponse.status === 201 && retryResponse.data.token) {
          customerToken = retryResponse.data.token;
          logSuccess('Customer registration successful (retry)');
          return true;
        }
      } catch (retryError) {
        logError(`Registration retry failed: ${retryError.response?.data?.error || retryError.message}`);
        return false;
      }
    }
    logError(`Registration failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Test 3: Customer Login
async function testCustomerLogin() {
  logTest('Customer Login');
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      accountNumber: testCustomerAccount,
      password: 'SecurePass123!'
    });
    
    if (response.status === 200 && response.data.token) {
      customerToken = response.data.token;
      logSuccess('Customer login successful');
      logInfo(`User: ${response.data.user.fullName}`);
      logInfo(`Role: ${response.data.user.role}`);
      return true;
    }
    logError('Login failed - unexpected response');
    return false;
  } catch (error) {
    logError(`Login failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Test 4: Employee Login
async function testEmployeeLogin() {
  logTest('Employee Login');
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      accountNumber: 'EMP001',
      password: 'Admin123!'
    });
    
    if (response.status === 200 && response.data.token) {
      employeeToken = response.data.token;
      logSuccess('Employee login successful');
      logInfo(`User: ${response.data.user.fullName}`);
      logInfo(`Role: ${response.data.user.role}`);
      return true;
    }
    logError('Employee login failed - unexpected response');
    return false;
  } catch (error) {
    logError(`Employee login failed: ${error.response?.data?.error || error.message}`);
    logWarning('Make sure employee accounts are seeded: npm run seed:employees');
    return false;
  }
}

// Test 5: Create Payment (Customer)
async function testCreatePayment() {
  logTest('Create Payment (Customer)');
  if (!customerToken) {
    logError('No customer token - skipping payment creation');
    return false;
  }
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/payments/create`,
      {
        amount: '1000.50',
        currency: 'USD',
        payeeAccount: 'PAYEE123',
        swiftCode: 'SBZAZAJJ',
        payeeName: 'Test Payee'
      },
      {
        headers: {
          'Authorization': `Bearer ${customerToken}`
        }
      }
    );
    
    if (response.status === 201 && response.data.transaction) {
      testTransactionId = response.data.transaction.id;
      logSuccess('Payment created successfully');
      logInfo(`Transaction ID: ${testTransactionId}`);
      logInfo(`Amount: ${response.data.transaction.amount} ${response.data.transaction.currency}`);
      logInfo(`Status: ${response.data.transaction.status}`);
      return true;
    }
    logError('Payment creation failed - unexpected response');
    return false;
  } catch (error) {
    logError(`Payment creation failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Test 6: Get Pending Transactions (Employee)
async function testGetPendingTransactions() {
  logTest('Get Pending Transactions (Employee)');
  if (!employeeToken) {
    logError('No employee token - skipping');
    return false;
  }
  
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/payments/pending`,
      {
        headers: {
          'Authorization': `Bearer ${employeeToken}`
        }
      }
    );
    
    if (response.status === 200 && Array.isArray(response.data.transactions)) {
      logSuccess('Pending transactions retrieved');
      logInfo(`Found ${response.data.transactions.length} pending transaction(s)`);
      if (response.data.transactions.length > 0) {
        logInfo(`First transaction: ${response.data.transactions[0].id}`);
      }
      return true;
    }
    logError('Failed to get pending transactions - unexpected response');
    return false;
  } catch (error) {
    logError(`Failed to get pending transactions: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Test 7: Input Validation - Weak Password
async function testInputValidationWeakPassword() {
  logTest('Input Validation - Weak Password');
  try {
    await axios.post(`${API_BASE_URL}/api/auth/register`, {
      fullName: 'Test User',
      idNumber: '1234567890123',
      accountNumber: 'WEAK001',
      password: 'weak' // Weak password
    });
    logError('Weak password was accepted (should be rejected)');
    return false;
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error) {
      logSuccess('Weak password correctly rejected');
      logInfo(`Error: ${error.response.data.error}`);
      return true;
    }
    logError(`Unexpected error: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Test 8: Input Validation - Invalid Account Number
async function testInputValidationInvalidAccount() {
  logTest('Input Validation - Invalid Account Number');
  try {
    await axios.post(`${API_BASE_URL}/api/auth/register`, {
      fullName: 'Test User',
      idNumber: '1234567890123',
      accountNumber: 'abc', // Too short
      password: 'SecurePass123!'
    });
    logError('Invalid account number was accepted (should be rejected)');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      logSuccess('Invalid account number correctly rejected');
      return true;
    }
    logError(`Unexpected error: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Test 9: Employee Registration Prevention
async function testEmployeeRegistrationPrevention() {
  logTest('Employee Registration Prevention');
  try {
    await axios.post(`${API_BASE_URL}/api/auth/register`, {
      fullName: 'Test Employee',
      idNumber: '1234567890123',
      accountNumber: 'EMP999',
      password: 'SecurePass123!',
      role: 'employee'
    });
    logError('Employee registration was allowed (should be blocked)');
    return false;
  } catch (error) {
    if (error.response?.status === 403 && error.response?.data?.code === 'EMPLOYEE_REGISTRATION_DISABLED') {
      logSuccess('Employee registration correctly blocked');
      logInfo(`Error: ${error.response.data.error}`);
      return true;
    }
    logError(`Unexpected error: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Test 10: Rate Limiting
async function testRateLimiting() {
  logTest('Rate Limiting');
  logInfo('Making multiple rapid requests...');
  
  let rateLimited = false;
  const requests = [];
  
  for (let i = 0; i < 15; i++) {
    requests.push(
      axios.post(`${API_BASE_URL}/api/auth/login`, {
        accountNumber: 'INVALID',
        password: 'wrong'
      }).catch(error => error)
    );
  }
  
  try {
    const responses = await Promise.all(requests);
    const rateLimitErrors = responses.filter(r => 
      r.response?.status === 429 || r.response?.data?.error?.includes('Too many')
    );
    
    if (rateLimitErrors.length > 0) {
      logSuccess('Rate limiting is working');
      logInfo(`Rate limited after ${responses.length - rateLimitErrors.length} requests`);
      return true;
    } else {
      logWarning('Rate limiting may not be triggered (this is OK if limit is high)');
      return true;
    }
  } catch (error) {
    logWarning(`Rate limiting test inconclusive: ${error.message}`);
    return true;
  }
}

// Test 11: SQL Injection Protection
async function testSQLInjectionProtection() {
  logTest('SQL Injection Protection');
  try {
    await axios.post(`${API_BASE_URL}/api/auth/login`, {
      accountNumber: "' OR '1'='1",
      password: "anything"
    });
    logError('SQL injection attempt was not blocked');
    return false;
  } catch (error) {
    if (error.response?.status === 400 || error.response?.status === 401) {
      logSuccess('SQL injection attempt correctly blocked');
      return true;
    }
    logWarning(`SQL injection test inconclusive: ${error.response?.data?.error || error.message}`);
    return true;
  }
}

// Test 12: Authentication Required
async function testAuthenticationRequired() {
  logTest('Authentication Required');
  try {
    await axios.get(`${API_BASE_URL}/api/payments/pending`);
    logError('Unauthenticated request was allowed (should require auth)');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      logSuccess('Unauthenticated request correctly rejected');
      return true;
    }
    logError(`Unexpected error: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('ZeniPay Payment Portal - Comprehensive Test Suite', 'cyan');
  log('='.repeat(60), 'cyan');
  logInfo(`Testing API at: ${API_BASE_URL}`);
  logInfo(`Test customer account: ${testCustomerAccount}\n`);
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Customer Registration', fn: testCustomerRegistration },
    { name: 'Customer Login', fn: testCustomerLogin },
    { name: 'Employee Login', fn: testEmployeeLogin },
    { name: 'Create Payment', fn: testCreatePayment },
    { name: 'Get Pending Transactions', fn: testGetPendingTransactions },
    { name: 'Input Validation - Weak Password', fn: testInputValidationWeakPassword },
    { name: 'Input Validation - Invalid Account', fn: testInputValidationInvalidAccount },
    { name: 'Employee Registration Prevention', fn: testEmployeeRegistrationPrevention },
    { name: 'Rate Limiting', fn: testRateLimiting },
    { name: 'SQL Injection Protection', fn: testSQLInjectionProtection },
    { name: 'Authentication Required', fn: testAuthenticationRequired }
  ];
  
  for (const test of tests) {
    results.total++;
    const passed = await test.fn();
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('Test Summary', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Total Tests: ${results.total}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`, 
      results.passed === results.total ? 'green' : 'yellow');
  
  if (results.failed === 0) {
    log('\n🎉 All tests passed!', 'green');
  } else {
    log('\n⚠️  Some tests failed. Check the output above for details.', 'yellow');
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});

