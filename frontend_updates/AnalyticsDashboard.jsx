import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Trophy, Target, TrendingUp, Award, BookOpen, 
  Clock, Zap, CheckCircle, AlertCircle 
} from 'lucide-react';
import { getDetailedAnalytics, getUserAchievements, getUserGoals, getRecommendations } from './enhanced_api';

const AnalyticsDashboard = ({ userId = 'anonymous' }) => {
  const [analytics, setAnalytics] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [goals, setGoals] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [userId, timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const [analyticsData, achievementsData, goalsData, recommendationsData] = await Promise.all([
        getDetailedAnalytics(timeRange, userId),
        getUserAchievements(userId),
        getUserGoals(userId),
        getRecommendations(userId)
      ]);

      setAnalytics(analyticsData.data);
      setAchievements(achievementsData);
      setGoals(goalsData);
