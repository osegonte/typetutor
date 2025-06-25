import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Use production API URL
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://typetutor-production.up.railway.app/api';

  console.log('🔗 AuthContext using API:', API_BASE_URL);

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
              console.log('✅ Auth initialized with existing token');
            } else {
              // Token invalid, clear storage
              localStorage.removeItem('typetutor_token');
              localStorage.removeItem('typetutor_user');
              console.log('🔄 Invalid token cleared');
            }
          } catch (error) {
            console.warn('⚠️ Token verification failed:', error);
            localStorage.removeItem('typetutor_token');
            localStorage.removeItem('typetutor_user');
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to initialize auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [API_BASE_URL]);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔐 Attempting login to:', `${API_BASE_URL}/auth/login`);
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'omit',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('📥 Login response:', { status: response.status, success: data.success });
      
      if (response.ok && data.success && data.token) {
        localStorage.setItem('typetutor_token', data.token);
        localStorage.setItem('typetutor_user', JSON.stringify(data.user));
        
        setUser(data.user);
        setIsAuthenticated(true);
        setError(null);
        
        console.log('✅ Login successful');
        return { success: true, user: data.user };
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
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
      console.log('📝 Attempting registration to:', `${API_BASE_URL}/auth/register`);
      
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'omit',
        body: JSON.stringify({ email, password, display_name: displayName }),
      });

      const data = await response.json();
      console.log('📥 Register response:', { status: response.status, success: data.success });
      
      if (response.ok && data.success && data.token) {
        localStorage.setItem('typetutor_token', data.token);
        localStorage.setItem('typetutor_user', JSON.stringify(data.user));
        
        setUser(data.user);
        setIsAuthenticated(true);
        setError(null);
        
        console.log('✅ Registration successful');
        return { success: true, user: data.user };
      } else {
        throw new Error(data.error || 'Registration failed');
      }
    } catch (err) {
      console.error('❌ Registration error:', err);
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
          console.warn('⚠️ Logout API call failed, but continuing with local logout');
        }
      }
    } catch (error) {
      console.warn('⚠️ Logout error:', error);
    }
    
    // Clear local storage
    localStorage.removeItem('typetutor_token');
    localStorage.removeItem('typetutor_user');
    
    // Reset state
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
    setLoading(false);
    
    console.log('🔓 Logout complete');
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