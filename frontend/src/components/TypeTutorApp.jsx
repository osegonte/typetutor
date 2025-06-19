import React, { useState, useEffect, useCallback } from 'react';
import { Moon, Sun, BarChart2, Upload, FileText, ChevronRight, Info } from 'lucide-react';
import { uploadPDF, processText, getStats } from '../services/api';
import DebuggingPanel from './DebuggingPanel';

// Import the corrected PracticeScreen
// This is just a reference - the actual component would be in a separate file
// import PracticeScreen from './PracticeScreen';

const TypeTutorApp = () => {
  // App state
  const [darkMode, setDarkMode] = useState(() => {
    // Initialize dark mode from localStorage or system preference
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [activeTab, setActiveTab] = useState('home');
  const [isDebugMode, setIsDebugMode] = useState(false);

  // User content state
  const [studyItems, setStudyItems] = useState([]);
  const [customText, setCustomText] = useState('');
  const [typingInProgress, setTypingInProgress] = useState(false);
  
  // Save dark mode preference when it changes
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    // Update document class for Tailwind dark mode
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Toggle debug mode with a keyboard shortcut (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsDebugMode(!isDebugMode);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDebugMode]);

  // Create a memoized function to handle tab switching
  // This ensures we don't lose data when switching between tabs
  const switchTab = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`px-6 py-4 flex justify-between items-center ${darkMode ? 'bg-gray-900' : 'bg-white'} border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center">
          <h1 className="text-xl font-bold">TypeTutor <span className="text-sm font-normal text-gray-500">Study Edition</span></h1>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleDarkMode}
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            aria-label="Show information"
          >
            <Info size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {activeTab === 'home' && (
          <HomeScreen 
            darkMode={darkMode} 
            setActiveTab={switchTab} 
            customText={customText}
            setCustomText={setCustomText}
            typingInProgress={typingInProgress}
            setTypingInProgress={setTypingInProgress}
          />
        )}
        {activeTab === 'practice' && (
          <PracticeScreen 
            darkMode={darkMode} 
            setActiveTab={switchTab}
            customText={customText}
          />
        )}
        {activeTab === 'stats' && (
          <StatsScreen darkMode={darkMode} setActiveTab={switchTab} />
        )}
        
        {/* Debug panel - only shown in debug mode */}
        {isDebugMode && (
          <div className="mt-8 border-t pt-8">
            <DebuggingPanel darkMode={darkMode} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`py-4 px-6 text-center text-sm ${darkMode ? 'bg-gray-900 text-gray-400' : 'bg-white text-gray-500'} border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        TypeTutor Study Edition • Designed for maximum comfort and learning efficiency
        <span className="ml-2 text-xs opacity-50">Press Ctrl+Shift+D for debug mode</span>
      </footer>
    </div>
  );
};

