import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Shield, Clock, CheckCircle, TrendingUp, AlertTriangle, CircleDollarSign } from 'lucide-react';
import apiService from '../services/api';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/validation';
import LoadingSpinner from '../components/LoadingSpinner';

const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalTransactions: 0,
    pendingTransactions: 0,
    verifiedTransactions: 0,
    totalAmountToday: 0,
    recentTransactions: [] as Transaction[]
  });

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getAllTransactions(1, 5);
      const transactions = response.transactions;
      
      // Calculate metrics
      const pending = transactions.filter(t => t.status === 'pending').length;
      const verified = transactions.filter(t => t.status === 'verified').length;
      const todayTransactions = transactions.filter(t => {
        const today = new Date().toISOString().split('T')[0];
        return new Date(t.createdAt).toISOString().split('T')[0] === today;
      });
      const todayTotal = todayTransactions.reduce((sum, t) => sum + (parseFloat(t.amount.toString()) || 0), 0);

      setMetrics({
        totalTransactions: transactions.length,
        pendingTransactions: pending,
        verifiedTransactions: verified,
        totalAmountToday: todayTotal,
        recentTransactions: transactions.slice(0, 5)
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    // Set up auto-refresh every 5 minutes
    const refreshInterval = setInterval(loadDashboardData, 300000);
    return () => clearInterval(refreshInterval);
  }, [loadDashboardData]);

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-500 text-white';
      case 'verified':
        return 'bg-green-500 text-white';
      case 'completed':
        return 'bg-blue-500 text-white';
      case 'rejected':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const MetricCard = ({ title, value, icon: Icon, color }: { 
    title: string;
    value: string | number;
    icon: React.ComponentType<any>;
    color: string;
  }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 flex items-start space-x-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Employee Dashboard</h1>
        <p className="text-gray-600">Monitor and manage payment transactions</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Transactions"
          value={metrics.totalTransactions}
          icon={CircleDollarSign}
          color="bg-blue-600"
        />
        <MetricCard
          title="Pending Review"
          value={metrics.pendingTransactions}
          icon={Clock}
          color="bg-yellow-500"
        />
        <MetricCard
          title="Verified Today"
          value={metrics.verifiedTransactions}
          icon={CheckCircle}
          color="bg-green-500"
        />
        <MetricCard
          title="Total Amount Today"
          value={formatCurrency(metrics.totalAmountToday, 'USD')}
          icon={TrendingUp}
          color="bg-indigo-600"
        />
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Recent Transactions</h2>
            <button
              onClick={() => navigate('/employee/transactions')}
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View all
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.recentTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{transaction.id}
                  </td>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(transaction.status)}`}>
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {transaction.status === 'pending' && (
                      <button
                        onClick={() => navigate(`/employee/transactions?id=${transaction.id}`)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors"
                      >
                        Review
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts Section */}
      {metrics.pendingTransactions > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You have {metrics.pendingTransactions} transaction{metrics.pendingTransactions !== 1 ? 's' : ''} pending review.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
