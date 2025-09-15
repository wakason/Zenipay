import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CustomerDashboard from './pages/CustomerDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import PaymentForm from './pages/PaymentForm';
import TransactionHistory from './pages/TransactionHistory';
import EmployeeTransactions from './pages/EmployeeTransactions';
import ProfilePage from './pages/ProfilePage';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ 
  children, 
  allowedRoles 
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    console.error('Unauthorized access: user role', user.role, 'is not allowed. Expected roles:', allowedRoles);
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated && user) {
    // Redirect based on user role
    if (user.role === 'customer') {
      return <Navigate to="/customer/dashboard" replace />;
    } else if (user.role === 'employee') {
      return <Navigate to="/employee/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

// Main App Routes
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } 
      />
      <Route 
        path="/register" 
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        } 
      />

      {/* Customer Routes */}
      <Route 
        path="/customer/*" 
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<CustomerDashboard />} />
                <Route path="/payment" element={<PaymentForm />} />
                <Route path="/transactions" element={<TransactionHistory />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/" element={<Navigate to="/customer/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } 
      />

      {/* Employee Routes */}
      <Route 
        path="/employee/*" 
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<EmployeeDashboard />} />
                <Route path="/transactions" element={<EmployeeTransactions />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/" element={<Navigate to="/employee/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } 
      />

      {/* Default Routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

// Main App Component
const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