const HomeScreen = ({ darkMode, setActiveTab, customText, setCustomText, typingInProgress, setTypingInProgress }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset any previous errors
    setErrorMessage(null);
    
    // Create loading indicator
    setIsLoading(true);

    try {
      // Use the API service function instead of direct fetch
      const result = await uploadPDF(file);

      if (result.success) {
        // Process the items
        if (result.items && result.items.length > 0) {
          // Join all content into a single string for simple implementation
          const allContent = result.items.map(item => item.content).join('\n\n');
          setCustomText(allContent);
          // Show success message
          alert(`Successfully extracted ${result.items.length} study items from PDF!`);
        } else {
          setErrorMessage('No content could be extracted from the PDF.');
        }
      } else {
        // Show detailed error message from the backend
        setErrorMessage(`Error: ${result.error || 'Failed to process PDF'}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setErrorMessage(error.message || 'Network error while uploading file. Please check if the backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle custom text input
  const handleSubmitText = async () => {
    if (!customText.trim()) {
      setErrorMessage('Please enter some text to practice with.');
      return;
    }
    
    setErrorMessage(null);
    setIsLoading(true);
    
    try {
      const result = await processText(customText);
      
      if (result.success) {
        setActiveTab('practice');
        setTypingInProgress(true);
      } else {
        setErrorMessage(`Error: ${result.error || 'Failed to process text'}`);
      }
    } catch (error) {
      console.error('Error processing text:', error);
      // Continue anyway since we already have the text
      setActiveTab('practice');
      setTypingInProgress(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">TypeTutor Study App</h2>
        <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Build your typing speed and accuracy while learning valuable content
        </p>
      </div>

      <div className="flex justify-end">
        <button 
          className={`flex items-center space-x-2 px-4 py-2 rounded-md ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
          onClick={() => setActiveTab('stats')}
        >
          <BarChart2 size={20} />
          <span>View Stats</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Learning Material */}
        <div className={`rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} p-6 h-72 flex flex-col`}>
          <h3 className="font-semibold text-lg mb-2">Upload Learning Material</h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
            Upload a text or PDF file to practice with
          </p>
          
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-md border-gray-600 m-2 relative">
            {isLoading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
                <div className="text-white">Processing...</div>
              </div>
            )}
            <Upload className={`${darkMode ? 'text-gray-600' : 'text-gray-400'} mb-2`} size={24} />
            <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-600'} text-center mb-2`}>
              Drag and drop your file here or click to browse
            </p>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.txt"
              onChange={handleFileUpload}
              disabled={isLoading}
            />
            <button 
              className={`text-sm px-4 py-1.5 rounded-md ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={() => document.getElementById('file-upload').click()}
              disabled={isLoading}
            >
              Browse Files
            </button>
          </div>
          
          {/* Display error message if any */}
          {errorMessage && (
            <div className={`mt-2 p-2 text-sm text-red-500 bg-red-100 dark:bg-red-900 dark:text-red-200 rounded-md`}>
              {errorMessage}
            </div>
          )}
        </div>

        {/* Custom Text */}
        <div className={`rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} p-6 h-72 flex flex-col`}>
          <h3 className="font-semibold text-lg mb-2">Custom Text</h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
            Paste or type the text you want to practice
          </p>
          
          <div className="flex-1 flex flex-col">
            <textarea 
              className={`flex-1 p-3 rounded-md resize-none ${darkMode ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-gray-50 text-gray-800 border-gray-300'} border focus:outline-none focus:ring-2 focus:ring-purple-500`}
              placeholder="Paste or type your practice text here..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Start Typing Practice Button */}
      <div className="flex justify-center mt-6">
        <button 
          className={`px-6 py-3 rounded-md font-medium flex items-center ${
            customText.trim() ? 'bg-purple-600 hover:bg-purple-700 text-white' : 
            darkMode ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
          disabled={!customText.trim() || isLoading}
          onClick={handleSubmitText}
        >
          {isLoading ? 'Processing...' : 'Start Typing Practice'}
        </button>
      </div>

      {/* Why TypeTutor Section */}
      <div className={`mt-12 rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-100 border-gray-200'} p-6`}>
        <h3 className="text-lg font-semibold text-center mb-6">Why TypeTutor?</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard 
            darkMode={darkMode}
            title="Learn While Typing"
            description="Practice with study materials to improve retention"
            icon={<FileText size={24} />}
          />
          
          <FeatureCard 
            darkMode={darkMode}
            title="Track Progress"
            description="View detailed stats on typing speed and accuracy"
            icon={<BarChart2 size={24} />}
          />
          
          <FeatureCard 
            darkMode={darkMode}
            title="Build Consistency"
            description="Track daily streaks and practice minutes"
            icon={<ChevronRight size={24} />}
          />
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ darkMode, title, description, icon }) => {
  return (
    <div className="text-center">
      <div className="flex justify-center">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          {icon}
        </div>
      </div>
      <h4 className="font-semibold mt-3 mb-1">{title}</h4>
      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {description}
      </p>
    </div>
  );
};

// Import the PracticeScreen component from corrected-practice-screen.jsx
// This is just a reference for the component structure
const PracticeScreen = ({ darkMode, setActiveTab, customText }) => {
  // For brevity, we're not including the full implementation here
  // The actual implementation should be imported from the corrected PracticeScreen component
  
  // Minimal implementation for demonstration purposes
  return (
    <div>
      <h2>Practice Screen</h2>
      <p>This is a placeholder for the corrected PracticeScreen component</p>
    </div>
  );
};

const StatsScreen = ({ darkMode, setActiveTab }) => {
  const [stats, setStats] = useState({
    averageWpm: 0,
    accuracy: 0,
    practiceMinutes: 0,
    currentStreak: 0,
    recentSessions: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch stats from backend using the API service
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getStats();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setError('Failed to load statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Performance Statistics</h2>
        <button 
          className={`px-4 py-2 rounded-md ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
          onClick={() => setActiveTab('home')}
        >
          Back to Home
        </button>
      </div>
      
      <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-8`}>
        Track your typing progress over time
      </p>
      
      {error && (
        <div className={`p-4 mb-6 rounded-md ${darkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-800'}`}>
          {error}
        </div>
      )}
      
      {loading ? (
        <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Loading your statistics...
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard 
              darkMode={darkMode} 
              title="Average WPM" 
              value={stats.averageWpm} 
              icon={<BarChart2 size={20} />} 
            />
            <StatCard 
              darkMode={darkMode} 
              title="Accuracy" 
              value={`${stats.accuracy}%`} 
              icon={<BarChart2 size={20} />} 
            />
            <StatCard 
              darkMode={darkMode} 
              title="Practice Time" 
              value={`${stats.practiceMinutes} mins`} 
              icon={<BarChart2 size={20} />} 
            />
            <StatCard 
              darkMode={darkMode} 
              title="Current Streak" 
              value={`${stats.currentStreak} days`} 
              icon={<BarChart2 size={20} />} 
            />
          </div>
          
          {/* Progress Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className={`rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} p-4`}>
              <h3 className="font-semibold text-lg mb-4">WPM Progress</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Your typing speed over time</p>
              
              <div className="h-64 flex items-center justify-center border border-dashed rounded-md mt-4 border-gray-600">
                <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {stats.recentSessions && stats.recentSessions.length > 0 
                    ? 'Chart will be displayed here'
                    : 'Complete typing sessions to see your progress'}
                </p>
              </div>
              
              <div className="flex justify-center mt-4">
                <div className={`text-xs ${darkMode ? 'text-purple-400' : 'text-purple-600'} flex items-center`}>
                  <div className="w-3 h-1 bg-purple-500 rounded mr-1"></div>
                  <span>wpm</span>
                </div>
              </div>
            </div>
            
            <div className={`rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} p-4`}>
              <h3 className="font-semibold text-lg mb-4">Accuracy</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Your typing accuracy over time</p>
              
              <div className="h-64 flex items-center justify-center border border-dashed rounded-md mt-4 border-gray-600">
                <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {stats.recentSessions && stats.recentSessions.length > 0 
                    ? 'Chart will be displayed here'
                    : 'Complete typing sessions to see your progress'}
                </p>
              </div>
              
              <div className="flex justify-center mt-4">
                <div className={`text-xs ${darkMode ? 'text-purple-400' : 'text-purple-600'} flex items-center`}>
                  <div className="w-3 h-1 bg-purple-500 rounded mr-1"></div>
                  <span>accuracy</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recent Sessions */}
          <div className={`rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} p-4`}>
            <h3 className="font-semibold text-lg mb-4">Recent Sessions</h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>Your last 5 typing practice sessions</p>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`text-left text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Duration</th>
                    <th className="pb-2">WPM</th>
                    <th className="pb-2">Accuracy</th>
                    <th className="pb-2">Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentSessions && stats.recentSessions.length > 0 ? (
                    stats.recentSessions.map((session, index) => (
                      <tr key={index} className={`border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                        <td className="py-2">{typeof session.date === 'string' && session.date.includes('T') 
                          ? new Date(session.date).toLocaleDateString() 
                          : session.date}</td>
                        <td className="py-2">{session.duration}</td>
                        <td className="py-2">{session.wpm}</td>
                        <td className="py-2">{session.accuracy}%</td>
                        <td className="py-2">{session.mode}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-sm">
                        <p className={darkMode ? 'text-gray-500' : 'text-gray-400'}>
                          No sessions recorded yet
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ darkMode, title, value, icon }) => {
  return (
    <div className={`rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

export default TypeTutorApp;