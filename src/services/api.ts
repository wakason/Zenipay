import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  CreatePaymentRequest, 
  VerifyTransactionRequest,
  Transaction,
  User,
  PaginatedResponse
} from '../types';

class ApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    const API_BASE_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'http://localhost:5000/api';
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage on initialization
    this.token = localStorage.getItem('token');
    if (this.token) {
      this.setAuthToken(this.token);
    }

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );

    // Error logging and response debugging
    this.api.interceptors.response.use(
      response => {
        if (response.config.url?.includes('/payments/my-transactions')) {
          console.log('API Response:', {
            url: response.config.url,
            data: response.data,
            status: response.status
          });
        }
        return response;
      },
      error => {
        console.error('API Error:', error.response ? error.response.data : error.message);
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
    this.api.defaults.headers.Authorization = `Bearer ${token}`;
  }

  clearAuthToken() {
    this.token = null;
    localStorage.removeItem('token');
    delete this.api.defaults.headers.Authorization;
  }

  logout() {
    this.clearAuthToken();
  }

  // Health check
  async healthCheck(): Promise<any> {
    const response = await this.api.get('/health');
    return response.data;
  }

  // Authentication endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/login', credentials);
    if (response.data.token) {
      this.setAuthToken(response.data.token);
    }
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/register', userData);
    if (response.data.token) {
      this.setAuthToken(response.data.token);
    }
    return response.data;
  }

  async getProfile(): Promise<{ user: User }> {
    const response = await this.api.get('/auth/profile');
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await this.api.put('/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  }

  async logoutUser(): Promise<{ message: string }> {
    const response = await this.api.post('/auth/logout');
    this.logout();
    return response.data;
  }

  // Payment endpoints
  async createPayment(paymentData: CreatePaymentRequest): Promise<{ message: string; transaction: Transaction }> {
    const response = await this.api.post('/payments/create', paymentData);
    return response.data;
  }

  // New: Pre-validate a beneficiary account with Swift API via backend
  async preValidateAccount(accountDetails: any, subjectDn: string): Promise<any> {
    const response = await this.api.post('/payments/pre-validate-account', { accountDetails, subjectDn });
    return response.data;
  }

  // New: Validate a data provider with Swift API via backend
  async validateDataProvider(partyAgentDetails: any, subjectDn: string): Promise<any> {
    const response = await this.api.post('/payments/validate-data-provider', { partyAgentDetails, subjectDn });
    return response.data;
  }

  async getMyTransactions(page: number = 1, limit: number = 10, status?: string): Promise<PaginatedResponse<Transaction>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status })
    });
    const response = await this.api.get(`/payments/my-transactions?${params}`);
    return response.data;
  }

  async getPendingTransactions(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Transaction>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    const response = await this.api.get(`/payments/pending?${params}`);
    return response.data;
  }

  async getAllTransactions(page: number = 1, limit: number = 10, status?: string, customerId?: number): Promise<PaginatedResponse<Transaction>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
      ...(customerId && { customerId: customerId.toString() })
    });
    const response = await this.api.get(`/payments?${params}`);
    return response.data;
  }

  async getTransaction(transactionId: number): Promise<{ transaction: Transaction }> {
    const response = await this.api.get(`/payments/${transactionId}`);
    return response.data;
  }

  async verifyTransaction(transactionId: number, verificationData: VerifyTransactionRequest): Promise<{ message: string; transaction: Transaction }> {
    const response = await this.api.put(`/payments/verify/${transactionId}`, verificationData);
    return response.data;
  }

  async submitToSwift(transactionId: number): Promise<{ message: string; swiftSubmissionId: string; transaction: Transaction }> {
    const response = await this.api.post(`/payments/submit-to-swift/${transactionId}`);
    return response.data;
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
