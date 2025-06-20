import { useState, useEffect } from 'react';
import { getDetailedAnalytics } from '../../services/analytics';

export const useAnalyticsData = (timeRange = 'week') => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const analyticsData = await getDetailedAnalytics(timeRange);
        setData(analyticsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  return { data, loading, error };
};