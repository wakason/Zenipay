import React, { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  CreditCard, 
  History, 
  User, 
  LogOut, 
  Shield,
  Menu,
  X,
  Bell,
  Settings,
  ChevronDown
} from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const getNavigationItems = () => {
    if (user?.role === 'customer') {
      return [
        { path: '/customer/dashboard', label: 'Dashboard', icon: Home },
        { path: '/customer/payment', label: 'New Payment', icon: CreditCard },
        { path: '/customer/transactions', label: 'Transactions', icon: History },
        { path: '/customer/profile', label: 'Profile', icon: User },
      ];
    } else if (user?.role === 'employee') {
      return [
        { path: '/employee/dashboard', label: 'Dashboard', icon: Home },
        { path: '/employee/transactions', label: 'Transactions', icon: Shield },
        { path: '/employee/profile', label: 'Profile', icon: User },
      ];
    }
    return [];
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-3 rounded-xl bg-gray-800/90 backdrop-blur-sm shadow-lg border border-gray-700/50"
        >
          {isMobileMenuOpen ? <X size={24} className="text-white" /> : <Menu size={24} className="text-white" />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-72 glass transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-20 px-6 border-b border-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ZeniPay</h1>
                <p className="text-xs text-gray-300">Global Payments</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-gray-700/50">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <User size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{user?.fullName}</p>
                <p className="text-xs text-gray-300 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(item.path)
                      ? 'bg-cyan-500/20 text-cyan-400 shadow-lg border border-cyan-500/30'
                      : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-700/50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-4 px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:ml-72">
        {/* Top Navigation Bar */}
        <div className="sticky top-0 z-30 glass border-b border-gray-700/50">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {location.pathname.includes('dashboard') && 'Dashboard'}
                {location.pathname.includes('payment') && 'New Payment'}
                {location.pathname.includes('transactions') && 'Transactions'}
                {location.pathname.includes('profile') && 'Profile'}
              </h2>
              <p className="text-gray-300 text-sm">
                {user?.role === 'customer' ? 'Customer Portal' : 'Employee Portal'}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="p-2 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-colors">
                <Bell size={20} className="text-gray-300 hover:text-cyan-400" />
              </button>
              
              {/* Settings */}
              <button className="p-2 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-colors">
                <Settings size={20} className="text-gray-300 hover:text-cyan-400" />
              </button>
              
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <User size={16} className="text-white" />
                  </div>
                  <ChevronDown size={16} className="text-gray-300" />
                </button>
                
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 glass rounded-xl shadow-lg py-2">
                    <button
                      onClick={() => {
                        navigate('/customer/profile');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800/50 hover:text-white transition-colors"
                    >
                      Profile Settings
                    </button>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
          {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
