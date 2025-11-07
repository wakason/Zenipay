import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { validatePassword } from '../utils/validation';
import LoadingSpinner from '../components/LoadingSpinner';
import { ArrowLeft, User, Key, Eye, EyeOff } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [successMessage, setSuccessMessage] = useState('');

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
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

  const validatePasswordForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    const newPasswordError = validatePassword(passwordForm.newPassword);
    if (newPasswordError) {
      newErrors.newPassword = newPasswordError;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) return;
    
    setIsLoading(true);
    try {
      await apiService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      await refreshUser(); // Refresh user data after password change
      setSuccessMessage('Password changed successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error: any) {
      setErrors({ submit: error.response?.data?.error || 'Password change failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => window.history.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600">Manage your account information</p>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <User size={32} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{user?.fullName}</h2>
            <p className="text-gray-600 capitalize">{user?.role}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <p className="mt-1 text-sm text-gray-900">{user?.fullName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Account Number</label>
            <p className="mt-1 text-sm text-gray-900">{user?.accountNumber}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <p className="mt-1 text-sm text-gray-900 capitalize">{user?.role}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Member Since</label>
            <p className="mt-1 text-sm text-gray-900">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Key size={24} className="text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
        </div>

        {successMessage && (
          <div className="mb-4 rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
              Current Password
            </label>
            <div className="mt-1 relative">
              <input
                id="currentPassword"
                name="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                className={`block w-full px-3 py-2 pr-10 border ${
                  errors.currentPassword ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white`}
                placeholder="Enter current password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
            )}
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <div className="mt-1 relative">
              <input
                id="newPassword"
                name="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                required
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                className={`block w-full px-3 py-2 pr-10 border ${
                  errors.newPassword ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white`}
                placeholder="Enter new password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <div className="mt-1 relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                className={`block w-full px-3 py-2 pr-10 border ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          {errors.submit && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{errors.submit}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
