// Updated API service - frontend/src/services/api.js
// Fix the port mismatch between frontend and backend

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance with proper configuration
import axios from 'axios';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }
    return config;
  },
  (error) => {
    console.error('🚨 API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging and error handling
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    console.error('🚨 API Response Error:', error);
    
    // Handle specific error cases
    if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      console.error('🚨 Backend server is not running or not accessible at:', API_BASE_URL);
      throw new Error('Cannot connect to server. Please ensure the backend is running on port 5001.');
    }
    
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      console.error(`🚨 Server Error ${status}:`, data);
      
      if (status === 404) {
        throw new Error('API endpoint not found');
      } else if (status === 500) {
        throw new Error(data.message || 'Internal server error');
      } else if (status === 400) {
        throw new Error(data.message || 'Bad request');
      }
      
      throw new Error(data.message || `Server error: ${status}`);
    }
    
    return Promise.reject(error);
  }
);

// Upload PDF file with progress tracking
export const uploadPDF = async (file, onProgress = null) => {
  try {
    console.log('📁 Uploading PDF:', file.name, 'Size:', file.size);
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress({ percentage, loaded: progressEvent.loaded, total: progressEvent.total });
        }
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }
};

// Process custom text
export const processText = async (text) => {
  try {
    console.log('📝 Processing text:', text.substring(0, 50) + '...');
    
    const response = await api.post('/process-text', { text });
    return response.data;
  } catch (error) {
    console.error('Error processing text:', error);
    throw error;
  }
};

// Get user statistics
export const getStats = async () => {
  try {
    console.log('📊 Fetching user statistics...');
    
    const response = await api.get('/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
};

// Save typing session statistics
export const saveStats = async (sessionData) => {
  try {
    console.log('💾 Saving session statistics:', sessionData);
    
    // Validate required fields before sending
    const requiredFields = ['wpm', 'accuracy', 'duration'];
    const missingFields = requiredFields.filter(field => 
      sessionData[field] === undefined || sessionData[field] === null
    );
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Log critical values for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Session data debug:', {
        wpm: sessionData.wpm,
        accuracy: sessionData.accuracy,
        duration: sessionData.duration,
        durationIsZero: sessionData.duration === 0,
        durationIsNaN: isNaN(sessionData.duration)
      });
    }
    
    const response = await api.post('/save-stats', sessionData);
    return response.data;
  } catch (error) {
    console.error('Error saving stats:', error);
    throw error;
  }
};

// Reset user statistics
export const resetStats = async (newStats = null) => {
  try {
    console.log('🔄 Resetting user statistics...');
    
    const response = await api.post('/reset-stats', newStats || {});
    return response.data;
  } catch (error) {
    console.error('Error resetting stats:', error);
    throw error;
  }
};

// Enhanced analytics endpoints
export const getDetailedAnalytics = async (timeRange = 'week') => {
  try {
    console.log('📈 Fetching detailed analytics for:', timeRange);
    
    const response = await api.get(`/analytics/detailed?timeRange=${timeRange}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching detailed analytics:', error);
    throw error;
  }
};

// Get user goals
export const getGoals = async () => {
  try {
    console.log('🎯 Fetching user goals...');
    
    const response = await api.get('/analytics/goals');
    return response.data;
  } catch (error) {
    console.error('Error fetching goals:', error);
    throw error;
  }
};

// Create new goal
export const createGoal = async (goalData) => {
  try {
    console.log('➕ Creating new goal:', goalData);
    
    const response = await api.post('/analytics/goals', goalData);
    return response.data;
  } catch (error) {
    console.error('Error creating goal:', error);
    throw error;
  }
};

// Get achievements
export const getAchievements = async () => {
  try {
    console.log('🏆 Fetching achievements...');
    
    const response = await api.get('/analytics/achievements');
    return response.data;
  } catch (error) {
    console.error('Error fetching achievements:', error);
    throw error;
  }
};

// Debug endpoints (development only)
export const getDebugStats = async () => {
  try {
    console.log('🐛 Fetching debug statistics...');
    
    const response = await api.get('/debug-stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching debug stats:', error);
    throw error;
  }
};

export const validateSessionData = async (sessionData) => {
  try {
    console.log('✅ Validating session data:', sessionData);
    
    const response = await api.post('/validate-session', sessionData);
    return response.data;
  } catch (error) {
    console.error('Error validating session data:', error);
    throw error;
  }
};

// Health check
export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

// Test connection
export const testConnection = async () => {
  try {
    console.log('🔌 Testing backend connection...');
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Backend connection successful:', data);
    return data;
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    throw new Error(`Cannot connect to backend at ${API_BASE_URL}. Please check if the server is running.`);
  }
};

// Export API configuration for debugging
export const getApiConfig = () => ({
  baseURL: API_BASE_URL,
  timeout: api.defaults.timeout,
  headers: api.defaults.headers,
});

// Utility function to check if backend is available
export const isBackendAvailable = async () => {
  try {
    await checkHealth();
    return true;
  } catch (error) {
    return false;
  }
};

// Enhanced error handling wrapper
export const withErrorHandling = (apiCall) => {
  return async (...args) => {
    try {
      return await apiCall(...args);
    } catch (error) {
      // Log error details for debugging
      console.error('API call failed:', {
        function: apiCall.name,
        args,
        error: error.message,
        stack: error.stack
      });
      
      // Re-throw with enhanced error message
      if (error.message.includes('Network Error') || error.code === 'ECONNREFUSED') {
        throw new Error(
          `Backend server is not accessible. Please ensure it's running on port 5001.\n\n` +
          `Try running: python backend/app.py\n\n` +
          `Original error: ${error.message}`
        );
      }
      
      throw error;
    }
  };
};

// Export wrapped versions for better error handling
export const saveStatsWithErrorHandling = withErrorHandling(saveStats);
export const getStatsWithErrorHandling = withErrorHandling(getStats);
export const uploadPDFWithErrorHandling = withErrorHandling(uploadPDF);

export default {
  uploadPDF,
  processText,
  getStats,
  saveStats,
  resetStats,
  getDetailedAnalytics,
  getGoals,
  createGoal,
  getAchievements,
  getDebugStats,
  validateSessionData,
  checkHealth,
  testConnection,
  getApiConfig,
  isBackendAvailable
};