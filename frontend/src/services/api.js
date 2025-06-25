// Clean TypeTutor API Service
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://typetutor-production.up.railway.app/api';

console.log('🔗 API configured for:', API_BASE_URL);

// Enhanced API client with proper error handling
const apiClient = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Handle FormData (for file uploads)
    if (options.body instanceof FormData) {
      delete defaultHeaders['Content-Type'];
    }
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: defaultHeaders,
        mode: 'cors',
        credentials: 'omit',
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers
        }
      });
      
      console.log(`📥 Response: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ API Success:', data);
      return data;
    } catch (error) {
      console.error('❌ Network Error:', error);
      throw error;
    }
  },

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data)
    });
  }
};

// API functions
export const uploadPDF = async (file, onProgress = null) => {
  try {
    console.log('📤 Starting PDF upload:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Note: onProgress callback not supported in this simplified version
    if (onProgress) {
      onProgress({ percentage: 50, loaded: file.size / 2, total: file.size });
    }
    
    const result = await apiClient.post('/upload-pdf', formData);
    
    if (onProgress) {
      onProgress({ percentage: 100, loaded: file.size, total: file.size });
    }
    
    return result;
  } catch (error) {
    console.error('❌ PDF upload failed:', error);
    throw error;
  }
};

export const processText = async (text) => {
  try {
    console.log('📝 Processing text:', text.substring(0, 50) + '...');
    return await apiClient.post('/process-text', { text });
  } catch (error) {
    console.error('❌ Error processing text:', error);
    throw error;
  }
};

export const getStats = async () => {
  try {
    console.log('📊 Fetching stats...');
    return await apiClient.get('/stats');
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    throw error;
  }
};

export const saveStats = async (sessionData) => {
  try {
    console.log('💾 Saving stats:', sessionData);
    
    // Ensure duration is valid
    if (!sessionData.duration || sessionData.duration <= 0) {
      console.warn('⚠️ Invalid duration, using fallback');
      sessionData.duration = 1;
    }
    
    return await apiClient.post('/save-stats', sessionData);
  } catch (error) {
    console.error('❌ Error saving stats:', error);
    throw error;
  }
};

export const checkHealth = async () => {
  try {
    console.log('🏥 Checking health...');
    return await apiClient.get('/health');
  } catch (error) {
    console.error('❌ Health check failed:', error);
    throw error;
  }
};

// Test API connection on load
console.log('🧪 Testing API connection...');
checkHealth()
  .then(data => {
    console.log('🎉 API connection successful!', data);
    window.typetutor_api_status = 'connected';
  })
  .catch(error => {
    console.error('🚨 API connection failed!', error);
    window.typetutor_api_status = 'failed';
  });

// Default export
const api = {
  uploadPDF,
  processText,
  getStats,
  saveStats,
  checkHealth
};

export default api;
