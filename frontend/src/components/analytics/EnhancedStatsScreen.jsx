// Enhanced Analytics Components for TypeTutor
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart2, TrendingUp, Target, Clock, Zap, Brain, Calendar, Award, AlertCircle, ChevronRight, Eye, Lightbulb, Star, Activity } from 'lucide-react';

// Main Enhanced Stats Screen with Detailed Analytics
export const EnhancedStatsScreen = ({ darkMode, setActiveTab }) => {
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('week'); // week, month, all
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetailedAnalytics();
  }, [timeRange]);

  const fetchDetailedAnalytics = async () => {
    setLoading(true);
    try {
      // In real implementation, this would call your API
      const mockData = generateMockAnalyticsData();
      setAnalyticsData(mockData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyticsTabsConfig = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 size={18} /> },
    { id: 'progress', label: 'Progress', icon: <TrendingUp size={18} /> },
    { id: 'accuracy', label: 'Accuracy Analysis', icon: <Target size={18} /> },
    { id: 'speed', label: 'Speed Insights', icon: <Zap size={18} /> },
    { id: 'learning', label: 'Learning Patterns', icon: <Brain size={18} /> },
    { id: 'goals', label: 'Goals & Achievements', icon: <Award size={18} /> }
  ];

  if (loading) {
    return <LoadingAnalytics darkMode={darkMode} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Detailed Analytics</h2>
          <p className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Deep insights into your typing performance and learning progress
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <TimeRangeSelector 
            darkMode={darkMode} 
            value={timeRange} 
            onChange={setTimeRange} 
          />
          <button 
            className={`px-4 py-2 rounded-xl transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('home')}
          >
            Back to Home
          </button>
        </div>
      </div>

      {/* Analytics Navigation */}
      <div className={`rounded-2xl border p-2 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="flex space-x-1 overflow-x-auto">
          {analyticsTabsConfig.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveAnalyticsTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                activeAnalyticsTab === tab.id
                  ? 'bg-purple-600 text-white shadow-lg'
                  : darkMode
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Content */}
      <div className="min-h-[600px]">
        {activeAnalyticsTab === 'overview' && (
          <OverviewAnalytics darkMode={darkMode} data={analyticsData} timeRange={timeRange} />
        )}
        {activeAnalyticsTab === 'progress' && (
          <ProgressAnalytics darkMode={darkMode} data={analyticsData} timeRange={timeRange} />
        )}
        {activeAnalyticsTab === 'accuracy' && (
          <AccuracyAnalytics darkMode={darkMode} data={analyticsData} timeRange={timeRange} />
        )}
        {activeAnalyticsTab === 'speed' && (
          <SpeedAnalytics darkMode={darkMode} data={analyticsData} timeRange={timeRange} />
        )}
        {activeAnalyticsTab === 'learning' && (
          <LearningAnalytics darkMode={darkMode} data={analyticsData} timeRange={timeRange} />
        )}
        {activeAnalyticsTab === 'goals' && (
          <GoalsAnalytics darkMode={darkMode} data={analyticsData} timeRange={timeRange} />
        )}
      </div>
    </div>
  );
};

// Overview Analytics Component
const OverviewAnalytics = ({ darkMode, data, timeRange }) => {
  const insights = useMemo(() => {
    return [
      {
        type: 'improvement',
        title: 'Speed Improvement',
        value: '+12 WPM',
        description: 'Compared to last week',
        color: 'text-green-600',
        bgColor: darkMode ? 'bg-green-900/20' : 'bg-green-50',
        icon: <TrendingUp size={20} />
      },
      {
        type: 'consistency',
        title: 'Consistency Score',
        value: '94%',
        description: 'Very stable performance',
        color: 'text-blue-600',
        bgColor: darkMode ? 'bg-blue-900/20' : 'bg-blue-50',
        icon: <Target size={20} />
      },
      {
        type: 'learning',
        title: 'Learning Efficiency',
        value: '87%',
        description: 'Strong content retention',
        color: 'text-purple-600',
        bgColor: darkMode ? 'bg-purple-900/20' : 'bg-purple-50',
        icon: <Brain size={20} />
      },
      {
        type: 'streak',
        title: 'Current Streak',
        value: '7 days',
        description: 'Keep it going!',
        color: 'text-orange-600',
        bgColor: darkMode ? 'bg-orange-900/20' : 'bg-orange-50',
        icon: <Award size={20} />
      }
    ];
  }, [darkMode]);

  return (
    <div className="space-y-6">
      {/* Key Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`p-6 rounded-2xl border transition-all duration-200 hover:scale-105 ${
              darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
            } ${insight.bgColor}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${insight.color} ${insight.bgColor}`}>
                {insight.icon}
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
            <div className={`text-2xl font-bold mb-1 ${insight.color}`}>
              {insight.value}
            </div>
            <div className="text-sm font-medium mb-1">{insight.title}</div>
            <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {insight.description}
            </div>
          </div>
        ))}
      </div>

      {/* Performance Chart */}
      <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <h3 className="text-xl font-semibold mb-6">Performance Trends</h3>
        <PerformanceChart darkMode={darkMode} data={data?.performanceTrends || []} />
      </div>

      {/* Recent Activity & Smart Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity darkMode={darkMode} sessions={data?.recentSessions || []} />
        <SmartRecommendations darkMode={darkMode} recommendations={data?.recommendations || []} />
      </div>
    </div>
  );
};

// Progress Analytics Component
const ProgressAnalytics = ({ darkMode, data, timeRange }) => {
  const progressMetrics = useMemo(() => {
    return {
      wpmGrowth: data?.wpmGrowth || { current: 45, previous: 38, change: 18.4 },
      accuracyTrend: data?.accuracyTrend || { current: 96.5, previous: 94.2, change: 2.4 },
      consistencyScore: data?.consistencyScore || { current: 88, previous: 82, change: 7.3 },
      practiceTime: data?.practiceTime || { current: 180, previous: 145, change: 24.1 }
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <h3 className="text-xl font-semibold mb-6">Progress Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(progressMetrics).map(([key, metric]) => (
            <ProgressMetricCard 
              key={key} 
              darkMode={darkMode} 
              title={formatMetricTitle(key)}
              current={metric.current}
              previous={metric.previous}
              change={metric.change}
              unit={getMetricUnit(key)}
            />
          ))}
        </div>
      </div>

      {/* Detailed Progress Chart */}
      <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <h3 className="text-xl font-semibold mb-6">Detailed Progress Timeline</h3>
        <ProgressTimeline darkMode={darkMode} data={data?.progressTimeline || []} />
      </div>

      {/* Milestone Achievements */}
      <MilestoneAchievements darkMode={darkMode} milestones={data?.milestones || []} />
    </div>
  );
};

// Accuracy Analytics Component
const AccuracyAnalytics = ({ darkMode, data, timeRange }) => {
  const accuracyData = useMemo(() => {
    return data?.accuracyAnalysis || {
      problemCharacters: [
        { char: 'q', accuracy: 78, frequency: 45, avgTime: 180 },
        { char: 'z', accuracy: 82, frequency: 23, avgTime: 165 },
        { char: 'x', accuracy: 85, frequency: 31, avgTime: 155 }
      ],
      commonMistakes: [
        { intended: 'the', typed: 'teh', frequency: 12 },
        { intended: 'and', typed: 'adn', frequency: 8 },
        { intended: 'you', typed: 'yuo', frequency: 6 }
      ],
      fingerAccuracy: {
        leftPinky: 89, leftRing: 94, leftMiddle: 96, leftIndex: 98,
        rightIndex: 97, rightMiddle: 95, rightRing: 91, rightPinky: 87
      }
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Problem Characters Analysis */}
      <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <h3 className="text-xl font-semibold mb-6">Characters Needing Practice</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {accuracyData.problemCharacters.map((char, index) => (
            <ProblemCharacterCard key={index} darkMode={darkMode} data={char} />
          ))}
        </div>
      </div>

      {/* Common Mistakes */}
      <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <h3 className="text-xl font-semibold mb-6">Common Typing Mistakes</h3>
        <CommonMistakesTable darkMode={darkMode} mistakes={accuracyData.commonMistakes} />
      </div>

      {/* Finger Accuracy Heatmap */}
      <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <h3 className="text-xl font-semibold mb-6">Finger Accuracy Analysis</h3>
        <FingerAccuracyHeatmap darkMode={darkMode} data={accuracyData.fingerAccuracy} />
      </div>
    </div>
  );
};

// Speed Analytics Component  
const SpeedAnalytics = ({ darkMode, data, timeRange }) => {
  const speedData = useMemo(() => {
    return data?.speedAnalysis || {
      peakSpeed: { value: 67, timestamp: '2024-01-15', context: 'Technical article practice' },
      averageSpeed: { value: 45, trend: 'increasing' },
      speedByTimeOfDay: [
        { hour: 9, avgWpm: 48 }, { hour: 12, avgWpm: 52 }, { hour: 15, avgWpm: 46 }, { hour: 18, avgWpm: 43 }
      ],
      speedByContentType: [
        { type: 'Technical', avgWpm: 38, sessions: 15 },
        { type: 'Literature', avgWpm: 52, sessions: 22 },
        { type: 'News Articles', avgWpm: 48, sessions: 18 }
      ]
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Speed Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SpeedMetricCard 
          darkMode={darkMode}
          title="Peak Speed"
          value={`${speedData.peakSpeed.value} WPM`}
          subtitle={`Achieved on ${new Date(speedData.peakSpeed.timestamp).toLocaleDateString()}`}
          context={speedData.peakSpeed.context}
          icon={<Zap size={24} />}
          color="text-yellow-600"
        />
        <SpeedMetricCard 
          darkMode={darkMode}
          title="Current Average"
          value={`${speedData.averageSpeed.value} WPM`}
          subtitle={`Trending ${speedData.averageSpeed.trend}`}
          icon={<Activity size={24} />}
          color="text-blue-600"
        />
        <SpeedMetricCard 
          darkMode={darkMode}
          title="Improvement Rate"
          value="+15%"
          subtitle="This month vs last month"
          icon={<TrendingUp size={24} />}
          color="text-green-600"
        />
      </div>

      {/* Speed by Time of Day */}
      <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <h3 className="text-xl font-semibold mb-6">Speed Performance by Time of Day</h3>
        <TimeOfDayChart darkMode={darkMode} data={speedData.speedByTimeOfDay} />
      </div>

      {/* Speed by Content Type */}
      <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <h3 className="text-xl font-semibold mb-6">Speed by Content Type</h3>
        <ContentTypeSpeedChart darkMode={darkMode} data={speedData.speedByContentType} />
      </div>
    </div>
  );
};

// Learning Analytics Component
const LearningAnalytics = ({ darkMode, data, timeRange }) => {
  const learningData = useMemo(() => {
    return data?.learningAnalysis || {
      retentionRate: 87,
      comprehensionScore: 92,
      learningVelocity: 'High',
      studyEfficiency: 89,
      contentTypes: [
        { type: 'Technical Documentation', retention: 82, comprehension: 88, sessions: 12 },
        { type: 'Academic Papers', retention: 91, comprehension: 95, sessions: 8 },
        { type: 'Literature', retention: 89, comprehension: 94, sessions: 15 }
      ]
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Learning Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <LearningMetricCard 
          darkMode={darkMode}
          title="Retention Rate"
          value={`${learningData.retentionRate}%`}
          description="How well you remember content"
          icon={<Brain size={20} />}
          color="text-purple-600"
        />
        <LearningMetricCard 
          darkMode={darkMode}
          title="Comprehension"
          value={`${learningData.comprehensionScore}%`}
          description="Understanding while typing"
          icon={<Eye size={20} />}
          color="text-blue-600"
        />
        <LearningMetricCard 
          darkMode={darkMode}
          title="Learning Velocity"
          value={learningData.learningVelocity}
          description="Speed of skill acquisition"
          icon={<TrendingUp size={20} />}
          color="text-green-600"
        />
        <LearningMetricCard 
          darkMode={darkMode}
          title="Study Efficiency"
          value={`${learningData.studyEfficiency}%`}
          description="Effective practice time"
          icon={<Target size={20} />}
          color="text-orange-600"
        />
      </div>

      {/* Learning by Content Type */}
      <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <h3 className="text-xl font-semibold mb-6">Learning Performance by Content Type</h3>
        <ContentTypeLearningTable darkMode={darkMode} data={learningData.contentTypes} />
      </div>

      {/* Study Patterns */}
      <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <h3 className="text-xl font-semibold mb-6">Study Pattern Analysis</h3>
        <StudyPatternsInsights darkMode={darkMode} />
      </div>
    </div>
  );
};

// Goals & Achievements Component
const GoalsAnalytics = ({ darkMode, data, timeRange }) => {
  const goalsData = useMemo(() => {
    return data?.goalsData || {
      currentGoals: [
        { id: 1, title: 'Reach 50 WPM', current: 45, target: 50, deadline: '2024-02-01', type: 'speed' },
        { id: 2, title: 'Maintain 95% Accuracy', current: 93, target: 95, deadline: '2024-01-31', type: 'accuracy' },
        { id: 3, title: 'Practice 30 minutes daily', current: 25, target: 30, deadline: 'ongoing', type: 'consistency' }
      ],
      achievements: [
        { id: 1, title: 'Speed Demon', description: 'Reached 40 WPM', earned: '2024-01-10', category: 'speed' },
        { id: 2, title: 'Consistency King', description: '7-day practice streak', earned: '2024-01-12', category: 'streak' },
        { id: 3, title: 'Accuracy Ace', description: '95% accuracy for 5 sessions', earned: '2024-01-08', category: 'accuracy' }
      ]
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Current Goals */}
      <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <h3 className="text-xl font-semibold mb-6">Current Goals</h3>
        <div className="space-y-4">
          {goalsData.currentGoals.map((goal) => (
            <GoalProgressCard key={goal.id} darkMode={darkMode} goal={goal} />
          ))}
        </div>
      </div>

      {/* Recent Achievements */}
      <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <h3 className="text-xl font-semibold mb-6">Recent Achievements</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {goalsData.achievements.map((achievement) => (
            <AchievementCard key={achievement.id} darkMode={darkMode} achievement={achievement} />
          ))}
        </div>
      </div>

      {/* Goal Setting */}
      <GoalSetting darkMode={darkMode} />
    </div>
  );
};

// Utility Components
const LoadingAnalytics = ({ darkMode }) => (
  <div className={`p-12 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
    <p className="text-lg">Loading detailed analytics...</p>
  </div>
);

const TimeRangeSelector = ({ darkMode, value, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
      darkMode 
        ? 'bg-gray-800 border-gray-700 text-gray-200' 
        : 'bg-white border-gray-300 text-gray-800'
    }`}
  >
    <option value="week">Last Week</option>
    <option value="month">Last Month</option>
    <option value="quarter">Last Quarter</option>
    <option value="all">All Time</option>
  </select>
);

// Mock data generator (replace with real API calls)
const generateMockAnalyticsData = () => {
  return {
    performanceTrends: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
      wpm: Math.floor(Math.random() * 20) + 35,
      accuracy: Math.floor(Math.random() * 10) + 90,
      practiceTime: Math.floor(Math.random() * 60) + 15
    })),
    recentSessions: Array.from({ length: 5 }, (_, i) => ({
      id: i,
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString(),
      wpm: Math.floor(Math.random() * 15) + 40,
      accuracy: Math.floor(Math.random() * 8) + 92,
      duration: Math.floor(Math.random() * 45) + 15,
      contentType: ['Technical', 'Literature', 'News'][Math.floor(Math.random() * 3)]
    })),
    recommendations: [
      {
        type: 'practice',
        title: 'Focus on Q and Z keys',
        description: 'Your accuracy on these keys is below average',
        priority: 'high',
        estimatedTime: '10 minutes'
      },
      {
        type: 'timing',
        title: 'Try morning practice sessions',
        description: 'Your performance is typically 15% higher in the morning',
        priority: 'medium',
        estimatedTime: '5 minutes'
      }
    ]
  };
};

// Helper functions
const formatMetricTitle = (key) => {
  const titles = {
    wpmGrowth: 'Words Per Minute',
    accuracyTrend: 'Accuracy Rate',
    consistencyScore: 'Consistency Score',
    practiceTime: 'Practice Time (min)'
  };
  return titles[key] || key;
};

const getMetricUnit = (key) => {
  const units = {
    wpmGrowth: 'WPM',
    accuracyTrend: '%',
    consistencyScore: '%',
    practiceTime: 'min'
  };
  return units[key] || '';
};

// Additional helper components would be implemented here...
// (ProgressMetricCard, PerformanceChart, etc.)

export default EnhancedStatsScreen;