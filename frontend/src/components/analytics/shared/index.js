// Helper Components for Detailed Analytics
import React from 'react';
import { TrendingUp, TrendingDown, ArrowRight, Star, Trophy, Target, Lightbulb, AlertCircle } from 'lucide-react';
// Export all shared components
export { ProgressMetricCard } from './ProgressMetricCard';
export { PerformanceChart } from './PerformanceChart';
export { RecentActivity } from './RecentActivity';
export { SmartRecommendations } from './SmartRecommendations';
// ... etc
// Progress Metric Card
export const ProgressMetricCard = ({ darkMode, title, current, previous, change, unit }) => {
  const isImprovement = change > 0;
  const changeColor = isImprovement ? 'text-green-600' : 'text-red-600';
  const TrendIcon = isImprovement ? TrendingUp : TrendingDown;

  return (
    <div className={`p-6 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
      <h4 className="font-semibold mb-3">{title}</h4>
      <div className="flex items-baseline space-x-2 mb-2">
        <span className="text-2xl font-bold">{current}{unit}</span>
        <div className={`flex items-center space-x-1 text-sm ${changeColor}`}>
          <TrendIcon size={14} />
          <span>{Math.abs(change).toFixed(1)}%</span>
        </div>
      </div>
      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        Previous: {previous}{unit}
      </div>
    </div>
  );
};

// Simple Performance Chart (using CSS for visualization)
export const PerformanceChart = ({ darkMode, data }) => {
  const maxWpm = Math.max(...data.map(d => d.wpm));
  const maxAccuracy = Math.max(...data.map(d => d.accuracy));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
            <span className="text-sm">WPM</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span className="text-sm">Accuracy %</span>
          </div>
        </div>
      </div>
      
      <div className="h-64 flex items-end space-x-1">
        {data.slice(-14).map((point, index) => (
          <div key={index} className="flex-1 flex flex-col items-center space-y-1">
            <div className="w-full flex flex-col justify-end h-48 space-y-1">
              <div 
                className="bg-purple-600 rounded-t w-full"
                style={{ height: `${(point.wpm / maxWpm) * 100}%` }}
                title={`${point.wpm} WPM`}
              ></div>
              <div 
                className="bg-blue-600 rounded-t w-full"
                style={{ height: `${(point.accuracy / maxAccuracy) * 100}%` }}
                title={`${point.accuracy}% Accuracy`}
              ></div>
            </div>
            <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {new Date(point.date).getDate()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Recent Activity Component
export const RecentActivity = ({ darkMode, sessions }) => {
  return (
    <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      <h3 className="text-xl font-semibold mb-6">Recent Activity</h3>
      <div className="space-y-4">
        {sessions.map((session, index) => (
          <div key={index} className={`flex items-center justify-between p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full ${
                session.wpm >= 50 ? 'bg-green-500' : session.wpm >= 40 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <div>
                <div className="font-medium">{session.contentType} Practice</div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {session.date} • {session.duration} minutes
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{session.wpm} WPM</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {session.accuracy}% accuracy
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Smart Recommendations Component
export const SmartRecommendations = ({ darkMode, recommendations }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <AlertCircle size={16} />;
      case 'medium': return <Lightbulb size={16} />;
      case 'low': return <Target size={16} />;
      default: return <Lightbulb size={16} />;
    }
  };

  return (
    <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      <h3 className="text-xl font-semibold mb-6">Smart Recommendations</h3>
      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <div key={index} className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className={`p-1 rounded-lg ${getPriorityColor(rec.priority)}`}>
                  {getPriorityIcon(rec.priority)}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${getPriorityColor(rec.priority)}`}>
                  {rec.priority.toUpperCase()}
                </span>
              </div>
              <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {rec.estimatedTime}
              </span>
            </div>
            <h4 className="font-semibold mb-2">{rec.title}</h4>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
              {rec.description}
            </p>
            <button className={`flex items-center space-x-2 text-sm font-medium text-purple-600 hover:text-purple-700`}>
              <span>Apply Recommendation</span>
              <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Problem Character Card
export const ProblemCharacterCard = ({ darkMode, data }) => {
  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 90) return 'text-green-600 bg-green-100 dark:bg-green-900/20';
    if (accuracy >= 80) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
    return 'text-red-600 bg-red-100 dark:bg-red-900/20';
  };

  return (
    <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-lg ${
          darkMode ? 'bg-gray-700' : 'bg-white'
        }`}>
          {data.char}
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getAccuracyColor(data.accuracy)}`}>
          {data.accuracy}%
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Frequency:</span>
          <span>{data.frequency} times</span>
        </div>
        <div className="flex justify-between">
          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Avg Time:</span>
          <span>{data.avgTime}ms</span>
        </div>
      </div>
      <button className="w-full mt-3 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
        Practice This Key
      </button>
    </div>
  );
};

// Common Mistakes Table
export const CommonMistakesTable = ({ darkMode, mistakes }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className={`text-left text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <th className="pb-3">Intended</th>
            <th className="pb-3">Typed</th>
            <th className="pb-3">Frequency</th>
            <th className="pb-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {mistakes.map((mistake, index) => (
            <tr key={index} className={`border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <td className="py-3">
                <span className={`px-2 py-1 rounded font-mono text-sm ${darkMode ? 'bg-green-900/20 text-green-300' : 'bg-green-100 text-green-800'}`}>
                  {mistake.intended}
                </span>
              </td>
              <td className="py-3">
                <span className={`px-2 py-1 rounded font-mono text-sm ${darkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-100 text-red-800'}`}>
                  {mistake.typed}
                </span>
              </td>
              <td className="py-3">{mistake.frequency} times</td>
              <td className="py-3">
                <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                  Practice Word
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Finger Accuracy Heatmap
export const FingerAccuracyHeatmap = ({ darkMode, data }) => {
  const fingers = [
    { name: 'Left Pinky', key: 'leftPinky', color: 'bg-red-500' },
    { name: 'Left Ring', key: 'leftRing', color: 'bg-orange-500' },
    { name: 'Left Middle', key: 'leftMiddle', color: 'bg-yellow-500' },
    { name: 'Left Index', key: 'leftIndex', color: 'bg-green-500' },
    { name: 'Right Index', key: 'rightIndex', color: 'bg-green-500' },
    { name: 'Right Middle', key: 'rightMiddle', color: 'bg-yellow-500' },
    { name: 'Right Ring', key: 'rightRing', color: 'bg-orange-500' },
    { name: 'Right Pinky', key: 'rightPinky', color: 'bg-red-500' }
  ];

  const getIntensity = (accuracy) => {
    if (accuracy >= 95) return 'opacity-100';
    if (accuracy >= 90) return 'opacity-80';
    if (accuracy >= 85) return 'opacity-60';
    return 'opacity-40';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {fingers.map((finger) => {
          const accuracy = data[finger.key];
          return (
            <div key={finger.key} className="text-center">
              <div className={`w-full h-16 rounded-lg ${finger.color} ${getIntensity(accuracy)} flex items-center justify-center mb-2`}>
                <span className="text-white font-bold text-sm">{accuracy}%</span>
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {finger.name.split(' ')[0]}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-center space-x-4 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Needs Work (&lt;90%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span>Good (90-95%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Excellent (&gt;95%)</span>
        </div>
      </div>
    </div>
  );
};

// Speed Metric Card
export const SpeedMetricCard = ({ darkMode, title, value, subtitle, context, icon, color }) => {
  return (
    <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${color} ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          {icon}
        </div>
      </div>
      <div className={`text-2xl font-bold mb-2 ${color}`}>{value}</div>
      <div className="font-medium mb-1">{title}</div>
      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{subtitle}</div>
      {context && (
        <div className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
          {context}
        </div>
      )}
    </div>
  );
};

// Learning Metric Card
export const LearningMetricCard = ({ darkMode, title, value, description, icon, color }) => {
  return (
    <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${color} ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          {icon}
        </div>
      </div>
      <div className={`text-xl font-bold mb-1 ${color}`}>{value}</div>
      <div className="font-medium text-sm mb-1">{title}</div>
      <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        {description}
      </div>
    </div>
  );
};

// Goal Progress Card
export const GoalProgressCard = ({ darkMode, goal }) => {
  const progress = (goal.current / goal.target) * 100;
  const isComplete = progress >= 100;
  
  const getTypeColor = (type) => {
    switch (type) {
      case 'speed': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'accuracy': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'consistency': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  return (
    <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">{goal.title}</h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(goal.type)}`}>
          {goal.type}
        </span>
      </div>
      
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span>{goal.current}</span>
          <span>{goal.target}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              isComplete ? 'bg-green-500' : 'bg-purple-600'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-sm">
        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          {goal.deadline !== 'ongoing' ? `Due: ${goal.deadline}` : 'Ongoing goal'}
        </span>
        <span className={`font-medium ${isComplete ? 'text-green-600' : 'text-purple-600'}`}>
          {Math.round(progress)}%
        </span>
      </div>
      
      {isComplete && (
        <div className="mt-2 flex items-center space-x-2 text-green-600">
          <Trophy size={16} />
          <span className="text-sm font-medium">Goal Complete!</span>
        </div>
      )}
    </div>
  );
};

// Achievement Card
export const AchievementCard = ({ darkMode, achievement }) => {
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'speed': return <Lightbulb size={20} />;
      case 'accuracy': return <Target size={20} />;
      case 'streak': return <Trophy size={20} />;
      default: return <Star size={20} />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'speed': return 'text-blue-600 bg-blue-900/20';
      case 'accuracy': return 'text-green-600 bg-green-900/20';
      case 'streak': return 'text-yellow-600 bg-yellow-900/20';
      default: return 'text-purple-600 bg-purple-900/20';
    }
  };

  return (
    <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${getCategoryColor(achievement.category)}`}>
          {getCategoryIcon(achievement.category)}
        </div>
        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {new Date(achievement.earned).toLocaleDateString()}
        </span>
      </div>
      <h4 className="font-semibold mb-2">{achievement.title}</h4>
      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {achievement.description}
      </p>
    </div>
  );
};

// Goal Setting Component
export const GoalSetting = ({ darkMode }) => {
  return (
    <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      <h3 className="text-xl font-semibold mb-4">Set New Goal</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className={`p-4 rounded-xl border-2 border-dashed transition-all duration-200 hover:border-blue-500 ${
          darkMode ? 'border-gray-700 hover:bg-blue-900/10' : 'border-gray-300 hover:bg-blue-50'
        }`}>
          <div className="text-center">
            <Lightbulb className="mx-auto mb-2 text-blue-600" size={24} />
            <div className="font-medium">Speed Goal</div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Set a WPM target
            </div>
          </div>
        </button>
        
        <button className={`p-4 rounded-xl border-2 border-dashed transition-all duration-200 hover:border-green-500 ${
          darkMode ? 'border-gray-700 hover:bg-green-900/10' : 'border-gray-300 hover:bg-green-50'
        }`}>
          <div className="text-center">
            <Target className="mx-auto mb-2 text-green-600" size={24} />
            <div className="font-medium">Accuracy Goal</div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Improve precision
            </div>
          </div>
        </button>
        
        <button className={`p-4 rounded-xl border-2 border-dashed transition-all duration-200 hover:border-purple-500 ${
          darkMode ? 'border-gray-700 hover:bg-purple-900/10' : 'border-gray-300 hover:bg-purple-50'
        }`}>
          <div className="text-center">
            <Trophy className="mx-auto mb-2 text-purple-600" size={24} />
            <div className="font-medium">Consistency Goal</div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Daily practice streak
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};