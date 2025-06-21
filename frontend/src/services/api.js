// Fixed API service - no circular dependencies or uninitialized variables
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

let apiClient = null;

const getApiClient = () => {
  if (!apiClient) {
    apiClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  return apiClient;
};

export const uploadPDF = async (file, onProgress = null) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const client = getApiClient();
    const response = await client.post('/upload-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
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

export const processText = async (text) => {
  try {
    const client = getApiClient();
    const response = await client.post('/process-text', { text });
    return response.data;
  } catch (error) {
    console.error('Error processing text:', error);
    throw error;
  }
};

export const getStats = async () => {
  try {
    const client = getApiClient();
    const response = await client.get('/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
};

export const saveStats = async (sessionData) => {
  try {
    const client = getApiClient();
    const response = await client.post('/save-stats', sessionData);
    return response.data;
  } catch (error) {
    console.error('Error saving stats:', error);
    throw error;
  }
};

export const resetStats = async (newStats = null) => {
  try {
    const client = getApiClient();
    const response = await client.post('/reset-stats', newStats || {});
    return response.data;
  } catch (error) {
    console.error('Error resetting stats:', error);
    throw error;
  }
};

export const checkHealth = async () => {
  try {
    const client = getApiClient();
    const response = await client.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

export const getApiConfig = () => ({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export const testConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Cannot connect to backend at ${API_BASE_URL}`);
  }
};

export const isBackendAvailable = async () => {
  try {
    await checkHealth();
    return true;
  } catch (error) {
    return false;
  }
};

const api = {
  uploadPDF,
  processText,
  getStats,
  saveStats,
  resetStats,
  checkHealth,
  testConnection,
  getApiConfig,
  isBackendAvailable
};

export default api;
