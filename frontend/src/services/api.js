// Updated frontend/src/services/api.js - More robust error handling
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://typetutor-production.up.railway.app/api';

console.log('🔗 API configured for:', API_BASE_URL);
console.log('🔗 All env vars:', import.meta.env);

let apiClient = null;

const getApiClient = () => {
  if (!apiClient) {
    apiClient = {
      async get(endpoint) {
        const url = `${API_BASE_URL}${endpoint}`;
        console.log('🌐 GET request to:', url);
        
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            mode: 'cors',
            credentials: 'omit'
          });
          
          console.log('📥 Response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
          
          const data = await response.json();
          console.log('✅ API Success:', data);
          return { data };
        } catch (error) {
          console.error('❌ Network Error:', error);
          throw error;
        }
      },
      
      async post(endpoint, data, config = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        console.log('🌐 POST request to:', url, 'with data:', data);
        
        const isFormData = data instanceof FormData;
        
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: isFormData ? {} : { 'Content-Type': 'application/json' },
            body: isFormData ? data : JSON.stringify(data),
            mode: 'cors',
            credentials: 'omit',
            ...config
          });
          
          console.log('📥 Response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', response.status, errorText);
            
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: errorText || 'Request failed' };
            }
            
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }
          
          const responseData = await response.json();
          console.log('✅ API Success:', responseData);
          return { data: responseData };
        } catch (error) {
          console.error('❌ Network Error:', error);
          throw error;
        }
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
    console.log('📝 Processing text:', text.substring(0, 50) + '...');
    const client = getApiClient();
    const response = await client.post('/process-text', { text });
    return response.data;
  } catch (error) {
    console.error('❌ Error processing text:', error);
    throw error;
  }
};

export const getStats = async () => {
  try {
    console.log('📊 Fetching stats...');
    const client = getApiClient();
    const response = await client.get('/stats');
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    throw error;
  }
};

export const saveStats = async (sessionData) => {
  try {
    console.log('💾 Saving stats:', sessionData);
    const client = getApiClient();
    const response = await client.post('/save-stats', sessionData);
    return response.data;
  } catch (error) {
    console.error('❌ Error saving stats:', error);
    throw error;
  }
};

export const resetStats = async (newStats = null) => {
  try {
    console.log('🔄 Resetting stats...');
    const client = getApiClient();
    const response = await client.post('/reset-stats', newStats || {});
    return response.data;
  } catch (error) {
    console.error('❌ Error resetting stats:', error);
    throw error;
  }
};

export const checkHealth = async () => {
  try {
    console.log('🏥 Checking health...');
    const url = `${API_BASE_URL}/health`;
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Health check success:', data);
    return data;
  } catch (error) {
    console.error('❌ Health check failed:', error);
    throw error;
  }
};

// Test connection on load
console.log('🧪 Testing API connection...');
checkHealth()
  .then(data => {
    console.log('🎉 API connection successful!', data);
    window.typetutor_api_status = 'connected';
  })
  .catch(error => {
    console.error('🚨 API connection failed!', error);
    window.typetutor_api_status = 'failed';
    
    // Show user-friendly error
    setTimeout(() => {
      if (window.typetutor_api_status === 'failed') {
        console.warn('⚠️ Consider showing user a connection error message');
      }
    }, 5000);
  });

const api = {
  uploadPDF,
  processText,
  getStats,
  saveStats,
  resetStats,
  checkHealth
};

export default api;