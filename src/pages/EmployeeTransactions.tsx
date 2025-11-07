import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';
import { Transaction } from '../types';
import { formatCurrency, formatDate, getStatusColor, getStatusText } from '../utils/validation';
import LoadingSpinner from '../components/LoadingSpinner';
import { ArrowLeft, CheckCircle, XCircle, Send } from 'lucide-react';

const EmployeeTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showModal, setShowModal] = useState(false);

  const loadTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getAllTransactions(currentPage, 10, statusFilter);
      setTransactions(response.transactions);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    loadTransactions();
  }, [currentPage, statusFilter, loadTransactions]);

  const handleVerifyTransaction = async (transactionId: number, verified: boolean) => {
    try {
      await apiService.verifyTransaction(transactionId, { 
        verified, 
        notes: verified ? 'Transaction verified by employee' : 'Transaction rejected by employee' 
      });
      await loadTransactions(); // Refresh data
      setShowModal(false);
    } catch (error) {
      console.error('Failed to verify transaction:', error);
      alert('Failed to verify transaction. Please try again.');
    }
  };

  const handleSubmitToSwift = async (transactionId: number) => {
    try {
      await apiService.submitToSwift(transactionId);
      loadTransactions(); // Refresh data
    } catch (error) {
      console.error('Failed to submit to SWIFT:', error);
    }
  };

  const openModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => window.history.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Transactions</h1>
          <p className="text-gray-600">Review and process payment transactions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status Filter
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Transactions</h2>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>No transactions found.</p>
          </div>
        ) : (
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
                    Payee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
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
                {transactions.map((transaction) => (
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                        {getStatusText(transaction.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {transaction.status === 'pending' && (
                        <>
                          <button
                            onClick={() => openModal(transaction)}
                            className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded text-xs"
                          >
                            Review
                          </button>
                        </>
                      )}
                      {transaction.status === 'verified' && (
                        <button
                          onClick={() => handleSubmitToSwift(transaction.id)}
                          className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-2 py-1 rounded text-xs flex items-center"
                        >
                          <Send size={12} className="mr-1" />
                          Submit to SWIFT
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Review Modal */}
      {showModal && selectedTransaction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Review Transaction #{selectedTransaction.id}
              </h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Customer:</span> {selectedTransaction.customerName}
                </div>
                <div>
                  <span className="font-medium">Payee:</span> {selectedTransaction.payeeName}
                </div>
                <div>
                  <span className="font-medium">Account:</span> {selectedTransaction.payeeAccount}
                </div>
                <div>
                  <span className="font-medium">SWIFT:</span> {selectedTransaction.swiftCode}
                </div>
                <div>
                  <span className="font-medium">Amount:</span> {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleVerifyTransaction(selectedTransaction.id, false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md flex items-center"
                >
                  <XCircle size={16} className="mr-1" />
                  Reject
                </button>
                <button
                  onClick={() => handleVerifyTransaction(selectedTransaction.id, true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md flex items-center"
                >
                  <CheckCircle size={16} className="mr-1" />
                  Verify
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeTransactions;
