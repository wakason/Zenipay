import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/validation';
import LoadingSpinner from '../components/LoadingSpinner';
import { Shield, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [validationResults, setValidationResults] = useState<{[key: number]: { accountValid?: boolean, swiftCodeValid?: boolean, message?: string }}>({});
  const [stats, setStats] = useState({
    totalPending: 0,
    totalVerified: 0,
    totalCompleted: 0,
    totalRejected: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getPendingTransactions(1, 5);
      setPendingTransactions(response.transactions);
      setValidationResults({}); // Clear previous validation results on data refresh
      
      // Calculate stats
      const allTransactionsResponse = await apiService.getAllTransactions(1, 1000);
      const allTransactions = allTransactionsResponse.transactions;
      
      const totalPending = allTransactions.filter(t => t.status === 'pending').length;
      const totalVerified = allTransactions.filter(t => t.status === 'verified').length;
      const totalCompleted = allTransactions.filter(t => t.status === 'completed').length;
      const totalRejected = allTransactions.filter(t => t.status === 'rejected').length;
      
      setStats({
        totalPending,
        totalVerified,
        totalCompleted,
        totalRejected
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTransaction = async (transactionId: number, verified: boolean) => {
    if (!verified) {
      // If rejecting, directly call the backend API
    try {
      await apiService.verifyTransaction(transactionId, { 
          verified: false,
          notes: 'Transaction rejected by employee' 
      });
        loadDashboardData();
    } catch (error) {
        console.error('Failed to reject transaction:', error);
      }
      return;
    }

    // Proceed with pre-validation if verifying
    const transactionToValidate = pendingTransactions.find(t => t.id === transactionId);
    if (!transactionToValidate) {
      console.error('Transaction not found for validation.');
      return;
    }

    // For a real application, subjectDn should be retrieved securely from the authenticated employee's context.
    // For this example, we'll use a placeholder or derive it if available in the user object.
    const subjectDn = user?.email; // Must be dynamically derived from authenticated employee's certificate subject DN

    setValidationResults(prev => ({ ...prev, [transactionId]: { message: 'Validating...' } }));

    try {
      // Step 1: Verify Beneficiary Account
      const accountDetails = {
        // Structure these based on Swift API documentation for /accounts/verification
        // Example fields, adjust as per actual API requirements:
        party_account: {
          identification: {
            iban: transactionToValidate.payeeAccount, // Assuming payeeAccount can be an IBAN
          },
        },
        party_agent: {
          bicfi: transactionToValidate.swiftCode, // Assuming swiftCode is BICFI
        },
        requestor: {
          any_bic: user?.bic, // Must be dynamically derived from authenticated employee's BIC
        },
        context: 'CRDT', // Credit Transfer context
        proprietary_service_parameters: {
          code: 'SCHM',
          qualifier: 'PVAH', // Example qualifier, adjust as needed
        },
      };

      if (!subjectDn || !user?.bic) {
        setValidationResults(prev => ({
          ...prev,
          [transactionId]: { message: 'Employee email or BIC not available for pre-validation.' }
        }));
        return;
      }

      const accountValidationResponse = await apiService.preValidateAccount(accountDetails, subjectDn);
      console.log('Account validation response:', accountValidationResponse);

      const isAccountValid = accountValidationResponse?.account_match === 'MTCH'; // Or other success indicator

      // Step 2: Validate Data Provider (optional, based on requirement)
      const partyAgentDetails = {
        // Structure based on Swift API documentation for /data-providers/check
        party_agent: {
          bicfi: transactionToValidate.swiftCode,
        },
      };

      const dataProviderValidationResponse = await apiService.validateDataProvider(partyAgentDetails, subjectDn);
      console.log('Data provider validation response:', dataProviderValidationResponse);
      const isSwiftCodeValid = dataProviderValidationResponse?.party_agent_match === 'MTCH'; // Or other success indicator

      if (isAccountValid && isSwiftCodeValid) {
        setValidationResults(prev => ({
          ...prev,
          [transactionId]: { accountValid: true, swiftCodeValid: true, message: 'Account and SWIFT code validated successfully.' }
        }));
        // If pre-validation is successful, then proceed with internal verification
        await apiService.verifyTransaction(transactionId, { 
          verified: true,
          notes: 'Transaction verified after Swift pre-validation' 
        });
        loadDashboardData();
      } else {
        let errorMessage = 'Validation failed: ';
        if (!isAccountValid) errorMessage += 'Beneficiary account invalid. ';
        if (!isSwiftCodeValid) errorMessage += 'SWIFT code invalid.';
        setValidationResults(prev => ({
          ...prev,
          [transactionId]: { accountValid: isAccountValid, swiftCodeValid: isSwiftCodeValid, message: errorMessage }
        }));
      }

    } catch (error: any) {
      console.error('Error during Swift pre-validation:', error);
      setValidationResults(prev => ({
        ...prev,
        [transactionId]: { message: `Pre-validation failed: ${error.response?.data?.error || error.message}` }
      }));
    }
  };

  const handleSubmitToSwift = async (transactionId: number) => {
    try {
      // Before submitting to SWIFT, ensure it was pre-validated successfully
      const result = validationResults[transactionId];
      if (!result?.accountValid || !result?.swiftCodeValid) {
        alert('Please complete successful pre-validation before submitting to SWIFT.');
        return;
      }

      await apiService.submitToSwift(transactionId);
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Failed to submit to SWIFT:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user?.fullName}!
        </h1>
        <p className="text-gray-600 mt-1">
          Review and process international payment transactions.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Pending Transactions</h3>
              <p className="text-gray-600 text-sm">Review transactions awaiting verification</p>
            </div>
            <button
              onClick={() => navigate('/employee/transactions')}
              className="bg-yellow-600 text-white p-3 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <Clock size={24} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">All Transactions</h3>
              <p className="text-gray-600 text-sm">View complete transaction history</p>
            </div>
            <button
              onClick={() => navigate('/employee/transactions')}
              className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Shield size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Verified</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalVerified}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCompleted}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRejected}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Transactions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Pending Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          {pendingTransactions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No pending transactions to review.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.customerName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {transaction.customerAccount}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.payeeName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {transaction.payeeAccount}
                        </div>
                        <div className="text-xs text-gray-400">
                          {transaction.swiftCode}
                        </div>
                        {validationResults[transaction.id] && (
                          <div className={`text-xs mt-1 ${validationResults[transaction.id]?.accountValid && validationResults[transaction.id]?.swiftCodeValid ? 'text-green-600' : 'text-red-600'}`}>
                            {validationResults[transaction.id]?.message}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleVerifyTransaction(transaction.id, true)}
                        disabled={validationResults[transaction.id]?.message === 'Validating...'}
                        className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-2 py-1 rounded text-xs"
                      >
                        {validationResults[transaction.id]?.message === 'Validating...' ? 'Validating...' : 'Pre-Validate & Verify'}
                      </button>
                      <button
                        onClick={() => handleVerifyTransaction(transaction.id, false)}
                        className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2 py-1 rounded text-xs"
                      >
                        Reject
                      </button>
                      {transaction.status === 'verified' && (
                        <button
                          onClick={() => handleSubmitToSwift(transaction.id)}
                          disabled={!validationResults[transaction.id]?.accountValid || !validationResults[transaction.id]?.swiftCodeValid}
                          className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded text-xs ml-2"
                        >
                          Submit to SWIFT
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {pendingTransactions.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <button
              onClick={() => navigate('/employee/transactions')}
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              View all transactions →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;
