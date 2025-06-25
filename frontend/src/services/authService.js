const API_BASE_URL = 'https://typetutor-production.up.railway.app/api';

class AuthService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/auth`;
  }

  async login(email, password) {
    try {
      const response = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }

      return {
        success: true,
        token: data.token,
        user: data.user,
        message: data.message
      };
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      throw error;
    }
  }

  async register(email, password, display_name = '') {
    try {
      const response = await fetch(`${this.baseURL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password, 
          display_name: display_name || undefined 
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }

      return {
        success: true,
        token: data.token,
        user: data.user,
        message: data.message
      };
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      throw error;
    }
  }

  async getProfile() {
    try {
      const token = localStorage.getItem('typetutor_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${this.baseURL}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Handle expired/invalid token
        if (response.status === 401) {
          localStorage.removeItem('typetutor_token');
          localStorage.removeItem('typetutor_user');
          throw new Error('Session expired. Please sign in again.');
        }
        
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }

      return {
        success: true,
        user: data.user
      };
    } catch (error) {
      console.error('Get profile error:', error);
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      throw error;
    }
  }

  async refreshToken() {
    try {
      const token = localStorage.getItem('typetutor_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${this.baseURL}/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }

      return {
        success: true,
        token: data.token,
        user: data.user
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      throw error;
    }
  }

  async logout() {
    try {
      const token = localStorage.getItem('typetutor_token');
      
      if (token) {
        const response = await fetch(`${this.baseURL}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        // Don't throw on logout errors, just log them
        if (!response.ok) {
          console.warn('Logout API call failed, but continuing with local logout');
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Don't throw logout errors - always allow local logout
      return { success: true };
    }
  }

  async updateProfile(profileData) {
    try {
      const token = localStorage.getItem('typetutor_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${this.baseURL}/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('typetutor_token');
          localStorage.removeItem('typetutor_user');
          throw new Error('Session expired. Please sign in again.');
        }
        
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }

      return {
        success: true,
        user: data.user,
        message: data.message
      };
    } catch (error) {
      console.error('Update profile error:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      throw error;
    }
  }

  async changePassword(currentPassword, newPassword) {
    try {
      const token = localStorage.getItem('typetutor_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${this.baseURL}/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          current_password: currentPassword,
          new_password: newPassword 
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Current password is incorrect');
        }
        
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }

      return {
        success: true,
        message: data.message || 'Password changed successfully'
      };
    } catch (error) {
      console.error('Change password error:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      throw error;
    }
  }

  async deleteAccount(password) {
    try {
      const token = localStorage.getItem('typetutor_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${this.baseURL}/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Password is incorrect');
        }
        
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }

      // Clear local storage after successful deletion
      localStorage.removeItem('typetutor_token');
      localStorage.removeItem('typetutor_user');

      return {
        success: true,
        message: data.message || 'Account deleted successfully'
      };
    } catch (error) {
      console.error('Delete account error:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      throw error;
    }
  }

  // Utility methods
  isAuthenticated() {
    const token = localStorage.getItem('typetutor_token');
    const user = localStorage.getItem('typetutor_user');
    return !!(token && user);
  }

  getCurrentUser() {
    try {
      const user = localStorage.getItem('typetutor_user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      return null;
    }
  }

  getAuthToken() {
    return localStorage.getItem('typetutor_token');
  }

  // Check if token is expired (basic check)
  isTokenExpired() {
    const token = this.getAuthToken();
    if (!token) return true;

    try {
      // JWT tokens have 3 parts separated by dots
      const parts = token.split('.');
      if (parts.length !== 3) return true;

      // Decode the payload (middle part)
      const payload = JSON.parse(atob(parts[1]));
      
      // Check if token has expired
      if (payload.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp < currentTime;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  // Clear all authentication data
  clearAuth() {
    localStorage.removeItem('typetutor_token');
    localStorage.removeItem('typetutor_user');
  }

  // Get auth headers for API calls
  getAuthHeaders() {
    const token = this.getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // Health check for auth endpoints
  async checkAuthHealth() {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      return {
        success: response.ok,
        status: response.status,
        data: data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Auth health check failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create and export singleton instance
export const authService = new AuthService();

// Export class for testing or custom instances
export { AuthService };

// Export default
export default authService;