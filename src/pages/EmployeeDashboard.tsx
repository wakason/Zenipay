import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { Transaction } from '../types';
import { formatCurrency, formatDate, getStatusColor, getStatusText } from '../utils/validation';
import LoadingSpinner from '../components/LoadingSpinner';
import { Shield, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    try {
      await apiService.verifyTransaction(transactionId, { 
        verified, 
        notes: verified ? 'Transaction verified' : 'Transaction rejected' 
      });
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Failed to verify transaction:', error);
    }
  };

  const handleSubmitToSwift = async (transactionId: number) => {
    try {
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
                        className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-2 py-1 rounded text-xs"
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => handleVerifyTransaction(transaction.id, false)}
                        className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2 py-1 rounded text-xs"
                      >
                        Reject
                      </button>
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
