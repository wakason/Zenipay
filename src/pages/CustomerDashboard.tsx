import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { Transaction } from '../types';
import { formatCurrency, formatDate, getStatusColor, getStatusText } from '../utils/validation';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  CreditCard, 
  Plus, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  Calendar,
  Globe
} from 'lucide-react';

const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    pendingTransactions: 0,
    completedTransactions: 0,
    totalAmount: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getMyTransactions(1, 5);
      setRecentTransactions(response.transactions);
      
      // Calculate stats
      const allTransactionsResponse = await apiService.getMyTransactions(1, 1000);
      const allTransactions = allTransactionsResponse.transactions;
      
      const totalTransactions = allTransactions.length;
      const pendingTransactions = allTransactions.filter(t => t.status === 'pending').length;
      const completedTransactions = allTransactions.filter(t => t.status === 'completed').length;
      const totalAmount = allTransactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);
      
      setStats({
        totalTransactions,
        pendingTransactions,
        completedTransactions,
        totalAmount
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
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
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="dashboard-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.fullName}! 👋
        </h1>
            <p className="text-gray-600 text-lg">
              Manage your international payments and track transaction status
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
              <Globe className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dashboard-card card-hover cursor-pointer" onClick={() => navigate('/customer/payment')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
            <div>
                <h3 className="text-lg font-semibold text-gray-900">New Payment</h3>
              <p className="text-gray-600 text-sm">Create a new international payment</p>
            </div>
            </div>
            <ArrowUpRight className="w-6 h-6 text-gray-400" />
          </div>
        </div>

        <div className="dashboard-card card-hover cursor-pointer" onClick={() => navigate('/customer/transactions')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
            <div>
                <h3 className="text-lg font-semibold text-gray-900">View All Transactions</h3>
              <p className="text-gray-600 text-sm">See your complete transaction history</p>
            </div>
            </div>
            <ArrowDownLeft className="w-6 h-6 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="dashboard-card card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Transactions</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalTransactions}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="dashboard-card card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Pending</p>
              <p className="text-3xl font-bold text-gray-900">{stats.pendingTransactions}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="dashboard-card card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Completed</p>
              <p className="text-3xl font-bold text-gray-900">{stats.completedTransactions}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="dashboard-card card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Sent</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(stats.totalAmount, 'USD')}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="dashboard-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
          <button
            onClick={() => navigate('/customer/transactions')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <span>View All</span>
            <Eye className="w-4 h-4" />
          </button>
        </div>
        
          {recentTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
            <p className="text-gray-600 mb-6">Create your first payment to get started!</p>
            <button
              onClick={() => navigate('/customer/payment')}
              className="btn-primary"
            >
              Create Payment
            </button>
            </div>
          ) : (
          <div className="space-y-4">
                {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                      <div>
                    <h4 className="font-semibold text-gray-900">{transaction.payeeName}</h4>
                    <p className="text-sm text-gray-600">{transaction.payeeAccount}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{formatDate(transaction.createdAt)}</span>
                        </div>
                        </div>
                      </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                        {formatCurrency(transaction.amount, transaction.currency)}
                  </p>
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                        {getStatusText(transaction.status)}
                      </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
