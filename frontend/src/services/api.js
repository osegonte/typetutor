// Direct connection to Railway backend (bypasses broken Vercel proxy)
const API_BASE_URL = 'https://typetutor-production.up.railway.app/api';

console.log('🔗 API configured for direct backend:', API_BASE_URL);

let apiClient = null;

const getApiClient = () => {
  if (!apiClient) {
    // Using fetch instead of axios for better CORS handling
    apiClient = {
      async get(endpoint) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'cors',
          credentials: 'omit'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return { data: await response.json() };
      },
      async post(endpoint, data, config = {}) {
        const isFormData = data instanceof FormData;
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: isFormData ? {} : { 'Content-Type': 'application/json' },
          body: isFormData ? data : JSON.stringify(data),
          mode: 'cors',
          credentials: 'omit',
          ...config
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        return { data: await response.json() };
      }
    };
  }
  return apiClient;
};

export const uploadPDF = async (file, onProgress = null) => {
  try {
    console.log('📤 Starting PDF upload:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    
    const client = getApiClient();
    const response = await client.post('/upload-pdf', formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress({ percentage, loaded: progressEvent.loaded, total: progressEvent.total });
        }
      },
    });
    
    console.log('✅ PDF upload successful');
    return response.data;
  } catch (error) {
    console.error('❌ PDF upload failed:', error);
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
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit'
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

const api = {
  uploadPDF,
  processText,
  getStats,
  saveStats,
  resetStats,
  checkHealth
};

export default api;
