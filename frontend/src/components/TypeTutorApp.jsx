import React, { useState, useEffect } from 'react';
import { Moon, Sun, BarChart2, Upload, FileText, ChevronRight, Info } from 'lucide-react';
import { uploadPDF, processText, getStats, saveStats } from '../services/api';

const TypeTutorApp = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('home');

  // Mock state to simulate application data
  const [studyItems, setStudyItems] = useState([]);
  const [customText, setCustomText] = useState('');
  const [typingInProgress, setTypingInProgress] = useState(false);
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

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
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
            <Info size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {activeTab === 'home' && (
          <HomeScreen 
            darkMode={darkMode} 
            setActiveTab={setActiveTab} 
            customText={customText}
            setCustomText={setCustomText}
            typingInProgress={typingInProgress}
            setTypingInProgress={setTypingInProgress}
          />
        )}
        {activeTab === 'practice' && (
          <PracticeScreen 
            darkMode={darkMode} 
            setActiveTab={setActiveTab}
            customText={customText}
          />
        )}
        {activeTab === 'stats' && (
          <StatsScreen darkMode={darkMode} setActiveTab={setActiveTab} />
        )}
      </main>

      {/* Footer */}
      <footer className={`py-4 px-6 text-center text-sm ${darkMode ? 'bg-gray-900 text-gray-400' : 'bg-white text-gray-500'} border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        TypeTutor Study Edition • Designed for maximum comfort and learning efficiency
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
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', file);

      // Send the file to the backend
      const response = await fetch('http://localhost:5000/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Process the items
        if (data.items && data.items.length > 0) {
          // Join all content into a single string for simple implementation
          const allContent = data.items.map(item => item.content).join('\n\n');
          setCustomText(allContent);
          // Show success message
          alert(`Successfully extracted ${data.items.length} study items from PDF!`);
        } else {
          setErrorMessage('No content could be extracted from the PDF.');
        }
      } else {
        // Show detailed error message from the backend
        setErrorMessage(`Error: ${data.error || 'Failed to process PDF'}`);
        if (data.traceback) {
          console.error('Backend error details:', data.traceback);
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setErrorMessage('Network error while uploading file. Please check if the backend server is running.');
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
          onClick={() => {
            if (customText.trim()) {
              setActiveTab('practice');
              setTypingInProgress(true);
            }
          }}
        >
          Start Typing Practice
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

const PracticeScreen = ({ darkMode, setActiveTab, customText }) => {
  const [typedText, setTypedText] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [problemChars, setProblemChars] = useState([]);

  // Set start time when component mounts
  useEffect(() => {
    setStartTime(new Date());
  }, []);

  // Calculate WPM and accuracy when typed text changes
  useEffect(() => {
    if (!startTime || !typedText) return;
    
    // Calculate elapsed time in minutes
    const elapsedMinutes = (new Date() - startTime) / 60000;
    
    // Calculate WPM (words per minute) - assuming 5 characters = 1 word
    const words = typedText.length / 5;
    const calculatedWpm = words / elapsedMinutes;
    setWpm(Math.round(calculatedWpm));
    
    // Calculate accuracy and track problem characters
    let correctChars = 0;
    const errors = {};
    
    for (let i = 0; i < typedText.length; i++) {
      if (i < customText.length && typedText[i] === customText[i]) {
        correctChars++;
      } else if (i < customText.length) {
        // Record error character for tracking problem characters
        const expectedChar = customText[i];
        errors[expectedChar] = (errors[expectedChar] || 0) + 1;
      }
    }
    
    const calculatedAccuracy = typedText.length > 0 ? (correctChars / typedText.length) * 100 : 0;
    setAccuracy(Math.round(calculatedAccuracy));
    
    // Update problem characters
    const problemCharsArray = Object.entries(errors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([char]) => char === ' ' ? '_' : char);
      
    setProblemChars(problemCharsArray);
    
    // Check if completed
    if (typedText.length >= customText.length) {
      setIsCompleted(true);
      saveSessionStats();
    }
  }, [typedText, startTime, customText]);

  // Save stats when completed
  const saveSessionStats = async () => {
    try {
      const sessionData = {
        timestamp: new Date().toISOString(),
        wpm: wpm,
        accuracy: accuracy,
        duration: (new Date() - startTime) / 1000, // duration in seconds
        itemType: 'Custom Text',
        characterCount: customText.length
      };

      // Send stats to backend
      await fetch('http://localhost:5000/api/save-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });
      console.log('Stats saved successfully');
    } catch (error) {
      console.error('Error saving stats:', error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Typing Practice</h2>
        <button 
          className={`px-4 py-2 rounded-md ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
          onClick={() => setActiveTab('home')}
        >
          Back to Home
        </button>
      </div>
      
      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-8`}>
        Build typing speed and accuracy while learning valuable content
      </p>
      
      <div className="mb-12 text-center">
        <h3 className="text-xl font-medium mb-6">Ready to improve your typing?</h3>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
          This 20-minute session includes warm-up, targeted practice, and review phases to build your typing speed and accuracy.
        </p>
        <button 
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium" 
        >
          Start 20-Minute Session
        </button>
      </div>
      
      {/* Practice Area */}
      <div className={`rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} p-6 mb-8`}>
        <h3 className="font-semibold text-lg mb-4">Reference Text (Type This)</h3>
        <div className={`p-4 rounded-md mb-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <p className="font-mono whitespace-pre-wrap">{customText}</p>
        </div>
        
        <h3 className="font-semibold text-lg mb-4">Your Answer</h3>
        <textarea 
          className={`w-full p-4 rounded-md resize-none font-mono ${
            darkMode ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-gray-50 text-gray-800 border-gray-300'
          } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
          placeholder="Start typing here..."
          rows={5}
          value={typedText}
          onChange={(e) => setTypedText(e.target.value)}
          disabled={isCompleted}
        />
        
        {/* Real-time Feedback Visualization */}
        <div className="h-8 mt-4 rounded-md overflow-hidden flex">
          {customText.split('').slice(0, 100).map((char, index) => {
            let bgColor;
            if (index >= typedText.length) {
              bgColor = darkMode ? 'bg-gray-800' : 'bg-gray-200'; // Not typed yet
            } else if (char === typedText[index]) {
              bgColor = 'bg-green-500'; // Correct
            } else {
              bgColor = 'bg-red-500'; // Incorrect
            }
            return (
              <div 
                key={index} 
                className={`${bgColor} h-full flex-1 border-r border-opacity-30 border-gray-800`}
              />
            );
          })}
        </div>
      </div>
      
      {/* Performance Metrics */}
      <div className={`grid grid-cols-2 gap-4 mb-6`}>
        <div className={`rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} p-4`}>
          <h4 className="text-sm font-medium mb-1">Speed</h4>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold">{wpm}</span>
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>WPM</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
            <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.min(wpm / 1.2, 100)}%` }}></div>
          </div>
        </div>
        
        <div className={`rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} p-4`}>
          <h4 className="text-sm font-medium mb-1">Accuracy</h4>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold">{accuracy}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
            <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${accuracy}%` }}></div>
          </div>
        </div>
      </div>
      
      {/* Problem Characters */}
      <div className={`rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} p-4 mb-8`}>
        <h4 className="text-sm font-medium mb-2">Problem Characters</h4>
        <div className="flex space-x-2">
          {problemChars.length > 0 ? (
            problemChars.map((char) => (
              <div 
                key={char} 
                className={`w-8 h-8 rounded-md flex items-center justify-center font-mono ${
                  darkMode ? 'bg-gray-800 text-red-400' : 'bg-gray-100 text-red-600'
                }`}
              >
                {char}
              </div>
            ))
          ) : (
            ['P', 'D', 'F', '_', 'C'].map((char) => (
              <div 
                key={char} 
                className={`w-8 h-8 rounded-md flex items-center justify-center font-mono ${
                  darkMode ? 'bg-gray-800 text-gray-600' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {char}
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Control Buttons */}
      <div className="flex justify-between">
        <button 
          className={`px-4 py-2 rounded-md ${
            darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('home')}
        >
          Cancel Session
        </button>
        
        <button 
          className={`px-4 py-2 rounded-md ${
            isCompleted 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
          onClick={() => {
            if (isCompleted) {
              setActiveTab('stats');
            } else {
              setIsCompleted(true);
              saveSessionStats();
            }
          }}
        >
          {isCompleted ? 'View Results' : 'Submit'}
        </button>
      </div>
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

  // Fetch stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5000/api/stats');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
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
              {loading ? 'Loading data...' : 'Complete typing sessions to see your progress'}
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
              {loading ? 'Loading data...' : 'Complete typing sessions to see your progress'}
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
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-sm">
                    <p className={darkMode ? 'text-gray-500' : 'text-gray-400'}>
                      Loading session data...
                    </p>
                  </td>
                </tr>
              ) : stats.recentSessions && stats.recentSessions.length > 0 ? (
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