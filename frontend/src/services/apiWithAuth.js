const API_BASE_URL = 'https://typetutor-production.up.railway.app/api';

class AuthenticatedApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  getAuthHeaders() {
    const token = localStorage.getItem('typetutor_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('typetutor_token');
          localStorage.removeItem('typetutor_user');
          window.location.reload();
        }
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${url}:`, error);
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Enhanced stats methods with authentication
  async getStats() {
    return this.get('/stats');
  }

  async saveStats(sessionData) {
    return this.post('/save-stats', sessionData);
  }

  async uploadPDF(file) {
    const formData = new FormData();
    formData.append('file', file);

    const headers = this.getAuthHeaders();
    delete headers['Content-Type']; // Let browser set it for FormData

    const response = await fetch(`${this.baseURL}/upload-pdf`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  async processText(text) {
    return this.post('/process-text', { text });
  }
}

export const apiWithAuth = new AuthenticatedApiService();