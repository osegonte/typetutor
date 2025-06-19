// Enhanced api.js - Complete API service with session management
import axios from 'axios';

// Configuration
const config = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  timeout: 15000, // 15 second timeout for better UX
  headers: {
    'Content-Type': 'application/json',
  }
};

// Create axios instance
const apiClient = axios.create(config);

// Session management
let sessionManager = {
  activeSessionId: null,
  sessionStartTime: null,
  autoSaveInterval: null,
  
  startSession() {
    this.activeSessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    
    // Auto-save progress every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      this.autoSaveProgress();
    }, 30000);
    
    console.log(`🎯 Session started: ${this.activeSessionId}`);
    return this.activeSessionId;
  },
  
  endSession() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    
    const sessionId = this.activeSessionId;
    this.activeSessionId = null;
    this.sessionStartTime = null;
    
    console.log(`🏁 Session ended: ${sessionId}`);
    return sessionId;
  },
  
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
  
  async autoSaveProgress() {
    if (!this.activeSessionId) return;
    
    try {
      // Get current session data from localStorage
      const progressData = localStorage.getItem('currentSessionProgress');
      if (progressData) {
        const data = JSON.parse(progressData);
        await saveSessionProgress({
          sessionId: this.activeSessionId,
          ...data,
          autoSave: true
        });
        console.log('📄 Auto-saved session progress');
      }
    } catch (error) {
      console.warn('⚠️ Auto-save failed:', error.message);
    }
  }
};

