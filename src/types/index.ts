// User types
export interface User {
  id: number;
  fullName: string;
  accountNumber: string;
  role: 'customer' | 'employee';
  createdAt?: string;
}

// Authentication types
export interface LoginRequest {
  accountNumber: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  idNumber: string;
  accountNumber: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

// Transaction types
export interface Transaction {
  id: number;
  amount: number;
  currency: string;
  payeeAccount: string;
  swiftCode: string;
  payeeName: string;
  status: 'pending' | 'verified' | 'completed' | 'rejected';
  employeeNotes?: string;
  createdAt: string;
  updatedAt?: string;
  customerName?: string;
  customerAccount?: string;
}

export interface CreatePaymentRequest {
  amount: string;
  currency: string;
  payeeAccount: string;
  swiftCode: string;
  payeeName: string;
}

export interface VerifyTransactionRequest {
  verified: boolean;
  notes?: string;
}

// API Response types
export interface ApiResponse<T> {
  message?: string;
  data?: T;
  error?: string;
  details?: string[];
}

export interface PaginatedResponse<T> {
  transactions: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Form validation types
export interface FormErrors {
  [key: string]: string;
}

// Currency options
export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' }
] as const;

// SWIFT code examples
export const SWIFT_EXAMPLES = [
  { code: 'SBZAZAJJ', bank: 'Standard Bank South Africa' },
  { code: 'ABSAZAJJ', bank: 'Absa Bank South Africa' },
  { code: 'NEDSZAJJ', bank: 'Nedbank South Africa' },
  { code: 'CHASUS33', bank: 'Chase Bank USA' },
  { code: 'DEUTDEFF', bank: 'Deutsche Bank Germany' },
  { code: 'BNPAFRPP', bank: 'BNP Paribas France' }
] as const;
