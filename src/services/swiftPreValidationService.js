require('dotenv').config();
const axios = require('axios');
const { getAccessToken } = require('./swiftAuthService');

const SWIFT_PRE_VALIDATION_BASE_URL = process.env.SWIFT_PRE_VALIDATION_BASE_URL || 'https://sandbox.swift.com/payment-pre-validation/v3'; // Example base URL

// Function to verify beneficiary account information
const verifyBeneficiaryAccount = async (accountDetails, subjectDn) => {
  try {
    const accessToken = await getAccessToken(subjectDn);

    const response = await axios.post(
      `${SWIFT_PRE_VALIDATION_BASE_URL}/accounts/verification`,
      accountDetails, // accountDetails should conform to the API's request body schema
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Request-ID': generateRequestId() // Implement this function to generate a UUID
        }
      }
    );
    console.log('Beneficiary account verification successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error verifying beneficiary account:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Function to validate a data provider
const validateDataProvider = async (partyAgentDetails, subjectDn) => {
  try {
    const accessToken = await getAccessToken(subjectDn);

    const response = await axios.post(
      `${SWIFT_PRE_VALIDATION_BASE_URL}/data-providers/check`,
      partyAgentDetails, // partyAgentDetails should conform to the API's request body schema
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Request-ID': generateRequestId()
        }
      }
    );
    console.log('Data provider validation successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error validating data provider:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Helper function to generate a unique request ID (UUID)
const generateRequestId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

module.exports = {
  verifyBeneficiaryAccount,
  validateDataProvider
};
