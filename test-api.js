import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

// Test configuration
const testConfig = {
  customer: {
    accountNumber: 'TEST001',
    password: 'Test123!',
    fullName: 'Test Customer',
    idNumber: '1234567890123'
  },
  employee: {
    accountNumber: 'EMP001',
    password: 'Admin123!'
  }
};

let customerToken = '';
let employeeToken = '';

// Helper function to make API calls
const apiCall = async (method, endpoint, data = null, token = null) => {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      ...(data && { data })
    };
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status 
    };
  }
};

// Test functions
const testHealthCheck = async () => {
  console.log('🔍 Testing health check...');
  const result = await apiCall('GET', '/health');
  if (result.success) {
    console.log('✅ Health check passed:', result.data);
  } else {
    console.log('❌ Health check failed:', result.error);
  }
  return result.success;
};

const testCustomerRegistration = async () => {
  console.log('🔍 Testing customer registration...');
  const result = await apiCall('POST', '/api/auth/register', testConfig.customer);
  if (result.success) {
    customerToken = result.data.token;
    console.log('✅ Customer registration passed');
  } else {
    console.log('❌ Customer registration failed:', result.error);
  }
  return result.success;
};

const testCustomerLogin = async () => {
  console.log('🔍 Testing customer login...');
  const result = await apiCall('POST', '/api/auth/login', {
    accountNumber: testConfig.customer.accountNumber,
    password: testConfig.customer.password
  });
  if (result.success) {
    customerToken = result.data.token;
    console.log('✅ Customer login passed');
  } else {
    console.log('❌ Customer login failed:', result.error);
  }
  return result.success;
};

const testEmployeeLogin = async () => {
  console.log('🔍 Testing employee login...');
  const result = await apiCall('POST', '/api/auth/login', testConfig.employee);
  if (result.success) {
    employeeToken = result.data.token;
    console.log('✅ Employee login passed');
  } else {
    console.log('❌ Employee login failed:', result.error);
  }
  return result.success;
};

const testGetProfile = async (token, userType) => {
  console.log(`🔍 Testing ${userType} profile...`);
  const result = await apiCall('GET', '/api/auth/profile', null, token);
  if (result.success) {
    console.log(`✅ ${userType} profile passed:`, result.data.user);
  } else {
    console.log(`❌ ${userType} profile failed:`, result.error);
  }
  return result.success;
};

const testCreatePayment = async () => {
  console.log('🔍 Testing payment creation...');
  const paymentData = {
    amount: '1000.00',
    currency: 'USD',
    payeeAccount: 'PAYEE123',
    swiftCode: 'TESTUS33',
    payeeName: 'Test Payee'
  };
  
  const result = await apiCall('POST', '/api/payments/create', paymentData, customerToken);
  if (result.success) {
    console.log('✅ Payment creation passed:', result.data.transaction);
    return result.data.transaction.id;
  } else {
    console.log('❌ Payment creation failed:', result.error);
    return null;
  }
};

const testGetMyTransactions = async () => {
  console.log('🔍 Testing get customer transactions...');
  const result = await apiCall('GET', '/api/payments/my-transactions?page=1&limit=10', null, customerToken);
  if (result.success) {
    console.log('✅ Get customer transactions passed:', result.data.transactions.length, 'transactions');
  } else {
    console.log('❌ Get customer transactions failed:', result.error);
  }
  return result.success;
};

const testGetPendingTransactions = async () => {
  console.log('🔍 Testing get pending transactions...');
  const result = await apiCall('GET', '/api/payments/pending?page=1&limit=10', null, employeeToken);
  if (result.success) {
    console.log('✅ Get pending transactions passed:', result.data.transactions.length, 'transactions');
    return result.data.transactions[0]?.id;
  } else {
    console.log('❌ Get pending transactions failed:', result.error);
    return null;
  }
};

const testVerifyTransaction = async (transactionId) => {
  if (!transactionId) {
    console.log('⚠️ No transaction ID for verification test');
    return false;
  }
  
  console.log('🔍 Testing transaction verification...');
  const verificationData = {
    verified: true,
    notes: 'Transaction verified by test'
  };
  
  const result = await apiCall('PUT', `/api/payments/verify/${transactionId}`, verificationData, employeeToken);
  if (result.success) {
    console.log('✅ Transaction verification passed');
  } else {
    console.log('❌ Transaction verification failed:', result.error);
  }
  return result.success;
};

const testSubmitToSwift = async (transactionId) => {
  if (!transactionId) {
    console.log('⚠️ No transaction ID for SWIFT submission test');
    return false;
  }
  
  console.log('🔍 Testing SWIFT submission...');
  const result = await apiCall('POST', `/api/payments/submit-to-swift/${transactionId}`, null, employeeToken);
  if (result.success) {
    console.log('✅ SWIFT submission passed:', result.data.swiftSubmissionId);
  } else {
    console.log('❌ SWIFT submission failed:', result.error);
  }
  return result.success;
};

const testGetAllTransactions = async () => {
  console.log('🔍 Testing get all transactions...');
  const result = await apiCall('GET', '/api/payments?page=1&limit=10', null, employeeToken);
  if (result.success) {
    console.log('✅ Get all transactions passed:', result.data.transactions.length, 'transactions');
  } else {
    console.log('❌ Get all transactions failed:', result.error);
  }
  return result.success;
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting API Tests...\n');
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Customer Registration', fn: testCustomerRegistration },
    { name: 'Customer Login', fn: testCustomerLogin },
    { name: 'Employee Login', fn: testEmployeeLogin },
    { name: 'Customer Profile', fn: () => testGetProfile(customerToken, 'Customer') },
    { name: 'Employee Profile', fn: () => testGetProfile(employeeToken, 'Employee') },
    { name: 'Create Payment', fn: testCreatePayment },
    { name: 'Get My Transactions', fn: testGetMyTransactions },
    { name: 'Get Pending Transactions', fn: testGetPendingTransactions },
    { name: 'Get All Transactions', fn: testGetAllTransactions }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) passedTests++;
    } catch (error) {
      console.log(`❌ ${test.name} failed with error:`, error.message);
    }
    console.log(''); // Add spacing between tests
  }
  
  // Test transaction workflow if we have a transaction
  if (customerToken && employeeToken) {
    console.log('🔄 Testing transaction workflow...');
    const transactionId = await testGetPendingTransactions();
    if (transactionId) {
      await testVerifyTransaction(transactionId);
      await testSubmitToSwift(transactionId);
    }
  }
  
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Backend is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the backend configuration.');
  }
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };
