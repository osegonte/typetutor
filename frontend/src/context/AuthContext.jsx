import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

// Auth state reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: !!action.payload, loading: false, error: null };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false, token: null, loading: false, error: null };
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('typetutor_token');
        const user = localStorage.getItem('typetutor_user');
        
        if (token && user) {
          dispatch({ type: 'SET_TOKEN', payload: token });
          dispatch({ type: 'SET_USER', payload: JSON.parse(user) });
          
          // Verify token is still valid
          try {
            const profile = await authService.getProfile();
            dispatch({ type: 'SET_USER', payload: profile.user });
          } catch (error) {
            // Token is invalid, clear auth
            logout();
          }
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const response = await authService.login(email, password);
      
      if (response.success) {
        const { user, token } = response;
        
        // Store in localStorage
        localStorage.setItem('typetutor_token', token);
        localStorage.setItem('typetutor_user', JSON.stringify(user));
        
        // Update state
        dispatch({ type: 'SET_TOKEN', payload: token });
        dispatch({ type: 'SET_USER', payload: user });
        
        return { success: true };
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Login failed' });
        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage = error.message || 'Network error during login';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  const register = useCallback(async (email, password, displayName) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const response = await authService.register(email, password, displayName);
      
      if (response.success) {
        const { user, token } = response;
        
        // Store in localStorage
        localStorage.setItem('typetutor_token', token);
        localStorage.setItem('typetutor_user', JSON.stringify(user));
        
        // Update state
        dispatch({ type: 'SET_TOKEN', payload: token });
        dispatch({ type: 'SET_USER', payload: user });
        
        return { success: true };
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error || 'Registration failed' });
        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage = error.message || 'Network error during registration';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('typetutor_token');
    localStorage.removeItem('typetutor_user');
    dispatch({ type: 'LOGOUT' });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const value = {
    ...state,
    login,
    register,
    logout,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};