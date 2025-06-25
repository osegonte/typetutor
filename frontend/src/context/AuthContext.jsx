// 1. First, create: frontend/src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://typetutor-production.up.railway.app/api';

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('typetutor_token');
        const savedUser = localStorage.getItem('typetutor_user');

        if (token && savedUser) {
          try {
            // Verify token is still valid
            const response = await fetch(`${API_BASE_URL}/auth/profile`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
              const data = await response.json();
              setUser(data.user);
              setIsAuthenticated(true);
            } else {
              // Token invalid, clear storage
              localStorage.removeItem('typetutor_token');
              localStorage.removeItem('typetutor_user');
            }
          } catch (error) {
            console.warn('Token verification failed:', error);
            localStorage.removeItem('typetutor_token');
            localStorage.removeItem('typetutor_user');
          }
        }
      } catch (error) {
        console.warn('Failed to initialize auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (response.ok && data.success && data.token) {
        localStorage.setItem('typetutor_token', data.token);
        localStorage.setItem('typetutor_user', JSON.stringify(data.user));
        
        setUser(data.user);
        setIsAuthenticated(true);
        setError(null);
        
        return { success: true, user: data.user };
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (err) {
      const errorMessage = err.message || 'Network error during login';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, displayName = '') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, display_name: displayName }),
      });

      const data = await response.json();
      
      if (response.ok && data.success && data.token) {
        localStorage.setItem('typetutor_token', data.token);
        localStorage.setItem('typetutor_user', JSON.stringify(data.user));
        
        setUser(data.user);
        setIsAuthenticated(true);
        setError(null);
        
        return { success: true, user: data.user };
      } else {
        throw new Error(data.error || 'Registration failed');
      }
    } catch (err) {
      const errorMessage = err.message || 'Network error during registration';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('typetutor_token');
      
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
          });
        } catch (error) {
          console.warn('Logout API call failed, but continuing with local logout');
        }
      }
    } catch (error) {
      console.warn('Logout error:', error);
    }
    
    // Clear local storage
    localStorage.removeItem('typetutor_token');
    localStorage.removeItem('typetutor_user');
    
    // Reset state
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
    setLoading(false);
  };

  const clearError = () => setError(null);

  const value = {
    user, loading, error, isAuthenticated,
    login, register, logout, clearError,
    isLoading: loading, hasError: !!error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

// 2. Create: frontend/src/components/auth/AuthModal.jsx
import React, { useState } from 'react';
import { X, Eye, EyeOff, Mail, Lock, User, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AuthModal = ({ isOpen, onClose, darkMode, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode);
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', displayName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  
  const { login, register, loading, error, clearError } = useAuth();

  if (!isOpen) return null;

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (mode === 'register' && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (mode === 'register' && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    
    if (!validateForm()) return;

    const result = mode === 'login' 
      ? await login(formData.email, formData.password)
      : await register(formData.email, formData.password, formData.displayName);
    
    if (result.success) {
      onClose();
      setFormData({ email: '', password: '', confirmPassword: '', displayName: '' });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl max-w-md w-full ${
        darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
      } shadow-2xl`}>
        <div className={`flex justify-between items-center p-6 border-b ${
          darkMode ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <h2 className="text-xl font-bold">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          {error && (
            <div className={`p-4 rounded-xl border mb-4 ${
              darkMode ? 'bg-red-900/20 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Email Address
              </label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} size={18} />
                <input
                  type="email" name="email" value={formData.email} onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                  } ${formErrors.email ? 'border-red-500' : ''}`}
                  placeholder="Enter your email" disabled={loading}
                />
              </div>
              {formErrors.email && <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>}
            </div>

            {mode === 'register' && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Display Name (Optional)
                </label>
                <div className="relative">
                  <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} size={18} />
                  <input
                    type="text" name="displayName" value={formData.displayName} onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      darkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Choose a display name" disabled={loading}
                  />
                </div>
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Password
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} size={18} />
                <input
                  type={showPassword ? 'text' : 'password'} name="password" 
                  value={formData.password} onChange={handleInputChange}
                  className={`w-full pl-10 pr-10 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                  } ${formErrors.password ? 'border-red-500' : ''}`}
                  placeholder={mode === 'login' ? 'Enter your password' : 'Create a password'} disabled={loading}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {formErrors.password && <p className="mt-1 text-sm text-red-500">{formErrors.password}</p>}
            </div>

            {mode === 'register' && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'} name="confirmPassword" 
                    value={formData.confirmPassword} onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      darkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                    } ${formErrors.confirmPassword ? 'border-red-500' : ''}`}
                    placeholder="Confirm your password" disabled={loading}
                  />
                </div>
                {formErrors.confirmPassword && <p className="mt-1 text-sm text-red-500">{formErrors.confirmPassword}</p>}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                  <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-purple-600 hover:text-purple-700 font-medium">
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;

// 3. Update: frontend/src/components/AuthWrapper.jsx
import React, { useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import TypeTutorApp from './TypeTutorApp';
import AuthModal from './auth/AuthModal';
import { User, LogIn, LogOut } from 'lucide-react';

const AuthHeader = ({ darkMode }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleAuthClick = (mode) => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <>
      <div className={`px-6 py-3 border-b ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} relative z-20`}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {isAuthenticated && user && (
              <div className={`px-3 py-1 rounded-full text-xs ${darkMode ? 'bg-green-900/20 text-green-400 border border-green-800' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                ✅ Signed in as {user.display_name || user.username || user.email}
              </div>
            )}
            {!isAuthenticated && (
              <div className={`px-3 py-1 rounded-full text-xs ${darkMode ? 'bg-blue-900/20 text-blue-400 border border-blue-800' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                👤 Guest Mode - Sign up to save progress
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {!isAuthenticated && (
              <>
                <button onClick={() => handleAuthClick('login')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                  }`}>
                  <LogIn size={14} />
                  <span>Sign In</span>
                </button>
                <button onClick={() => handleAuthClick('register')}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm">
                  <User size={14} />
                  <span>Sign Up</span>
                </button>
              </>
            )}
            
            {isAuthenticated && (
              <div className="relative">
                <button onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all text-sm ${
                    darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}>
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">
                    {user?.display_name?.[0] || user?.email?.[0] || 'U'}
                  </div>
                  <span>{user?.display_name || user?.username || 'User'}</span>
                </button>

                {showUserMenu && (
                  <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl border shadow-lg z-50 ${
                    darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
                  }`}>
                    <div className={`p-3 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                      <p className="text-sm font-medium">{user?.display_name || user?.username}</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user?.email}</p>
                    </div>
                    <div className="p-1">
                      <button onClick={handleLogout}
                        className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors text-sm">
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} darkMode={darkMode} initialMode={authMode} />
    </>
  );
};

const AuthWrapperContent = () => {
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) return savedMode === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setDarkMode(isDark);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <AuthHeader darkMode={darkMode} />
      <TypeTutorApp />
    </div>
  );
};

const AuthWrapper = () => (
  <AuthProvider>
    <AuthWrapperContent />
  </AuthProvider>
);

export default AuthWrapper;

// 4. Update: frontend/src/App.jsx
import React from 'react';
import AuthWrapper from './components/AuthWrapper';
import './index.css';

function App() {
  return <AuthWrapper />;
}

export default App;