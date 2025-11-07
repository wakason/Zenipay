import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { RegisterRequest } from "../types";
import { validateAccountNumber, validateIdNumber, validatePassword, validateName } from "../utils/validation";
import LoadingSpinner from "../components/LoadingSpinner";
import { Shield, Eye, EyeOff, Building2, User, Lock, ArrowRight, CreditCard, FileText } from "lucide-react";

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<RegisterRequest>({
    fullName: "",
    idNumber: "",
    accountNumber: "",
    password: ""
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    const nameError = validateName(formData.fullName);
    if (nameError) newErrors.fullName = nameError;
    
    const idError = validateIdNumber(formData.idNumber);
    if (idError) newErrors.idNumber = idError;
    
    const accountError = validateAccountNumber(formData.accountNumber);
    if (accountError) newErrors.accountNumber = accountError;
    
    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      await register(formData);
      navigate('/login'); // Redirect to login page after successful registration
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300d4ff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>
      
      <div className="absolute top-20 left-20 w-32 h-32 bg-cyan-500/20 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-10 w-24 h-24 bg-orange-500/20 rounded-full blur-xl animate-pulse delay-500"></div>

      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl mb-6 border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
            <CreditCard className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">ZeniPay</h1>
          <p className="text-gray-300 text-lg">Global Payment Platform</p>
        </div>

        <div className="glass rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-white mb-2">Create Account</h2>
            <p className="text-gray-300">Register for the secure banking portal</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-cyan-400" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={`block w-full pl-12 pr-4 py-3 bg-gray-900/50 border ${
                      errors.fullName ? "border-red-500" : "border-gray-700"
                    } rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500`}
                    placeholder="Enter your full name"
                  />
                </div>
                {errors.fullName && (
                  <p className="mt-2 text-sm text-red-400">{errors.fullName}</p>
                )}
              </div>

              <div>
                <label htmlFor="idNumber" className="block text-sm font-medium text-gray-300 mb-2">
                  ID Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FileText className="h-5 w-5 text-cyan-400" />
                  </div>
                  <input
                    id="idNumber"
                    name="idNumber"
                    type="text"
                    required
                    value={formData.idNumber}
                    onChange={handleInputChange}
                    className={`block w-full pl-12 pr-4 py-3 bg-gray-900/50 border ${
                      errors.idNumber ? "border-red-500" : "border-gray-700"
                    } rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500`}
                    placeholder="Enter your 13-digit ID number"
                  />
                </div>
                {errors.idNumber && (
                  <p className="mt-2 text-sm text-red-400">{errors.idNumber}</p>
                )}
              </div>

              <div>
                <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-300 mb-2">
                  Account Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-cyan-400" />
                  </div>
                  <input
                    id="accountNumber"
                    name="accountNumber"
                    type="text"
                    required
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    className={`block w-full pl-12 pr-4 py-3 bg-gray-900/50 border ${
                      errors.accountNumber ? "border-red-500" : "border-gray-700"
                    } rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500`}
                    placeholder="Enter your account number"
                  />
                </div>
                {errors.accountNumber && (
                  <p className="mt-2 text-sm text-red-400">{errors.accountNumber}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-cyan-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoCapitalize="none"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`block w-full pl-12 pr-12 py-3 bg-gray-900/50 border ${
                      errors.password ? "border-red-500" : "border-gray-700"
                    } rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-300"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-400">{errors.password}</p>
                )}
              </div>
            </div>

            {errors.submit && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/50 p-4">
                <p className="text-sm text-red-400">{errors.submit}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="relative w-full flex items-center justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>

            <div className="text-center mt-6">
              <p className="text-gray-400 text-sm">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>

            <div className="mt-6 p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-medium text-gray-300">Password Requirements:</h3>
              </div>
              <ul className="text-xs text-gray-400 space-y-1 ml-6">
                <li>• At least 8 characters long</li>
                <li>• Contains uppercase and lowercase letters</li>
                <li>• Contains at least one number</li>
                <li>• Contains at least one special character (@$!%*?&)</li>
              </ul>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
