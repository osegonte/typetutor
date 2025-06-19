import axios from 'axios';

// Use environment variable if available, otherwise default to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create an axios instance with error handling
const apiClient = axios.create({
  baseURL: API_URL
});

// Add response interceptor for consistent error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Format error response consistently
    const errorResponse = {
      error: error.message,
      status: error.response?.status || 500
    };
    
    // Include any additional error details from the server
    if (error.response?.data) {
      errorResponse.details = error.response.data;
    }
    
    return Promise.reject(errorResponse);
  }
);

export const uploadPDF = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await apiClient.post('/upload-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('PDF upload error:', error);
    throw error;
  }
};

export const processText = async (text) => {
  try {
    const response = await apiClient.post('/process-text', { text });
    return response.data;
  } catch (error) {
    console.error('Text processing error:', error);
    throw error;
  }
};

export const getStats = async () => {
  try {
    const response = await apiClient.get('/stats');
    return response.data;
  } catch (error) {
    console.error('Get stats error:', error);
    throw error;
  }
};

export const saveStats = async (sessionData) => {
  try {
    const response = await apiClient.post('/save-stats', sessionData);
    return response.data;
  } catch (error) {
    console.error('Save stats error:', error);
    throw error;
  }
};

// Function to reset stats for testing
export const resetStats = async () => {
  try {
    // Define default stats
    const defaultStats = {
      averageWpm: 0,
      accuracy: 0,
      practiceMinutes: 0,
      currentStreak: 0,
      totalSessions: 0,
      lastSessionDate: null,
      recentSessions: []
    };

    // Send request to update stats file
    const response = await apiClient.post('/reset-stats', defaultStats);
    return response.data;
  } catch (error) {
    console.error('Reset stats error:', error);
    throw error;
  }
};