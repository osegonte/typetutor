

import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Get API URL with fallback
  const getApiUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://typetutor-production.up.railway.app/api';
    console.log('Using API URL:', apiUrl);
    return apiUrl;
  };

  // Enhanced error handling for production
  const handleAuthError = (error, operation) => {
    console.error(`Auth error during ${operation}:`, error);
    
    // Check if it's a network error
    if (error.message.includes('fetch')) {
      setError('Network error. Please check your connection and try again.');
    } else if (error.message.includes('401')) {
      setError('Authentication failed. Please check your credentials.');
    } else if (error.message.includes('500')) {
      setError('Server error. Please try again later.');
    } else {
      setError(error.message || 'An unexpected error occurred.');
    }
    
    return { success: false, error: error.message };
  };

  // Initialize authentication state with better error handling
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if we have stored auth data
        const token = localStorage.getItem('typetutor_token');
        const savedUser = localStorage.getItem('typetutor_user');

        if (token && savedUser) {
          try {
            // Verify token is still valid
            const apiUrl = getApiUrl();
            const response = await fetch(`${apiUrl}/auth/profile`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              const data = await response.json();
              setUser(data.user);
              setIsAuthenticated(true);
              console.log('Auth initialized successfully');
            } else {
              // Token invalid, clear storage
              localStorage.removeItem('typetutor_token');
              localStorage.removeItem('typetutor_user');
              console.log('Stored token was invalid, cleared');
            }
          } catch (error) {
            console.warn('Token verification failed:', error);
            // Don't treat this as a critical error in production
            localStorage.removeItem('typetutor_token');
            localStorage.removeItem('typetutor_user');
          }
        }
      } catch (error) {
        console.warn('Failed to initialize auth:', error);
        // Don't show error to user for initialization failures
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
      const apiUrl = getApiUrl();
      console.log('Attempting login to:', `${apiUrl}/auth/login`);
      
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (response.ok && data.success && data.token) {
        // Store token and user data
        localStorage.setItem('typetutor_token', data.token);
        localStorage.setItem('typetutor_user', JSON.stringify(data.user));
        
        setUser(data.user);
        setIsAuthenticated(true);
        setError(null);
        
        console.log('Login successful');
        return { success: true, user: data.user };
      } else {
        throw new Error(data.error || data.message || 'Login failed');
      }
    } catch (err) {
      return handleAuthError(err, 'login');
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, displayName = '') => {
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = getApiUrl();
      console.log('Attempting registration to:', `${apiUrl}/auth/register`);
      
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password, 
          display_name: displayName || undefined 
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success && data.token) {
        // Store token and user data
        localStorage.setItem('typetutor_token', data.token);
        localStorage.setItem('typetutor_user', JSON.stringify(data.user));
        
        setUser(data.user);
        setIsAuthenticated(true);
        setError(null);
        
        console.log('Registration successful');
        return { success: true, user: data.user };
      } else {
        throw new Error(data.error || data.message || 'Registration failed');
      }
    } catch (err) {
      return handleAuthError(err, 'registration');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    
    try {
      const apiUrl = getApiUrl();
      const token = localStorage.getItem('typetutor_token');
      
      // Try to call logout endpoint, but don't fail if it doesn't work
      if (token) {
        try {
          await fetch(`${apiUrl}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        } catch (error) {
          console.warn('Logout API call failed, but continuing with local logout:', error);
        }
      }
    } catch (error) {
      console.warn('Logout error:', error);
    }
    
    // Always clear local storage and state
    localStorage.removeItem('typetutor_token');
    localStorage.removeItem('typetutor_user');
    
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
    setLoading(false);
    
    console.log('Logout completed');
  };

  const clearError = () => {
    setError(null);
  };

  // Test connection function
  const testConnection = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/health`);
      const data = await response.json();
      
      console.log('Connection test result:', data);
      return {
        success: response.ok,
        data,
        authAvailable: data.authentication_enabled || false
      };
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        success: false,
        error: error.message,
        authAvailable: false
      };
    }
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
    testConnection,
    
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

export default AuthContext;