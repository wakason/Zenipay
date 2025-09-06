import { FormErrors } from '../types';

// Validation patterns
export const PATTERNS = {
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  ACCOUNT_NUMBER: /^[A-Z0-9]{6,20}$/,
  ID_NUMBER: /^[0-9]{13}$/,
  SWIFT_CODE: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  CURRENCY: /^[A-Z]{3}$/,
  AMOUNT: /^\d+(\.\d{1,2})?$/,
  NAME: /^[a-zA-Z\s]{2,100}$/
};

// Validation messages
export const VALIDATION_MESSAGES = {
  PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  ACCOUNT_NUMBER: 'Account number must be 6-20 alphanumeric characters',
  ID_NUMBER: 'ID number must be exactly 13 digits',
  SWIFT_CODE: 'SWIFT code must be 8 or 11 characters (e.g., SBZAZAJJ)',
  CURRENCY: 'Currency must be a valid 3-letter code (e.g., USD, EUR, ZAR)',
  AMOUNT: 'Amount must be a positive number with up to 2 decimal places',
  NAME: 'Name must be 2-100 characters and contain only letters and spaces',
  REQUIRED: 'This field is required'
};

// Validation functions
export const validatePassword = (password: string): string | null => {
  if (!password) return VALIDATION_MESSAGES.REQUIRED;
  if (!PATTERNS.PASSWORD.test(password)) return VALIDATION_MESSAGES.PASSWORD;
  return null;
};

export const validateAccountNumber = (accountNumber: string): string | null => {
  if (!accountNumber) return VALIDATION_MESSAGES.REQUIRED;
  if (!PATTERNS.ACCOUNT_NUMBER.test(accountNumber)) return VALIDATION_MESSAGES.ACCOUNT_NUMBER;
  return null;
};

export const validateIdNumber = (idNumber: string): string | null => {
  if (!idNumber) return VALIDATION_MESSAGES.REQUIRED;
  if (!PATTERNS.ID_NUMBER.test(idNumber)) return VALIDATION_MESSAGES.ID_NUMBER;
  return null;
};

export const validateSwiftCode = (swiftCode: string): string | null => {
  if (!swiftCode) return VALIDATION_MESSAGES.REQUIRED;
  if (!PATTERNS.SWIFT_CODE.test(swiftCode)) return VALIDATION_MESSAGES.SWIFT_CODE;
  return null;
};

export const validateCurrency = (currency: string): string | null => {
  if (!currency) return VALIDATION_MESSAGES.REQUIRED;
  if (!PATTERNS.CURRENCY.test(currency)) return VALIDATION_MESSAGES.CURRENCY;
  return null;
};

export const validateAmount = (amount: string): string | null => {
  if (!amount) return VALIDATION_MESSAGES.REQUIRED;
  if (!PATTERNS.AMOUNT.test(amount)) return VALIDATION_MESSAGES.AMOUNT;
  if (parseFloat(amount) <= 0) return 'Amount must be greater than 0';
  if (parseFloat(amount) > 100000) return 'Amount cannot exceed 100,000';
  return null;
};

export const validateName = (name: string): string | null => {
  if (!name) return VALIDATION_MESSAGES.REQUIRED;
  if (!PATTERNS.NAME.test(name)) return VALIDATION_MESSAGES.NAME;
  return null;
};

// Form validation helper
export const validateForm = (data: Record<string, any>, rules: Record<string, (value: any) => string | null>): FormErrors => {
  const errors: FormErrors = {};
  
  for (const [field, validator] of Object.entries(rules)) {
    const error = validator(data[field]);
    if (error) {
      errors[field] = error;
    }
  }
  
  return errors;
};

// Sanitize input
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

// Format currency
export const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format date
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Get status color
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'text-yellow-600 bg-yellow-100';
    case 'verified':
      return 'text-blue-600 bg-blue-100';
    case 'completed':
      return 'text-green-600 bg-green-100';
    case 'rejected':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

// Get status text
export const getStatusText = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'Pending Review';
    case 'verified':
      return 'Verified';
    case 'completed':
      return 'Completed';
    case 'rejected':
      return 'Rejected';
    default:
      return status;
  }
};
