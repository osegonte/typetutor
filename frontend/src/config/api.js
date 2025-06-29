// TypeTutor API Service - Uses environment variables properly
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

console.log('🔗 API configured for:', API_BASE_URL);

// Debug helper to log all requests
const logRequest = (method, url, data = null) => {
  console.group(`🌐 API ${method} ${url}`);
  if (data) {
    if (data instanceof FormData) {
      console.log('📁 FormData contents:');
      for (let [key, value] of data.entries()) {
        console.log(`  ${key}:`, value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value);
      }
    } else {
      console.log('📝 Request data:', data);
    }
  }
  console.groupEnd();
};

// Enhanced API client with debug logging
const apiClient = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const method = options.method || 'GET';
    
    logRequest(method, url, options.body);
    
    const defaultHeaders = {
      'Accept': 'application/json'
    };
    
    // Don't set Content-Type for FormData (browser will set it with boundary)
    if (!(options.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }
    
    const requestOptions = {
      method,
      mode: 'cors',
      credentials: 'omit',
      headers: {
        ...defaultHeaders,
        ...options.headers
      },
      ...options
    };
    
    console.log('📤 Request options:', {
      method: requestOptions.method,
      url,
      headers: requestOptions.headers,
      mode: requestOptions.mode,
      credentials: requestOptions.credentials
    });
    
    try {
      const response = await fetch(url, requestOptions);
      
      console.log(`📥 Response: ${response.status} ${response.statusText}`);
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        let errorData;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          const errorText = await response.text();
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        
        console.error('❌ API Error Response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      console.log('✅ API Success:', data);
      return data;
      
    } catch (error) {
      console.group('❌ API Request Failed');
      console.error('Error details:', error);
      console.error('Request URL:', url);
      console.error('Request options:', requestOptions);
      console.groupEnd();
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

// Test API connection
export const checkHealth = async () => {
  try {
    console.log('🏥 Performing health check...');
    const data = await apiClient.get('/health');
    console.log('🎉 Health check successful!', data);
    return data;
  } catch (error) {
    console.error('🚨 Health check failed!', error);
    throw error;
  }
};

// PDF upload
export const uploadPDF = async (file, onProgress = null) => {
  try {
    console.group('📤 PDF Upload Process Started');
    console.log('File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified)
    });
    
    // Validate file
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('File must be a PDF');
    }
    
    if (file.size > 16 * 1024 * 1024) {
      throw new Error('File size must be under 16MB');
    }
    
    if (file.size === 0) {
      throw new Error('File appears to be empty');
    }
    
    console.log('✅ File validation passed');
    
    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    
    console.log('📋 FormData created');
    
    // Progress callback
    if (onProgress) {
      console.log('📈 Calling progress callback: 25%');
      onProgress({ percentage: 25, loaded: file.size * 0.25, total: file.size });
    }
    
    console.log('🌐 Starting upload request...');
    const result = await apiClient.post('/upload-pdf', formData);
    
    // Final progress callback
    if (onProgress) {
      console.log('📈 Calling progress callback: 100%');
      onProgress({ percentage: 100, loaded: file.size, total: file.size });
    }
    
    console.log('✅ PDF upload completed successfully');
    console.groupEnd();
    
    return result;
    
  } catch (error) {
    console.group('❌ PDF Upload Failed');
    console.error('Upload error:', error);
    console.error('File info:', {
      name: file?.name,
      size: file?.size,
      type: file?.type
    });
    console.groupEnd();
    
    throw error;
  }
};

export const processText = async (text) => {
  try {
    console.log('📝 Processing text length:', text.length);
    const result = await apiClient.post('/process-text', { text });
    console.log('✅ Text processing completed');
    return result;
  } catch (error) {
    console.error('❌ Text processing failed:', error);
    throw error;
  }
};

export const getStats = async () => {
  try {
    console.log('📊 Fetching user statistics...');
    const result = await apiClient.get('/stats');
    console.log('✅ Stats retrieved:', result);
    return result;
  } catch (error) {
    console.error('❌ Failed to fetch stats:', error);
    throw error;
  }
};

export const saveStats = async (sessionData) => {
  try {
    console.log('💾 Saving session statistics...');
    
    // Validate session data
    const requiredFields = ['wpm', 'accuracy', 'duration'];
    const missingFields = requiredFields.filter(field => 
      sessionData[field] === undefined || sessionData[field] === null
    );
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Ensure duration is valid
    if (!sessionData.duration || sessionData.duration <= 0) {
      console.warn('⚠️ Invalid duration detected, using fallback value');
      sessionData.duration = 1;
    }
    
    console.log('Session data to save:', sessionData);
    
    const result = await apiClient.post('/save-stats', sessionData);
    console.log('✅ Stats saved successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Failed to save stats:', error);
    throw error;
  }
};

export const resetStats = async () => {
  try {
    console.log('🗑️ Resetting user statistics...');
    const result = await apiClient.post('/reset-stats', {});
    console.log('✅ Stats reset successfully');
    return result;
  } catch (error) {
    console.error('❌ Failed to reset stats:', error);
    throw error;
  }
};

// Test connection on load
checkHealth().catch(error => {
  console.warn('⚠️ Initial health check failed:', error.message);
});

// Export default object
export default {
  uploadPDF,
  processText,
  getStats,
  saveStats,
  checkHealth,
  resetStats
};