// Request interceptor for logging and session management
apiClient.interceptors.request.use(
  (config) => {
    // Add session ID to requests if available
    if (sessionManager.activeSessionId) {
      config.headers['X-Session-ID'] = sessionManager.activeSessionId;
    }
    
    // Add client metadata
    config.headers['X-Client-Version'] = '2.0.0';
    config.headers['X-Client-Platform'] = navigator.platform;
    
    // Log API calls in development
    if (import.meta.env.DEV) {
      console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    // Add timestamp to prevent caching issues
    if (config.method === 'get') {
      config.params = { ...config.params, _t: Date.now() };
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for enhanced error handling
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    
    // Handle session-related headers
    const sessionId = response.headers['x-session-id'];
    if (sessionId && sessionId !== sessionManager.activeSessionId) {
      console.log(`🔄 Session updated: ${sessionId}`);
    }
    
    return response;
  },
  (error) => {
    // Enhanced error handling with retry logic
    const errorInfo = {
      message: 'Unknown error occurred',
      status: error.response?.status || 500,
      statusText: error.response?.statusText || 'Internal Server Error',
      data: error.response?.data || null,
      isNetworkError: !error.response,
      timestamp: new Date().toISOString(),
      retryable: false
    };

    // Specific error messages and retry logic
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      errorInfo.message = 'Cannot connect to server. Please check if the backend is running on port 5001.';
      errorInfo.isNetworkError = true;
      errorInfo.retryable = true;
    } else if (error.response?.status === 404) {
      errorInfo.message = 'API endpoint not found. Please check the server configuration.';
    } else if (error.response?.status === 500) {
      errorInfo.message = 'Server error occurred. Please try again later.';
      errorInfo.retryable = true;
    } else if (error.response?.status === 413) {
      errorInfo.message = 'File too large. Please try a smaller file.';
    } else if (error.response?.status === 429) {
      errorInfo.message = 'Too many requests. Please wait a moment before trying again.';
      errorInfo.retryable = true;
    } else if (error.response?.status === 408) {
      errorInfo.message = 'Request timeout. Please try again.';
      errorInfo.retryable = true;
    } else if (error.response?.data?.error) {
      errorInfo.message = error.response.data.error;
    } else if (error.message) {
      errorInfo.message = error.message;
    }

    console.error('❌ API Error:', errorInfo);
    return Promise.reject(errorInfo);
  }
);

// Retry wrapper for retryable requests
const withRetry = async (requestFn, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      if (!error.retryable || attempt === maxRetries) {
        throw error;
      }
      
      console.log(`🔄 Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
};

// Enhanced API Health Check
export const checkHealth = async () => {
  try {
    const response = await withRetry(() => apiClient.get('/health'));
    return {
      success: true,
      data: response.data,
      timestamp: new Date().toISOString(),
      latency: response.headers['x-response-time'] || 'unknown'
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

// PDF Processing with Enhanced Progress Tracking
export const uploadPDF = async (file, onProgress = null) => {
  if (!file) {
    throw new Error('No file provided');
  }

  if (file.type !== 'application/pdf') {
    throw new Error('Please select a PDF file');
  }

  if (file.size > 16 * 1024 * 1024) { // 16MB limit
    throw new Error('File size must be less than 16MB');
  }

  const formData = new FormData();
  formData.append('file', file);

  // Add processing options
  formData.append('options', JSON.stringify({
    extractImages: false,
    preserveFormatting: true,
    chunkSize: 1000,
    sessionId: sessionManager.activeSessionId
  }));

  try {
    const response = await apiClient.post('/upload-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000, // 60 second timeout for large files
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: percentCompleted,
            stage: percentCompleted < 100 ? 'uploading' : 'processing'
          });
        }
      }
    });

    return {
      success: true,
      processingTime: response.headers['x-processing-time'],
      ...response.data
    };
  } catch (error) {
    throw {
      success: false,
      error: error.message,
      details: error.data,
      stage: 'upload_failed'
    };
  }
};

// Enhanced Text Processing
export const processText = async (text, options = {}) => {
  if (!text || typeof text !== 'string') {
    throw new Error('Text content is required');
  }

  const trimmedText = text.trim();
  if (trimmedText.length < 10) {
    throw new Error('Text must be at least 10 characters long');
  }

  if (trimmedText.length > 100000) {
    throw new Error('Text must be less than 100,000 characters');
  }

  const processingOptions = {
    chunkSize: 500,
    preserveLineBreaks: true,
    removeExtraSpaces: true,
    sessionId: sessionManager.activeSessionId,
    ...options
  };

  try {
    const response = await apiClient.post('/process-text', { 
      text: trimmedText,
      options: processingOptions
    });

    return {
      success: true,
      processingTime: response.headers['x-processing-time'],
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

// Enhanced Statistics with Caching
let statsCache = {
  data: null,
  timestamp: null,
  ttl: 30000 // 30 seconds cache
};

export const getStats = async (timeRange = 'all', useCache = true) => {
  // Check cache first
  if (useCache && statsCache.data && statsCache.timestamp) {
    const age = Date.now() - statsCache.timestamp;
    if (age < statsCache.ttl) {
      console.log('📊 Using cached stats');
      return statsCache.data;
    }
  }

  try {
    const response = await withRetry(() => 
      apiClient.get('/stats', {
        params: { 
          timeRange,
          includeDetails: true,
          sessionId: sessionManager.activeSessionId
        }
      })
    );

    // Ensure we have default values
    const defaultStats = {
      averageWpm: 0,
      accuracy: 0,
      practiceMinutes: 0,
      currentStreak: 0,
      totalSessions: 0,
      personalBest: 0,
      lastSessionDate: null,
      recentSessions: [],
      weeklyProgress: [],
      monthlyProgress: [],
      accuracyTrend: [],
      difficultyBreakdown: {}
    };

    const enhancedStats = {
      ...defaultStats,
      ...response.data,
      cacheTime: new Date().toISOString()
    };

    // Update cache
    statsCache.data = enhancedStats;
    statsCache.timestamp = Date.now();

    return enhancedStats;
  } catch (error) {
    console.error('Failed to fetch stats:', error.message);
    
    // Return cached data if available, otherwise defaults
    if (statsCache.data) {
      console.log('📊 Using stale cached stats due to error');
      return { ...statsCache.data, error: error.message };
    }
    
    return {
      averageWpm: 0,
      accuracy: 0,
      practiceMinutes: 0,
      currentStreak: 0,
      totalSessions: 0,
      personalBest: 0,
      lastSessionDate: null,
      recentSessions: [],
      error: error.message
    };
  }
};

// Enhanced Session Statistics Saving
export const saveStats = async (sessionData, options = {}) => {
  if (!sessionData) {
    throw new Error('Session data is required');
  }

  // Validate required fields
  const requiredFields = ['wpm', 'accuracy', 'duration'];
  for (const field of requiredFields) {
    if (typeof sessionData[field] !== 'number') {
      throw new Error(`${field} must be a number`);
    }
  }

  // Enhanced session data
  const enrichedData = {
    ...sessionData,
    sessionId: sessionManager.activeSessionId || sessionManager.generateSessionId(),
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    sessionDuration: sessionManager.sessionStartTime ? 
      Date.now() - sessionManager.sessionStartTime : null,
    ...options
  };

  try {
    const response = await withRetry(() => 
      apiClient.post('/save-stats', enrichedData)
    );

    // Clear stats cache to force refresh
    statsCache.data = null;
    statsCache.timestamp = null;

    // Clear any saved progress
    localStorage.removeItem('currentSessionProgress');

    return {
      success: true,
      sessionId: enrichedData.sessionId,
      ...response.data
    };
  } catch (error) {
    // Save to localStorage as backup
    const backupKey = `backup_session_${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(enrichedData));
    console.log(`💾 Session saved to backup: ${backupKey}`);

    throw {
      success: false,
      error: error.message,
      details: error.data,
      backupKey
    };
  }
};

// New: Save Session Progress (for auto-save)
export const saveSessionProgress = async (progressData) => {
  if (!progressData) {
    throw new Error('Progress data is required');
  }

  try {
    const response = await apiClient.post('/save-progress', {
      ...progressData,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      ...response.data
    };
  } catch (error) {
    // Don't throw for progress saves, just log
    console.warn('Progress save failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// New: Load Session Progress
export const loadSessionProgress = async (sessionId) => {
  try {
    const response = await apiClient.get(`/load-progress/${sessionId}`);
    return {
      success: true,
      ...response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Enhanced Statistics Reset
export const resetStats = async (confirmation = false) => {
  if (!confirmation) {
    throw new Error('Confirmation required to reset statistics');
  }

  try {
    const response = await apiClient.post('/reset-stats', {
      confirmation: true,
      timestamp: new Date().toISOString(),
      sessionId: sessionManager.activeSessionId
    });

    // Clear all caches
    statsCache.data = null;
    statsCache.timestamp = null;
    localStorage.removeItem('personalBest');
    localStorage.removeItem('currentStreak');
    localStorage.removeItem('lastSessionDate');

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

// New: Get Practice Recommendations
export const getPracticeRecommendations = async () => {
  try {
    const response = await apiClient.get('/recommendations', {
      params: {
        sessionId: sessionManager.activeSessionId
      }
    });

    return {
      success: true,
      ...response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      recommendations: []
    };
  }
};

// New: Get Leaderboard
export const getLeaderboard = async (timeframe = 'week') => {
  try {
    const response = await apiClient.get('/leaderboard', {
      params: { timeframe }
    });

    return {
      success: true,
      ...response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      leaderboard: []
    };
  }
};

// Enhanced Debug Information
export const getDebugInfo = async () => {
  try {
    const response = await apiClient.get('/debug-info');
    
    const clientInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      onlineStatus: navigator.onLine,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      sessionManager: {
        activeSessionId: sessionManager.activeSessionId,
        sessionStartTime: sessionManager.sessionStartTime
      }
    };

    return {
      success: true,
      server: response.data,
      client: clientInfo,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      isNetworkError: error.isNetworkError
    };
  }
};

// Enhanced Connection Testing
export const testConnection = async () => {
  const results = {
    health: { status: 'pending', startTime: Date.now() },
    pdfSupport: { status: 'pending', startTime: Date.now() },
    stats: { status: 'pending', startTime: Date.now() },
    upload: { status: 'pending', startTime: Date.now() }
  };

  // Test health endpoint
  try {
    const startTime = Date.now();
    await checkHealth();
    results.health = { 
      status: 'success', 
      message: 'Health check passed',
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    results.health = { 
      status: 'error', 
      message: error.message,
      responseTime: Date.now() - results.health.startTime
    };
  }

  // Test PDF support
  try {
    const startTime = Date.now();
    const response = await apiClient.get('/pdf-support');
    results.pdfSupport = { 
      status: 'success', 
      message: 'PDF support available',
      responseTime: Date.now() - startTime,
      data: response.data
    };
  } catch (error) {
    results.pdfSupport = { 
      status: 'error', 
      message: error.message,
      responseTime: Date.now() - results.pdfSupport.startTime
    };
  }

  // Test stats endpoint
  try {
    const startTime = Date.now();
    await getStats('all', false); // Don't use cache for testing
    results.stats = { 
      status: 'success', 
      message: 'Stats endpoint working',
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    results.stats = { 
      status: 'error', 
      message: error.message,
      responseTime: Date.now() - results.stats.startTime
    };
  }

  // Test upload endpoint (with empty request)
  try {
    const startTime = Date.now();
    await apiClient.post('/upload-pdf'); // This should fail gracefully
  } catch (error) {
    const responseTime = Date.now() - startTime;
    if (error.status === 400) {
      results.upload = { 
        status: 'success', 
        message: 'Upload endpoint responding correctly',
        responseTime
      };
    } else {
      results.upload = { 
        status: 'error', 
        message: error.message,
        responseTime
      };
    }
  }

  return results;
};

// Utility Functions
export const clearCache = () => {
  statsCache.data = null;
  statsCache.timestamp = null;
  console.log('🧹 API cache cleared');
};

export const getSessionManager = () => sessionManager;

export const startSession = () => sessionManager.startSession();

export const endSession = () => sessionManager.endSession();

// Backup and Recovery
export const getBackupSessions = () => {
  const backups = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('backup_session_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        backups.push({ key, data });
      } catch (error) {
        console.warn(`Invalid backup data for ${key}`);
      }
    }
  }
  return backups;
};

export const restoreBackupSession = async (backupKey) => {
  try {
    const backupData = localStorage.getItem(backupKey);
    if (!backupData) {
      throw new Error('Backup not found');
    }

    const sessionData = JSON.parse(backupData);
    await saveStats(sessionData);
    
    // Remove backup after successful restore
    localStorage.removeItem(backupKey);
    
    return { success: true, message: 'Session restored successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Export configuration and client
export { apiClient };

export const getApiConfig = () => ({
  baseURL: config.baseURL,
  timeout: config.timeout,
  isDevelopment: import.meta.env.DEV,
  environment: import.meta.env.MODE,
  cacheStatus: {
    statsCache: {
      hasData: !!statsCache.data,
      age: statsCache.timestamp ? Date.now() - statsCache.timestamp : null,
      ttl: statsCache.ttl
    }
  }
});

// Auto-initialize session manager
if (typeof window !== 'undefined') {
  // Resume session if page was refreshed
  const savedSessionId = sessionStorage.getItem('activeSessionId');
  const savedStartTime = sessionStorage.getItem('sessionStartTime');
  
  if (savedSessionId && savedStartTime) {
    sessionManager.activeSessionId = savedSessionId;
    sessionManager.sessionStartTime = parseInt(savedStartTime);
    console.log(`🔄 Resumed session: ${savedSessionId}`);
  }
  
  // Save session state on page unload
  window.addEventListener('beforeunload', () => {
    if (sessionManager.activeSessionId) {
      sessionStorage.setItem('activeSessionId', sessionManager.activeSessionId);
      sessionStorage.setItem('sessionStartTime', sessionManager.sessionStartTime.toString());
    }
  });
}