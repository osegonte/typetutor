import { apiClient } from './api';

export const getDetailedAnalytics = async (timeRange = 'week') => {
  try {
    const response = await apiClient.get(`/analytics/detailed`, {
      params: { timeRange }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getProgressData = async (timeRange) => {
  // Fetch progress analytics
};

export const getAccuracyAnalysis = async (timeRange) => {
  // Fetch accuracy analytics  
};

// ... more analytics API calls