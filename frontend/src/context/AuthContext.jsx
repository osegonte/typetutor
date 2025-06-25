import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('typetutor_token');
        const savedUser = localStorage.getItem('typetutor_user');

        if (token && savedUser) {
          try {
            // Verify token is still valid
            const profile = await authService.getProfile();
            setUser(profile.user);
            setIsAuthenticated(true);
          } catch (error) {
            // Token invalid, clear storage
            localStorage.removeItem('typetutor_token');
            localStorage.removeItem('typetutor_user');
            console.log('Stored token was invalid, cleared');
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
      const response = await authService.login(email, password);
      
      if (response.success && response.token) {
        // Store token and user data
        localStorage.setItem('typetutor_token', response.token);
        localStorage.setItem('typetutor_user', JSON.stringify(response.user));
        
        setUser(response.user);
        setIsAuthenticated(true);
        setError(null);
        
        console.log('Login successful:', response.user);
        return { success: true, user: response.user };
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (err) {
      const errorMessage = err.message || 'Network error during login';
      setError(errorMessage);
      console.error('Login error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, displayName = '') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.register(email, password, displayName);
      
      if (response.success && response.token) {
        // Store token and user data
        localStorage.setItem('typetutor_token', response.token);
        localStorage.setItem('typetutor_user', JSON.stringify(response.user));
        
        setUser(response.user);
        setIsAuthenticated(true);
        setError(null);
        
        console.log('Registration successful:', response.user);
        return { success: true, user: response.user };
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (err) {
      const errorMessage = err.message || 'Network error during registration';
      setError(errorMessage);
      console.error('Registration error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    
    try {
      // Call backend logout (optional, to invalidate token)
      await authService.logout();
    } catch (error) {
      console.warn('Logout API call failed:', error);
      // Continue with local logout even if API fails
    }
    
    // Clear local storage
    localStorage.removeItem('typetutor_token');
    localStorage.removeItem('typetutor_user');
    
    // Reset state
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
    setLoading(false);
    
    console.log('Logout completed');
  };

  const clearError = () => {
    setError(null);
  };

  const refreshToken = async () => {
    try {
      const response = await authService.refreshToken();
      
      if (response.success && response.token) {
        localStorage.setItem('typetutor_token', response.token);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Force logout on refresh failure
      logout();
      return false;
    }
  };

  const updateUser = (userData) => {
    setUser(prevUser => ({ ...prevUser, ...userData }));
    localStorage.setItem('typetutor_user', JSON.stringify({ ...user, ...userData }));
  };

  const value = {
    // State
    user,
    loading,
    error,
    isAuthenticated,
    
    // Actions
    login,
    register,
    logout,
    clearError,
    refreshToken,
    updateUser,
    
    // Utility
    isLoading: loading,
    hasError: !!error
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

// Higher-order component for protected routes
export const withAuth = (WrappedComponent) => {
  return (props) => {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
            <p className="text-gray-600">Please sign in to access this feature.</p>
          </div>
        </div>
      );
    }
    
    return <WrappedComponent {...props} />;
  };
};

export default AuthContext;