// api.js - Fixed API service for TypeTutor frontend
import axios from 'axios';

// FIXED: Updated to use port 5001 instead of 5000
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create axios instance with enhanced error handling
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 second timeout for PDF uploads
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Log API calls in development
    if (import.meta.env.DEV) {
      console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    // Add timestamp to prevent caching
    if (config.method === 'get') {
      config.params = { 
        ...config.params, 
        _t: Date.now() 
      };
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with better error handling
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    // Create consistent error format
    const errorInfo = {
      message: 'An unexpected error occurred',
      status: error.response?.status || 500,
      statusText: error.response?.statusText || 'Internal Server Error',
      data: error.response?.data || null,
      isNetworkError: !error.response,
      timestamp: new Date().toISOString()
    };

    // Handle different error types
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      errorInfo.message = 'Cannot connect to TypeTutor server. Please make sure the backend is running on port 5001.';
      errorInfo.isNetworkError = true;
    } else if (error.code === 'ECONNABORTED') {
      errorInfo.message = 'Request timed out. Please try again.';
    } else if (error.response?.status === 404) {
      errorInfo.message = 'API endpoint not found. Please check the server configuration.';
    } else if (error.response?.status === 413) {
      errorInfo.message = 'File too large. Please try a smaller file (max 10MB).';
    } else if (error.response?.status === 429) {
      errorInfo.message = 'Too many requests. Please wait a moment and try again.';
    } else if (error.response?.status === 500) {
      errorInfo.message = 'Server error occurred. Please try again later.';
    } else if (error.response?.data?.error) {
      errorInfo.message = error.response.data.error;
    } else if (error.message) {
      errorInfo.message = error.message;
    }

    console.error('❌ API Error:', errorInfo);
    return Promise.reject(errorInfo);
  }
);

// Health check function
export const checkHealth = async () => {
  try {
    const response = await apiClient.get('/health');
    return {
      success: true,
      data: response.data,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      isNetworkError: error.isNetworkError,
      timestamp: new Date().toISOString()
    };
  }
};

// Upload PDF with enhanced error handling and progress tracking
export const uploadPDF = async (file, onProgress = null) => {
  // Input validation
  if (!file) {
    throw { message: 'No file provided', success: false };
  }

  if (file.type !== 'application/pdf') {
    throw { message: 'Please select a PDF file', success: false };
  }

  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    throw { message: 'File size must be less than 10MB', success: false };
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await apiClient.post('/upload-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000, // 30 seconds for file uploads
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress({ percentage: percentCompleted, loaded: progressEvent.loaded, total: progressEvent.total });
        }
      }
    });

    return {
      success: true,
      ...response.data
    };
  } catch (error) {
    throw {
      success: false,
      error: error.message,
      details: error.data
    };
  }
};

// Process text content
export const processText = async (text) => {
  // Input validation
  if (!text || typeof text !== 'string') {
    throw { message: 'Text content is required', success: false };
  }

  const trimmedText = text.trim();
  if (trimmedText.length < 10) {
    throw { message: 'Text must be at least 10 characters long', success: false };
  }

  if (trimmedText.length > 50000) {
    throw { message: 'Text must be less than 50,000 characters', success: false };
  }

  try {
    const response = await apiClient.post('/process-text', { 
      text: trimmedText
    });

    return {
      success: true,
      ...response.data
    };
  } catch (error) {
    throw {
      success: false,
      error: error.message,
      details: error.data
    };
  }
};

// Get user statistics with better error handling
export const getStats = async (timeRange = 'all') => {
  try {
    const response = await apiClient.get('/stats', {
      params: { 
        timeRange,
        includeDetails: true 
      }
    });

    // Ensure we return consistent data structure
    const defaultStats = {
      averageWpm: 0,
      accuracy: 0,
      practiceMinutes: 0,
      currentStreak: 0,
      totalSessions: 0,
      personalBest: 0,
      lastSessionDate: null,
      recentSessions: []
    };

    return {
      ...defaultStats,
      ...response.data
    };
  } catch (error) {
    console.error('Failed to fetch stats:', error.message);
    
    // Return default stats structure if API fails
    return {
      averageWpm: 0,
      accuracy: 0,
      practiceMinutes: 0,
      currentStreak: 0,
      totalSessions: 0,
      personalBest: 0,
      lastSessionDate: null,
      recentSessions: []
    };
  }
};

// Save typing session statistics
export const saveStats = async (sessionData) => {
  // Input validation
  if (!sessionData || typeof sessionData !== 'object') {
    throw { message: 'Session data is required', success: false };
  }

  // Validate required fields
  const requiredFields = ['wpm', 'accuracy', 'duration'];
  for (const field of requiredFields) {
    if (typeof sessionData[field] !== 'number' || sessionData[field] < 0) {
      throw { message: `${field} must be a positive number`, success: false };
    }
  }

  // Validate reasonable ranges
  if (sessionData.wpm > 300) {
    throw { message: 'WPM seems unusually high. Please check your data.', success: false };
  }

  if (sessionData.accuracy > 100) {
    throw { message: 'Accuracy cannot exceed 100%', success: false };
  }

  // Add metadata
  const enrichedData = {
    ...sessionData,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    sessionId: generateSessionId(),
    version: '1.0'
  };

  try {
    const response = await apiClient.post('/save-stats', enrichedData);
    return {
      success: true,
      ...response.data
    };
  } catch (error) {
    throw {
      success: false,
      error: error.message,
      details: error.data
    };
  }
};

// Reset user statistics (for testing/admin)
export const resetStats = async () => {
  try {
    const response = await apiClient.post('/reset-stats');
    return {
      success: true,
      message: 'Statistics reset successfully',
      ...response.data
    };
  } catch (error) {
    throw {
      success: false,
      error: error.message,
      details: error.data
    };
  }
};

// Get debug information
export const getDebugInfo = async () => {
  try {
    const response = await apiClient.get('/debug-info');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      isNetworkError: error.isNetworkError
    };
  }
};

// PDF support check
export const checkPDFSupport = async () => {
  try {
    const response = await apiClient.get('/pdf-support');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.warn('PDF support check failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Utility functions
const generateSessionId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Test API connectivity
export const testConnection = async () => {
  const results = {
    health: { status: 'pending' },
    pdfSupport: { status: 'pending' },
    stats: { status: 'pending' },
    baseURL: API_URL
  };

  // Test health endpoint
  try {
    const healthResult = await checkHealth();
    results.health = healthResult.success 
      ? { status: 'success', message: 'Health check passed', data: healthResult.data }
      : { status: 'error', message: healthResult.error };
  } catch (error) {
    results.health = { status: 'error', message: error.message };
  }

  // Test PDF support
  try {
    const pdfResult = await checkPDFSupport();
    results.pdfSupport = pdfResult.success 
      ? { status: 'success', message: 'PDF support available', data: pdfResult.data }
      : { status: 'error', message: pdfResult.error };
  } catch (error) {
    results.pdfSupport = { status: 'error', message: error.message };
  }

  // Test stats endpoint
  try {
    const statsResult = await getStats();
    results.stats = { status: 'success', message: 'Stats endpoint working', data: statsResult };
  } catch (error) {
    results.stats = { status: 'error', message: error.message };
  }

  return results;
};

// Export API client for advanced usage
export { apiClient };

// Export configuration for debugging
export const getApiConfig = () => ({
  baseURL: API_URL,
  timeout: apiClient.defaults.timeout,
  isDevelopment: import.meta.env.DEV,
  environment: import.meta.env.MODE,
  version: '1.0.0'
});