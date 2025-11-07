import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { CreatePaymentRequest, CURRENCIES, SWIFT_EXAMPLES } from '../types';
import { validateAmount, validateCurrency, validateSwiftCode, validateAccountNumber, validateName } from '../utils/validation';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  ArrowLeft, 
  CreditCard, 
  Info, 
  Send,
  Shield,
  CheckCircle,
  AlertCircle,
  DollarSign,
  User,
  Globe,
  Building2
} from 'lucide-react';

const PaymentForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreatePaymentRequest>({
    amount: '',
    currency: 'USD',
    payeeAccount: '',
    swiftCode: '',
    payeeName: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSwiftExamples, setShowSwiftExamples] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    const amountError = validateAmount(formData.amount);
    if (amountError) newErrors.amount = amountError;
    
    const currencyError = validateCurrency(formData.currency);
    if (currencyError) newErrors.currency = currencyError;
    
    const payeeAccountError = validateAccountNumber(formData.payeeAccount);
    if (payeeAccountError) newErrors.payeeAccount = payeeAccountError;
    
    const swiftCodeError = validateSwiftCode(formData.swiftCode);
    if (swiftCodeError) newErrors.swiftCode = swiftCodeError;
    
    const payeeNameError = validateName(formData.payeeName);
    if (payeeNameError) newErrors.payeeName = payeeNameError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      await apiService.createPayment(formData);
      navigate('/customer/dashboard');
    } catch (error: any) {
      setErrors({ submit: error.response?.data?.error || 'Payment creation failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/customer/dashboard')}
          className="flex items-center text-white/70 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Dashboard
        </button>
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
            <Send className="w-6 h-6 text-white" />
          </div>
        <div>
            <h1 className="text-3xl font-bold text-white">Create New Payment</h1>
            <p className="text-white/70 mt-1">
              Send money internationally with secure SWIFT transfers
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form */}
        <div className="lg:col-span-2">
          <div className="dashboard-card">
            <form onSubmit={handleSubmit} className="space-y-8">
          {/* Amount and Currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                  <label htmlFor="amount" className="block text-sm font-semibold text-gray-700 mb-3">
                Amount
              </label>
                  <div className="relative">
                    <div className="input-icon-container">
                      <DollarSign className="h-4 w-4 text-cyan-400" />
                    </div>
              <input
                      type="number"
                id="amount"
                name="amount"
                step="0.01"
                min="0.01"
                max="100000"
                required
                value={formData.amount}
                onChange={handleInputChange}
                      className={`modern-input input-with-icon ${
                        errors.amount ? 'border-red-400 focus:ring-red-400' : ''
                      }`}
                placeholder="0.00"
              />
                  </div>
              {errors.amount && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.amount}
                    </p>
              )}
            </div>

            <div>
                  <label htmlFor="currency" className="block text-sm font-semibold text-gray-700 mb-3">
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                    className={`modern-input ${
                      errors.currency ? 'border-red-400 focus:ring-red-400' : ''
                    }`}
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
                  {errors.currency && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.currency}
                    </p>
                  )}
            </div>
          </div>

          {/* Payee Information */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Payee Information</h3>
                </div>

          <div>
                  <label htmlFor="payeeName" className="block text-sm font-semibold text-gray-700 mb-3">
              Payee Name
            </label>
                  <div className="relative">
                    <div className="input-icon-container">
                      <User className="h-4 w-4 text-cyan-400" />
                    </div>
            <input
                      type="text"
              id="payeeName"
              name="payeeName"
              required
              value={formData.payeeName}
              onChange={handleInputChange}
                      className={`modern-input input-with-icon ${
                        errors.payeeName ? 'border-red-400 focus:ring-red-400' : ''
                      }`}
              placeholder="Enter payee's full name"
            />
                  </div>
            {errors.payeeName && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.payeeName}
                    </p>
            )}
          </div>

          <div>
                  <label htmlFor="payeeAccount" className="block text-sm font-semibold text-gray-700 mb-3">
              Payee Account Number
            </label>
                  <div className="relative">
                    <div className="input-icon-container">
                      <CreditCard className="h-4 w-4 text-cyan-400" />
                    </div>
            <input
                      type="text"
              id="payeeAccount"
              name="payeeAccount"
              required
              value={formData.payeeAccount}
              onChange={handleInputChange}
                      className={`modern-input input-with-icon ${
                        errors.payeeAccount ? 'border-red-400 focus:ring-red-400' : ''
                      }`}
              placeholder="Enter payee's account number"
            />
                  </div>
            {errors.payeeAccount && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.payeeAccount}
                    </p>
            )}
          </div>

          {/* SWIFT Code */}
          <div>
                  <div className="flex items-center justify-between mb-3">
                    <label htmlFor="swiftCode" className="block text-sm font-semibold text-gray-700">
                SWIFT Code
              </label>
              <button
                type="button"
                onClick={() => setShowSwiftExamples(!showSwiftExamples)}
                      className="text-sm text-blue-600 hover:text-blue-500 flex items-center transition-colors"
              >
                <Info size={16} className="mr-1" />
                Examples
              </button>
                  </div>
                  <div className="relative">
                    <div className="input-icon-container">
                      <Globe className="h-4 w-4 text-cyan-400" />
            </div>
            <input
                      type="text"
              id="swiftCode"
              name="swiftCode"
              required
              value={formData.swiftCode}
              onChange={handleInputChange}
                      className={`modern-input input-with-icon uppercase ${
                        errors.swiftCode ? 'border-red-400 focus:ring-red-400' : ''
                      }`}
              placeholder="Enter SWIFT code (e.g., SBZAZAJJ)"
            />
                  </div>
            {errors.swiftCode && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.swiftCode}
                    </p>
            )}
            
            {showSwiftExamples && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <h4 className="text-sm font-semibold text-blue-900 mb-3">SWIFT Code Examples:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {SWIFT_EXAMPLES.map((example) => (
                          <div key={example.code} className="flex items-center space-x-2 text-blue-800">
                            <Building2 className="w-4 h-4" />
                            <span><strong>{example.code}</strong> - {example.bank}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
                </div>
          </div>

              {/* Error Message */}
          {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-sm text-red-800">{errors.submit}</p>
                  </div>
            </div>
          )}

          {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={() => navigate('/customer/dashboard')}
                  className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
                  className="btn-primary btn-animate flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                    <LoadingSpinner size="sm" />
              ) : (
                <>
                      <Send className="w-5 h-5" />
                      <span>Create Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
          </div>
        </div>

        {/* Security Info Sidebar */}
        <div className="space-y-6">
          <div className="dashboard-card">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Security Features</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">256-bit SSL Encryption</p>
                  <p className="text-xs text-gray-600">All data is encrypted in transit</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">SWIFT Network</p>
                  <p className="text-xs text-gray-600">Secure international transfers</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Real-time Monitoring</p>
                  <p className="text-xs text-gray-600">24/7 fraud detection</p>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Amount:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formData.amount ? `${formData.currency} ${formData.amount}` : 'Not specified'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Payee:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formData.payeeName || 'Not specified'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Account:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formData.payeeAccount || 'Not specified'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">SWIFT:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formData.swiftCode || 'Not specified'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;
