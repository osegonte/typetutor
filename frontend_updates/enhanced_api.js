// Enhanced API service for TypeTutor with analytics support
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Enhanced session saving with analytics
export const saveSessionWithAnalytics = async (sessionData) => {
  try {
    const response = await apiClient.post('/analytics/sessions', {
      ...sessionData,
      userId: sessionData.userId || 'anonymous',
      keystrokes: sessionData.keystrokes || [],
      deviceInfo: {
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      timestamp: new Date().toISOString()
    });
    
    return response.data;
  } catch (error) {
    console.error('Error saving session with analytics:', error);
    throw error;
  }
};

// Get detailed analytics
export const getDetailedAnalytics = async (timeRange = 'week', userId = 'anonymous') => {
  try {
    const response = await apiClient.get(`/analytics/detailed/${userId}?timeRange=${timeRange}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching detailed analytics:', error);
    throw error;
  }
};

// Get user achievements
export const getUserAchievements = async (userId = 'anonymous') => {
  try {
    const response = await apiClient.get(`/analytics/achievements/${userId}`);
    return response.data.achievements;
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return [];
  }
};

// Get available achievements list
export const getAvailableAchievements = async () => {
  try {
    const response = await apiClient.get('/analytics/achievements-list');
    return response.data.achievements;
  } catch (error) {
    console.error('Error fetching available achievements:', error);
    return [];
  }
};

// Get user goals
export const getUserGoals = async (userId = 'anonymous') => {
  try {
    const response = await apiClient.get(`/analytics/goals/${userId}`);
    return response.data.goals;
  } catch (error) {
    console.error('Error fetching goals:', error);
    return [];
  }
};

// Create new goal
export const createGoal = async (goalData, userId = 'anonymous') => {
  try {
    const response = await apiClient.post('/analytics/goals', {
      ...goalData,
      userId
    });
    return response.data;
  } catch (error) {
    console.error('Error creating goal:', error);
    throw error;
  }
};

// Get personalized recommendations
export const getRecommendations = async (userId = 'anonymous') => {
  try {
    const response = await apiClient.get(`/analytics/recommendations/${userId}`);
    return response.data.recommendations;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
};

// Get character-level analytics
export const getCharacterAnalytics = async (userId = 'anonymous') => {
  try {
    const response = await apiClient.get(`/analytics/characters/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching character analytics:', error);
    return { characterStats: [], problemCharacters: [] };
  }
};

// Get enhanced user stats
export const getEnhancedStats = async (userId = 'anonymous') => {
  try {
    const response = await apiClient.get(`/analytics/stats/${userId}`);
    return response.data.stats;
  } catch (error) {
    console.error('Error fetching enhanced stats:', error);
    return {
      averageWpm: 0,
      accuracy: 0,
      practiceMinutes: 0,
      currentStreak: 0,
      totalSessions: 0,
      bestWpm: 0,
      longestStreak: 0,
      recentSessions: []
    };
  }
};

// Reset user data (for testing)
export const resetUserData = async (userId = 'anonymous') => {
  try {
    const response = await apiClient.delete(`/analytics/reset/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error resetting user data:', error);
    throw error;
  }
};

// Backward compatibility - keep existing API functions
export const saveStats = saveSessionWithAnalytics;
export const getStats = getEnhancedStats;

export default {
  saveSessionWithAnalytics,
  getDetailedAnalytics,
  getUserAchievements,
  getAvailableAchievements,
  getUserGoals,
  createGoal,
  getRecommendations,
  getCharacterAnalytics,
  getEnhancedStats,
  resetUserData,
  // Backward compatibility
  saveStats: saveSessionWithAnalytics,
  getStats: getEnhancedStats
};
